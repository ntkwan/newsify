from pyspark.sql import SparkSession
from pyspark.sql.types import *
import os
from dotenv import load_dotenv
from pyspark.sql.functions import *
from supabase import create_client, Client
from datetime import datetime, date, timedelta
import pandas as pd
import redis
import json
import pytz
from pathlib import Path
from pymilvus import FieldSchema, CollectionSchema, DataType, Collection, utility, connections
import numpy as np
from sentence_transformers import SentenceTransformer
from sqlalchemy import create_engine
from postgrest.exceptions import APIError

load_dotenv()

REDIS_HOST = os.getenv("REDIS_HOST")
REDIS_PORT = int(os.getenv("REDIS_PORT"))
REDIS_USERNAME = os.getenv("REDIS_USERNAME")
REDIS_PASSWORD = os.getenv("REDIS_PASSWORD")
REDIS_CHANNEL = os.getenv("REDIS_CHANNEL")

def create_spark_session():
    spark = SparkSession.builder \
    .appName("RawToSilver") \
    .master("local[*]") \
    .config("spark.hadoop.fs.s3a.impl", "org.apache.hadoop.fs.s3a.S3AFileSystem") \
    .config("spark.sql.extensions", "io.delta.sql.DeltaSparkSessionExtension") \
    .config("spark.sql.catalog.spark_catalog", "org.apache.spark.sql.delta.catalog.DeltaCatalog") \
    .config("spark.hadoop.fs.s3a.access.key", os.getenv("AWS_ACCESS_KEY_ID")) \
    .config("spark.hadoop.fs.s3a.secret.key", os.getenv("AWS_SECRET_ACCESS_KEY")) \
    .config("spark.hadoop.fs.s3a.endpoint", "s3.amazonaws.com") \
    .config("spark.sql.legacy.timeParserPolicy", "LEGACY") \
    .config("spark.sql.session.timeZone", "UTC") \
    .getOrCreate()
        
    return spark

def send_notification(update_type="general", details=None, from_time=None, to_time=None):
    r = None
    try:
        if REDIS_USERNAME and REDIS_PASSWORD:
            r = redis.Redis(
                host=REDIS_HOST,
                port=REDIS_PORT,
                username=REDIS_USERNAME,
                password=REDIS_PASSWORD,
                ssl=True,
                decode_responses=True,
                socket_timeout=5,
                socket_connect_timeout=5
            )
        else:
            r = redis.Redis(
                host=REDIS_HOST,
                port=REDIS_PORT,
                decode_responses=True,
                socket_timeout=5,
                socket_connect_timeout=5
            )
        
        r.ping()
        
        now = datetime.now(pytz.UTC).isoformat()
        message = {
            "update_type": update_type,
            "timestamp": now,
        }
        
        if details:
            message["details"] = details
        
        if from_time and to_time:
            message["time_range"] = {
                "from": from_time,
                "to": to_time
            }
            
        json_message = json.dumps(message)
        result = r.publish(REDIS_CHANNEL, json_message)
        print(f"Notification sent to channel {REDIS_CHANNEL}: {message}")
        print(f"Delivery count: {result} listeners received the message")
        
        return True
    except redis.ConnectionError as e:
        print(f"Redis connection error: {str(e)}")
        print(f"Check Redis connection details: Host={REDIS_HOST}, Port={REDIS_PORT}")
        return False
    except redis.AuthenticationError as e:
        print(f"Redis authentication error: {str(e)}")
        print("Verify your username and password are correct")
        return False
    except Exception as e:
        print(f"Error sending notification: {str(e)}")
        return False
    finally:
        # Close connection in finally block to ensure it always happens
        if r:
            try:
                r.close()
            except:
                pass

def get_time_slot(_=None) -> tuple:
    now = datetime.now(pytz.timezone("Asia/Ho_Chi_Minh"))
    current_hour = now.hour
    if 0 <= current_hour < 5:
        return (0, 5)
    elif 5 <= current_hour < 11:
        return (5, 11)
    elif 11 <= current_hour < 17:
        return (11, 17)
    elif 17 <= current_hour < 24:
        return (17, 23)

def read_data_silver(spark, s3_base_path, process_date, start_hour, end_hour):
    try:
        ingest_date = process_date.strftime('%Y-%m-%d')
        hours_to_read = [str(i).zfill(2) for i in range(start_hour, end_hour + 1)]
        hours_str = ",".join([f"'{h}'" for h in hours_to_read])
        
        df = spark.read.format("delta").load(s3_base_path).where(
            f"processed_date = '{ingest_date}' AND processed_hour IN ({hours_str})"
        )
        print(f"Running query: processed_date = '{ingest_date}' AND processed_hour IN ({hours_str})")
        # df = spark.read.format("delta").load(s3_base_path).where(
        #     "processed_date = '2025-05-08' AND processed_hour = '00'"
        # )
        # df.show()
       
        record_count = df.count()
        print(f"Loaded {record_count} records from silver data")
        return df if record_count > 0 else spark.createDataFrame([], df.schema)
    except Exception as e:
        print(f"Error reading data from silver: {str(e)}")
        raise

def connect_to_milvus():
    connections.connect(
        alias="default",
        uri=os.getenv("ZILLIZ_URI"),
        token=os.getenv("ZILLIZ_TOKEN"),
        secure=True
    )
    print("Connected to Milvus")
     
def create_milvus_collection():
    collection_name = os.getenv("COLLECTION_NAME")
    
    if utility.has_collection(collection_name):
        print(f"Collection '{collection_name}' existed.")
        return Collection(collection_name)
    
    dim = 384 # embeddings dim
    
    fields = [
        FieldSchema(name="article_id", dtype=DataType.INT64, is_primary=True, auto_id=True),
        FieldSchema(name="article_embed", dtype=DataType.FLOAT_VECTOR, dim=dim),
        FieldSchema(name="url", dtype=DataType.VARCHAR, max_length=1024),
        FieldSchema(name="publish_date", dtype=DataType.INT64, max_length=32),
    ]
    
    schema = CollectionSchema(
        fields=fields,
        description="News articles for recommendation"
    )
     
    collection = Collection(name=collection_name, schema=schema)
    print(f"Create collection '{collection_name}' successfully.")
    
    return collection

def generate_embeddings(titles, contents):
    model = SentenceTransformer("all-MiniLM-L6-v2")
    combined_texts = [f"{title} {content}" for title, content in zip(titles, contents)]
    embeddings = model.encode(combined_texts)  
    return embeddings    

def delete_existing_vectors_by_url(collection, urls):
    for url in urls:
        expr = f'url == "{url}"'
        res = collection.query(expr, output_fields=["article_id"])
        
        if res:
            ids_to_delete = [r["article_id"] for r in res]
            ids_str = "[" + ", ".join(str(id_) for id_ in ids_to_delete) + "]"
            collection.delete(expr=f'article_id in {ids_str}')
            print(f"Deleted {len(ids_to_delete)} existing vectors for URL: {url}")
            
def save_to_milvus(collection, article_embeds, urls, publish_dates):
    docs = [
        article_embeds,  
        urls,  
        publish_dates  
    ]
    
    # creating index on article_embeds field 
    index_params = {
        "metric_type": "COSINE",
        "index_type": "HNSW",
        "params": {
            "M": 32,              
            "efConstruction": 300,
            "efSearch": 200
        }    
    }
    collection.create_index(field_name="article_embed", index_params=index_params)
    
    collection.load()
    
    delete_existing_vectors_by_url(collection, urls)
    
    result = collection.insert(docs)
    
    print(f"Inserted {len(urls)} records into Milvus")
    return result
 
def save_to_supabase_and_milvus(spark, s3_base_path, supabase_url, supabase_key, table_name, process_date):
    try:
        # print(f"supabase_url: {supabase_url}")
        # print(f"supabase_key: {supabase_key}")
        # Connect to Supabase
        supabase: Client = create_client(supabase_url, supabase_key)
        
        response = supabase.table("control_table").select("last_ingest_time").eq("id", "silver_to_supabase").execute()
        if response.data:
            last_ingest_time = response.data[0]['last_ingest_time']
            print(f"Last ingest time from control table: {last_ingest_time}")
        else:
            last_ingest_time = "1970-01-01T00:00:00Z"
            print("No last ingest time found in control table. Processing all records")
        
        current_hour = int(datetime.now(pytz.UTC).strftime("%H"))
        start_hour, end_hour = get_time_slot(current_hour)
        
        if start_hour is None or end_hour is None:
            print(f"Invalid current hour: {current_hour}")
            return 0
        
        effective_date = process_date
        if start_hour == 0:
            effective_date = process_date - timedelta(days=1)
        
        # time range for notification
        from_time = f"{start_hour}h {effective_date.strftime('%d/%m')}"
        to_time = f"{end_hour}h {effective_date.strftime('%d/%m')}"
        
        # read data from silver layer
        silver_df = read_data_silver(spark, s3_base_path, effective_date, start_hour, end_hour)
        record_count = silver_df.count()
        print(f"Reading {record_count} records from silver layer")
        
        if record_count == 0:
            print("No new records to process")
            return None
        
        # filter records newer than last_ingest_time
        silver_df = silver_df.filter(col("ingest_time") > last_ingest_time)
        new_record_count = silver_df.count()
        print(f"Processing {new_record_count} new records since last ingest time")
        
        if new_record_count == 0:
            print("No new records to process after filtering")
            return None
        
       # create publish_date from year, month_number, day, hour, minute
        silver_df = silver_df.withColumn(
            "publish_date",
            when(
                (col("year").isNotNull()) &
                (col("month_number").isNotNull()) &
                (col("day").isNotNull()) &
                (col("hour").isNotNull()) &
                (col("minute").isNotNull()) &
                (col("year").cast("integer").between(1900, 9999)) &
                (col("month_number").cast("integer").between(1, 12)) &
                (col("day").cast("integer").between(1, 31)) &
                (col("hour").cast("integer").between(0, 23)) &
                (col("minute").cast("integer").between(0, 59)),
                to_timestamp(
                    concat(
                        col("year"), lit("-"),
                        lpad(col("month_number"), 2, "0"), lit("-"),
                        lpad(col("day"), 2, "0"), lit(" "),
                        lpad(col("hour"), 2, "0"), lit(":"),
                        lpad(col("minute"), 2, "0"), lit(":00")
                    ),
                    "yyyy-MM-dd HH:mm:ss"
                )
            ).otherwise(None)
        ) 
        
        silver_df = silver_df.withColumn(
            "publish_date_epoch",
            unix_timestamp(col("publish_date")) 
        )
        
        upsert_df = silver_df.select(
            "url", "src", "language", "title", "content", "image_url", 
            "publish_date", "time_reading", "author", "main_category", "categories"
        )
        
        df = upsert_df.toPandas() 
        if df.empty:
            print("No data to write to Supabase after conversion")
            return None
        
        total_rows = len(df)
        
        publish_dates_int64 = df['publish_date'].apply(
                lambda x: int(x.timestamp()) if pd.notnull(x) else None
                ).tolist()
        
        df["publish_date"] = df["publish_date"].apply(
            lambda x: x.isoformat() + "+00:00" if pd.notnull(x) else None
        )
        
        print(f"Writing {total_rows} rows to Supabase table: {table_name}")
        
        if total_rows == 0:
            print("No data to write to Supabase after conversion")
            return None
        
        try: 
            # upsert to supabase
            response = supabase.table(table_name).upsert(
                df.to_dict(orient="records"),
                on_conflict=["url", "src"]
            ).execute()
            print(f"Successfully wrote {total_rows} records to Supabase table: {table_name}")
            
            # convert df columns to lists
            titles = df['title'].tolist()
            contents = df['content'].tolist()
            urls = df['url'].tolist()

            # create embeddings
            article_embeds = generate_embeddings(titles, contents)
            
            # save to milvus
            collection = create_milvus_collection() 
            save_to_milvus(collection, article_embeds, urls, publish_dates_int64)
            print("Successfully wrote data to Milvus.")
            
            # send notification
            details = {
                "processed_rows": total_rows,
                "table": table_name,
                "date": effective_date.strftime('%Y-%m-%d'),
                "hours": list(range(start_hour, end_hour + 1))
            }
            
            send_notification(update_type="general", details=details, from_time=from_time, to_time=to_time)
            print(f"Notification sent for {total_rows} new records")
            
        except APIError as e:
            print(f"Error writing data into Supabase or Milvus: {str(e)}")
            return None
            
        result_row = silver_df.agg(max("ingest_time").alias("max_ingest_time")).collect()[0]
        max_ingest_time = result_row["max_ingest_time"]    
        
        if max_ingest_time:
            max_ingest_time_iso = max_ingest_time.isoformat()
            supabase.table("control_table").upsert(
                {"id": "silver_to_supabase", "last_ingest_time": max_ingest_time_iso},
                on_conflict=["id"]
            ).execute()
            print(f"Updated control table with last ingest time: {max_ingest_time_iso}")
        else:
            print(f"No ingest time to update.")
            
        return total_rows   

    except Exception as e:
        print(f"Error saving data to Supabase: {str(e)}")
        raise
    
if __name__ == "__main__":
    s3_base_path = "s3a://newsifyteam12/silver_data/blogs_list/"
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_KEY")
    table_name = "Articles"
    process_date = date.today()
    
    spark = create_spark_session()
    connect_to_milvus()
    total_rows = save_to_supabase_and_milvus(spark, s3_base_path, supabase_url, supabase_key, table_name, process_date)
    
    spark.stop()
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
    .config("spark.master", "spark://spark-master:7077") \
    .config("spark.jars", "/opt/spark/jars/*") \
    .config("spark.hadoop.fs.s3a.impl", "org.apache.hadoop.fs.s3a.S3AFileSystem") \
    .config("spark.hadoop.fs.s3a.path.style.access", "true") \
    .config("spark.sql.extensions", "io.delta.sql.DeltaSparkSessionExtension") \
    .config("spark.sql.catalog.spark_catalog", "org.apache.spark.sql.delta.catalog.DeltaCatalog") \
    .config("spark.hadoop.fs.s3a.access.key", os.getenv("AWS_ACCESS_KEY_ID")) \
    .config("spark.hadoop.fs.s3a.secret.key", os.getenv("AWS_SECRET_ACCESS_KEY")) \
    .config("spark.hadoop.fs.s3a.endpoint", "s3.amazonaws.com") \
    .config("spark.hadoop.io.nativeio.enabled", "false") \
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
        # print(f"Running query: processed_date = '{ingest_date}' AND processed_hour IN ({hours_str})")
        # df = spark.read.format("delta").load(s3_base_path).where(
        #     "processed_date = '2025-05-10' AND processed_hour = '02'"
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
    
    delete_existing_vectors_by_url(collection, urls)
    
    result = collection.insert(docs)
    
    print(f"Inserted {len(urls)} records into Milvus")
    return result
 
def save_to_milvus_main(df):
    batch_size = 5000  
    total_rows = df.count()
    collection = create_milvus_collection() 
    collection.load()
    titles, contents, urls, publish_dates_int64 = [], [], [], []

    for i in range(0, total_rows, batch_size):
        batch_df = df.limit(batch_size).offset(i)
        rows = batch_df.collect()

        titles.extend([row["title"] for row in rows])
        contents.extend([row["content"] for row in rows])
        urls.extend([row["url"] for row in rows])
        publish_dates_int64.extend([int(row["publish_date"].timestamp()) if row["publish_date"] is not None else None for row in rows])
    
        # create embeddings
        article_embeds = generate_embeddings(titles, contents)
    
        # save to milvus
        save_to_milvus(collection, article_embeds, urls, publish_dates_int64)
    
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
    
    print("Successfully wrote data to Milvus")

def get_last_ingest_time(supabase: Client) -> str:
    response = supabase.table("control_table").select("last_ingest_time").eq("id", "silver_to_supabase").execute()
    
    if response.data:
        last_ingest_time = response.data[0]['last_ingest_time']
        print(f"Last ingest time from control table: {last_ingest_time}")
        return last_ingest_time
    else:
        last_ingest_time = "1970-01-01T00:00:00Z"
        print("No last ingest time found in control table. Uploading all records")
        return last_ingest_time
    
def save_to_supabase(df, table_name, supabase: Client): 
    df["publish_date"] = df["publish_date"].apply(
        lambda x: x.isoformat() + "+00:00" if pd.notnull(x) else None
    )
    
    uploaded_time = datetime.now(pytz.UTC).isoformat()  
    df["uploaded_date"] = uploaded_time
    
    total_rows = len(df)
    
    print(f"Writing {total_rows} rows to Supabase table: {table_name}")
    
    try:
        response = supabase.table(table_name).upsert(
            df.to_dict(orient="records"),
            on_conflict=["url", "src"]
        ).execute()
        
        print(f"Successfully wrote {total_rows} records to Supabase table: {table_name}")  
        return uploaded_time, total_rows    
    
    except APIError as e:
        print(f"Error writing data into Supabase: {str(e)}")
        return None, 0
              
def update_control_table(supabase: Client, max_ingest_time):
    if max_ingest_time:
        max_ingest_time_iso = max_ingest_time.isoformat()
        supabase.table("control_table").upsert(
            {"id": "silver_to_supabase", "last_ingest_time": max_ingest_time_iso},
            on_conflict=["id"]
        ).execute()
        print(f"Updated control table with last ingest time: {max_ingest_time_iso}")
    else:
        print("No ingest time to update.")
     
def main_process(spark, s3_base_path, supabase_url, supabase_key, table_name, process_date):
    try:
        # Connect to Supabase
        # print(f"supabase_url: {supabase_url}")
        # print(f"supabase_key: {supabase_key}")
        supabase: Client = create_client(supabase_url, supabase_key)
        last_ingest_time = get_last_ingest_time(supabase)
        
        current_hour = int(datetime.now(pytz.UTC).strftime("%H"))
        start_hour, end_hour = get_time_slot(current_hour)
        
        if start_hour is None or end_hour is None:
            print(f"Invalid current hour: {current_hour}")
            return 0
        
        effective_date = process_date
        if start_hour == 0:
            effective_date = process_date - timedelta(days=1)
          
        # read data from silver layer
        silver_df = read_data_silver(spark, s3_base_path, effective_date, start_hour, end_hour)
        record_count = silver_df.count()
        print(f"Reading {record_count} records from silver layer")
        
        # filter records newer than last_ingest_time
        silver_df = silver_df.filter(col("ingest_time") > last_ingest_time)
        new_record_count = silver_df.count()
        print(f"Processing {new_record_count} new records since last ingest time")
        
        if new_record_count == 0:
            print("No new records to upload")
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
        
        
        upsert_df = silver_df.select(
            "url", "src", "language", "title", "content", "image_url", 
            "publish_date", "time_reading", "author", "main_category", "categories"
        )
        
        df = upsert_df.toPandas() 
        if df.empty:
            print("No data to write to Supabase after conversion")
            return None
       
        # upload data to supabase
        uploaded_time, total_rows = save_to_supabase(df, table_name, supabase)
        
        if total_rows > 0:
            # send notification
            details = {
            "processed_rows": total_rows,
            "table": table_name,
            "date": effective_date.strftime('%Y-%m-%d'),
            "hours": list(range(start_hour, end_hour + 1))
            }
            
            result_row = silver_df.agg(min("ingest_time").alias("min_ingest_time")).collect()[0]
            bangkok = pytz.timezone("Asia/Bangkok") # spark timezone
            
            if result_row["min_ingest_time"]:
                if result_row["min_ingest_time"].tzinfo is None:
                    min_ingest_time_bkk = bangkok.localize(result_row["min_ingest_time"])
                else:
                    min_ingest_time_bkk = result_row["min_ingest_time"]

                from_time = min_ingest_time_bkk.astimezone(pytz.UTC).isoformat()
            else:
                from_time = None
                
            to_time = uploaded_time
            
            send_notification(update_type="general", details=details, from_time=from_time, to_time=to_time)
            print(f"Notification sent for {total_rows} new records")
            
            max_ingest_time = silver_df.agg(max("ingest_time").alias("max_ingest_time")).collect()[0]["max_ingest_time"]
            update_control_table(supabase, max_ingest_time)
        
        # save to milvus
        connect_to_milvus()
        save_to_milvus_main(upsert_df)
            
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
    total_rows = main_process(spark, s3_base_path, supabase_url, supabase_key, table_name, process_date)
    
    spark.stop()
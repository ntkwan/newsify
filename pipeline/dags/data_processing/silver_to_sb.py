from pyspark.sql import SparkSession
from pyspark.sql.types import *
import os
from dotenv import load_dotenv
from pyspark.sql.functions import *
from supabase import create_client, Client
from datetime import datetime
import pandas as pd
import redis
import json
import pytz

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

def send_notification(update_type="general", details=None):
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

def save_to_supabase(df, s3_input_path, supabase_url, supabase_key, table_name):
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
        
        # Read data from Silver layer
        silver_df = spark.read \
            .format("delta") \
            .load(s3_input_path)
        
        # print(f"s3 path: {s3_input_path}")
        
        # df_with_files = silver_df.withColumn("input_file", input_file_name())
        # df_with_files.select("input_file").distinct().show(truncate=False)
        
        record_count = silver_df.count()
        print(f"Reading {record_count} records from Silver layer: {s3_input_path}")
        
        if record_count == 0:
            print("No new records to process")
            return None

        # Filter records newer than last_ingest_time
        silver_df = silver_df.filter(col("ingest_time") > last_ingest_time)
        new_record_count = silver_df.count()
        print(f"Processing {new_record_count} new records since last ingest time")
        
        if new_record_count == 0:
            print("No new records to process after filtering")
            return None
        
       # Create publish_date from year, month_number, day, hour, minute
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
        total_rows = len(df)
        print(f"Writing {total_rows} rows to Supabase table: {table_name}")
        
        if total_rows == 0:
            print("No data to write to Supabase after conversion")
            return None
        
        df["publish_date"] = df["publish_date"].apply(
            lambda x: x.isoformat() + "+00:00" if pd.notnull(x) else None
        )
        
        try: 
            response = supabase.table(table_name).upsert(
                df.to_dict(orient="records"),
                on_conflict=["url", "src"]
            ).execute()
            print(f"Successfully wrote {total_rows} records to Supabase table: {table_name}")
            
            details = {
                "processed_rows": total_rows,
                "table": table_name,
            }
            # send_notification(update_type="general", details=details)
            print(f"Notification sent for {total_rows} new records")
            
        except APIError as e:
            print(f"Error writing data into Supabase: {response.error}")
            return None
            
        result_row = silver_df.agg(max("ingest_time").alias("max_ingest_time")).collect()[0]
        max_ingest_time = result_row["max_ingest_time"]    
        # max_ingest_time = silver_df.agg(max("ingest_time").alias("max_ingest_time")).collect()[0][max_ingest_time]       
        if max_ingest_time:
            max_ingest_time_iso = max_ingest_time.isoformat()
            supabase.table("control_table").upsert(
                {"id": "silver_to_supabase", "last_ingest_time": max_ingest_time_iso},
                on_conflict=["id"]
            ).execute()
            print(f"Updated control table with last ingest time: {max_ingest_time_iso}")
        else:
            print(f"No ingest time to update.")
            
        return df
    except Exception as e:
        print(f"Error saving data to Supabase: {str(e)}")
        raise
    
if __name__ == "__main__":
    s3_input_path = "s3a://newsifyteam12/silver_data/blogs_list/"
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_KEY")
    table_name = "Articles"
    spark = create_spark_session()
    
    df = save_to_supabase(spark, s3_input_path, supabase_url, supabase_key, table_name)
    
    if df is not None:
        details = {
            "processed_rows": len(df),
            "table": table_name,
        }
        send_notification(update_type="general", details=details)
    else:
        details = {
            "processed_rows": 0,
            "table": table_name,
            "message": "No new records to process"
        }
        send_notification(update_type="general", details=details)
    
    spark.stop()
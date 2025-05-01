from pyspark.sql import SparkSession
from pyspark.sql.types import StructType, StringType, IntegerType, DateType, TimestampType, StructField
import os
from dotenv import load_dotenv
from pyspark.sql.functions import input_file_name, regexp_replace, col, to_timestamp, unix_timestamp, date_format, trim, broadcast, from_utc_timestamp, hour, minute, dayofmonth, month, year, lit, current_timestamp
from supabase import create_client, Client
from datetime import datetime
import pandas as pd
import psycopg2

load_dotenv()
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
    .getOrCreate()
        
    return spark

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

        # Transform data
        silver_df = silver_df.withColumn(
            "publish_date",
            to_timestamp(col("publish_date"), "yyyy-MM-dd HH:mm:ss")
        )
        
        silver_df = silver_df.select(
            "url", "src", "language", "title", "content", "image_url", 
            "publish_date", "time_reading", "author"
        )
        
        df = silver_df.toPandas() 
        total_rows = len(df)
        print(f"Writing {total_rows} rows to Supabase table: {table_name}")
        
        # Convert publish_date to ISO format
        pandas_df["publish_date"] = pandas_df["publish_date"].apply(
            lambda x: x.isoformat() if pd.notnull(x) else None
        )
        
        response = supabase.table(table_name).upsert(
            pandas_df.to_dict(orient="records"),
            on_conflict=["url", "src"]
        ).execute()
        if response.error:
            print(f"Error writing data into Supabase: {response.error}")
            raise Exception(f"Supabase error: {response.error}")
            
        print(f"Successfully wrote {total_rows} records to Supabase table: {table_name}")
        
        max_ingest_time = silver_df.agg(max("ingest_time").alias("max_ingest_time")).collect()[0][max_ingest_time]       
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
    table_name = "articles"
    
    spark = create_spark_session()
    
    df = save_to_supabase(spark, s3_input_path, supabase_url, supabase_key, table_name)
    
    spark.stop()
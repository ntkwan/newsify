from pyspark.sql import SparkSession
from dotenv import load_dotenv
import os
from delta.tables import DeltaTable
from datetime import datetime
import pytz
from pyspark.sql.functions import (to_date, coalesce, row_number, expr, regexp_replace, col, lower, to_timestamp, date_format, 
trim, broadcast, from_utc_timestamp, hour, minute, dayofmonth, month, year, lit, current_timestamp, when, current_date, struct)

def create_spark_session():
    load_dotenv()

    spark = SparkSession.builder \
    .appName("SilverToGold") \
    .config("spark.master", "spark://spark-master:7077") \
    .config("spark.jars", "/opt/spark/jars/*") \
    .config("spark.executor.memory", "4g") \
    .config("spark.hadoop.fs.s3a.impl", "org.apache.hadoop.fs.s3a.S3AFileSystem") \
    .config("spark.hadoop.fs.s3a.path.style.access", "true") \
    .config("spark.sql.extensions", "io.delta.sql.DeltaSparkSessionExtension") \
    .config("spark.sql.catalog.spark_catalog", "org.apache.spark.sql.delta.catalog.DeltaCatalog") \
    .config("spark.hadoop.fs.s3a.access.key", os.getenv("AWS_ACCESS_KEY_ID")) \
    .config("spark.hadoop.fs.s3a.secret.key", os.getenv("AWS_SECRET_ACCESS_KEY")) \
    .config("spark.hadoop.fs.s3a.endpoint", "s3.amazonaws.com") \
    .config("spark.hadoop.io.nativeio.enabled", "false") \
    .config("spark.sql.legacy.timeParserPolicy", "LEGACY") \
    .getOrCreate()
    spark.catalog.clearCache()
    return spark

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
        
        # for auto uploading, default today
        df = spark.read.format("delta").load(s3_base_path).where(
            f"processed_date = '{ingest_date}' AND processed_hour IN ({hours_str})"
        )
        print(f"Running query: processed_date = '{ingest_date}' AND processed_hour IN ({hours_str})")
        
        # for manual uploading
        #     "processed_date = '2025-05-14' AND processed_hour = '01'"
        # )
       
        record_count = df.count()
        print(f"Loaded {record_count} records from silver data")
        
        return df if record_count > 0 else spark.createDataFrame([], df.schema)
    
    except Exception as e:
        print(f"Error reading data from silver: {str(e)}")
        raise

def save_to_gold(spark, silver_df, s3_output_path):
    try:
        silver_df = silver_df.withColumn("publish_date", to_date(col("publish_date")))
        silver_df = silver_df.withColumn("upload_date", current_date())  
        
        selected_columns = [
            "url", "src", "language", "title", "content", "image_url", 
            "publish_date", "time", "timezone", "author", "main_category", 
            "categories", "time_reading", "ingest_time", "processed_date", "upload_date" 
        ]
        
        gold_df = silver_df.select(*selected_columns).dropDuplicates(["url", "src"])
        
        print(f"Uploading data to gold layer: {gold_df.count()} records")
        
        # append new records and z-ordering by publish_date
        if DeltaTable.isDeltaTable(spark, s3_output_path):
            gold_df.write.format("delta") \
                .mode("append") \
                .partitionBy("upload_date") \
                .save(s3_output_path)
                
            spark.sql(f"Optimize delta. `{s3_output_path}` zorder by (main_category)")
        else:
            gold_df.write.format("delta") \
                .option("mergeSchema", "true") \
                .mode("overwrite") \
                .partitionBy("upload_date") \
                .save(s3_output_path)
        
        print(f"Uploaded data to gold {s3_output_path} successfully")    
    except Exception as e:
        print(f"Error saving to gold: {str(e)}")
        raise
    
if __name__ == "__main__":
    s3_input_path = "s3a://newsifyteam12/silver_data/blogs_list"
    s3_output_path = "s3a://newsifyteam12/gold_data/blogs_list"

    spark = create_spark_session()
    
    process_date = datetime.now(pytz.timezone("Asia/Ho_Chi_Minh")).date()
    start_hour, end_hour = get_time_slot()
    
    silver_df = read_data_silver(spark, s3_input_path, process_date, start_hour, end_hour)
    
    save_to_gold(spark, silver_df, s3_output_path)
    
    spark.stop()
    
    
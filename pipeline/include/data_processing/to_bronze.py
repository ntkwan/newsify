from pyspark.sql import SparkSession, DataFrame
from dotenv import load_dotenv
import os
import re
from delta.tables import DeltaTable
from pyspark.sql.types import *
from pyspark.sql.functions import (regexp_replace, col, lower, to_timestamp, unix_timestamp, date_format, 
trim, broadcast, from_utc_timestamp, hour, minute, dayofmonth, month, year, lit, current_timestamp, when, current_date, to_json, struct)
from datetime import datetime, date
import argparse

def create_spark_session():
    load_dotenv()

    spark = SparkSession.builder \
    .appName("RawToBronze") \
    .config("spark.master", "spark://spark-master:7077") \
    .config("spark.jars", "/opt/spark/jars/*") \
    .config("spark.eventLog.enabled", "false") \
    .config("spark.hadoop.fs.s3a.impl", "org.apache.hadoop.fs.s3a.S3AFileSystem") \
    .config("spark.hadoop.fs.s3a.path.style.access", "true") \
    .config("spark.sql.extensions", "io.delta.sql.DeltaSparkSessionExtension") \
    .config("spark.sql.catalog.spark_catalog", "org.apache.spark.sql.delta.catalog.DeltaCatalog") \
    .config("spark.hadoop.fs.s3a.access.key", os.getenv("AWS_ACCESS_KEY_ID")) \
    .config("spark.hadoop.fs.s3a.secret.key", os.getenv("AWS_SECRET_ACCESS_KEY")) \
    .config("spark.hadoop.fs.s3a.endpoint", "s3.amazonaws.com") \
    .config("spark.hadoop.io.nativeio.enabled", "false") \
    .getOrCreate()
    return spark

schema_json = {
    "type": "struct",
    "fields": [
        {"name": "url", "type": "string", "nullable": False, "metadata": {}},
        {"name": "src", "type": "string", "nullable": False, "metadata": {}},
        {"name": "title", "type": "string", "nullable": True, "metadata": {}},
        {"name": "language", "type": "string", "nullable": True, "metadata": {}},
        {"name": "content", "type": "string", "nullable": True, "metadata": {}},
        {"name": "image_url", "type": "string", "nullable": True, "metadata": {}},
        {"name": "publish_date", "type": "string", "nullable": True, "metadata": {}},
        {"name": "time", "type": "string", "nullable": True, "metadata": {}},
        {"name": "timezone", "type": "string", "nullable": True, "metadata": {}},
        {"name": "hour", "type": "integer", "nullable": True, "metadata": {}},
        {"name": "minute", "type": "integer", "nullable": True, "metadata": {}},
        {"name": "day", "type": "integer", "nullable": True, "metadata": {}},
        {"name": "month", "type": "string", "nullable": True, "metadata": {}},
        {"name": "month_number", "type": "integer", "nullable": True, "metadata": {}},
        {"name": "year", "type": "integer", "nullable": True, "metadata": {}},
        {"name": "weekday", "type": "string", "nullable": True, "metadata": {}},
        {"name": "time_reading", "type": "string", "nullable": True, "metadata": {}},
        {"name": "author", "type": "string", "nullable": True, "metadata": {}},
        {"name": "categories", "type": {"type": "array", "elementType": "string", "containsNull": True}, "nullable": True, "metadata": {}}
    ]
}

default_schema = StructType.fromJson(schema_json) \
    .add(StructField(
        '_corrupt',
        StringType(),
        True,
        metadata={'comment': 'invalid rows go into _corrupt'}
    ))

def define_schema():
    return default_schema

def get_delta_schema(spark: SparkSession, s3_output_path: str):
    try:
        if DeltaTable.isDeltaTable(spark, s3_output_path):
            delta_table = DeltaTable.forPath(spark, s3_output_path)
            return delta_table.toDF().schema
        else:
            return default_schema
    except Exception as e:
        print(f"Error getting Delta schema: {str(e)}")
        return default_schema

def read_json(spark: SparkSession, s3_input_path: str, schema: StructType):
    try:
        return spark.read \
            .option("multiline", "true") \
            .option("mode", "PERMISSIVE") \
            .option("columnNameOfCorruptRecord", "_corrupt") \
            .option("inferSchema", "false") \
            .schema(schema) \
            .json(s3_input_path)
    except Exception as e:
        print(f"Error reading JSON files: {str(e)}")
        raise

def save_to_bronze(df, s3_output_path: str):
    try:
        if "day" in df.columns:
            df = df.withColumn("day", col("day").cast("integer"))
        df = df.withColumn("ingest_time", current_timestamp()) \
            .withColumn("ingest_date", date_format(col("ingest_time"), "yyyy-MM-dd")) \
            .withColumn("ingest_hour", date_format(col("ingest_time"), "HH"))
            
        df.write.format("delta") \
            .option("maxRecordsPerFile", 5000) \
            .mode("append") \
            .partitionBy("ingest_date", "ingest_hour") \
            .option("mergeSchema", "true") \
            .save(s3_output_path)
        print(f"Successfully saved data to bronze layer: {s3_output_path}")
        
        df = df.cache()
        error_df = df.filter(col("_corrupt").isNotNull())
        if error_df.count() > 0:
            error_df.write.format("delta") \
                .mode("append") \
                .save(f"{s3_output_path}_errors")
            print(f"Saved {error_df.count()} corrupt records to {s3_output_path}_errors")
        df.unpersist()
    except Exception as e:
        print(f"Error saving DataFrame to bronze layer: {str(e)}")
        print("Dataframe schema:")
        df.printSchema()
        print("Sample data:")
        df.show(truncate=False)
        raise

def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument('--date', type=str, help='Date in YYYY-MM-DD format. Defaults to today.')
    args = parser.parse_args()
    return args

if __name__ == "__main__":
    args = parse_args()
    # Lấy ngày từ tham số hoặc mặc định là hôm nay
    process_date = args.date or date.today().strftime('%Y-%m-%d')
    print(f"Processing raw data for date: {process_date}")

    s3_input_path = f"s3a://newsifyteam12/raw_data/{process_date}/*.json"
    s3_output_path = "s3a://newsifyteam12/bronze_data/blogs_list"
    
    spark = create_spark_session()
    known_schema = get_delta_schema(spark, s3_output_path)
    df = read_json(spark, s3_input_path, known_schema)
    save_to_bronze(df, s3_output_path)
    print("Data saved to bronze layer successfully.")
    
    spark.stop()

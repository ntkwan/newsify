from pyspark.sql import SparkSession, DataFrame
from dotenv import load_dotenv
import os
import re
from delta.tables import DeltaTable
from pyspark.sql.types import *
from pyspark.sql.window import Window
from pyspark.sql.functions import (coalesce, row_number, udf, expr, regexp_replace, col, lower, to_timestamp, unix_timestamp, date_format, 
trim, broadcast, from_utc_timestamp, hour, minute, dayofmonth, month, year, lit, current_timestamp, when, current_date, to_json, struct)
from dateutil import parser

def create_spark_session():
    load_dotenv()

    spark = SparkSession.builder \
    .appName("BronzeToSilver") \
    .master("local[*]") \
    .config("spark.hadoop.fs.s3a.impl", "org.apache.hadoop.fs.s3a.S3AFileSystem") \
    .config("spark.sql.extensions", "io.delta.sql.DeltaSparkSessionExtension") \
    .config("spark.sql.catalog.spark_catalog", "org.apache.spark.sql.delta.catalog.DeltaCatalog") \
    .config("spark.hadoop.fs.s3a.access.key", os.getenv("AWS_ACCESS_KEY_ID")) \
    .config("spark.hadoop.fs.s3a.secret.key", os.getenv("AWS_SECRET_ACCESS_KEY")) \
    .config("spark.hadoop.fs.s3a.endpoint", "s3.amazonaws.com") \
    .config("spark.sql.legacy.timeParserPolicy", "LEGACY") \
    .getOrCreate()
    spark.catalog.clearCache()
    return spark

def define_schema():
    return StructType([
        StructField("url", StringType(), False),
        StructField("src", StringType(), False),
        StructField("language", StringType(), True),
        StructField("title", StringType(), True),
        StructField("content", StringType(), True),
        StructField("image_url", StringType(), True),
        StructField("publish_date", StringType(), True),
        StructField("time", StringType(), True),
        StructField("timezone", StringType(), True),
        StructField("hour", IntegerType(), True),
        StructField("minute", IntegerType(), True),
        StructField("day", IntegerType(), True),
        StructField("month", StringType(), True),
        StructField("month_number", IntegerType(), True),
        StructField("year", IntegerType(), True),
        StructField("weekday", StringType(), True),
        StructField("time_reading", StringType(), True),
        StructField("author", StringType(), True), 
        StructField("categories", ArrayType(StringType()), nullable=True),
        StructField("_corrupt", StringType(), True),
        StructField("ingest_time", TimestampType(), True),
        StructField("processed_date", TimestampType(), True),
        StructField("main_category", StringType(), True),
        StructField("trend", StringType(), True),
        StructField("score", String)
    ])

def read_data_bronze(spark, s3_input_path) -> DataFrame:
    try:
        if DeltaTable.isDeltaTable(spark, s3_input_path):
            delta_table = DeltaTable.forPath(spark, s3_input_path)
            df = delta_table.toDF()
            print("Loaded data from Delta table with schema:")
            df.printSchema()
            expected_schema = define_schema()
            delta_schema = df.schema
            if delta_schema != expected_schema:
                print("Warning: Delta table schema does not match expected schema!")
                print("Expected schema:")
                spark.createDataFrame([], expected_schema).printSchema()
            return df
        else:
            schema = define_schema()
            print("No Delta table found, using default schema from define_schema:")
            spark.createDataFrame([], schema).printSchema()
            return spark.read.schema(schema).parquet(s3_input_path)
    except Exception as e:
        print(f"Error reading data from bronze: {str(e)}")
        raise       

if __name__ == "__main__":
    s3_input_path = "s3a://newsifyteam12/silver_data/blogs_list"
    s3_output_path = "s3a://newsifyteam12/gold_data/blogs_list"

    spark = create_spark_session()
    
    
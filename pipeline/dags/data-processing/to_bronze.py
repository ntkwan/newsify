from dotenv import load_dotenv
from pyspark.sql import SparkSession
from pyspark.sql.functions import current_timestamp
import os
import re
from delta import configure_spark_with_delta_pip
import findspark
findspark.init()

def create_spark_session():
    load_dotenv()

    spark = SparkSession.builder \
    .appName("ToBronze") \
    .master("local[*]") \
    .config("spark.hadoop.fs.s3a.impl", "org.apache.hadoop.fs.s3a.S3AFileSystem") \
    .config("spark.sql.extensions", "io.delta.sql.DeltaSparkSessionExtension") \
    .config("spark.sql.catalog.spark_catalog", "org.apache.spark.sql.delta.catalog.DeltaCatalog") \
    .config("spark.hadoop.fs.s3a.access.key", os.getenv("AWS_ACCESS_KEY_ID")) \
    .config("spark.hadoop.fs.s3a.secret.key", os.getenv("AWS_SECRET_ACCESS_KEY")) \
    .config("spark.hadoop.fs.s3a.endpoint", "s3.amazonaws.com") \
    .config("spark.hadoop.io.nativeio.enabled", "false") \
    .getOrCreate()
    return spark

def read_json(spark, s3_input_path):
    try:
        return spark.read \
            .option("multiline", "true") \
            .option("mode", "PERMISSIVE") \
            .json(s3_input_path)
    except Exception as e:
        print(f"Error reading JSON files: {str(e)}")
        raise

def save_to_bronze(df, s3_output_path):
    try:
        df.write.format("delta") \
            .mode("append") \
            .save(s3_output_path)
    except Exception as e:
        print(f"Error saving DataFrame to bronze layer: {str(e)}")
        raise

if __name__ == "__main__":
    s3_input_path = "s3a://newsifyteam12/raw_data/*/*.json"
    s3_output_path = "s3a://newsifyteam12/bronze/cnn_delta/"
    
    spark = create_spark_session()
    df = read_json(spark, s3_input_path)
    df = df.withColumn("ingest_time", current_timestamp())
    save_to_bronze(df, s3_output_path)
    print("Data saved to bronze layer successfully.")
    
    spark.stop()
    
    
    
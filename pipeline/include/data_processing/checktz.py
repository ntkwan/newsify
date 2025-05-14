from pyspark.sql import SparkSession
from pyspark.sql import SparkSession
from dotenv import load_dotenv
import os
load_dotenv()

spark = SparkSession.builder \
    .appName("RawToBronze") \
    .master("local[*]") \
    .config("spark.driver.memory", "4g") \
    .config("spark.hadoop.fs.s3a.impl", "org.apache.hadoop.fs.s3a.S3AFileSystem") \
    .config("spark.sql.extensions", "io.delta.sql.DeltaSparkSessionExtension") \
    .config("spark.sql.catalog.spark_catalog", "org.apache.spark.sql.delta.catalog.DeltaCatalog") \
    .config("spark.hadoop.fs.s3a.access.key", os.getenv("AWS_ACCESS_KEY_ID")) \
    .config("spark.hadoop.fs.s3a.secret.key", os.getenv("AWS_SECRET_ACCESS_KEY")) \
    .config("spark.hadoop.fs.s3a.endpoint", "s3.amazonaws.com") \
    .config("spark.hadoop.io.nativeio.enabled", "false") \
    .getOrCreate()

print(spark.conf.get("spark.sql.session.timeZone"))

spark.stop()
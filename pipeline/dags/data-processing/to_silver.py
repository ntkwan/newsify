from pyspark.sql import SparkSession, DataFrame
from dotenv import load_dotenv
import os
import re
from delta.tables import DeltaTable
from pyspark.sql.types import *
from pyspark.sql.functions import (expr, regexp_replace, col, lower, to_timestamp, unix_timestamp, date_format, 
trim, broadcast, from_utc_timestamp, hour, minute, dayofmonth, month, year, lit, current_timestamp, when, current_date, to_json, struct)
import findspark
findspark.init()

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
        StructField("_corrupt", StringType(), True),
        StructField("ingest_time", TimestampType(), True)
    ])

# def read_data_silver(spark, s3_input_path, schema):
#     try:
#         if DeltaTable.isDeltaTable(spark, s3_input_path):
#             delta_table = DeltaTable.forPath(spark, s3_input_path)
#             return delta_table.toDF()
#         else:
#             schema = define_schema()
#             return spark.read.schema(schema).parquet(s3_input_path)
#     except Exception as e:
#         print(f"Error reading data from bronze: {str(e)}")
#         raise

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
                
def clean_data(news_df: DataFrame) -> DataFrame:
    df = news_df.cache()
    # remove duplicates in the new data
    df = news_df.dropDuplicates(["src", "url"])
     
    df = df \
        .withColumn("title", trim(regexp_replace(col("title"), r"\s+", " "))) \
        .withColumn("content", trim(regexp_replace(col("content"), r"\s+", " "))) \
        .withColumn("title", regexp_replace(col("title"), '[\\"\']', '')) \
        .withColumn("content", regexp_replace(col("content"), '[\\"\']', ''))
    
    # Lọc bản ghi hợp lệ
    valid_df = df.filter(
        (col("url").isNotNull()) &
        (col("src").isNotNull()) &
        (col("title").isNotNull()) & 
        (trim(col("title")) != "") & 
        (lower(trim(col("title"))) != "no title") &
        (col("content").isNotNull()) & 
        (trim(col("content")) != "") &
        (lower(trim(col("content"))) != "no content") &
        (col("day").isNull() | col("day").cast("integer").isNotNull())
    )
    
    error_df = df.filter(~(
        (col("url").isNotNull()) &
        (col("src").isNotNull()) &
        (col("title").isNotNull()) & 
        (trim(col("title")) != "") & 
        (lower(trim(col("title"))) != "no title") &
        (col("content").isNotNull()) & 
        (trim(col("content")) != "") &
        (lower(trim(col("content"))) != "no content") &
        (col("day").isNull() | col("day").cast("integer").isNotNull())
    ))
    
    df.unpersist()
    
    return valid_df, error_df                 

def process_publish_date(df: DataFrame) -> DataFrame:
    df.withColumn(
        "publish_date", 
        when(col("publish_date") == "No publish date", None)
        .otherwise(col("publish_date"))
    )
    
    df = df.withColumn(
        "cleaned_publish_date",
        when(col("publish_date").isNotNull(),
            trim(regexp_replace(
                regexp_replace(col("publish_date"), r"(?i)(Updated|Published)\s*", ""),
                r"\s+", " "
            ))
        )
    )
    
    # h:mm a z, EEE MMMM d, yyyy
    df = df.withColumn(
        "timestamp_1",
        when(col("cleaned_publish_date").isNotNull(),
            to_timestamp(col("cleaned_publish_date"), "h:mm a z, EEE MMMM d, yyyy")
        )
    )    
    
     # h:mm a z, MMMM d, yyyy
    df = df.withColumn(
        "timestamp_2",
        
        when(col("timestamp_1").isNull() & col("cleaned_publish_date").isNotNull(),
            to_timestamp(col("cleaned_publish_date"), "h:mm a z, MMMM d, yyyy"))
        .otherwise(col("timestamp_1"))
    )
    
    # MMMM d, yyyy h:mm a z
    df = df.withColumn(
        "timestamp_3",
        when(col("timestamp_2").isNull() & col("cleaned_publish_date").isNotNull(),
            to_timestamp(col("cleaned_publish_date"), "MMMM d, yyyy h:mm a z"))
        .otherwise(col("timestamp_2"))
    )

     # ISO - yyyy-MM-dd'T'HH:mm:ss.SSS'Z
    df = df.withColumn(
        "timestamp_4",
        when(col("timestamp_3").isNull() & col("cleaned_publish_date").isNotNull(),
            to_timestamp(col("cleaned_publish_date"), "yyyy-MM-dd'T'HH:mm:ss.SSS'Z"))
        .otherwise(col("timestamp_2"))
    )
    
    # yyyy-MM-dd HH:mm:ss
    df = df.withColumn(
        "timestamp_5",
        when(col("timestamp_4").isNull() & col("cleaned_publish_date").isNotNull(),
            to_timestamp(col("cleaned_publish_date"), "yyyy-MM-dd HH:mm:ss"))
        .otherwise(col("timestamp_4"))
    )
    
    df = df \
        .withColumn("publish_date", col("timestamp_5")) \
        .withColumn("time", when(col("publish_date").isNotNull(), date_format(col("publish_date"), "HH:mm"))) \
        .withColumn("timezone", lit("Asia/Ho_Chi_Minh")) \
        .withColumn("hour", when(col("publish_date").isNotNull(), hour(col("publish_date")))) \
        .withColumn("minute", when(col("publish_date").isNotNull(), minute(col("publish_date")))) \
        .withColumn("day", when(col("publish_date").isNotNull(), dayofmonth(col("publish_date")))) \
        .withColumn("month", when(col("publish_date").isNotNull(), date_format(col("publish_date"), "MMMM"))) \
        .withColumn("month_number", when(col("publish_date").isNotNull(), month(col("publish_date")))) \
        .withColumn("year", when(col("publish_date").isNotNull(), year(col("publish_date")))) \
        .withColumn("weekday", when(col("publish_date").isNotNull(), date_format(col("publish_date"), "EEEE"))) \
        .drop("cleaned_publish_date","timestamp_1", "timestamp_2", "timestamp_3", "timestamp_4", "timestamp_5")
    
    return df

# Case: articles are from the same src
def deduplicate_news(spark, cleaned_news_df, s3_output_path):
    cleaned_news_df.createOrReplaceTempView("news_blogs_temp")
    
    try:
        silver_df  = spark.read.format("delta").load(s3_output_path)
        silver_df.select("src", "url").createOrReplaceTempView("blogs_list")
    except Exception as e:
        print(f"No existing silver data found or error: {str(e)}")
        empty_df = spark.createDataFrame([], StructType([
            StructField("src", StringType(), False),
            StructField("url", StringType(), False)
        ]))
        empty_df.createOrReplaceTempView("blogs_list")
    
    result_df = spark.sql("""
        SELECT n.*
        FROM news_blogs_temp n
        LEFT JOIN blogs_list b 
        ON n.src = b.src AND n.url = b.url
        WHERE b.url IS NULL
    """)
    
    return result_df

def save_to_silver(df, s3_output_path):
    processed_date = current_date()
    df = df.withColumn("processed_date", processed_date) 
    
    try: 
        valid_df, error_df = clean_data(df)
        print(f"After cleaning: {valid_df.count()} valid records, {error_df.count()} error records")
        
        if not error_df.isEmpty():
            error_df.write.format("delta") \
                .option("mergeSchema", "true") \
                .mode("append") \
                .save(f"{s3_output_path}_errors")
            print(f"Saved {error_df.count()} corrupt records to {s3_output_path}_errors")
        
        valid_df = process_publish_date(valid_df)
        
        result_df = deduplicate_news(spark, valid_df, s3_output_path)
        print(f"New unique records: {result_df.count()}")
        
        if DeltaTable.isDeltaTable(spark, s3_output_path): 
            delta_table = DeltaTable.forPath(spark, s3_output_path)
            delta_table.alias("silver").merge(
                df.alias("new_data"),
                "silver.src = new_data.src AND silver.url = new_data.url"
                ) \
                .whenMatchedUpdateAll() \
                .whenNotMatchedInsertAll() \
                .execute()
            print(f"Successfully merged data into silver layer: {s3_output_path}")
        else:
            df.write.format("delta") \
            .option("mergeSchema", "true") \
            .mode("append") \
            .partitionBy("processed_date") \
            .save(s3_output_path)
            print(f"Successfully saved data to silver layer: {s3_output_path}")
    except Exception as e:
        print(f"Error saving data to silver layer: {str(e)}")
        raise
        
if __name__ == "__main__":
    s3_input_path = "s3a://newsifyteam12/bronze_data/*/*.parquet"
    s3_output_path = "s3a://newsifyteam12/silver_data/blogs_list"
    # s3_gold_path = "s3a://newsifyteam12/gold_data/blogs_list"
    
    spark = create_spark_session()
    
    # schema = define_schema()
    
    news_df = read_data_bronze(spark, s3_input_path)
    print(f"Raw data loaded: {news_df.count()} records")
    
    # valid_df, error_df = clean_data(df)
    # print(f"After cleaning: {valid_df.count()} records")
    
    # processed_date_df = process_publish_date(cleaned_news_df)
    
    # result_df = deduplicate_news(spark, processed_date_df, s3_output_path)
    # print(f"New unique records: {result_df.count()}")
    
    save_to_silver(news_df, s3_output_path)
    
    spark.stop()
    
    
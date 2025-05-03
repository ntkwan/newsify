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
import pytz
from rapidfuzz import fuzz
# import findspark
# findspark.init()

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
        StructField("main_category", StringType(), True)
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

def parse_to_utc(publish_date_str):
    try:
        dt = parser.parse(publish_date_str)
        return dt.astimezone(pytz.utc)
    except:
        return None
    
def parse_to_utc(publish_date_str):
    if not publish_date_str:
        return None
    try:
        tzinfos = {
            "ET": pytz.timezone("America/New_York"),
            "EST": pytz.FixedOffset(-5 * 60),
            "EDT": pytz.FixedOffset(-4 * 60),
            "CST": pytz.FixedOffset(-6 * 60),
            "CDT": pytz.FixedOffset(-5 * 60),
            "MST": pytz.FixedOffset(-7 * 60),
            "MDT": pytz.FixedOffset(-6 * 60),
            "PST": pytz.FixedOffset(-8 * 60),
            "PDT": pytz.FixedOffset(-7 * 60),
            "UTC": pytz.UTC
        }
        dt = parser.parse(publish_date_str, fuzzy=True, tzinfos=tzinfos)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=pytz.UTC)
        return dt.astimezone(pytz.UTC)
    except:
        return None

parse_to_utc_udf = udf(parse_to_utc, TimestampType())

def process_publish_date(df: DataFrame) -> DataFrame:
    # Clean publish_date by removing "Updated" or "Published" and extra spaces
    df = df.withColumn(
        "publish_date",
        when(col("publish_date") == "No publish date", None)
        .otherwise(col("publish_date"))
    )
    
    df = df.withColumn(
        "cleaned_publish_date",
        when(col("publish_date").isNotNull(),
            trim(regexp_replace(
                regexp_replace(col("publish_date"), r"(?i)^\s*(Updated|Published)\s+", ""),
                r"\s+", " "
            ))
        )
    )
    
    # Log sample data before parsing
    print("Sample publish_date and cleaned_publish_date:")
    df.select("publish_date", "cleaned_publish_date").show(5, truncate=False)
    
    # Define common date formats
    date_formats = [
        "h:mm a z, EEE MMMM dd, yyyy",  # e.g., 7:03 AM EST, Thu January 16, 2025
        "yyyy-MM-dd HH:mm:ss",
        "yyyy-MM-dd'T'HH:mm:ssXXX",
        "EEE, dd MMM yyyy HH:mm:ss Z",
        "dd MMM yyyy HH:mm",
        "yyyy-MM-dd",
        "MMM dd, yyyy HH:mm",
        "dd/MM/yyyy HH:mm",
        "yyyy/MM/dd HH:mm"
    ]
    
    # Try parsing with multiple formats
    df = df.withColumn(
        "publish_date_utc",
        when(col("cleaned_publish_date").isNotNull(),
             coalesce(*[
                 to_timestamp(col("cleaned_publish_date"), fmt)
                 for fmt in date_formats
             ])
        )
    )
    
    # Fallback to dateutil.parser for non-standard formats
    df = df.withColumn(
        "publish_date_utc",
        when(col("publish_date_utc").isNull() & col("cleaned_publish_date").isNotNull(),
             parse_to_utc_udf(col("cleaned_publish_date"))
        ).otherwise(col("publish_date_utc"))
    )
    
    # Ensure UTC timezone (UTC±00:00)
    df = df.withColumn(
        "publish_date_utc",
        when(col("publish_date_utc").isNotNull(),
             from_utc_timestamp(col("publish_date_utc"), "UTC"))
    )
    
    # Log sample data after parsing
    print("Sample cleaned_publish_date and publish_date_utc:")
    df.select("cleaned_publish_date", "publish_date_utc").show(5, truncate=False)
    
    # Extract time components
    df = df \
        .withColumn("time", when(col("publish_date_utc").isNotNull(), date_format(col("publish_date_utc"), "HH:mm"))) \
        .withColumn("timezone", lit("UTC")) \
        .withColumn("hour", when(col("publish_date_utc").isNotNull(), hour(col("publish_date_utc")))) \
        .withColumn("minute", when(col("publish_date_utc").isNotNull(), minute(col("publish_date_utc")))) \
        .withColumn("day", when(col("publish_date_utc").isNotNull(), dayofmonth(col("publish_date_utc")))) \
        .withColumn("month", when(col("publish_date_utc").isNotNull(), date_format(col("publish_date_utc"), "MMMM"))) \
        .withColumn("month_number", when(col("publish_date_utc").isNotNull(), month(col("publish_date_utc")))) \
        .withColumn("year", when(col("publish_date_utc").isNotNull(), year(col("publish_date_utc")))) \
        .withColumn("weekday", when(col("publish_date_utc").isNotNull(), date_format(col("publish_date_utc"), "EEEE")))
        
    return df

def fuzzy_match_categories(cat_list, category_map, threshold=70):
    if not cat_list:
        return "Other"

    best_match = None
    max_score = 0

    for raw_cat in cat_list:
        if not raw_cat:
            continue
        for unified_cat, keywords in category_map.items():
            for keyword in keywords:
                score = fuzz.partial_ratio(raw_cat.lower(), keyword.lower())
                if score > max_score:
                    max_score = score
                    best_match = unified_cat

    return best_match if max_score >= threshold else "Other"

def clean_data(news_df: DataFrame, category_map) -> DataFrame:
    df = news_df.cache()
    # Remove duplicates in the new data
    df = df.dropDuplicates(["src", "url"])
    
    # Clean title and content
    df = df \
        .withColumn("title", trim(regexp_replace(col("title"), r"\s+", " "))) \
        .withColumn("content", trim(regexp_replace(col("content"), r"\s+", " "))) \
        .withColumn("title", regexp_replace(col("title"), '[\\"\']', '')) \
        .withColumn("content", regexp_replace(col("content"), '[\\"\']', ''))
    
    # Filter valid records (must have title and content)
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
    
    # Collect error records (including those missing title or content)
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
    
    # Log sample invalid records for debugging
    print("Sample invalid records (error_df):")
    error_df.select("url", "src", "title", "content").show(5, truncate=False)
    
    # Apply fuzzy matching for categories on valid records
    fuzzy_array_udf = udf(lambda x: fuzzy_match_categories(x, category_map), StringType())
    valid_df = valid_df.withColumn("main_category", fuzzy_array_udf(col("categories")))
    
    df.unpersist()
    
    return valid_df, error_df

def deduplicate_news(spark, cleaned_news_df, s3_output_path):
    cleaned_news_df.createOrReplaceTempView("news_blogs_temp")
    
    try:
        silver_df = spark.read.format("delta").load(s3_output_path)
        # Validate existing silver data
        silver_df = silver_df.filter(
            (col("url").isNotNull()) &
            (col("src").isNotNull()) &
            (col("title").isNotNull()) & 
            (trim(col("title")) != "") & 
            (lower(trim(col("title"))) != "no title") &
            (col("content").isNotNull()) & 
            (trim(col("content")) != "") &
            (lower(trim(col("content"))) != "no content")
        )
        silver_df.select("src", "url").createOrReplaceTempView("blogs_list")
        print(f"Existing silver data after validation: {silver_df.count()} records")
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
    
    window_spec = Window.partitionBy("src", "url").orderBy(col("publish_date").desc())
    deduped_df = result_df.withColumn("row_number", row_number().over(window_spec)) \
                        .filter("row_number = 1") \
                        .drop("row_number")
    
    # Final validation before returning
    deduped_df = deduped_df.filter(
        (col("url").isNotNull()) &
        (col("src").isNotNull()) &
        (col("title").isNotNull()) & 
        (trim(col("title")) != "") & 
        (lower(trim(col("title"))) != "no title") &
        (col("content").isNotNull()) & 
        (trim(col("content")) != "") &
        (lower(trim(col("content"))) != "no content")
    )
    
    return deduped_df

def save_to_silver(df, s3_output_path, category_map):
    processed_date = current_date()
    df = df.withColumn("processed_date", processed_date) 
    
    try:
        valid_df, error_df = clean_data(df, category_map)
        print(f"After cleaning: {valid_df.count()} valid records, {error_df.count()} error records")
        
        # Process publish_date and handle unparseable dates
        valid_df = process_publish_date(valid_df)
        unparseable_df = valid_df.filter(col("publish_date_utc").isNull() & col("cleaned_publish_date").isNotNull())
        # Align unparseable_df schema with error_df
        error_schema_columns = error_df.columns
        unparseable_df = unparseable_df.select(error_schema_columns)
        valid_df = valid_df.filter(~(col("publish_date_utc").isNull() & col("cleaned_publish_date").isNotNull()))
        error_df = error_df.union(unparseable_df)
        
        if not error_df.isEmpty():
            error_df.write.format("delta") \
                .option("mergeSchema", "true") \
                .mode("append") \
                .save(f"{s3_output_path}_errors")
            print(f"Saved {error_df.count()} corrupt records to {s3_output_path}_errors")
        
        result_df = deduplicate_news(spark, valid_df, s3_output_path)
        print(f"New unique records after deduplication: {result_df.count()}")
        
        # Final validation before saving
        result_df = result_df.filter(
            (col("url").isNotNull()) &
            (col("src").isNotNull()) &
            (col("title").isNotNull()) & 
            (trim(col("title")) != "") & 
            (lower(trim(col("title"))) != "no title") &
            (col("content").isNotNull()) & 
            (trim(col("content")) != "") &
            (lower(trim(col("content"))) != "no content")
        )
        print(f"Final valid records before saving: {result_df.count()}")
        
        # Select only schema-defined columns to avoid extra columns
        schema_columns = [f.name for f in define_schema()]
        result_df = result_df.select(schema_columns)
        
        if DeltaTable.isDeltaTable(spark, s3_output_path):
            delta_table = DeltaTable.forPath(spark, s3_output_path)
            delta_table.alias("silver").merge(
                result_df.alias("new_data"),
                "silver.src = new_data.src AND silver.url = new_data.url"
            ) \
            .whenMatchedUpdateAll() \
            .whenNotMatchedInsertAll() \
            .execute()
            print(f"Successfully merged data into silver layer: {s3_output_path}")
        else:
            result_df.write.format("delta") \
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

    spark = create_spark_session()
    
    news_df = read_data_bronze(spark, s3_input_path)
    print(f"Raw data loaded: {news_df.count()} records")
    
    category_map = {
        "Sports": ["sports", "football", "nba", "tennis", "soccer", "cricket", "olympics"],
        "Technology": ["tech", "technology", "gadgets", "ai", "software", "hardware", "computing"],
        "Health": ["health", "wellness", "fitness", "medicine", "mental health", "nutrition"],
        "Business and Finance": ["business", "economy", "markets", "finance", "stocks", "investing"],
        "Entertainment": ["entertainment", "movies", "tv", "music", "celebrities", "hollywood"],
        "Politics": ["politics", "election", "government", "policy", "diplomacy"],
        "Science": ["science", "space", "research", "physics", "biology", "nasa"],
        "Climate": ["climate", "environment", "global warming", "carbon", "sustainability"],
        "Food and Drink": ["food", "drink", "cooking", "recipes", "restaurants", "beverage"],
        "Travel and Transportation": ["travel", "transportation", "flights", "hotels", "tourism"],
        "Beauty and Fashion": ["fashion", "style", "beauty", "makeup", "clothing"],
        "Autos and Vehicles": ["cars", "autos", "vehicles", "automobile", "motorcycles"],
        "Games": ["games", "gaming", "video games", "e-sports"],
        "Hobbies and Leisure": ["hobbies", "leisure", "crafts", "diy", "collections"],
        "Jobs and Education": ["jobs", "career", "education", "school", "university"],
        "Law and Government": ["law", "justice", "regulation", "court", "legal", "government"],
        "Pets and Animals": ["pets", "animals", "wildlife", "cats", "dogs"],
        "Shopping": ["shopping", "ecommerce", "retail", "deals", "sales"],
        "Other": []  
    }
    
    save_to_silver(news_df, s3_output_path, category_map)
    
    spark.stop()
    
    
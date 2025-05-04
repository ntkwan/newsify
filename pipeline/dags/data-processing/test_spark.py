from to_bronze import create_spark_session
import os

if __name__ == "__main__":
    spark = create_spark_session()
    
    print("Spark version:", spark.version)
    print("Hadoop AWS impl:", spark.conf.get("spark.hadoop.fs.s3a.impl"))
    
    try:
        spark.read.text("s3a://newsifyteam12/raw_data/*/*.json").show(1)
        print("S3 read OK")
    except Exception as e:
        print("S3 read error:", e) 

    spark.stop()
    print("Test SparkSession successfully.")
from airflow import DAG
from airflow.operators.python import PythonOperator
from airflow.operators.bash import BashOperator
from airflow.utils.dates import days_ago
from datetime import timedelta
import pendulum
from airflow.providers.apache.spark.operators.spark_submit import SparkSubmitOperator

local_tz = pendulum.timezone("Asia/Ho_Chi_Minh")

default_args = {
    'owner': 'thuyduong',
    'start_date': days_ago(1),
    'email': ['thuyduongne2312@gmail.com'],
    'email_on_failure': True,
    'email_on_retry': False,
    'retries': 3,
    'retry_delay': timedelta(minutes=2)
}

dag = DAG(
    'news_scraping',
    default_args=default_args,
    description='DAG for scraping rss feeds',
    # schedule_interval='0 * * * *', # every hour,
    schedule_interval='0 0,5,11,17 * * *', # 4 times/day: 00:00, 05:00, 11:00, 17:00
    catchup=False,
    tags=['scraping', 'rss']
)

run_crawling_task = BashOperator(
    task_id='run_crawling_task',
    bash_command='python /opt/airflow/dags/data_crawling/rss_crawl.py',
    dag=dag
)

run_upload_to_bronze = SparkSubmitOperator(
    task_id='run_upload_to_bronze',
    application='/opt/airflow/dags/data_processing/to_bronze.py',
    conn_id='spark_default',
    dag=dag
)

run_upload_to_silver = SparkSubmitOperator(
    task_id='run_upload_to_silver',
    application='/opt/airflow/dags/data_processing/to_silver.py',
    conn_id='spark_default',
    dag=dag
)

run_upload_to_db = SparkSubmitOperator(
    task_id='run_upload_to_db',
    application='/opt/airflow/dags/data_processing/silver_to_db.py',
    conn_id='spark_default',
    dag=dag
)

run_upload_to_gold = SparkSubmitOperator(
    task_id='run_upload_to_gold',
    application='/opt/airflow/dags/data_processing/silver_to_gold.py',
    conn_id='spark_default',
    dag=dag
)

# Set task dependencies 
run_crawling_task >> run_upload_to_bronze >> run_upload_to_silver >> [run_upload_to_db, run_upload_to_gold]
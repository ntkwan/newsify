from airflow import DAG
from airflow.operators.python import PythonOperator
from airflow.operators.bash import BashOperator
from airflow.utils.dates import days_ago
from datetime import timedelta
from pendulum import timezone

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
    'cnn_scraping',
    default_args=default_args,
    description='DAG for scraping cnn website',
    schedule_interval='0 0,5,11,17 * * *', # Chạy 4 lần/ngày: 00:00, 05:00, 11:00, 17:00
   # schedule_interval='0 */6 * * *',  # Chạy 4 lần/ngày: 00:00, 06:00, 12:00, 18:00
#    dag_timezone=timezone("Asia/Ho_Chi_Minh"),
)

run_crawling_task = BashOperator(
    task_id='run_crawling_task',
    bash_command='cd /opt/airflow/dags/news_scraper && scrapy crawl cnn',
    dag=dag
)

# Set task dependencies 
run_crawling_task 
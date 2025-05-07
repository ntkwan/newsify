from airflow import DAG
from airflow.operators.python import PythonOperator
from airflow.operators.bash import BashOperator
from airflow.utils.dates import days_ago
from datetime import timedelta
import pendulum


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
    schedule_interval='0 * * * *', # Mỗi giờ,
    # schedule_interval='0 0,5,11,17 * * *', # Chạy 4 lần/ngày: 00:00, 05:00, 11:00, 17:00
    catchup=False,
    tags=['scraping', 'rss']

)

run_crawling_task = BashOperator(
    task_id='run_crawling_task',
    bash_command='python /opt/airflow/dags/data_crawling/rss_crawl.py',
    dag=dag
)

# Set task dependencies 
# run_crawling_task 
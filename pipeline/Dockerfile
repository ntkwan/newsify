FROM apache/airflow:2.10.5

COPY requirements.txt /requirements.txt

RUN pip install --no-cache-dir -r /requirements.txt

WORKDIR /opt/airflow

COPY ./dags /opt/airflow/dags
COPY ./plugins /opt/airflow/plugins
COPY ./dags/news_scraper /opt/airflow/news_scraper
COPY .env /opt/airflow/.env  

EXPOSE 8080
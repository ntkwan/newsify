# --- Base Image ---
FROM python:3.12.9-bullseye AS spark-base

# --- Install system dependencies ---
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        sudo \
        curl \
        vim \
        unzip \
        rsync \
        openjdk-11-jdk \
        build-essential \
        software-properties-common \
        ssh && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# --- Environment variables ---
ENV SPARK_VERSION=3.5.5
ENV SPARK_HOME=/opt/spark
ENV HADOOP_HOME=/opt/hadoop
ENV SPARK_MASTER_PORT=7077
ENV SPARK_MASTER_HOST=spark-master
ENV SPARK_MASTER=spark://$SPARK_MASTER_HOST:$SPARK_MASTER_PORT
ENV PYTHONPATH=$SPARK_HOME/python/:$PYTHONPATH
ENV PYSPARK_PYTHON=python3

# --- Create spark & hadoop directories ---
RUN mkdir -p ${SPARK_HOME} ${HADOOP_HOME}
WORKDIR ${SPARK_HOME}

# --- Download Spark ---
RUN curl -L https://dlcdn.apache.org/spark/spark-${SPARK_VERSION}/spark-${SPARK_VERSION}-bin-hadoop3.tgz -o spark-${SPARK_VERSION}-bin-hadoop3.tgz && \
    tar xvzf spark-${SPARK_VERSION}-bin-hadoop3.tgz --directory ${SPARK_HOME} --strip-components 1 && \
    rm spark-${SPARK_VERSION}-bin-hadoop3.tgz

# --- Set permissions ---
RUN chmod u+x /opt/spark/sbin/* && \
    chmod u+x /opt/spark/bin/*

ENV PATH="$PATH:$SPARK_HOME/bin:$SPARK_HOME/sbin"

# --- Install Python requirements if needed ---
COPY requirements.txt .
RUN pip install -r requirements.txt

# --- Install Delta Lake jars ---
RUN curl -L https://repo1.maven.org/maven2/io/delta/delta-core_2.12/3.2.0/delta-core_2.12-3.2.0.jar -o /opt/spark/jars/delta-core_2.12-3.2.0.jar && \
    curl -L https://repo1.maven2/maven2/io/delta/delta-storage/3.2.0/delta-storage-3.2.0.jar -o /opt/spark/jars/delta-storage-3.2.0.jar && \
    curl -L https://repo1.maven2/maven2/io/delta/delta-spark_2.12/3.2.0/delta-spark_2.12-3.2.0.jar -o /opt/spark/jars/delta-spark_2.12-3.2.0.jar

# --- Install Hadoop AWS & AWS SDK for S3 support ---
RUN curl -L https://repo1.maven.org/maven2/org/apache/hadoop/hadoop-aws/3.3.2/hadoop-aws-3.3.2.jar -o /opt/spark/jars/hadoop-aws-3.3.2.jar && \
    curl -L https://repo1.maven.org/maven2/com/amazonaws/aws-java-sdk-bundle/1.12.398/aws-java-sdk-bundle-1.12.398.jar -o /opt/spark/jars/aws-java-sdk-bundle-1.12.398.jar

# --- Spark Configuration ---
COPY conf/spark-defaults.conf "$SPARK_HOME/conf/spark-defaults.conf"

# --- Entrypoint ---
COPY entrypoint.sh .
RUN chmod +x entrypoint.sh

ENTRYPOINT ["./entrypoint.sh"]
CMD ["bash"]

# For windows users
FROM deltaio/delta-docker:latest   

USER root

RUN apt-get update && apt-get install -y \
    openjdk-17-jdk procps\
    wget \
    rsync && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# spark
RUN wget -q https://dlcdn.apache.org/spark/spark-3.5.5/spark-3.5.5-bin-hadoop3.tgz -O /tmp/spark.tgz && \
    tar -xvzf /tmp/spark.tgz -C /opt/ && \
    rm /tmp/spark.tgz && \
    ln -s /opt/spark-3.5.5-bin-hadoop3 /opt/spark

    
# hadoop and aws sdk libs and delta
RUN wget https://repo1.maven.org/maven2/org/apache/hadoop/hadoop-aws/3.3.2/hadoop-aws-3.3.2.jar  -P /opt/spark/jars/ && \
    wget https://repo1.maven.org/maven2/com/amazonaws/aws-java-sdk-bundle/1.12.262/aws-java-sdk-bundle-1.12.262.jar -P /opt/spark/jars/ && \
    wget https://repo1.maven.org/maven2/io/delta/delta-core_2.12/2.4.0/delta-core_2.12-2.4.0.jar  -P /opt/spark/jars/ && \
    wget https://repo1.maven.org/maven2/io/delta/delta-storage/2.4.0/delta-storage-2.4.0.jar  -P /opt/spark/jars/
    
# set environemt variables 
ENV JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
ENV PATH=$JAVA_HOME/bin:$PATH
ENV SPARK_HOME=/opt/spark
ENV PATH=$SPARK_HOME/bin:$JAVA_HOME/bin:$PATH
ENV SPARK_CONF_DIR="$SPARK_HOME/conf"
ENV SPARK_MASTER="spark://spark-master:7077"
ENV SPARK_MASTER_HOST=spark-master
ENV SPARK_MASTER_PORT=7077
ENV PYSPARK_PYTHON=python3
ENV PYTHONPATH=
ENV PYTHONPATH=$SPARK_HOME/python:$PYTHONPATH

COPY requirements.txt /requirements.txt

RUN pip3 install --no-cache-dir -r /requirements.txt

# Download hadoop-aws library
COPY ./conf/spark-defaults.conf "$SPARK_HOME/conf/spark-defaults.conf"
# COPY ./aws-java-sdk-1.12.262.jar "$SPARK_HOME/jars/aws-java-sdk-1.12.262.jar"

# Create and event logging directory to store job logs
RUN mkdir /tmp/spark-events 

RUN chmod u+x /opt/spark/sbin/* && \
    chmod u+x /opt/spark/bin/*
    
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]
FROM quay.io/astronomer/astro-runtime:12.4.0

USER root

# Install OpenJDK-17
RUN apt update && \
    apt-get install -y openjdk-17-jdk procps && \
    apt-get install -y ant && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Set JAVA_HOME
ENV JAVA_HOME /usr/lib/jvm/java-17-openjdk-amd64

# Create Spark jars folder
RUN mkdir -p /opt/spark/jars
WORKDIR /opt/spark/jars

# Download Spark + Delta + S3 compatible JARs for Spark 3.5.5
ADD https://repo1.maven.org/maven2/io/delta/delta-core_2.12/2.4.0/delta-core_2.12-2.4.0.jar .
ADD https://repo1.maven.org/maven2/org/apache/hadoop/hadoop-aws/3.3.6/hadoop-aws-3.3.6.jar .
ADD https://repo1.maven.org/maven2/org/apache/hadoop/hadoop-common/3.3.6/hadoop-common-3.3.6.jar .
ADD https://repo1.maven.org/maven2/com/amazonaws/aws-java-sdk-bundle/1.12.262/aws-java-sdk-bundle-1.12.262.jar .
ADD https://repo1.maven.org/maven2/io/delta/delta-storage/2.4.0/delta-storage-2.4.0.jar .
# Optional: move back to a working dir if needed
WORKDIR /usr/local/airflow

USER astro

# (uncomment if you have requirements to install)
COPY requirements.txt /requirements.txt
RUN pip3 install --no-cache-dir -r /requirements.txt

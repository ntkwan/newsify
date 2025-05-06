# FROM python:3.12.9-bullseye AS spark-base

# RUN apt-get update && \
#     apt-get install -y --no-install-recommends \
#       sudo \
#       curl \
#       vim \
#       unzip \
#       rsync \
#       openjdk-11-jdk \
#       build-essential \
#       software-properties-common \
#       ssh && \
#     apt-get clean && \
#     rm -rf /var/lib/apt/lists/*

# ## Download spark and hadoop dependencies and install

# # ENV variables
# ENV SPARK_VERSION=3.5.5

# ENV SPARK_HOME=${SPARK_HOME:-"/opt/spark"}
# ENV HADOOP_HOME=${HADOOP_HOME:-"/opt/hadoop"}

# ENV SPARK_MASTER_PORT=7077
# ENV SPARK_MASTER_HOST=spark-master
# ENV SPARK_MASTER="spark://$SPARK_MASTER_HOST:$SPARK_MASTER_PORT"

# ENV PYTHONPATH=$SPARK_HOME/python/:$PYTHONPATH
# ENV PYSPARK_PYTHON=python3

# # Add iceberg spark runtime jar to IJava classpath
# ENV IJAVA_CLASSPATH=/opt/spark/jars/*

# RUN mkdir -p ${HADOOP_HOME} && mkdir -p ${SPARK_HOME}
# WORKDIR ${SPARK_HOME}

# RUN mkdir -p ${SPARK_HOME} \
#     && curl https://dlcdn.apache.org/spark/spark-${SPARK_VERSION}/spark-${SPARK_VERSION}-bin-hadoop3.tgz -o spark-${SPARK_VERSION}-bin-hadoop3.tgz \
#     && tar xvzf spark-${SPARK_VERSION}-bin-hadoop3.tgz --directory ${SPARK_HOME} --strip-components 1 \
#     && rm -rf spark-${SPARK_VERSION}-bin-hadoop3.tgz

# # Add spark binaries to shell and enable execution
# RUN chmod u+x /opt/spark/sbin/* && \
#     chmod u+x /opt/spark/bin/*
# ENV PATH="$PATH:$SPARK_HOME/bin:$SPARK_HOME/sbin"

# # Add a spark config for all nodes
# COPY conf/spark-defaults.conf "$SPARK_HOME/conf/"


# FROM spark-base AS pyspark

# # Install python deps
# COPY requirements.txt .
# RUN pip3 install -r requirements.txt


# FROM pyspark AS pyspark-runner

# # Download delta jars
# RUN curl https://repo1.maven.org/maven2/io/delta/delta-core_2.12/2.4.0/delta-core_2.12-2.4.0.jar -Lo /opt/spark/jars/delta-core_2.12-2.4.0.jar
# RUN curl https://repo1.maven.org/maven2/io/delta/delta-spark_2.12/3.2.0/delta-spark_2.12-3.2.0.jar -Lo /opt/spark/jars/delta-spark_2.12-3.2.0.jar
# RUN curl https://repo1.maven.org/maven2/io/delta/delta-storage/3.2.0/delta-storage-3.2.0.jar -Lo /opt/spark/jars/delta-storage-3.2.0.jar

# COPY entrypoint.sh .
# RUN chmod u+x /opt/spark/entrypoint.sh


# ENTRYPOINT ["./entrypoint.sh"]
# CMD [ "bash" ]

# Now go to interactive shell mode
# -$ docker exec -it spark-master /bin/bash 
# then execute
# -$ pyspark


# --- Stage 1: Builder ---
FROM openjdk:11-jdk-slim AS builder

ARG SPARK_VERSION=3.4.4
ARG HADOOP_VERSION=3
ENV SPARK_HOME=/opt/spark

# Cài đặt các công cụ cần thiết
RUN apt-get update && \
apt-get install -y --no-install-recommends \
    sudo \
    curl \
    vim \
    unzip \
    rsync \
    openjdk-11-jdk \
    build-essential \
    ssh  && \
apt-get clean && \
rm -rf /var/lib/apt/lists/*

# Tải và giải nén Spark
RUN curl -fsSL https://dlcdn.apache.org/spark/spark-${SPARK_VERSION}/spark-${SPARK_VERSION}-bin-hadoop${HADOOP_VERSION}.tgz | \
    tar -xz -C /opt/ && \
    mv /opt/spark-${SPARK_VERSION}-bin-hadoop${HADOOP_VERSION} ${SPARK_HOME}

# Tải các JAR cần thiết cho Delta Lake và S3
RUN mkdir -p ${SPARK_HOME}/jars && \
    curl -fsSL https://repo1.maven.org/maven2/io/delta/delta-spark_2.12/3.3.0/delta-spark_2.12-3.3.0.jar -o ${SPARK_HOME}/jars/delta-spark_2.12-3.3.0.jar && \
    curl -fsSL https://repo1.maven.org/maven2/io/delta/delta-storage/3.3.0/delta-storage-3.3.0.jar -o ${SPARK_HOME}/jars/delta-storage-3.3.0.jar && \
    curl -fsSL https://repo1.maven.org/maven2/org/apache/hadoop/hadoop-aws/3.3.4/hadoop-aws-3.3.4.jar -o ${SPARK_HOME}/jars/hadoop-aws-3.3.4.jar && \
    curl -fsSL https://repo1.maven.org/maven2/com/amazonaws/aws-java-sdk-bundle/1.12.721/aws-java-sdk-bundle-1.12.721.jar -o ${SPARK_HOME}/jars/aws-java-sdk-bundle-1.12.721.jar 

# --- Stage 2: Final Image ---
FROM python:3.12.9-bullseye

ENV SPARK_HOME=/opt/spark
ENV HADOOP_HOME=$SPARK_HOME
ENV HADOOP_CONF_DIR=$SPARK_HOME/conf
ENV PYSPARK_PYTHON=python3
ENV SPARK_MASTER_HOST=spark-master
ENV SPARK_MASTER_PORT=7077
ENV SPARK_MASTER=spark://$SPARK_MASTER_HOST:$SPARK_MASTER_PORT
ENV JAVA_HOME=/usr/lib/jvm/java-11-openjdk-amd64
ENV PATH=$JAVA_HOME/bin:$PATH:$SPARK_HOME/bin:$SPARK_HOME/sbin


# Cài đặt các gói hệ thống cần thiết
RUN apt-get update && \
apt-get install -y --no-install-recommends \
    sudo \
    curl \
    vim \
    unzip \
    rsync \
    ssh \ 
    openjdk-11-jdk \
    build-essential \
    iputils-ping \
    software-properties-common && \
apt-get clean && \
rm -rf /var/lib/apt/lists/*

RUN apt-get update && apt-get install -y openssh-server && \
    mkdir /var/run/sshd && \
    echo 'root:root' | chpasswd && \
    sed -i 's/#PermitRootLogin prohibit-password/PermitRootLogin yes/' /etc/ssh/sshd_config && \
    sed -i 's/#PasswordAuthentication yes/PasswordAuthentication yes/' /etc/ssh/sshd_config


# Sao chép Spark từ builder
COPY --from=builder /opt/spark /opt/spark

#RUN find ${SPARK_HOME}/jars -name "*aws*" -not -name "*aws-java-sdk-bundle*" -delete

# Cài đặt các gói Python cần thiết
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Tạo thư mục làm việc và logs cho Spark
RUN mkdir -p /opt/spark/work-dir /opt/spark/logs && \
    chown -R root:root /opt/spark

# Sao chép tập tin cấu hình và entrypoint 
COPY conf/spark-defaults.conf $SPARK_HOME/conf/spark-defaults.conf
COPY entrypoint.sh /
RUN chmod +x /entrypoint.sh

# Tạo SSH key và cấu hình
RUN mkdir -p /root/.ssh && \
    ssh-keygen -t rsa -f /root/.ssh/id_rsa -q -N "" && \
    cat /root/.ssh/id_rsa.pub >> /root/.ssh/authorized_keys && \
    chmod 600 /root/.ssh/authorized_keys

USER root
# RUN mkdir -p /home/sparkuser/.ssh && \
#     touch /home/sparkuser/.ssh/known_hosts && \
#     chown -R sparkuser:sparkuser /home/sparkuser && \
#     chmod 700 /home/sparkuser/.ssh && \
#     chmod 600 /home/sparkuser/.ssh/known_hosts

# RUN id -u sparkuser &>/dev/null || useradd -ms /bin/bash sparkuser && \
#     chown -R sparkuser:sparkuser /opt/spark
# USER sparkuser


WORKDIR /opt/spark/work-dir
ENTRYPOINT ["/entrypoint.sh"]

CMD ["bash"]


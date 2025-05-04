#!/bin/bash
service ssh start

ssh-keyscan -H spark-master >> ~/.ssh/known_hosts
ssh-keyscan -H spark-worker >> ~/.ssh/known_hosts

chmod 644 /root/.ssh/known_hosts

SPARK_WORKLOAD=$1

echo "SPARK_WORKLOAD: $SPARK_WORKLOAD"

sleep 3

if [ "$SPARK_WORKLOAD" == "master" ]; then
  $SPARK_HOME/sbin/start-master.sh -p 7077
elif [[ $SPARK_WORKLOAD =~ "worker" ]]; then
  $SPARK_HOME/sbin/start-worker.sh spark://spark-master:7077
elif [ "$SPARK_WORKLOAD" == "history" ]; then
  $SPARK_HOME/sbin/start-history-server.sh
fi

tail -f /dev/null
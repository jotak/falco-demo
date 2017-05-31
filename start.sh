#!/bin/sh

# until curl -u jdoe:password -H "Hawkular-Tenant: falco" http://hawkular:8080/hawkular/metrics/status | grep STARTED
# do
#   echo "Waiting Hawkular to be ready"
#   sleep 2
# done
#
# echo "Hawkular ready!"

java -Dvertx.disableDnsResolver=true -DHAWKULAR_HOST=$HAWKULAR_HOST -jar falco-demo.jar
# java -Dvertx.disableDnsResolver=true -agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=5005 -DHAWKULAR_HOST=$HAWKULAR_HOST -DUSE_DW_METRICS=true -Dorg.slf4j.simpleLogger.defaultLogLevel=debug -jar falco-demo.jar

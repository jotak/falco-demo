#!/bin/sh

until curl -u admin:admin http://localhost:3000/api/datasources
do
  echo "Waiting, grafana server not ready"
  sleep 0.5
done

curl -u admin:admin -H "Content-Type: application/json" -X POST -d @/tmp/datasource.json http://localhost:3000/api/datasources
curl -u admin:admin -H "Content-Type: application/json" -X POST -d @/tmp/Falco-Prom.json http://localhost:3000/api/dashboards/db
curl -u admin:admin -H "Content-Type: application/json" -X POST -d @/tmp/Falco-VertX-Prom.json http://localhost:3000/api/dashboards/db

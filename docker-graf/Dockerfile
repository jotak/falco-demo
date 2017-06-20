FROM grafana/grafana

ADD ./datasource.json /tmp/datasource.json
ADD ./Falco-Prom.json /tmp/Falco-Prom.json
ADD ./Falco-VertX-Prom.json /tmp/Falco-VertX-Prom.json
ADD ./configure.sh /tmp/configure.sh
ADD ./run-override.sh /tmp/run-override.sh

RUN chmod +x /tmp/run-override.sh /tmp/configure.sh

ENTRYPOINT ["/tmp/run-override.sh"]

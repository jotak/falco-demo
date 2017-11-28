FROM openjdk:8-jre

WORKDIR "/tmp"

EXPOSE 8081 9099

ADD start.sh /tmp/start.sh
RUN chmod +x /tmp/start.sh

ADD webroot /tmp/webroot
ADD target/falco-demo.jar /tmp/falco-demo.jar
ADD jmx_prometheus_javaagent-0.10.jar /tmp/jmx_prometheus_javaagent-0.10.jar
ADD jmx-config.yml /tmp/jmx-config.yml

ENTRYPOINT ["/tmp/start.sh"]

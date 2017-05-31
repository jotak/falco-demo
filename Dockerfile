FROM openjdk:8-jre

WORKDIR "/tmp"

EXPOSE 8081

ADD start.sh /tmp/start.sh
RUN chmod +x /tmp/start.sh

ADD webroot /tmp/webroot
ADD target/falco-demo.jar /tmp/falco-demo.jar

ENTRYPOINT ["/tmp/start.sh"]

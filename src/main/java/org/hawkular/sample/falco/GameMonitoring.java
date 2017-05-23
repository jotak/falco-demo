package org.hawkular.sample.falco;

import java.io.PrintWriter;
import java.io.StringWriter;
import java.util.Random;

import org.hawkular.metrics.client.HawkularClient;
import org.hawkular.metrics.client.HawkularClientBuilder;
import org.hawkular.metrics.client.HawkularLogger;
import org.hawkular.metrics.client.model.Gauge;
import org.hawkular.metrics.client.model.Logger;

import flying.spaghetti.code.monster.TotalNonSense;
import io.vertx.core.AbstractVerticle;
import io.vertx.core.Vertx;
import io.vertx.core.VertxOptions;
import io.vertx.core.eventbus.EventBus;
import io.vertx.core.eventbus.Message;
import io.vertx.core.json.JsonObject;
import io.vertx.ext.hawkular.AuthenticationOptions;
import io.vertx.ext.hawkular.VertxHawkularOptions;
import io.vertx.ext.web.Router;
import io.vertx.ext.web.handler.StaticHandler;
import io.vertx.ext.web.handler.sockjs.BridgeOptions;
import io.vertx.ext.web.handler.sockjs.PermittedOptions;
import io.vertx.ext.web.handler.sockjs.SockJSHandler;

public class GameMonitoring extends AbstractVerticle {

    private static final Random RANDOM = new Random();

    private final HawkularClient hawkular;
    private final HawkularLogger hawkularLogger;

    private GameMonitoring() {
        hawkular = hawkularBuilder().build();
        hawkularLogger = hawkularBuilder().buildLogger(GameMonitoring.class);
    }

    public static void main(String[] args) {
        Vertx vertx = Vertx.vertx(new VertxOptions().setMetricsOptions(
                new VertxHawkularOptions()
						.setEnabled(true)
						.setTenant("falco2")
						.setHost("localhost")
						.setPort(8080)
                        .setAuthenticationOptions(
                                new AuthenticationOptions()
                                        .setEnabled(true)
                                        .setId("jdoe")
                                        .setSecret("password"))));
        vertx.deployVerticle(new GameMonitoring());
    }

    private static HawkularClientBuilder hawkularBuilder() {
        return new HawkularClientBuilder("falco")
                .basicAuth("jdoe", "password");
    }

    @Override
    public void start() throws Exception {
        Router router = Router.router(vertx);

        // Allow events for the designated addresses in/out of the event bus bridge
        BridgeOptions opts = new BridgeOptions()
                .addOutboundPermitted(new PermittedOptions().setAddress("logs"))
                .addInboundPermitted(new PermittedOptions().setAddress("init-session"))
                .addInboundPermitted(new PermittedOptions().setAddress("new-score"))
                .addInboundPermitted(new PermittedOptions().setAddress("heat"))
                .addInboundPermitted(new PermittedOptions().setAddress("new-level"))
                .addInboundPermitted(new PermittedOptions().setAddress("overheated"))
                .addInboundPermitted(new PermittedOptions().setAddress("fscm"))
                .addInboundPermitted(new PermittedOptions().setAddress("nodes"))
                .addInboundPermitted(new PermittedOptions().setAddress("game-over"))
                .addInboundPermitted(new PermittedOptions().setAddress("won"));

        // Create the event bus bridge and add it to the router.
        SockJSHandler ebHandler = SockJSHandler.create(vertx).bridge(opts);
        router.route("/eventbus/*").handler(ebHandler);

        // Create a router endpoint for the static content.
        router.route().handler(StaticHandler.create());

        // Start the web server and tell it to use the router to handle requests.
        vertx.createHttpServer().requestHandler(router::accept).listen(8081);

        EventBus eb = vertx.eventBus();
        eb.consumer("init-session", msg -> {
            String playerName = playerName(msg);
            score(playerName).set(0);
            heat(playerName).set(100);
            level(playerName).set(0);
            heatLimit(playerName).set(200);
            timeline(playerName).log("Starting new game");
        });
        eb.consumer("new-score", msg -> score(playerName(msg)).set((int) value(msg)));
        eb.consumer("heat", msg -> heat(playerName(msg)).set(((Number) value(msg)).doubleValue()));
        eb.consumer("new-level", msg -> level(playerName(msg)).set((int) value(msg)));
        eb.consumer("overheated", msg -> timeline(playerName(msg)).log("Overheated :-("));
        eb.consumer("fscm", msg -> {
            timeline(playerName(msg)).log("Careful! Just caught an Flying Spaghetti Code Monster! What could go wrong?");
            vertx.executeBlocking(future -> {
                generateException();
                future.complete();
            }, res -> {});
        });
        eb.consumer("nodes", msg -> heatLimit(playerName(msg)).set(200 * (int) value(msg)));
        eb.consumer("won", msg -> timeline(playerName(msg)).log("WON!"));
        eb.consumer("game-over", msg -> timeline(playerName(msg)).log("GAME OVER!"));
    }

    private static String playerName(Message msg) {
        return ((JsonObject) (msg.body())).getString("name");
    }

    private static Object value(Message msg) {
        return ((JsonObject) (msg.body())).getValue("value");
    }

    private Gauge score(String playerName) {
        return hawkular.metricBuilder()
                .addSegment("source", "falco")
                .addSegment("player", playerName)
                .addSegment("metric", "score")
                .toGauge();
    }

    private Gauge heat(String playerName) {
        return hawkular.metricBuilder()
                .addSegment("source", "falco")
                .addSegment("player", playerName)
                .addSegment("metric", "heat")
                .toGauge();
    }

    private Gauge level(String playerName) {
        return hawkular.metricBuilder()
                .addSegment("source", "falco")
                .addSegment("player", playerName)
                .addSegment("metric", "level")
                .toGauge();
    }

    private Gauge heatLimit(String playerName) {
        return hawkular.metricBuilder()
                .addSegment("source", "falco")
                .addSegment("player", playerName)
                .addSegment("metric", "heat-limit")
                .toGauge();
    }

    private Logger timeline(String playerName) {
        return hawkular.metricBuilder()
                .addSegment("source", "falco")
                .addSegment("player", playerName)
                .addSegment("metric", "timeline")
                .toLogger();
    }

    private void generateException() {
        try {
            switch (RANDOM.nextInt(3)) {
                case 0:
                    // NPE
                    TotalNonSense.run(null, null);
                    break;
                case 1:
                    // Stack overflow
                    TotalNonSense.run(1, 2);
                    break;
                default:
                    // OOM
                    TotalNonSense
                            .run("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" +
                                            "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" +
                                            "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" +
                                            "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" +
                                            "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" +
                                            "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" +
                                            "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" +
                                            "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" +
                                            "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" +
                                            "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" +
                                            "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" +
                                            "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" +
                                            "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" +
                                            "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" +
                                            "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" +
                                            "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" +
                                            "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" +
                                            "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" +
                                            "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" +
                                            "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" +
                                            "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" +
                                            "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" +
                                            "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" +
                                            "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" +
                                            "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" +
                                            "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" +
                                            "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" +
                                            "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" +
                                            "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" +
                                            "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" +
                                            "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" +
                                            "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" +
                                            "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" +
                                            "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" +
                                            "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" +
                                            "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" +
                                            "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" +
                                            "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" +
                                            "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" +
                                            "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" +
                                            "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
                                    null);
                    break;
            }
        } catch (Throwable e) {
            StringWriter sw = new StringWriter();
            PrintWriter pw = new PrintWriter(sw);
            e.printStackTrace(pw);
            hawkularLogger.error(e);
            vertx.eventBus().send("logs", sw.toString());
        }
    }
}

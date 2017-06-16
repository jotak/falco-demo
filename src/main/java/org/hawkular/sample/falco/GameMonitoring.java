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
import io.vertx.core.http.HttpClientOptions;
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
    private static final String HAWKULAR_SECURED = System.getenv("HAWKULAR_HTTPS");
    private static final String HAWKULAR_HOST = getEnvOrDefault("HAWKULAR_HOST", "localhost");
    private static final String HAWKULAR_PORT = getEnvOrDefault("HAWKULAR_PORT", "8080");
    private static final String HAWKULAR_TENANT = getEnvOrDefault("HAWKULAR_TENANT", "falco");
    private static final String HAWKULAR_AUTH_TOKEN = System.getenv("HAWKULAR_AUTH_TOKEN");
    private static final String HAWKULAR_USERNAME = System.getenv("HAWKULAR_USERNAME");
    private static final String HAWKULAR_PASSWORD = System.getenv("HAWKULAR_PASSWORD");
    private static final String HAWKULAR_URI = ("true".equals(HAWKULAR_SECURED) ? "https://" : "http://")
            + HAWKULAR_HOST + ":" + HAWKULAR_PORT;

    private final HawkularClient hawkular;
    private final HawkularLogger hawkularLogger;

    private static String getEnvOrDefault(String key, String def) {
        String env = System.getenv(key);
        if (env == null) {
            return def;
        }
        return env;
    }

    private GameMonitoring() {
        hawkular = hawkularBuilder().build();
        hawkularLogger = hawkularBuilder().buildLogger("falco");
    }

    private static HawkularClientBuilder hawkularBuilder() {
        HawkularClientBuilder builder = new HawkularClientBuilder(HAWKULAR_TENANT).uri(HAWKULAR_URI);
        if (HAWKULAR_AUTH_TOKEN != null) {
            builder.bearerToken(HAWKULAR_AUTH_TOKEN);
        } else if (HAWKULAR_USERNAME != null && HAWKULAR_PASSWORD != null) {
            builder.basicAuth(HAWKULAR_USERNAME, HAWKULAR_PASSWORD);
        }
        return builder;
    }

    public static void main(String[] args) throws InterruptedException {
        System.out.println("HAWKULAR_HOST=" + HAWKULAR_HOST);
        System.out.println("HAWKULAR_PORT=" + HAWKULAR_PORT);
        AuthenticationOptions authenticationOptions = new AuthenticationOptions();
        VertxHawkularOptions vertxHawkularOptions = new VertxHawkularOptions()
                .setEnabled(true)
                .setTenant(HAWKULAR_TENANT)
                .setHost(HAWKULAR_HOST)
                .setPort(Integer.parseInt(HAWKULAR_PORT));
        if (HAWKULAR_AUTH_TOKEN != null) {
            vertxHawkularOptions.setHttpHeaders(new JsonObject()
                    .put("Authorization", "Bearer " + HAWKULAR_AUTH_TOKEN));
        } else if (HAWKULAR_USERNAME != null && HAWKULAR_PASSWORD != null) {
            authenticationOptions = authenticationOptions
                    .setEnabled(true)
                    .setId(HAWKULAR_USERNAME)
                    .setSecret(HAWKULAR_PASSWORD);
        }
        if ("true".equals(HAWKULAR_SECURED)) {
            vertxHawkularOptions.setHttpOptions(new HttpClientOptions().setSsl(true));
        }
        VertxOptions options = new VertxOptions().setMetricsOptions(
                vertxHawkularOptions
                        .setAuthenticationOptions(authenticationOptions));
        Vertx.vertx(options).deployVerticle(new GameMonitoring());
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

package se.pourfolio.barcode;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.io.IOException;
import java.io.InputStream;
import java.net.InetSocketAddress;
import java.util.concurrent.atomic.AtomicReference;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.sun.net.httpserver.HttpServer;

/** The HTTP side of the client, against a local server instead of the real service. */
class OpenFoodFactsClientTests {

    private HttpServer server;
    private final AtomicReference<String> lastPath = new AtomicReference<>();
    private final AtomicReference<String> lastUserAgent = new AtomicReference<>();
    private volatile int status = 200;
    private volatile String fixture = "5010327755014";

    @BeforeEach
    void start() throws IOException {
        server = HttpServer.create(new InetSocketAddress("localhost", 0), 0);
        server.createContext("/", exchange -> {
            lastPath.set(exchange.getRequestURI().toString());
            lastUserAgent.set(exchange.getRequestHeaders().getFirst("User-Agent"));
            byte[] body;
            try (InputStream in = getClass().getResourceAsStream("/openfoodfacts/" + fixture + ".json")) {
                body = in.readAllBytes();
            }
            exchange.getResponseHeaders().add("Content-Type", "application/json");
            exchange.sendResponseHeaders(status, body.length);
            exchange.getResponseBody().write(body);
            exchange.close();
        });
        server.start();
    }

    @AfterEach
    void stop() {
        server.stop(0);
    }

    private OpenFoodFactsClient client(boolean enabled) {
        return new OpenFoodFactsClient("http://localhost:" + server.getAddress().getPort(), enabled);
    }

    @Test
    void looksUpProductByBarcode() {
        var product = client(true).lookup("5010327755014");

        assertThat(product).hasValueSatisfying(p -> assertThat(p.name()).isEqualTo("Hendrick’s Gin"));
        assertThat(lastPath.get()).startsWith("/api/v2/product/5010327755014.json?fields=");
        assertThat(lastUserAgent.get()).startsWith("Pourfolio/");
    }

    @Test
    void returnsEmptyForUnknownProducts() {
        fixture = "not-found";
        assertThat(client(true).lookup("2000000000008")).isEmpty();
    }

    @Test
    void reportsServerErrorsAsUnavailable() {
        status = 503;
        assertThatThrownBy(() -> client(true).lookup("5010327755014"))
                .isInstanceOf(OpenFoodFactsClient.UnavailableException.class);
    }

    @Test
    void doesNothingWhenDisabled() {
        assertThat(client(false).lookup("5010327755014")).isEmpty();
        assertThat(lastPath.get()).isNull();
    }
}

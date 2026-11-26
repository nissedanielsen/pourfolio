package se.pourfolio.common.web;

import static org.assertj.core.api.Assertions.assertThat;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;

import se.pourfolio.TestcontainersConfiguration;
import se.pourfolio.auth.AuthProperties;
import se.pourfolio.auth.AuthService;

/**
 * Query parameters that are not valid UTF-8 (e.g. "ångström" sent as Latin-1 by some
 * command-line clients) are rejected by Tomcat itself, so this needs a real server.
 */
@Import(TestcontainersConfiguration.class)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ExtendWith(OutputCaptureExtension.class)
class InvalidEncodingTests {

    @LocalServerPort
    private int port;

    @Autowired
    private AuthService authService;

    @Autowired
    private AuthProperties authProperties;

    @Test
    void rejectsNonUtf8QueryParameterAsQuietBadRequest(CapturedOutput output) throws Exception {
        // "Ångström" percent-encoded as Latin-1 bytes instead of UTF-8.
        URI uri = URI.create("http://localhost:" + port + "/api/inventory-items?q=%C5ngstr%F6m");
        String token = authService.login(authProperties.username(), authProperties.password()).token();

        HttpResponse<String> response = HttpClient.newHttpClient().send(
                HttpRequest.newBuilder(uri).header("Authorization", "Bearer " + token).GET().build(),
                HttpResponse.BodyHandlers.ofString());

        assertThat(response.statusCode()).isEqualTo(400);
        assertThat(response.headers().firstValue("Content-Type")).hasValueSatisfying(
                type -> assertThat(type).startsWith("application/problem+json"));
        assertThat(response.body()).contains("\"status\":400").contains("UTF-8");
        assertThat(output).doesNotContain("Request processing failed");
    }
}

package se.pourfolio.auth;

import static org.hamcrest.Matchers.containsStringIgnoringCase;
import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import com.jayway.jsonpath.JsonPath;

import se.pourfolio.TestcontainersConfiguration;

/** Sign-in and protection of the API, with real tokens (credentials from test config). */
@Import(TestcontainersConfiguration.class)
@SpringBootTest
@AutoConfigureMockMvc
class AuthControllerTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private AuthProperties properties;

    @Autowired
    private AuthService authService;

    @Autowired
    private JwtEncoder jwtEncoder;

    @Autowired
    private LoginAttemptLimiter limiter;

    @BeforeEach
    void resetLimiter() {
        limiter.reset();
    }

    @Test
    void apiRequiresSignIn() throws Exception {
        mockMvc.perform(get("/api/inventory-items"))
                .andExpect(status().isUnauthorized())
                .andExpect(header().string("WWW-Authenticate", "Bearer"))
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.status").value(401));
        mockMvc.perform(get("/api/categories")).andExpect(status().isUnauthorized());
    }

    @Test
    void healthCheckDoesNotRequireSignIn() throws Exception {
        mockMvc.perform(get("/actuator/health/liveness")).andExpect(status().isOk());
    }

    @Test
    void signsInAndUsesToken() throws Exception {
        Instant before = Instant.now();
        String body = login(properties.username(), properties.password())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token", notNullValue()))
                .andExpect(jsonPath("$.expiresAt", notNullValue()))
                .andReturn().getResponse().getContentAsString();

        String token = JsonPath.read(body, "$.token");
        Instant expiresAt = Instant.parse(JsonPath.read(body, "$.expiresAt"));
        // One day, as configured.
        org.assertj.core.api.Assertions.assertThat(expiresAt)
                .isBetween(before.plus(Duration.ofHours(24)).minusSeconds(5), Instant.now().plus(Duration.ofHours(24)));

        mockMvc.perform(get("/api/inventory-items").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value(properties.username()));
    }

    @Test
    void rejectsWrongCredentials() throws Exception {
        login(properties.username(), "wrong")
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.detail").value("Wrong user name or password"));
        login("someone-else", properties.password()).andExpect(status().isUnauthorized());
    }

    @Test
    void rejectsBlankCredentials() throws Exception {
        login("", "").andExpect(status().isBadRequest());
    }

    @Test
    void rejectsTamperedExpiredAndForeignTokens() throws Exception {
        String valid = authService.login(properties.username(), properties.password()).token();
        String tampered = valid.substring(0, valid.length() - 2) + (valid.endsWith("A") ? "BB" : "AA");

        Clock twoDaysAgo = Clock.fixed(Instant.now().minus(Duration.ofDays(2)), ZoneOffset.UTC);
        String expired = new AuthService(properties, jwtEncoder, limiter, twoDaysAgo)
                .issueToken(properties.username()).token();

        String otherUser = authService.issueToken("someone-else").token();

        for (String token : new String[] {tampered, expired, otherUser, "not-a-token"}) {
            mockMvc.perform(get("/api/inventory-items").header("Authorization", "Bearer " + token))
                    .andExpect(status().isUnauthorized());
        }
    }

    @Test
    void blocksSignInAfterRepeatedFailures() throws Exception {
        for (int i = 0; i < LoginAttemptLimiter.MAX_FAILURES; i++) {
            login(properties.username(), "wrong-" + i).andExpect(status().isUnauthorized());
        }

        // Even the right password is refused while blocked.
        login(properties.username(), properties.password())
                .andExpect(status().isTooManyRequests())
                .andExpect(header().exists("Retry-After"))
                .andExpect(jsonPath("$.status").value(429));
    }

    @Test
    void allowsCorsPreflightWithAuthorizationHeaderFromConfiguredOrigin() throws Exception {
        mockMvc.perform(options("/api/inventory-items")
                        .header("Origin", "http://localhost:5173")
                        .header("Access-Control-Request-Method", "GET")
                        .header("Access-Control-Request-Headers", "authorization"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:5173"))
                .andExpect(header().string("Access-Control-Allow-Headers", containsStringIgnoringCase("authorization")));

        mockMvc.perform(options("/api/inventory-items")
                        .header("Origin", "https://evil.example")
                        .header("Access-Control-Request-Method", "GET"))
                .andExpect(status().isForbidden());
    }

    private ResultActions login(String username, String password) throws Exception {
        return mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"username\": \"%s\", \"password\": \"%s\"}".formatted(username, password)));
    }
}

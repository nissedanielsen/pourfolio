package se.pourfolio.auth;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;

import org.junit.jupiter.api.Test;
import org.springframework.boot.autoconfigure.AutoConfigurations;
import org.springframework.boot.autoconfigure.context.ConfigurationPropertiesAutoConfiguration;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.boot.validation.autoconfigure.ValidationAutoConfiguration;
import org.springframework.context.annotation.Configuration;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

/** Without credentials the app must refuse to start rather than run unprotected. */
class AuthPropertiesTests {

    private final ApplicationContextRunner runner = new ApplicationContextRunner()
            .withConfiguration(AutoConfigurations.of(
                    ConfigurationPropertiesAutoConfiguration.class, ValidationAutoConfiguration.class))
            .withUserConfiguration(PropertiesConfig.class);

    @Test
    void refusesToStartWithoutCredentials() {
        runner.withPropertyValues("pourfolio.auth.token-ttl=24h").run(context -> {
            assertThat(context).hasFailed();
            assertThat(context.getStartupFailure()).rootCause().hasMessageContaining("AUTH_USERNAME must be set");
        });
    }

    @Test
    void refusesShortTokenSecret() {
        runner.withPropertyValues(
                        "pourfolio.auth.username=u", "pourfolio.auth.password=p",
                        "pourfolio.auth.token-secret=too-short", "pourfolio.auth.token-ttl=24h")
                .run(context -> assertThat(context).hasFailed());
    }

    @Test
    void startsWithCompleteSettings() {
        runner.withPropertyValues(
                        "pourfolio.auth.username=u", "pourfolio.auth.password=p",
                        "pourfolio.auth.token-secret=" + "x".repeat(32), "pourfolio.auth.token-ttl=24h")
                .run(context -> assertThat(context.getBean(AuthProperties.class).tokenTtl())
                        .isEqualTo(Duration.ofHours(24)));
    }

    @Configuration
    @EnableConfigurationProperties(AuthProperties.class)
    static class PropertiesConfig {
    }
}

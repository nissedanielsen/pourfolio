package se.pourfolio.auth;

import java.time.Duration;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * The single user's credentials and token settings. Validated at startup, so the app
 * refuses to start (instead of running unprotected) when they are missing.
 *
 * @param username    the user name to sign in with (AUTH_USERNAME)
 * @param password    the password to sign in with (AUTH_PASSWORD)
 * @param tokenSecret secret used to sign tokens; changing it signs out every device (AUTH_TOKEN_SECRET)
 * @param tokenTtl    how long a sign-in lasts
 */
@Validated
@ConfigurationProperties("pourfolio.auth")
public record AuthProperties(
        @NotBlank(message = "AUTH_USERNAME must be set") String username,
        @NotBlank(message = "AUTH_PASSWORD must be set") String password,
        @NotBlank(message = "AUTH_TOKEN_SECRET must be set")
        @Size(min = 32, message = "AUTH_TOKEN_SECRET must be at least 32 characters") String tokenSecret,
        @NotNull Duration tokenTtl) {
}

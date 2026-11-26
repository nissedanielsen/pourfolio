package se.pourfolio.auth;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;

/** Checks the single user's credentials and issues sign-in tokens. */
@Service
public class AuthService {

    private final AuthProperties properties;
    private final JwtEncoder jwtEncoder;
    private final LoginAttemptLimiter limiter;
    private final Clock clock;

    @Autowired
    public AuthService(AuthProperties properties, JwtEncoder jwtEncoder, LoginAttemptLimiter limiter) {
        this(properties, jwtEncoder, limiter, Clock.systemUTC());
    }

    AuthService(AuthProperties properties, JwtEncoder jwtEncoder, LoginAttemptLimiter limiter, Clock clock) {
        this.properties = properties;
        this.jwtEncoder = jwtEncoder;
        this.limiter = limiter;
        this.clock = clock;
    }

    /**
     * @throws TooManyLoginAttemptsException if sign-in is temporarily blocked
     * @throws InvalidCredentialsException   if the user name or password is wrong
     */
    public TokenResponse login(String username, String password) {
        limiter.blockedFor().ifPresent(wait -> {
            throw new TooManyLoginAttemptsException(wait);
        });
        // Compare both values in constant time so timing doesn't reveal which one was wrong.
        boolean usernameMatches = constantTimeEquals(username, properties.username());
        boolean passwordMatches = constantTimeEquals(password, properties.password());
        if (!(usernameMatches & passwordMatches)) {
            limiter.recordFailure();
            throw new InvalidCredentialsException();
        }
        limiter.reset();
        return issueToken(properties.username());
    }

    TokenResponse issueToken(String subject) {
        Instant now = clock.instant();
        Instant expiresAt = now.plus(properties.tokenTtl());
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer(SecurityConfig.ISSUER)
                .subject(subject)
                .issuedAt(now)
                .expiresAt(expiresAt)
                .build();
        JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();
        String token = jwtEncoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
        return new TokenResponse(token, expiresAt);
    }

    private static boolean constantTimeEquals(String given, String expected) {
        // Hashing first makes the comparison independent of the strings' lengths.
        return MessageDigest.isEqual(sha256(given), sha256(expected));
    }

    private static byte[] sha256(String value) {
        try {
            return MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    public static class InvalidCredentialsException extends RuntimeException {
        InvalidCredentialsException() {
            super("Wrong user name or password");
        }
    }

    public static class TooManyLoginAttemptsException extends RuntimeException {
        private final Duration retryAfter;

        TooManyLoginAttemptsException(Duration retryAfter) {
            super("Too many failed sign-ins; try again later");
            this.retryAfter = retryAfter;
        }

        public Duration getRetryAfter() {
            return retryAfter;
        }
    }
}

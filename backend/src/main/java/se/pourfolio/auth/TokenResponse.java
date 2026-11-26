package se.pourfolio.auth;

import java.time.Instant;

import io.swagger.v3.oas.annotations.media.Schema;

/** A sign-in token to send as {@code Authorization: Bearer <token>} until it expires. */
@Schema(requiredProperties = {"token", "expiresAt"})
public record TokenResponse(String token, Instant expiresAt) {
}

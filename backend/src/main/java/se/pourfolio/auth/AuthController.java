package se.pourfolio.auth;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;

@RestController
@RequestMapping(path = "/api/auth", produces = MediaType.APPLICATION_JSON_VALUE)
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    /** Signs in and returns a token. Wrong credentials give 401; repeated failures give 429. */
    @PostMapping("/login")
    public TokenResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request.username(), request.password());
    }

    /** The signed-in user; useful to check that a stored token is still valid. */
    @GetMapping("/me")
    public CurrentUserResponse me(@AuthenticationPrincipal Jwt jwt) {
        return new CurrentUserResponse(jwt.getSubject());
    }

    @ExceptionHandler(AuthService.InvalidCredentialsException.class)
    ProblemDetail handleInvalidCredentials(AuthService.InvalidCredentialsException ex) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.UNAUTHORIZED, ex.getMessage());
    }

    @ExceptionHandler(AuthService.TooManyLoginAttemptsException.class)
    ResponseEntity<ProblemDetail> handleTooManyAttempts(AuthService.TooManyLoginAttemptsException ex) {
        long seconds = Math.max(1, (long) Math.ceil(ex.getRetryAfter().toMillis() / 1000.0));
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                .header(HttpHeaders.RETRY_AFTER, String.valueOf(seconds))
                .body(ProblemDetail.forStatusAndDetail(HttpStatus.TOO_MANY_REQUESTS, ex.getMessage()));
    }

    public record LoginRequest(@NotBlank String username, @NotBlank String password) {
    }

    @Schema(requiredProperties = "username")
    public record CurrentUserResponse(String username) {
    }
}

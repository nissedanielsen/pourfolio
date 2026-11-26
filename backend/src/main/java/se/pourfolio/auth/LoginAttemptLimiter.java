package se.pourfolio.auth;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/**
 * Slows down password guessing: after {@value #MAX_FAILURES} failed sign-ins within a minute,
 * further attempts are refused until the oldest failure is a minute old. There is only one
 * account, so the limit is global rather than per client.
 */
@Component
public class LoginAttemptLimiter {

    static final int MAX_FAILURES = 5;
    static final Duration WINDOW = Duration.ofMinutes(1);

    private final Clock clock;
    private final Deque<Instant> failures = new ArrayDeque<>();

    @Autowired
    public LoginAttemptLimiter() {
        this(Clock.systemUTC());
    }

    LoginAttemptLimiter(Clock clock) {
        this.clock = clock;
    }

    /** How long sign-in is blocked, or empty if an attempt is allowed now. */
    public synchronized Optional<Duration> blockedFor() {
        Instant now = clock.instant();
        prune(now);
        if (failures.size() < MAX_FAILURES) {
            return Optional.empty();
        }
        return Optional.of(Duration.between(now, failures.peekFirst().plus(WINDOW)));
    }

    public synchronized void recordFailure() {
        Instant now = clock.instant();
        prune(now);
        failures.addLast(now);
    }

    /** Called after a successful sign-in, and by tests. */
    public synchronized void reset() {
        failures.clear();
    }

    private void prune(Instant now) {
        while (!failures.isEmpty() && !failures.peekFirst().plus(WINDOW).isAfter(now)) {
            failures.removeFirst();
        }
    }
}

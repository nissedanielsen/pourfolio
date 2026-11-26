package se.pourfolio.auth;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;

import org.junit.jupiter.api.Test;

class LoginAttemptLimiterTests {

    private final MutableClock clock = new MutableClock(Instant.parse("2026-01-01T12:00:00Z"));
    private final LoginAttemptLimiter limiter = new LoginAttemptLimiter(clock);

    @Test
    void blocksAfterMaxFailuresWithinWindowAndUnblocksWhenTheyAge() {
        for (int i = 0; i < LoginAttemptLimiter.MAX_FAILURES - 1; i++) {
            limiter.recordFailure();
            clock.advance(Duration.ofSeconds(5));
        }
        assertThat(limiter.blockedFor()).isEmpty();

        limiter.recordFailure();
        // The first failure was 20 s ago, so it ages out of the 60 s window in 40 s.
        assertThat(limiter.blockedFor()).contains(Duration.ofSeconds(40));

        clock.advance(Duration.ofSeconds(40));
        assertThat(limiter.blockedFor()).isEmpty();
    }

    @Test
    void successfulSignInClearsFailures() {
        for (int i = 0; i < LoginAttemptLimiter.MAX_FAILURES; i++) {
            limiter.recordFailure();
        }
        limiter.reset();
        assertThat(limiter.blockedFor()).isEmpty();
    }

    private static final class MutableClock extends Clock {
        private Instant now;

        MutableClock(Instant now) {
            this.now = now;
        }

        void advance(Duration duration) {
            now = now.plus(duration);
        }

        @Override
        public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return now;
        }
    }
}

package se.pourfolio.inventory;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

/** Body for quickly updating how much is left of an item. */
public record UpdateRemainingRequest(@NotNull @PositiveOrZero Integer remaining) {
}

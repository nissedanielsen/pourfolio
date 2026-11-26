package se.pourfolio.inventory;

import java.math.BigDecimal;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

/**
 * Body for creating or replacing an inventory item.
 * {@code capacity} and {@code remaining} are millilitres for VOLUME items and pieces for COUNT items.
 */
public record InventoryItemRequest(
        @NotNull Long categoryId,
        @NotBlank @Size(max = 200) String name,
        @Size(max = 200) String brand,
        @DecimalMin("0.0") @DecimalMax("100.0") @Digits(integer = 3, fraction = 1) BigDecimal abv,
        @NotNull UnitType unitType,
        @NotNull @Positive Integer capacity,
        @NotNull @PositiveOrZero Integer remaining,
        @Size(max = 2000) String notes,
        /** Optional: which ingredient this is, so recipes can be matched. Must be in the same category. */
        Long ingredientId,
        /** Optional EAN/GTIN barcode (8, 12, 13 or 14 digits with a valid check digit). */
        @Size(max = 20) String barcode) {
}

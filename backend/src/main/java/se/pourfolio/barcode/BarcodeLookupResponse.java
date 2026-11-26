package se.pourfolio.barcode;

import java.math.BigDecimal;
import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;
import se.pourfolio.inventory.UnitType;

/**
 * What is known about a scanned barcode.
 *
 * @param source               where the suggestion comes from
 * @param suggestion           values to fill the form with, if anything is known
 * @param existingItems        items at home with this barcode
 * @param externalLookupFailed Open Food Facts could not be reached
 */
@Schema(requiredProperties = {"barcode", "source", "existingItems", "externalLookupFailed"})
public record BarcodeLookupResponse(String barcode, Source source, Suggestion suggestion,
        List<ExistingItem> existingItems, boolean externalLookupFailed) {

    public enum Source {
        /** Saved earlier in this app. */
        KNOWN_PRODUCT,
        /** From Open Food Facts; should be checked by the user. */
        OPEN_FOOD_FACTS,
        /** Nothing known. */
        NONE
    }

    @Schema(requiredProperties = {"name", "unitType"})
    public record Suggestion(String name, String brand, BigDecimal abv, UnitType unitType, Integer capacity,
            Long categoryId, Long ingredientId) {
    }

    @Schema(requiredProperties = {"id", "name", "unitType", "capacity", "remaining"})
    public record ExistingItem(Long id, String name, UnitType unitType, int capacity, int remaining) {
    }
}

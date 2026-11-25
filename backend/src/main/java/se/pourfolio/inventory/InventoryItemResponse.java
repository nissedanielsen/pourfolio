package se.pourfolio.inventory;

import io.swagger.v3.oas.annotations.media.Schema;

import java.math.BigDecimal;
import java.time.Instant;

import se.pourfolio.category.CategorySummary;

@Schema(requiredProperties = {"id", "category", "name", "unitType", "capacity", "remaining", "createdAt", "updatedAt"})
public record InventoryItemResponse(
        Long id,
        CategorySummary category,
        String name,
        String brand,
        BigDecimal abv,
        UnitType unitType,
        int capacity,
        int remaining,
        String notes,
        Instant createdAt,
        Instant updatedAt) {

    static InventoryItemResponse from(InventoryItem item) {
        return new InventoryItemResponse(
                item.getId(),
                CategorySummary.from(item.getCategory()),
                item.getName(),
                item.getBrand(),
                item.getAbv(),
                item.getUnitType(),
                item.getCapacity(),
                item.getRemaining(),
                item.getNotes(),
                item.getCreatedAt(),
                item.getUpdatedAt());
    }
}

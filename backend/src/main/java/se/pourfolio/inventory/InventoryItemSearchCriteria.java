package se.pourfolio.inventory;

import java.math.BigDecimal;

/**
 * Optional filters for listing inventory items. All filters are combined with AND.
 *
 * @param q          free text matched against name and brand (case-insensitive)
 * @param categoryId a category; a top-level category also matches its subcategories
 * @param minAbv     lowest alcohol by volume, inclusive
 * @param maxAbv     highest alcohol by volume, inclusive
 * @param unitType   only items measured in this unit
 * @param lowStock   if true, only items with at most a quarter left (including empty ones)
 */
public record InventoryItemSearchCriteria(
        String q,
        Long categoryId,
        BigDecimal minAbv,
        BigDecimal maxAbv,
        UnitType unitType,
        Boolean lowStock) {
}

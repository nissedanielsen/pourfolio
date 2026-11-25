package se.pourfolio.inventory;

import java.math.BigDecimal;
import java.util.Collection;
import java.util.Locale;

import org.springframework.data.jpa.domain.Specification;

/** Building blocks for filtering inventory items. */
final class InventoryItemSpecifications {

    private InventoryItemSpecifications() {
    }

    static Specification<InventoryItem> matchesText(String text) {
        String pattern = "%" + escapeLike(text.trim().toLowerCase(Locale.ROOT)) + "%";
        return (root, query, cb) -> cb.or(
                cb.like(cb.lower(root.get("name")), pattern, '\\'),
                cb.like(cb.lower(cb.coalesce(root.get("brand"), "")), pattern, '\\'),
                cb.like(cb.lower(root.get("category").get("name")), pattern, '\\'));
    }

    static Specification<InventoryItem> inCategories(Collection<Long> categoryIds) {
        return (root, query, cb) -> root.get("category").get("id").in(categoryIds);
    }

    static Specification<InventoryItem> abvAtLeast(BigDecimal min) {
        return (root, query, cb) -> cb.greaterThanOrEqualTo(root.get("abv"), min);
    }

    static Specification<InventoryItem> abvAtMost(BigDecimal max) {
        return (root, query, cb) -> cb.lessThanOrEqualTo(root.get("abv"), max);
    }

    static Specification<InventoryItem> hasUnitType(UnitType unitType) {
        return (root, query, cb) -> cb.equal(root.get("unitType"), unitType);
    }

    /** At most a quarter left: remaining * 4 <= capacity. */
    static Specification<InventoryItem> lowStock() {
        return (root, query, cb) -> cb.lessThanOrEqualTo(
                cb.prod(root.<Integer>get("remaining"), 4), root.<Integer>get("capacity"));
    }

    private static String escapeLike(String value) {
        return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
    }
}

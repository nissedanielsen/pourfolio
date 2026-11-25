package se.pourfolio.category;

import io.swagger.v3.oas.annotations.media.Schema;

/** Compact category reference used inside other responses. */
@Schema(requiredProperties = {"id", "code", "name"})
public record CategorySummary(Long id, String code, String name, Long parentId) {

    public static CategorySummary from(Category category) {
        return new CategorySummary(category.getId(), category.getCode(), category.getName(), category.getParentId());
    }
}

package se.pourfolio.category;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;

/** A category with its subcategories (empty for subcategories themselves). */
@Schema(requiredProperties = {"id", "code", "name", "children"})
public record CategoryResponse(Long id, String code, String name, List<CategoryResponse> children) {
}

package se.pourfolio.ingredient;

import io.swagger.v3.oas.annotations.media.Schema;

/** Compact ingredient reference used inside other responses. */
@Schema(requiredProperties = {"id", "code", "name"})
public record IngredientSummary(Long id, String code, String name) {

    public static IngredientSummary from(Ingredient ingredient) {
        return new IngredientSummary(ingredient.getId(), ingredient.getCode(), ingredient.getName());
    }
}

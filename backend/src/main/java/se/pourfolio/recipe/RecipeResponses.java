package se.pourfolio.recipe;

import java.math.BigDecimal;
import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;
import se.pourfolio.recipe.RecipeMatcher.LineStatus;
import se.pourfolio.recipe.RecipeMatcher.Measure;

/** JSON shapes for the recipe API. Amounts are in ml (or pieces when {@code measure} is PIECES). */
public final class RecipeResponses {

    private RecipeResponses() {
    }

    /** What a shortfall is about: name of the ingredient, or of the category for "any …" lines. */
    @Schema(requiredProperties = {"name", "status"})
    public record Shortfall(String name, LineStatus status, Measure measure, BigDecimal needed,
            BigDecimal available) {
    }

    /**
     * @param servings how many times it can be made with what's at home (null if unknown)
     */
    @Schema(requiredProperties = {"id", "code", "name", "canMake", "missingCount", "missing"})
    public record RecipeSummary(Long id, String code, String name, String description, String glass,
            boolean canMake, int missingCount, Integer servings, List<Shortfall> missing) {
    }

    @Schema(requiredProperties = {"id", "name"})
    public record MatchedItem(Long id, String name) {
    }

    /**
     * @param name          ingredient name, or category name when {@code anyOfCategory}
     * @param anyOfCategory true when any item in the category will do ("any gin")
     */
    @Schema(requiredProperties = {"position", "unit", "name", "anyOfCategory", "optional", "status",
            "usesSubstitute", "matchedItems"})
    public record RecipeLine(int position, BigDecimal amount, RecipeUnit unit, String name, boolean anyOfCategory,
            boolean optional, LineStatus status, Measure measure, BigDecimal needed, BigDecimal available,
            boolean usesSubstitute, List<MatchedItem> matchedItems) {
    }

    @Schema(requiredProperties = {"id", "code", "name", "method", "canMake", "missingCount", "lines"})
    public record RecipeDetail(Long id, String code, String name, String description, String method,
            String glass, String garnish, boolean canMake, int missingCount, Integer servings,
            List<RecipeLine> lines) {
    }

    @Schema(requiredProperties = {"id", "name"})
    public record RecipeRef(Long id, String name) {
    }

    /** Buying {@code name} would complete {@code recipes}, which miss only that. */
    @Schema(requiredProperties = {"name", "recipeCount", "recipes"})
    public record ShoppingSuggestion(String name, int recipeCount, List<RecipeRef> recipes) {
    }
}

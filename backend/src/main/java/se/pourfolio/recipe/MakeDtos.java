package se.pourfolio.recipe;

import java.math.BigDecimal;
import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import se.pourfolio.inventory.UnitType;
import se.pourfolio.recipe.MakePlanner.LineKind;

/** JSON shapes for "Jag gjorde den!". Amounts are in each item's unit: ml or pieces. */
public final class MakeDtos {

    private MakeDtos() {
    }

    @Schema(requiredProperties = {"itemId", "itemName", "unitType", "amount", "remainingBefore"})
    public record PlannedDeduction(Long itemId, String itemName, UnitType unitType, int amount,
            int remainingBefore) {
    }

    @Schema(requiredProperties = {"itemId", "itemName", "unitType", "remaining"})
    public record Alternative(Long itemId, String itemName, UnitType unitType, int remaining) {
    }

    @Schema(requiredProperties = {"position", "name", "unit", "kind", "enough", "deductions", "alternatives"})
    public record PlannedLine(int position, String name, BigDecimal amount, RecipeUnit unit, LineKind kind,
            boolean enough, List<PlannedDeduction> deductions, List<Alternative> alternatives) {
    }

    /** What making the recipe would take from which item. */
    @Schema(requiredProperties = {"recipeId", "recipeName", "servings", "canMake", "lines"})
    public record MakePlan(Long recipeId, String recipeName, int servings, boolean canMake,
            List<PlannedLine> lines) {
    }

    public record Deduction(@NotNull Long itemId, @NotNull @Positive Integer amount) {
    }

    /** What to take, usually the plan's deductions, possibly with another item or amount chosen. */
    public record MakeRequest(
            @NotNull @Min(1) @Max(20) Integer servings,
            @NotEmpty List<@Valid Deduction> deductions) {
    }

    @Schema(requiredProperties = {"drinkLogId", "recipeName", "servings"})
    public record MakeResult(Long drinkLogId, String recipeName, int servings) {
    }
}

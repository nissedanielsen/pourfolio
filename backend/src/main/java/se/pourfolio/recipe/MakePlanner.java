package se.pourfolio.recipe;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

import se.pourfolio.inventory.UnitType;
import se.pourfolio.recipe.RecipeMatcher.IngredientInfo;
import se.pourfolio.recipe.RecipeMatcher.Line;
import se.pourfolio.recipe.RecipeMatcher.StockItem;

/**
 * Works out what to take from which item when a drink is made ("Jag gjorde den!").
 * Pure logic, like {@link RecipeMatcher}, whose rules for which items fit a line it reuses.
 *
 * <ul>
 * <li>Amounts in ml (and teaspoons, 5 ml) are taken from bottles as is.</li>
 * <li>Fruit counted in pieces is taken whole: 25 ml lime juice takes one lime (≈ 30 ml).</li>
 * <li>Other pieces (e.g. cans of tonic) are one per drink; recipe pieces (an egg) one each.</li>
 * <li>Nothing is taken for things always at home, dashes, "fill up", or optional lines.</li>
 * <li>With several items, the one with least left goes first, so open bottles are finished
 * before new ones; if it isn't enough, the rest comes from the next.</li>
 * </ul>
 */
public final class MakePlanner {

    public enum LineKind {
        /** Something is taken from one or more items. */
        DEDUCT,
        /** Always at home; nothing is taken. */
        ALWAYS_AVAILABLE,
        /** Dashes and "fill up": too little or too vague to take. */
        NOT_DEDUCTED,
        /** Optional (e.g. garnish); nothing is taken. */
        OPTIONAL
    }

    /** Take {@code amount} (ml for VOLUME, pieces for COUNT) from the item. */
    public record Deduction(StockItem item, int amount) {
    }

    /**
     * @param enough       whether the items at home cover the line (always true unless DEDUCT)
     * @param deductions   what to take, least-left item first
     * @param alternatives every item that could be used for the line
     */
    public record LinePlan(Line line, LineKind kind, boolean enough, List<Deduction> deductions,
            List<StockItem> alternatives) {
    }

    public record Plan(int servings, boolean canMake, List<LinePlan> lines) {
    }

    private static final Comparator<StockItem> LEAST_LEFT_FIRST =
            Comparator.comparingInt(StockItem::remaining).thenComparingLong(StockItem::id);

    private final RecipeMatcher matcher;

    public MakePlanner(RecipeMatcher matcher) {
        this.matcher = matcher;
    }

    public Plan plan(List<Line> lines, int servings) {
        if (servings < 1) {
            throw new IllegalArgumentException("servings must be at least 1");
        }
        List<LinePlan> plans = lines.stream().map(line -> planLine(line, servings)).toList();
        boolean canMake = plans.stream().allMatch(LinePlan::enough);
        return new Plan(servings, canMake, plans);
    }

    LinePlan planLine(Line line, int servings) {
        IngredientInfo ingredient = matcher.ingredient(line.ingredientId());
        if (line.optional()) {
            return new LinePlan(line, LineKind.OPTIONAL, true, List.of(), List.of());
        }
        if (ingredient != null && ingredient.alwaysAvailable()) {
            return new LinePlan(line, LineKind.ALWAYS_AVAILABLE, true, List.of(), List.of());
        }

        List<StockItem> candidates = matcher.candidates(line).items().stream().sorted(LEAST_LEFT_FIRST).toList();
        if (line.unit() == RecipeUnit.DASH || line.unit() == RecipeUnit.TOP_UP) {
            return new LinePlan(line, LineKind.NOT_DEDUCTED, !candidates.isEmpty(), List.of(), candidates);
        }

        return switch (line.unit()) {
            case ML, TSP -> takeMillilitres(line, candidates, millilitres(line, servings), servings);
            case PIECE -> ingredient != null && ingredient.mlPerPiece() != null
                    ? takeMillilitres(line, candidates,
                            round(line.amount().multiply(ingredient.mlPerPiece()).multiply(BigDecimal.valueOf(servings))),
                            servings)
                    : takePieces(line, candidates, round(line.amount().multiply(BigDecimal.valueOf(servings))));
            case DASH, TOP_UP -> throw new IllegalStateException("handled above");
        };
    }

    private LinePlan takeMillilitres(Line line, List<StockItem> candidates, int neededMl, int servings) {
        double perServing = (double) neededMl / servings;
        int left = neededMl;
        List<Deduction> deductions = new ArrayList<>();
        for (StockItem item : candidates) {
            if (left <= 0) {
                break;
            }
            int take;
            int covers;
            if (item.unitType() == UnitType.VOLUME) {
                take = Math.min(item.remaining(), left);
                covers = take;
            } else {
                BigDecimal mlPerPiece = mlPerPiece(item);
                // Whole pieces: by juice per piece for fruit, otherwise one per drink (e.g. a can).
                double perPiece = mlPerPiece != null ? mlPerPiece.doubleValue() : perServing;
                take = Math.min(item.remaining(), (int) Math.ceil(left / perPiece - 1e-9));
                covers = (int) Math.round(take * perPiece);
            }
            if (take > 0) {
                deductions.add(new Deduction(item, take));
                left -= covers;
            }
        }
        return new LinePlan(line, LineKind.DEDUCT, left <= 0, List.copyOf(deductions), candidates);
    }

    private static LinePlan takePieces(Line line, List<StockItem> candidates, int neededPieces) {
        List<StockItem> countable = candidates.stream().filter(i -> i.unitType() == UnitType.COUNT).toList();
        if (countable.isEmpty() && !candidates.isEmpty()) {
            // e.g. mint registered as a bottle of syrup: can't take pieces from it.
            return new LinePlan(line, LineKind.NOT_DEDUCTED, true, List.of(), candidates);
        }
        int left = neededPieces;
        List<Deduction> deductions = new ArrayList<>();
        for (StockItem item : countable) {
            if (left <= 0) {
                break;
            }
            int take = Math.min(item.remaining(), left);
            if (take > 0) {
                deductions.add(new Deduction(item, take));
                left -= take;
            }
        }
        return new LinePlan(line, LineKind.DEDUCT, left <= 0, List.copyOf(deductions), countable);
    }

    private static int millilitres(Line line, int servings) {
        BigDecimal perServing = line.unit() == RecipeUnit.TSP
                ? line.amount().multiply(BigDecimal.valueOf(RecipeUnit.ML_PER_TSP))
                : line.amount();
        return round(perServing.multiply(BigDecimal.valueOf(servings)));
    }

    private BigDecimal mlPerPiece(StockItem item) {
        IngredientInfo ingredient = matcher.ingredient(item.ingredientId());
        return ingredient == null ? null : ingredient.mlPerPiece();
    }

    private static int round(BigDecimal value) {
        return value.setScale(0, RoundingMode.HALF_UP).intValueExact();
    }
}

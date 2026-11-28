package se.pourfolio.recipe;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

import se.pourfolio.inventory.UnitType;

/**
 * Decides which recipes can be made from what is at home, and how many times.
 * Pure logic on plain values, so every case can be unit tested without a database.
 *
 * <p>A recipe line asks for a specific ingredient (or one of its substitutes) or for any
 * item in a category. Items with nothing left never count. Amounts are compared in ml when
 * possible: VOLUME items hold ml, and COUNT items of fruit are converted using the
 * ingredient's ml per piece (one lime ≈ 30 ml juice). Other COUNT items (e.g. cans of tonic)
 * count as one serving per piece. When an amount can't be compared at all (e.g. bitters by
 * the dash), having some is enough.
 */
public final class RecipeMatcher {

    /** An inventory item with something left. */
    public record StockItem(long id, String name, long categoryId, Long parentCategoryId, Long ingredientId,
            UnitType unitType, int remaining) {
    }

    public record IngredientInfo(long id, String name, boolean alwaysAvailable, BigDecimal mlPerPiece,
            Set<Long> substituteIds) {
    }

    public record Line(int position, BigDecimal amount, RecipeUnit unit, Long ingredientId, Long categoryId,
            boolean optional) {
    }

    public enum LineStatus {
        /** Enough of a matching item at home. */
        OK,
        /** Ice, water and the like: assumed to be at home. */
        ALWAYS_AVAILABLE,
        /** Nothing matching at home. */
        MISSING,
        /** Something matching, but less than the recipe needs. */
        NOT_ENOUGH
    }

    /** What amounts were compared in; null when only presence was checked. */
    public enum Measure {
        ML, PIECES
    }

    public record LineMatch(Line line, LineStatus status, List<StockItem> matchedItems, boolean usesSubstitute,
            Measure measure, BigDecimal needed, BigDecimal available, Integer servings) {

        public boolean isShortfall() {
            return status == LineStatus.MISSING || status == LineStatus.NOT_ENOUGH;
        }
    }

    /**
     * @param missingCount required lines that are missing or short
     * @param servings     how many times the recipe can be made, or null if it can't be
     *                     made or no line's amount could be measured
     */
    public record RecipeMatch(boolean canMake, int missingCount, Integer servings, List<LineMatch> lines) {

        public List<LineMatch> shortfalls() {
            return lines.stream().filter(l -> !l.line().optional() && l.isShortfall()).toList();
        }
    }

    private final Map<Long, IngredientInfo> ingredients;
    private final List<StockItem> stock;

    public RecipeMatcher(Map<Long, IngredientInfo> ingredients, List<StockItem> stock) {
        this.ingredients = ingredients;
        this.stock = stock.stream().filter(item -> item.remaining() > 0).toList();
    }

    public RecipeMatch match(List<Line> lines) {
        List<LineMatch> matches = lines.stream().map(this::matchLine).toList();
        List<LineMatch> required = matches.stream().filter(m -> !m.line().optional()).toList();
        int missing = (int) required.stream().filter(LineMatch::isShortfall).count();
        Integer servings = null;
        if (missing == 0) {
            servings = required.stream()
                    .map(LineMatch::servings)
                    .filter(Objects::nonNull)
                    .min(Integer::compare)
                    .orElse(null);
        }
        return new RecipeMatch(missing == 0, missing, servings, matches);
    }

    LineMatch matchLine(Line line) {
        IngredientInfo ingredient = line.ingredientId() == null ? null : ingredients.get(line.ingredientId());
        if (ingredient != null && ingredient.alwaysAvailable()) {
            return new LineMatch(line, LineStatus.ALWAYS_AVAILABLE, List.of(), false, null, null, null, null);
        }

        Candidates found = candidates(line);
        List<StockItem> candidates = found.items();
        boolean usesSubstitute = found.usesSubstitute();

        if (candidates.isEmpty()) {
            return new LineMatch(line, LineStatus.MISSING, List.of(), false, null, null, null, null);
        }

        Requirement requirement = requirement(line, ingredient);
        if (requirement == null) {
            return present(line, candidates, usesSubstitute);
        }
        BigDecimal available = BigDecimal.ZERO;
        // Pieces that can't be converted to ml (e.g. cans of tonic): one piece is one serving.
        int pieceServings = 0;
        for (StockItem item : candidates) {
            BigDecimal amount = availableAmount(item, requirement.measure());
            if (amount != null) {
                available = available.add(amount);
            } else if (requirement.measure() == Measure.ML && item.unitType() == UnitType.COUNT) {
                pieceServings += item.remaining();
            } else {
                // Can't be expressed in the recipe's unit at all: having it is enough.
                return present(line, candidates, usesSubstitute);
            }
        }
        int servings = available.divide(requirement.amount(), 0, RoundingMode.FLOOR).intValueExact() + pieceServings;
        LineStatus status = servings > 0 ? LineStatus.OK : LineStatus.NOT_ENOUGH;
        return new LineMatch(line, status, candidates, usesSubstitute, requirement.measure(),
                requirement.amount(), available, servings);
    }

    /** Items at home that a line can use, and whether they are substitutes. */
    public record Candidates(List<StockItem> items, boolean usesSubstitute) {
    }

    /**
     * Items with something left that can be used for the line: the ingredient itself (or, if
     * there is none, its substitutes), or any item in the line's category or its subcategories.
     */
    public Candidates candidates(Line line) {
        IngredientInfo ingredient = line.ingredientId() == null ? null : ingredients.get(line.ingredientId());
        if (ingredient != null) {
            List<StockItem> items = itemsWithIngredient(Set.of(ingredient.id()));
            if (items.isEmpty() && !ingredient.substituteIds().isEmpty()) {
                List<StockItem> substitutes = itemsWithIngredient(ingredient.substituteIds());
                return new Candidates(substitutes, !substitutes.isEmpty());
            }
            return new Candidates(items, false);
        }
        if (line.categoryId() == null) {
            return new Candidates(List.of(), false);
        }
        return new Candidates(stock.stream()
                .filter(item -> line.categoryId().equals(item.categoryId())
                        || line.categoryId().equals(item.parentCategoryId()))
                .toList(), false);
    }

    public IngredientInfo ingredient(Long id) {
        return id == null ? null : ingredients.get(id);
    }

    private List<StockItem> itemsWithIngredient(Set<Long> ingredientIds) {
        return stock.stream()
                .filter(item -> item.ingredientId() != null && ingredientIds.contains(item.ingredientId()))
                .toList();
    }

    private static LineMatch present(Line line, List<StockItem> candidates, boolean usesSubstitute) {
        return new LineMatch(line, LineStatus.OK, candidates, usesSubstitute, null, null, null, null);
    }

    private record Requirement(Measure measure, BigDecimal amount) {
    }

    /** What the line needs, or null if only presence can be checked. */
    private static Requirement requirement(Line line, IngredientInfo ingredient) {
        return switch (line.unit()) {
            case ML -> new Requirement(Measure.ML, line.amount());
            case TSP -> new Requirement(Measure.ML, line.amount().multiply(BigDecimal.valueOf(RecipeUnit.ML_PER_TSP)));
            case PIECE -> ingredient != null && ingredient.mlPerPiece() != null
                    ? new Requirement(Measure.ML, line.amount().multiply(ingredient.mlPerPiece()))
                    : new Requirement(Measure.PIECES, line.amount());
            case DASH, TOP_UP -> null;
        };
    }

    /** How much of the item there is in the given measure, or null if it can't be expressed in it. */
    private BigDecimal availableAmount(StockItem item, Measure measure) {
        BigDecimal remaining = BigDecimal.valueOf(item.remaining());
        if (measure == Measure.ML) {
            if (item.unitType() == UnitType.VOLUME) {
                return remaining;
            }
            IngredientInfo itemIngredient = item.ingredientId() == null ? null : ingredients.get(item.ingredientId());
            return itemIngredient != null && itemIngredient.mlPerPiece() != null
                    ? remaining.multiply(itemIngredient.mlPerPiece())
                    : null;
        }
        return item.unitType() == UnitType.COUNT ? remaining : null;
    }
}

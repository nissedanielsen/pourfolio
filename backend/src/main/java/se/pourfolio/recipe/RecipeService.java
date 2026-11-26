package se.pourfolio.recipe;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import se.pourfolio.common.web.NotFoundException;
import se.pourfolio.ingredient.Ingredient;
import se.pourfolio.ingredient.IngredientRepository;
import se.pourfolio.inventory.InventoryItem;
import se.pourfolio.inventory.InventoryItemRepository;
import se.pourfolio.recipe.RecipeMatcher.IngredientInfo;
import se.pourfolio.recipe.RecipeMatcher.Line;
import se.pourfolio.recipe.RecipeMatcher.LineMatch;
import se.pourfolio.recipe.RecipeMatcher.RecipeMatch;
import se.pourfolio.recipe.RecipeMatcher.StockItem;
import se.pourfolio.recipe.RecipeResponses.MatchedItem;
import se.pourfolio.recipe.RecipeResponses.RecipeDetail;
import se.pourfolio.recipe.RecipeResponses.RecipeLine;
import se.pourfolio.recipe.RecipeResponses.RecipeRef;
import se.pourfolio.recipe.RecipeResponses.RecipeSummary;
import se.pourfolio.recipe.RecipeResponses.Shortfall;
import se.pourfolio.recipe.RecipeResponses.ShoppingSuggestion;

/**
 * Matches the recipes against the current inventory. There are tens of recipes and a few
 * hundred items at most, so everything is loaded and matched in memory per request.
 */
@Service
@Transactional(readOnly = true)
public class RecipeService {

    static final int MAX_SHOPPING_SUGGESTIONS = 8;

    public enum Filter {
        ALL, CAN_MAKE, MISSING_ONE
    }

    private final RecipeRepository recipes;
    private final IngredientRepository ingredients;
    private final InventoryItemRepository inventory;

    public RecipeService(RecipeRepository recipes, IngredientRepository ingredients,
            InventoryItemRepository inventory) {
        this.recipes = recipes;
        this.ingredients = ingredients;
        this.inventory = inventory;
    }

    /** Makeable recipes first, then by how little is missing, then by name. */
    public List<RecipeSummary> list(Filter filter) {
        RecipeMatcher matcher = matcher();
        return recipes.findAllWithLines().stream()
                .map(recipe -> toSummary(recipe, matcher.match(lines(recipe))))
                .filter(summary -> switch (filter) {
                    case ALL -> true;
                    case CAN_MAKE -> summary.canMake();
                    case MISSING_ONE -> summary.missingCount() == 1;
                })
                .sorted(Comparator.comparing(RecipeSummary::missingCount))
                .toList();
    }

    public RecipeDetail get(Long id) {
        Recipe recipe = recipes.findWithLines(id).orElseThrow(() -> new NotFoundException("Recipe", id));
        RecipeMatch match = matcher().match(lines(recipe));
        Map<Integer, RecipeIngredient> byPosition = recipe.getLines().stream()
                .collect(Collectors.toMap(RecipeIngredient::getPosition, Function.identity()));
        List<RecipeLine> lines = match.lines().stream()
                .map(m -> toLine(byPosition.get(m.line().position()), m))
                .toList();
        return new RecipeDetail(recipe.getId(), recipe.getCode(), recipe.getName(), recipe.getDescription(),
                recipe.getMethod(), recipe.getGlass(), recipe.getGarnish(), match.canMake(), match.missingCount(),
                match.servings(), lines);
    }

    /** What to buy to complete the most recipes that miss exactly one thing. */
    public List<ShoppingSuggestion> shoppingSuggestions() {
        RecipeMatcher matcher = matcher();
        Map<String, List<RecipeRef>> byMissing = new LinkedHashMap<>();
        for (Recipe recipe : recipes.findAllWithLines()) {
            RecipeMatch match = matcher.match(lines(recipe));
            if (match.missingCount() == 1) {
                RecipeIngredient missing = lineAt(recipe, match.shortfalls().getFirst());
                byMissing.computeIfAbsent(displayName(missing), name -> new ArrayList<>())
                        .add(new RecipeRef(recipe.getId(), recipe.getName()));
            }
        }
        return byMissing.entrySet().stream()
                .map(e -> new ShoppingSuggestion(e.getKey(), e.getValue().size(), e.getValue()))
                .sorted(Comparator.comparing(ShoppingSuggestion::recipeCount).reversed()
                        .thenComparing(ShoppingSuggestion::name))
                .limit(MAX_SHOPPING_SUGGESTIONS)
                .toList();
    }

    private RecipeMatcher matcher() {
        Map<Long, IngredientInfo> ingredientInfo = ingredients.findAllWithDetails().stream()
                .collect(Collectors.toMap(Ingredient::getId, i -> new IngredientInfo(i.getId(), i.getName(),
                        i.isAlwaysAvailable(), i.getMlPerPiece(),
                        i.getSubstitutes().stream().map(Ingredient::getId).collect(Collectors.toSet()))));
        List<StockItem> stock = inventory.findAllInStock().stream().map(RecipeService::toStock).toList();
        return new RecipeMatcher(ingredientInfo, stock);
    }

    private static StockItem toStock(InventoryItem item) {
        return new StockItem(item.getId(), item.getName(), item.getCategory().getId(),
                item.getCategory().getParentId(),
                item.getIngredient() == null ? null : item.getIngredient().getId(),
                item.getUnitType(), item.getRemaining());
    }

    private static List<Line> lines(Recipe recipe) {
        return recipe.getLines().stream()
                .map(l -> new Line(l.getPosition(), l.getAmount(), l.getUnit(),
                        l.getIngredient() == null ? null : l.getIngredient().getId(),
                        l.getCategory() == null ? null : l.getCategory().getId(),
                        l.isOptional()))
                .toList();
    }

    private static RecipeIngredient lineAt(Recipe recipe, LineMatch match) {
        return recipe.getLines().stream()
                .filter(l -> l.getPosition() == match.line().position())
                .findFirst()
                .orElseThrow();
    }

    private static String displayName(RecipeIngredient line) {
        return line.getIngredient() != null ? line.getIngredient().getName() : line.getCategory().getName();
    }

    private static RecipeSummary toSummary(Recipe recipe, RecipeMatch match) {
        List<Shortfall> missing = match.shortfalls().stream()
                .map(m -> new Shortfall(displayName(lineAt(recipe, m)), m.status(), m.measure(), m.needed(),
                        m.available()))
                .toList();
        return new RecipeSummary(recipe.getId(), recipe.getCode(), recipe.getName(), recipe.getDescription(),
                recipe.getGlass(), match.canMake(), match.missingCount(), match.servings(), missing);
    }

    private static RecipeLine toLine(RecipeIngredient line, LineMatch match) {
        return new RecipeLine(line.getPosition(), line.getAmount(), line.getUnit(), displayName(line),
                line.getIngredient() == null, line.isOptional(), match.status(), match.measure(), match.needed(),
                match.available(), match.usesSubstitute(),
                match.matchedItems().stream().map(item -> new MatchedItem(item.id(), item.name())).toList());
    }
}

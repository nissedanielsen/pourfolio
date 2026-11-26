package se.pourfolio.recipe;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.junit.jupiter.api.Test;

import se.pourfolio.inventory.UnitType;
import se.pourfolio.recipe.RecipeMatcher.IngredientInfo;
import se.pourfolio.recipe.RecipeMatcher.Line;
import se.pourfolio.recipe.RecipeMatcher.LineStatus;
import se.pourfolio.recipe.RecipeMatcher.Measure;
import se.pourfolio.recipe.RecipeMatcher.RecipeMatch;
import se.pourfolio.recipe.RecipeMatcher.StockItem;

class RecipeMatcherTests {

    // Categories
    private static final long SPIRITS = 1, GIN = 11, VODKA = 12, CITRUS = 21, BITTER_LIQUEUR = 31, VERMOUTH = 41;

    // Ingredients
    private static final long CAMPARI = 100, SWEET_VERMOUTH = 101, LIME = 102, SODA = 103, BOURBON = 104, RYE = 105,
            ANGOSTURA = 106, MINT = 107;

    private final Map<Long, IngredientInfo> ingredients = Map.of(
            CAMPARI, ingredient(CAMPARI, "Campari"),
            SWEET_VERMOUTH, ingredient(SWEET_VERMOUTH, "Söt vermouth"),
            LIME, new IngredientInfo(LIME, "Lime", false, new BigDecimal("30"), Set.of()),
            SODA, new IngredientInfo(SODA, "Sodavatten", true, null, Set.of()),
            BOURBON, new IngredientInfo(BOURBON, "Bourbon", false, null, Set.of(RYE)),
            RYE, new IngredientInfo(RYE, "Rye", false, null, Set.of(BOURBON)),
            ANGOSTURA, ingredient(ANGOSTURA, "Angostura"),
            MINT, ingredient(MINT, "Mynta"));

    private final List<StockItem> stock = new ArrayList<>();
    private long nextId = 1;

    @Test
    void canMakeWhenEverythingIsAtHomeAndCountsServings() {
        bottle("Tanqueray", GIN, null, 700);
        bottle("Campari", BITTER_LIQUEUR, CAMPARI, 100);
        bottle("Martini Rosso", VERMOUTH, SWEET_VERMOUTH, 750);

        RecipeMatch negroni = match(ml(30, null, GIN), ml(30, CAMPARI, null), ml(30, SWEET_VERMOUTH, null));

        assertThat(negroni.canMake()).isTrue();
        assertThat(negroni.missingCount()).isZero();
        // Campari limits: 100 ml / 30 ml = 3 drinks.
        assertThat(negroni.servings()).isEqualTo(3);
    }

    @Test
    void reportsMissingIngredients() {
        bottle("Tanqueray", GIN, null, 700);

        RecipeMatch negroni = match(ml(30, null, GIN), ml(30, CAMPARI, null), ml(30, SWEET_VERMOUTH, null));

        assertThat(negroni.canMake()).isFalse();
        assertThat(negroni.missingCount()).isEqualTo(2);
        assertThat(negroni.servings()).isNull();
        assertThat(negroni.shortfalls()).extracting(m -> m.line().ingredientId()).containsExactly(CAMPARI, SWEET_VERMOUTH);
    }

    @Test
    void reportsNotEnoughWithAmounts() {
        bottle("Campari", BITTER_LIQUEUR, CAMPARI, 20);

        var line = match(ml(30, CAMPARI, null)).lines().getFirst();

        assertThat(line.status()).isEqualTo(LineStatus.NOT_ENOUGH);
        assertThat(line.measure()).isEqualTo(Measure.ML);
        assertThat(line.needed()).isEqualByComparingTo("30");
        assertThat(line.available()).isEqualByComparingTo("20");
    }

    @Test
    void emptyItemsDoNotCount() {
        bottle("Campari", BITTER_LIQUEUR, CAMPARI, 0);

        assertThat(match(ml(30, CAMPARI, null)).lines().getFirst().status()).isEqualTo(LineStatus.MISSING);
    }

    @Test
    void addsUpSeveralItemsOfTheSameKind() {
        bottle("Campari (gammal)", BITTER_LIQUEUR, CAMPARI, 20);
        bottle("Campari (ny)", BITTER_LIQUEUR, CAMPARI, 20);

        RecipeMatch match = match(ml(30, CAMPARI, null));

        assertThat(match.canMake()).isTrue();
        assertThat(match.lines().getFirst().matchedItems()).hasSize(2);
    }

    @Test
    void categoryLineAcceptsAnyItemInTheCategoryOrItsSubcategories() {
        bottle("Hemmagjord gin", GIN, null, 500);

        assertThat(match(ml(50, null, GIN)).canMake()).isTrue();
        assertThat(match(ml(50, null, SPIRITS)).canMake()).isTrue();
        assertThat(match(ml(50, null, VODKA)).canMake()).isFalse();
    }

    @Test
    void ingredientLineNeedsTheIngredientNotJustTheCategory() {
        // A bitter liqueur that isn't marked as Campari doesn't make a Negroni.
        bottle("Okänd bitterlikör", BITTER_LIQUEUR, null, 700);

        assertThat(match(ml(30, CAMPARI, null)).canMake()).isFalse();
    }

    @Test
    void usesSubstituteWhenTheIngredientIsMissing() {
        bottle("Rittenhouse", 0, RYE, 700);

        var line = match(ml(60, BOURBON, null)).lines().getFirst();

        assertThat(line.status()).isEqualTo(LineStatus.OK);
        assertThat(line.usesSubstitute()).isTrue();
    }

    @Test
    void prefersTheIngredientOverSubstitutes() {
        bottle("Buffalo Trace", 0, BOURBON, 100);
        bottle("Rittenhouse", 0, RYE, 700);

        var line = match(ml(60, BOURBON, null)).lines().getFirst();

        assertThat(line.usesSubstitute()).isFalse();
        assertThat(line.matchedItems()).extracting(StockItem::name).containsExactly("Buffalo Trace");
        assertThat(line.servings()).isEqualTo(1);
    }

    @Test
    void alwaysAvailableIngredientsNeedNoItem() {
        var line = match(topUp(SODA)).lines().getFirst();

        assertThat(line.status()).isEqualTo(LineStatus.ALWAYS_AVAILABLE);
    }

    @Test
    void convertsFruitPiecesToJuice() {
        pieces("Lime", CITRUS, LIME, 2); // 2 × 30 ml

        assertThat(match(ml(25, LIME, null)).servings()).isEqualTo(2);
        assertThat(match(ml(70, LIME, null)).lines().getFirst().status()).isEqualTo(LineStatus.NOT_ENOUGH);
        // A recipe asking for a whole lime is happy with bottled lime juice too.
        stock.clear();
        bottle("Limejuice", CITRUS, LIME, 100);
        assertThat(match(piece(1, LIME)).servings()).isEqualTo(3);
    }

    @Test
    void countsPiecesWhenThereIsNoConversion() {
        pieces("Mynta", 0, MINT, 1);

        assertThat(match(piece(1, MINT)).servings()).isEqualTo(1);
        assertThat(match(piece(2, MINT)).lines().getFirst().status()).isEqualTo(LineStatus.NOT_ENOUGH);
    }

    @Test
    void teaspoonsAreFiveMillilitres() {
        bottle("Sockerlag", 0, CAMPARI, 12);

        RecipeMatcher.LineMatch line = match(new Line(1, BigDecimal.ONE, RecipeUnit.TSP, CAMPARI, null, false))
                .lines().getFirst();

        assertThat(line.needed()).isEqualByComparingTo("5");
        assertThat(line.servings()).isEqualTo(2);
    }

    @Test
    void dashesOnlyNeedSomeLeft() {
        bottle("Angostura", 0, ANGOSTURA, 1);

        var line = match(new Line(1, BigDecimal.TWO, RecipeUnit.DASH, ANGOSTURA, null, false)).lines().getFirst();

        assertThat(line.status()).isEqualTo(LineStatus.OK);
        assertThat(line.measure()).isNull();
        assertThat(line.servings()).isNull();
    }

    @Test
    void countsEachPieceAsOneServingWhenItCannotBeConvertedToMillilitres() {
        // Tonic registered as 3 cans: each can is enough for one drink, so gin isn't the limit.
        bottle("Tanqueray", GIN, null, 700);
        pieces("Fever-Tree Tonic", VODKA, null, 3);

        RecipeMatch gt = match(ml(50, null, GIN), new Line(2, BigDecimal.valueOf(150), RecipeUnit.ML, null, VODKA, false));

        assertThat(gt.canMake()).isTrue();
        assertThat(gt.servings()).isEqualTo(3);
    }

    @Test
    void addsPiecesToMeasuredVolume() {
        bottle("Tonic (flaska)", VODKA, null, 200);
        pieces("Tonic (burkar)", VODKA, null, 2);

        // 200 ml / 150 ml = 1, plus 2 cans.
        assertThat(match(new Line(1, BigDecimal.valueOf(150), RecipeUnit.ML, null, VODKA, false)).servings())
                .isEqualTo(3);
    }

    @Test
    void presenceIsEnoughWhenAnItemCannotBeMeasured() {
        // Mint registered as a bottle (volume) can't be counted in pieces.
        bottle("Myntsirap", 0, MINT, 10);

        assertThat(match(piece(3, MINT)).canMake()).isTrue();
    }

    @Test
    void optionalLinesDoNotAffectTheResult() {
        bottle("Tanqueray", GIN, null, 700);

        RecipeMatch match = match(ml(50, null, GIN), new Line(2, BigDecimal.ONE, RecipeUnit.PIECE, LIME, null, true));

        assertThat(match.canMake()).isTrue();
        assertThat(match.servings()).isEqualTo(14);
        assertThat(match.lines().get(1).status()).isEqualTo(LineStatus.MISSING);
    }

    @Test
    void servingsAreUnknownWhenNoLineCanBeMeasured() {
        bottle("Angostura", 0, ANGOSTURA, 100);

        RecipeMatch match = match(new Line(1, BigDecimal.TWO, RecipeUnit.DASH, ANGOSTURA, null, false), topUp(SODA));

        assertThat(match.canMake()).isTrue();
        assertThat(match.servings()).isNull();
    }

    // --- helpers ---

    private static IngredientInfo ingredient(long id, String name) {
        return new IngredientInfo(id, name, false, null, Set.of());
    }

    private void bottle(String name, long categoryId, Long ingredientId, int ml) {
        stock.add(new StockItem(nextId++, name, categoryId, parentOf(categoryId), ingredientId, UnitType.VOLUME, ml));
    }

    private void pieces(String name, long categoryId, Long ingredientId, int count) {
        stock.add(new StockItem(nextId++, name, categoryId, parentOf(categoryId), ingredientId, UnitType.COUNT, count));
    }

    private static Long parentOf(long categoryId) {
        return categoryId == GIN || categoryId == VODKA ? SPIRITS : null;
    }

    private static Line ml(int amount, Long ingredientId, Long categoryId) {
        return new Line(1, BigDecimal.valueOf(amount), RecipeUnit.ML, ingredientId, categoryId, false);
    }

    private static Line piece(int amount, long ingredientId) {
        return new Line(1, BigDecimal.valueOf(amount), RecipeUnit.PIECE, ingredientId, null, false);
    }

    private static Line topUp(long ingredientId) {
        return new Line(1, null, RecipeUnit.TOP_UP, ingredientId, null, false);
    }

    private RecipeMatch match(Line... lines) {
        return new RecipeMatcher(ingredients, stock).match(List.of(lines));
    }
}

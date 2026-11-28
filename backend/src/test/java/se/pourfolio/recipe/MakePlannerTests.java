package se.pourfolio.recipe;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.junit.jupiter.api.Test;

import se.pourfolio.inventory.UnitType;
import se.pourfolio.recipe.MakePlanner.LineKind;
import se.pourfolio.recipe.MakePlanner.LinePlan;
import se.pourfolio.recipe.MakePlanner.Plan;
import se.pourfolio.recipe.RecipeMatcher.IngredientInfo;
import se.pourfolio.recipe.RecipeMatcher.Line;
import se.pourfolio.recipe.RecipeMatcher.StockItem;

class MakePlannerTests {

    private static final long GIN = 11, CITRUS = 21, TONIC = 31, BITTERS = 41, FRESH = 51;
    private static final long CAMPARI = 100, LIME = 101, ANGOSTURA = 102, SODA = 103, BOURBON = 104, RYE = 105,
            EGG = 106, MINT = 107, SPARKLING = 108;

    private final Map<Long, IngredientInfo> ingredients = Map.of(
            CAMPARI, new IngredientInfo(CAMPARI, "Campari", false, null, Set.of()),
            LIME, new IngredientInfo(LIME, "Lime", false, new BigDecimal("30"), Set.of()),
            ANGOSTURA, new IngredientInfo(ANGOSTURA, "Angostura", true, null, Set.of()),
            SODA, new IngredientInfo(SODA, "Sodavatten", true, null, Set.of()),
            BOURBON, new IngredientInfo(BOURBON, "Bourbon", false, null, Set.of(RYE)),
            RYE, new IngredientInfo(RYE, "Rye", false, null, Set.of(BOURBON)),
            EGG, new IngredientInfo(EGG, "Ägg", false, null, Set.of()),
            MINT, new IngredientInfo(MINT, "Mynta", false, null, Set.of()),
            SPARKLING, new IngredientInfo(SPARKLING, "Mousserande", false, null, Set.of()));

    private final List<StockItem> stock = new ArrayList<>();
    private long nextId = 1;

    @Test
    void takesMillilitresFromTheBottle() {
        long campari = bottle("Campari", 0, CAMPARI, 700);

        LinePlan line = plan(1, ml(30, CAMPARI, null)).lines().getFirst();

        assertThat(line.kind()).isEqualTo(LineKind.DEDUCT);
        assertThat(line.enough()).isTrue();
        assertThat(line.deductions()).singleElement().satisfies(d -> {
            assertThat(d.item().id()).isEqualTo(campari);
            assertThat(d.amount()).isEqualTo(30);
        });
    }

    @Test
    void multipliesByServingsAndRoundsHalfMillilitres() {
        bottle("Gin", GIN, null, 700);

        assertThat(plan(3, ml(50, null, GIN)).lines().getFirst().deductions().getFirst().amount()).isEqualTo(150);
        // 22.5 ml rounds to 23.
        assertThat(plan(1, new Line(1, new BigDecimal("22.5"), RecipeUnit.ML, null, GIN, false))
                .lines().getFirst().deductions().getFirst().amount()).isEqualTo(23);
    }

    @Test
    void takesFromTheBottleWithLeastLeftFirstAndContinuesWithTheNext() {
        long full = bottle("Ny gin", GIN, null, 700);
        long almostEmpty = bottle("Gammal gin", GIN, null, 20);

        LinePlan line = plan(1, ml(50, null, GIN)).lines().getFirst();

        assertThat(line.deductions()).extracting(d -> d.item().id(), MakePlanner.Deduction::amount)
                .containsExactly(org.assertj.core.groups.Tuple.tuple(almostEmpty, 20),
                        org.assertj.core.groups.Tuple.tuple(full, 30));
        assertThat(line.alternatives()).hasSize(2);
    }

    @Test
    void takesWholeLimesForJuice() {
        long limes = pieces("Lime", CITRUS, LIME, 5);

        LinePlan one = plan(1, ml(25, LIME, null)).lines().getFirst();
        assertThat(one.deductions()).singleElement().satisfies(d -> {
            assertThat(d.item().id()).isEqualTo(limes);
            assertThat(d.amount()).isEqualTo(1);
        });
        // Two drinks: 50 ml -> 2 limes.
        assertThat(plan(2, ml(25, LIME, null)).lines().getFirst().deductions().getFirst().amount()).isEqualTo(2);
    }

    @Test
    void takesBottledLimeJuiceInMillilitres() {
        bottle("Limejuice", CITRUS, LIME, 200);

        assertThat(plan(1, piece(1, LIME)).lines().getFirst().deductions().getFirst().amount())
                .isEqualTo(30); // a whole lime ≈ 30 ml juice
    }

    @Test
    void takesOneCanPerDrink() {
        bottle("Gin", GIN, null, 700);
        long cans = pieces("Tonic", TONIC, null, 4);

        Plan plan = plan(2, ml(50, null, GIN), new Line(2, BigDecimal.valueOf(150), RecipeUnit.ML, null, TONIC, false));

        assertThat(plan.lines().get(1).deductions()).singleElement().satisfies(d -> {
            assertThat(d.item().id()).isEqualTo(cans);
            assertThat(d.amount()).isEqualTo(2);
        });
    }

    @Test
    void takesPieces() {
        pieces("Mynta", FRESH, MINT, 3);

        assertThat(plan(2, piece(1, MINT)).lines().getFirst().deductions().getFirst().amount()).isEqualTo(2);
    }

    @Test
    void takesNothingForAlwaysAvailableDashesTopUpsAndOptionalLines() {
        bottle("Mousserande", 0, SPARKLING, 750);
        bottle("Angostura", BITTERS, ANGOSTURA, 200);
        pieces("Ägg", FRESH, EGG, 6);

        Plan plan = plan(1,
                new Line(1, BigDecimal.TWO, RecipeUnit.DASH, ANGOSTURA, null, false),
                new Line(2, null, RecipeUnit.TOP_UP, SODA, null, false),
                new Line(3, null, RecipeUnit.TOP_UP, SPARKLING, null, false),
                new Line(4, BigDecimal.ONE, RecipeUnit.PIECE, EGG, null, true));

        assertThat(plan.lines()).extracting(LinePlan::kind).containsExactly(
                LineKind.ALWAYS_AVAILABLE, LineKind.ALWAYS_AVAILABLE, LineKind.NOT_DEDUCTED, LineKind.OPTIONAL);
        assertThat(plan.lines()).allSatisfy(l -> assertThat(l.deductions()).isEmpty());
        assertThat(plan.canMake()).isTrue();
    }

    @Test
    void usesSubstitutes() {
        long rye = bottle("Rittenhouse", 0, RYE, 700);

        assertThat(plan(1, ml(60, BOURBON, null)).lines().getFirst().deductions().getFirst().item().id())
                .isEqualTo(rye);
    }

    @Test
    void cannotMakeWhenSomethingIsMissingOrShort() {
        bottle("Campari", 0, CAMPARI, 40);

        assertThat(plan(1, ml(30, CAMPARI, null), ml(30, null, GIN)).canMake()).isFalse();
        // Enough for one, not for two.
        assertThat(plan(1, ml(30, CAMPARI, null)).canMake()).isTrue();
        Plan two = plan(2, ml(30, CAMPARI, null));
        assertThat(two.canMake()).isFalse();
        assertThat(two.lines().getFirst().enough()).isFalse();
    }

    // --- helpers ---

    private long bottle(String name, long categoryId, Long ingredientId, int ml) {
        long id = nextId++;
        stock.add(new StockItem(id, name, categoryId, null, ingredientId, UnitType.VOLUME, ml));
        return id;
    }

    private long pieces(String name, long categoryId, Long ingredientId, int count) {
        long id = nextId++;
        stock.add(new StockItem(id, name, categoryId, null, ingredientId, UnitType.COUNT, count));
        return id;
    }

    private static Line ml(int amount, Long ingredientId, Long categoryId) {
        return new Line(1, BigDecimal.valueOf(amount), RecipeUnit.ML, ingredientId, categoryId, false);
    }

    private static Line piece(int amount, long ingredientId) {
        return new Line(1, BigDecimal.valueOf(amount), RecipeUnit.PIECE, ingredientId, null, false);
    }

    private Plan plan(int servings, Line... lines) {
        return new MakePlanner(new RecipeMatcher(ingredients, stock)).plan(List.of(lines), servings);
    }
}

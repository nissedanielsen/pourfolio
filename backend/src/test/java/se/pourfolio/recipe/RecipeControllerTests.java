package se.pourfolio.recipe;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import com.jayway.jsonpath.JsonPath;

import se.pourfolio.TestcontainersConfiguration;

/** Recipes from the seeded collection, matched against an inventory built per test. */
@Import(TestcontainersConfiguration.class)
@SpringBootTest
@AutoConfigureMockMvc
@WithMockUser
class RecipeControllerTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbc;

    @BeforeEach
    void emptyInventory() {
        jdbc.update("DELETE FROM inventory_item");
    }

    @Test
    void seededCollectionIsComplete() {
        assertThat(jdbc.queryForObject("SELECT count(*) FROM recipe", Integer.class)).isGreaterThanOrEqualTo(40);
        // Every recipe has at least two required lines (catches lines lost to a mistyped recipe code).
        List<String> tooShort = jdbc.queryForList("""
                SELECT r.code FROM recipe r
                WHERE (SELECT count(*) FROM recipe_ingredient l WHERE l.recipe_id = r.id AND NOT l.optional) < 2
                """, String.class);
        assertThat(tooShort).isEmpty();
    }

    @Test
    void nothingCanBeMadeFromAnEmptyBar() throws Exception {
        mockMvc.perform(get("/api/recipes").param("filter", "CAN_MAKE"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void listsWhatCanBeMadeWithServings() throws Exception {
        stockNegroniBar();

        String body = mockMvc.perform(get("/api/recipes").param("filter", "CAN_MAKE"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        List<String> names = JsonPath.read(body, "$[*].name");
        assertThat(names).containsExactly("Americano", "Negroni");
        // 100 ml Campari / 30 ml per drink.
        List<Integer> negroniServings = JsonPath.read(body, "$[?(@.code == 'negroni')].servings");
        assertThat(negroniServings).containsExactly(3);
    }

    @Test
    void listsRecipesMissingOneThingWithWhatIsMissing() throws Exception {
        stockNegroniBar();

        mockMvc.perform(get("/api/recipes").param("filter", "MISSING_ONE"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].code", hasItem("boulevardier")))
                .andExpect(jsonPath("$[*].code", hasItem("gin_tonic")))
                .andExpect(jsonPath("$[*].code", not(hasItem("negroni"))))
                .andExpect(jsonPath("$[?(@.code == 'boulevardier')].missing[0].name").value("Bourbon"))
                .andExpect(jsonPath("$[?(@.code == 'boulevardier')].missing[0].status").value("MISSING"))
                .andExpect(jsonPath("$[?(@.code == 'gin_tonic')].missing[0].name").value("Tonic"));
    }

    @Test
    void allRecipesAreListedWithMakeableFirst() throws Exception {
        stockNegroniBar();

        String body = mockMvc.perform(get("/api/recipes")).andReturn().getResponse().getContentAsString();
        List<Boolean> canMake = JsonPath.read(body, "$[*].canMake");
        List<Integer> missing = JsonPath.read(body, "$[*].missingCount");

        assertThat(canMake).hasSizeGreaterThanOrEqualTo(40);
        assertThat(canMake.subList(0, 2)).containsOnly(true);
        assertThat(missing).isSorted();
    }

    @Test
    void reportsNotEnoughWithAmounts() throws Exception {
        long gin = item("Gin", "gin", null, 700);
        item("Campari", "bitter_liqueur", "campari", 20);
        item("Röd vermouth", "vermouth", "sweet_vermouth", 750);

        mockMvc.perform(get("/api/recipes/" + recipeId("negroni")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.canMake").value(false))
                .andExpect(jsonPath("$.lines[1].name").value("Campari"))
                .andExpect(jsonPath("$.lines[1].status").value("NOT_ENOUGH"))
                .andExpect(jsonPath("$.lines[1].needed").value(30))
                .andExpect(jsonPath("$.lines[1].available").value(20))
                .andExpect(jsonPath("$.lines[0].matchedItems[0].id").value(gin));
    }

    @Test
    void showsRecipeDetailWithLineStatuses() throws Exception {
        stockNegroniBar();

        mockMvc.perform(get("/api/recipes/" + recipeId("americano")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Americano"))
                .andExpect(jsonPath("$.method").isNotEmpty())
                .andExpect(jsonPath("$.canMake").value(true))
                .andExpect(jsonPath("$.lines[0].matchedItems[0].name").value("Campari"))
                .andExpect(jsonPath("$.lines[2].name").value("Sodavatten"))
                .andExpect(jsonPath("$.lines[2].unit").value("TOP_UP"))
                .andExpect(jsonPath("$.lines[2].status").value("ALWAYS_AVAILABLE"));

        mockMvc.perform(get("/api/recipes/" + recipeId("negroni")))
                .andExpect(jsonPath("$.lines[0].name").value("Gin"))
                .andExpect(jsonPath("$.lines[0].anyOfCategory").value(true));
    }

    @Test
    void sugarSimpleSyrupSaltIceAndWaterAreAlwaysAtHome() throws Exception {
        assertThat(jdbc.queryForList("SELECT code FROM ingredient WHERE always_available ORDER BY code", String.class))
                .containsExactly("ice", "salt", "simple_syrup", "soda_water", "sugar", "water");

        // Old Fashioned: bourbon, simple syrup and bitters – only bourbon and bitters are registered.
        item("Buffalo Trace", "whisky", "bourbon", 700);
        item("Angostura", "aromatic_bitters", "angostura", 200);

        mockMvc.perform(get("/api/recipes/" + recipeId("old_fashioned")))
                .andExpect(jsonPath("$.canMake").value(true))
                .andExpect(jsonPath("$.lines[1].name").value("Sockerlag"))
                .andExpect(jsonPath("$.lines[1].status").value("ALWAYS_AVAILABLE"));
    }

    @Test
    void usesSubstitutes() throws Exception {
        item("Rittenhouse Rye", "whisky", "rye", 700);
        item("Campari", "bitter_liqueur", "campari", 700);
        item("Röd vermouth", "vermouth", "sweet_vermouth", 750);

        mockMvc.perform(get("/api/recipes/" + recipeId("boulevardier")))
                .andExpect(jsonPath("$.canMake").value(true))
                .andExpect(jsonPath("$.lines[0].name").value("Bourbon"))
                .andExpect(jsonPath("$.lines[0].usesSubstitute").value(true));
    }

    @Test
    void suggestsWhatToBuy() throws Exception {
        stockNegroniBar();

        mockMvc.perform(get("/api/recipes/shopping-suggestions"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].name", hasItem("Bourbon")))
                .andExpect(jsonPath("$[?(@.name == 'Tonic')].recipes[*].name", hasItem("Gin & Tonic")))
                .andExpect(jsonPath("$.length()").value(org.hamcrest.Matchers.lessThanOrEqualTo(
                        RecipeService.MAX_SHOPPING_SUGGESTIONS)));
    }

    @Test
    void returnsNotFoundForUnknownRecipe() throws Exception {
        mockMvc.perform(get("/api/recipes/999999")).andExpect(status().isNotFound());
    }

    @Test
    void inventoryItemsCanBeLinkedToAnIngredientInTheSameCategory() throws Exception {
        long campari = ingredientId("campari");

        create(categoryId("bitter_liqueur"), "Campari", campari)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.ingredient.name").value("Campari"));

        create(categoryId("gin"), "Inte Campari", campari)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.ingredientId").value("ingredient does not belong to the category"));

        create(categoryId("gin"), "Okänd", 999_999L)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.ingredientId").value("ingredient does not exist"));
    }

    @Test
    void listsIngredients() throws Exception {
        mockMvc.perform(get("/api/ingredients"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.code == 'campari')].categoryId", hasItem((int) categoryId("bitter_liqueur"))))
                .andExpect(jsonPath("$[?(@.code == 'ice')].alwaysAvailable", hasItem(true)));
    }

    // --- helpers ---

    /** Gin, Campari (100 ml) and sweet vermouth: enough for Negroni and Americano. */
    private void stockNegroniBar() {
        item("Tanqueray", "gin", null, 700);
        item("Campari", "bitter_liqueur", "campari", 100);
        item("Röd vermouth", "vermouth", "sweet_vermouth", 750);
    }

    private long item(String name, String categoryCode, String ingredientCode, int ml) {
        return jdbc.queryForObject("""
                INSERT INTO inventory_item (category_id, ingredient_id, name, unit_type, capacity, remaining)
                VALUES ((SELECT id FROM category WHERE code = ?),
                        (SELECT id FROM ingredient WHERE code = ?), ?, 'VOLUME', ?, ?)
                RETURNING id""", Long.class, categoryCode, ingredientCode, name, Math.max(ml, 1), ml);
    }

    private ResultActions create(long categoryId, String name, Long ingredientId) throws Exception {
        String body = new tools.jackson.databind.json.JsonMapper().writeValueAsString(Map.of(
                "categoryId", categoryId, "name", name, "unitType", "VOLUME", "capacity", 700, "remaining", 700,
                "ingredientId", ingredientId));
        return mockMvc.perform(post("/api/inventory-items").contentType(MediaType.APPLICATION_JSON).content(body));
    }

    private long recipeId(String code) {
        return jdbc.queryForObject("SELECT id FROM recipe WHERE code = ?", Long.class, code);
    }

    private long ingredientId(String code) {
        return jdbc.queryForObject("SELECT id FROM ingredient WHERE code = ?", Long.class, code);
    }

    private long categoryId(String code) {
        return jdbc.queryForObject("SELECT id FROM category WHERE code = ?", Long.class, code);
    }
}

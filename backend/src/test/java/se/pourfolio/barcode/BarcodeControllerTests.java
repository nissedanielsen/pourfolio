package se.pourfolio.barcode;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Map;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import com.jayway.jsonpath.JsonPath;

import se.pourfolio.TestcontainersConfiguration;
import tools.jackson.databind.json.JsonMapper;

@Import(TestcontainersConfiguration.class)
@SpringBootTest
@AutoConfigureMockMvc
@WithMockUser
class BarcodeControllerTests {

    private static final String HENDRICKS = "5010327755014";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbc;

    @MockitoBean
    private OpenFoodFactsClient openFoodFacts;

    @BeforeEach
    void clean() {
        jdbc.update("DELETE FROM inventory_item");
        jdbc.update("DELETE FROM known_product");
        when(openFoodFacts.lookup(anyString())).thenReturn(Optional.empty());
    }

    @Test
    void rejectsInvalidBarcodes() throws Exception {
        mockMvc.perform(get("/api/barcodes/5010327755015"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.barcode").value("invalid barcode"));
    }

    @Test
    void reportsUnknownBarcodes() throws Exception {
        mockMvc.perform(get("/api/barcodes/" + HENDRICKS))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.barcode").value(HENDRICKS))
                .andExpect(jsonPath("$.source").value("NONE"))
                .andExpect(jsonPath("$.suggestion").doesNotExist())
                .andExpect(jsonPath("$.existingItems.length()").value(0))
                .andExpect(jsonPath("$.externalLookupFailed").value(false));
    }

    @Test
    void suggestsFromOpenFoodFactsWithCategoryFromTags() throws Exception {
        offReturns("5010327755014");

        mockMvc.perform(get("/api/barcodes/" + HENDRICKS))
                .andExpect(jsonPath("$.source").value("OPEN_FOOD_FACTS"))
                .andExpect(jsonPath("$.suggestion.name").value("Hendrick’s Gin"))
                .andExpect(jsonPath("$.suggestion.brand").value("Hendrick's"))
                .andExpect(jsonPath("$.suggestion.capacity").value(700))
                .andExpect(jsonPath("$.suggestion.abv").value(41.7))
                .andExpect(jsonPath("$.suggestion.unitType").value("VOLUME"))
                .andExpect(jsonPath("$.suggestion.categoryId").value(categoryId("gin")));
    }

    @Test
    void guessesCategoryFromIngredientOrName() throws Exception {
        // Campari is only tagged "liqueurs": the ingredient gives the category.
        offReturns("8000040001106");
        mockMvc.perform(get("/api/barcodes/8000040001106"))
                .andExpect(jsonPath("$.suggestion.categoryId").value(categoryId("bitter_liqueur")))
                .andExpect(jsonPath("$.suggestion.ingredientId").value(ingredientId("campari")));

        // Tanqueray has no tags at all: "Gin" in the name gives the category.
        offReturns("5000291020706");
        mockMvc.perform(get("/api/barcodes/5000291020706"))
                .andExpect(jsonPath("$.suggestion.categoryId").value(categoryId("gin")));

        offReturns("5011007003005");
        mockMvc.perform(get("/api/barcodes/5011007003005"))
                .andExpect(jsonPath("$.suggestion.categoryId").value(categoryId("whisky")));
    }

    @Test
    void reportsWhenOpenFoodFactsIsUnavailable() throws Exception {
        when(openFoodFacts.lookup(anyString()))
                .thenThrow(new OpenFoodFactsClient.UnavailableException(new RuntimeException("down")));

        mockMvc.perform(get("/api/barcodes/" + HENDRICKS))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.source").value("NONE"))
                .andExpect(jsonPath("$.externalLookupFailed").value(true));
    }

    @Test
    void remembersSavedProductsEvenAfterTheItemIsDeleted() throws Exception {
        String body = createItem(Map.of("categoryId", categoryId("gin"), "name", "Hendrick's", "brand", "Hendrick's",
                "abv", 41.4, "unitType", "VOLUME", "capacity", 700, "remaining", 350, "barcode", HENDRICKS))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.barcode").value(HENDRICKS))
                .andReturn().getResponse().getContentAsString();
        long id = ((Number) JsonPath.read(body, "$.id")).longValue();

        mockMvc.perform(get("/api/barcodes/" + HENDRICKS))
                .andExpect(jsonPath("$.source").value("KNOWN_PRODUCT"))
                .andExpect(jsonPath("$.suggestion.name").value("Hendrick's"))
                .andExpect(jsonPath("$.suggestion.abv").value(41.4))
                .andExpect(jsonPath("$.suggestion.capacity").value(700))
                .andExpect(jsonPath("$.suggestion.categoryId").value(categoryId("gin")))
                .andExpect(jsonPath("$.existingItems[0].id").value(id))
                .andExpect(jsonPath("$.existingItems[0].remaining").value(350));

        mockMvc.perform(delete("/api/inventory-items/" + id)).andExpect(status().isNoContent());

        mockMvc.perform(get("/api/barcodes/" + HENDRICKS))
                .andExpect(jsonPath("$.source").value("KNOWN_PRODUCT"))
                .andExpect(jsonPath("$.existingItems.length()").value(0));
        // Known products never go to Open Food Facts.
        verify(openFoodFacts, never()).lookup(anyString());
    }

    @Test
    void rejectsInvalidBarcodeOnItems() throws Exception {
        createItem(Map.of("categoryId", categoryId("gin"), "name", "Gin", "unitType", "VOLUME", "capacity", 700,
                "remaining", 700, "barcode", "12345"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.barcode").value("invalid barcode"));
    }

    private void offReturns(String fixture) {
        when(openFoodFacts.lookup(anyString())).thenReturn(Optional.of(OpenFoodFactsProductTests.fixture(fixture)));
    }

    private ResultActions createItem(Map<String, Object> fields) throws Exception {
        return mockMvc.perform(post("/api/inventory-items").contentType(MediaType.APPLICATION_JSON)
                .content(JsonMapper.builder().build().writeValueAsString(fields)));
    }

    private long categoryId(String code) {
        return jdbc.queryForObject("SELECT id FROM category WHERE code = ?", Long.class, code);
    }

    private long ingredientId(String code) {
        return jdbc.queryForObject("SELECT id FROM ingredient WHERE code = ?", Long.class, code);
    }
}

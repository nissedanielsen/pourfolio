package se.pourfolio.inventory;

import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.endsWith;
import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import com.jayway.jsonpath.JsonPath;

import se.pourfolio.TestcontainersConfiguration;

@Import(TestcontainersConfiguration.class)
@SpringBootTest
@AutoConfigureMockMvc
// The API requires sign-in; these tests are about the API itself (see AuthControllerTests).
@WithMockUser
class InventoryItemControllerTests {

    private static final String URL = "/api/inventory-items";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbc;

    private long gin;
    private long vodka;
    private long bitterLiqueur;
    private long citrus;
    private long spirits;

    @BeforeEach
    void setUp() {
        jdbc.update("DELETE FROM inventory_item");
        gin = categoryId("gin");
        vodka = categoryId("vodka");
        bitterLiqueur = categoryId("bitter_liqueur");
        citrus = categoryId("citrus");
        spirits = categoryId("spirits");
    }

    @Test
    void createsAndFetchesItem() throws Exception {
        String body = create(gin, "Tanqueray London Dry", "Tanqueray", "43.1", "VOLUME", 700, 700)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id", notNullValue()))
                .andExpect(jsonPath("$.category.code").value("gin"))
                .andExpect(jsonPath("$.category.name").value("Gin"))
                .andExpect(jsonPath("$.abv").value(43.1))
                .andExpect(jsonPath("$.createdAt", notNullValue()))
                .andReturn().getResponse().getContentAsString();
        long id = idFrom(body);

        mockMvc.perform(get(URL + "/" + id))
                .andExpect(status().isOk())
                .andExpect(header().doesNotExist("Location"))
                .andExpect(jsonPath("$.name").value("Tanqueray London Dry"))
                .andExpect(jsonPath("$.capacity").value(700))
                .andExpect(jsonPath("$.remaining").value(700));
    }

    @Test
    void returnsLocationHeaderOnCreate() throws Exception {
        String body = create(gin, "Gin", null, "40", "VOLUME", 700, 700)
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        create(gin, "Gin", null, "40", "VOLUME", 700, 700)
                .andExpect(header().string("Location", endsWith(URL + "/" + (idFrom(body) + 1))));
    }

    @Test
    void allowsCountItemsWithoutAbv() throws Exception {
        mockMvc.perform(post(URL).contentType(MediaType.APPLICATION_JSON).content("""
                {"categoryId": %d, "name": "Lime", "unitType": "COUNT", "capacity": 6, "remaining": 4}
                """.formatted(citrus)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.unitType").value("COUNT"))
                .andExpect(jsonPath("$.abv").doesNotExist());
    }

    @Test
    void rejectsInvalidBodyWithFieldErrors() throws Exception {
        mockMvc.perform(post(URL).contentType(MediaType.APPLICATION_JSON).content("""
                {"categoryId": %d, "name": " ", "abv": 120, "unitType": "VOLUME", "capacity": 0, "remaining": -1}
                """.formatted(gin)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.errors.name", notNullValue()))
                .andExpect(jsonPath("$.errors.abv", notNullValue()))
                .andExpect(jsonPath("$.errors.capacity", notNullValue()))
                .andExpect(jsonPath("$.errors.remaining", notNullValue()));
    }

    @Test
    void rejectsRemainingGreaterThanCapacity() throws Exception {
        create(gin, "Gin", null, "40", "VOLUME", 700, 800)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.remaining").value("must not be greater than capacity"));
    }

    @Test
    void rejectsTopLevelAndUnknownCategories() throws Exception {
        create(spirits, "Gin", null, "40", "VOLUME", 700, 700)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.categoryId").value("must be a subcategory"));

        create(999_999, "Gin", null, "40", "VOLUME", 700, 700)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.categoryId").value("category does not exist"));
    }

    @Test
    void updatesItem() throws Exception {
        long id = createdId(gin, "Gin", "40", 700, 700);

        mockMvc.perform(put(URL + "/" + id).contentType(MediaType.APPLICATION_JSON).content("""
                {"categoryId": %d, "name": "Absolut", "brand": "Absolut", "abv": 40, "unitType": "VOLUME",
                 "capacity": 1000, "remaining": 500, "notes": "Från taxfree"}
                """.formatted(vodka)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.category.code").value("vodka"))
                .andExpect(jsonPath("$.name").value("Absolut"))
                .andExpect(jsonPath("$.capacity").value(1000))
                .andExpect(jsonPath("$.notes").value("Från taxfree"));
    }

    @Test
    void updatesRemaining() throws Exception {
        long id = createdId(gin, "Gin", "40", 700, 700);

        mockMvc.perform(patch(URL + "/" + id + "/remaining").contentType(MediaType.APPLICATION_JSON)
                .content("{\"remaining\": 250}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.remaining").value(250));

        mockMvc.perform(patch(URL + "/" + id + "/remaining").contentType(MediaType.APPLICATION_JSON)
                .content("{\"remaining\": 701}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void deletesItem() throws Exception {
        long id = createdId(gin, "Gin", "40", 700, 700);

        mockMvc.perform(delete(URL + "/" + id)).andExpect(status().isNoContent());
        mockMvc.perform(get(URL + "/" + id)).andExpect(status().isNotFound());
        mockMvc.perform(delete(URL + "/" + id)).andExpect(status().isNotFound());
    }

    @Test
    void returnsNotFoundAsProblemDetail() throws Exception {
        mockMvc.perform(get(URL + "/123456"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.detail").value("Inventory item with id 123456 was not found"));
    }

    @Test
    void searchesAndFilters() throws Exception {
        create(gin, "Tanqueray London Dry", "Tanqueray", "43.1", "VOLUME", 700, 600);
        create(gin, "Hendrick's", "Hendrick's", "41.4", "VOLUME", 700, 100);
        create(vodka, "Absolut Vodka", "Absolut", "40", "VOLUME", 1000, 1000);
        create(bitterLiqueur, "Campari", "Campari", "25", "VOLUME", 700, 0);
        mockMvc.perform(post(URL).contentType(MediaType.APPLICATION_JSON).content("""
                {"categoryId": %d, "name": "Lime", "unitType": "COUNT", "capacity": 6, "remaining": 6}
                """.formatted(citrus)));

        // Default sort is by name; paging metadata is present.
        mockMvc.perform(get(URL))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(5))
                .andExpect(jsonPath("$.content[*].name", contains(
                        "Absolut Vodka", "Campari", "Hendrick's", "Lime", "Tanqueray London Dry")));

        // Free text matches name, brand or category name, case-insensitively.
        mockMvc.perform(get(URL).param("q", "tanq"))
                .andExpect(jsonPath("$.content[*].name", contains("Tanqueray London Dry")));
        mockMvc.perform(get(URL).param("q", "GIN"))
                .andExpect(jsonPath("$.content[*].name", contains("Hendrick's", "Tanqueray London Dry")));

        // A top-level category includes its subcategories.
        mockMvc.perform(get(URL).param("categoryId", String.valueOf(spirits)))
                .andExpect(jsonPath("$.content[*].name", containsInAnyOrder(
                        "Absolut Vodka", "Hendrick's", "Tanqueray London Dry")));

        mockMvc.perform(get(URL).param("minAbv", "41").param("maxAbv", "42"))
                .andExpect(jsonPath("$.content[*].name", contains("Hendrick's")));

        mockMvc.perform(get(URL).param("unitType", "COUNT"))
                .andExpect(jsonPath("$.content[*].name", contains("Lime")));

        // Low stock: at most a quarter left, including empty.
        mockMvc.perform(get(URL).param("lowStock", "true"))
                .andExpect(jsonPath("$.content[*].name", contains("Campari", "Hendrick's")));

        mockMvc.perform(get(URL).param("sort", "abv,desc").param("size", "2"))
                .andExpect(jsonPath("$.content[*].name", contains("Tanqueray London Dry", "Hendrick's")))
                .andExpect(jsonPath("$.size").value(2))
                .andExpect(jsonPath("$.totalPages").value(3));
    }

    @Test
    void sortsNamesInSwedishOrder() throws Exception {
        for (String name : new String[] {"Örnbo", "ägglikör", "Zubrowka", "Ångström", "absolut"}) {
            create(gin, name, null, "40", "VOLUME", 700, 700).andExpect(status().isCreated());
        }

        mockMvc.perform(get(URL))
                .andExpect(jsonPath("$.content[*].name", contains(
                        "absolut", "Zubrowka", "Ångström", "ägglikör", "Örnbo")));
    }

    @Test
    void rejectsUnknownSortProperty() throws Exception {
        mockMvc.perform(get(URL).param("sort", "nope"))
                .andExpect(status().isBadRequest());
    }

    private ResultActions create(long categoryId, String name, String brand, String abv, String unitType,
            int capacity, int remaining) throws Exception {
        String brandJson = brand == null ? "null" : "\"" + brand + "\"";
        return mockMvc.perform(post(URL).contentType(MediaType.APPLICATION_JSON).content("""
                {"categoryId": %d, "name": "%s", "brand": %s, "abv": %s, "unitType": "%s",
                 "capacity": %d, "remaining": %d}
                """.formatted(categoryId, name, brandJson, abv, unitType, capacity, remaining)));
    }

    private long createdId(long categoryId, String name, String abv, int capacity, int remaining)
            throws Exception {
        String body = create(categoryId, name, null, abv, "VOLUME", capacity, remaining)
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return idFrom(body);
    }

    private long categoryId(String code) {
        return jdbc.queryForObject("SELECT id FROM category WHERE code = ?", Long.class, code);
    }

    private static long idFrom(String json) {
        return ((Number) JsonPath.read(json, "$.id")).longValue();
    }
}

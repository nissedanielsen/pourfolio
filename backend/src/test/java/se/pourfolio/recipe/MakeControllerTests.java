package se.pourfolio.recipe;

import static org.assertj.core.api.Assertions.assertThat;
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
import tools.jackson.databind.json.JsonMapper;

/** "Jag gjorde den!" against the seeded Gimlet: gin, lime and simple syrup (always at home). */
@Import(TestcontainersConfiguration.class)
@SpringBootTest
@AutoConfigureMockMvc
@WithMockUser
class MakeControllerTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbc;

    private long gimlet;
    private long gin;
    private long limes;

    @BeforeEach
    void stockGimletBar() {
        jdbc.update("DELETE FROM drink_log");
        jdbc.update("DELETE FROM inventory_item");
        gimlet = jdbc.queryForObject("SELECT id FROM recipe WHERE code = 'gimlet'", Long.class);
        gin = item("Tanqueray", "gin", null, "VOLUME", 700, 700);
        limes = item("Lime", "citrus", "lime", "COUNT", 6, 3);
    }

    @Test
    void plansWhatToTake() throws Exception {
        mockMvc.perform(get("/api/recipes/" + gimlet + "/make-plan"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.recipeName").value("Gimlet"))
                .andExpect(jsonPath("$.servings").value(1))
                .andExpect(jsonPath("$.canMake").value(true))
                // 6 cl gin
                .andExpect(jsonPath("$.lines[0].kind").value("DEDUCT"))
                .andExpect(jsonPath("$.lines[0].deductions[0].itemId").value(gin))
                .andExpect(jsonPath("$.lines[0].deductions[0].amount").value(60))
                .andExpect(jsonPath("$.lines[0].deductions[0].remainingBefore").value(700))
                // 2 cl lime juice -> one whole lime
                .andExpect(jsonPath("$.lines[1].deductions[0].itemId").value(limes))
                .andExpect(jsonPath("$.lines[1].deductions[0].amount").value(1))
                .andExpect(jsonPath("$.lines[1].deductions[0].unitType").value("COUNT"))
                // simple syrup is always at home
                .andExpect(jsonPath("$.lines[2].kind").value("ALWAYS_AVAILABLE"))
                .andExpect(jsonPath("$.lines[2].deductions.length()").value(0));
    }

    @Test
    void plansSeveralDrinks() throws Exception {
        mockMvc.perform(get("/api/recipes/" + gimlet + "/make-plan").param("servings", "2"))
                .andExpect(jsonPath("$.lines[0].deductions[0].amount").value(120))
                .andExpect(jsonPath("$.lines[1].deductions[0].amount").value(2));

        // Three limes (≈ 9 cl juice) are not enough for five Gimlets (5 × 2 cl = 10 cl).
        mockMvc.perform(get("/api/recipes/" + gimlet + "/make-plan").param("servings", "5"))
                .andExpect(jsonPath("$.canMake").value(false))
                .andExpect(jsonPath("$.lines[1].enough").value(false));
    }

    @Test
    void takesFromTheInventoryAndLogsIt() throws Exception {
        String body = make(1, Map.of(gin, 60, limes, 1))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.recipeName").value("Gimlet"))
                .andReturn().getResponse().getContentAsString();

        assertThat(remaining(gin)).isEqualTo(640);
        assertThat(remaining(limes)).isEqualTo(2);
        long logId = ((Number) JsonPath.read(body, "$.drinkLogId")).longValue();
        assertThat(jdbc.queryForObject("SELECT servings FROM drink_log WHERE id = ?", Integer.class, logId)).isOne();
        assertThat(jdbc.queryForList("SELECT amount FROM drink_log_entry WHERE drink_log_id = ? ORDER BY amount",
                Integer.class, logId)).containsExactly(1, 60);
    }

    @Test
    void refusesWhenSomethingIsMissing() throws Exception {
        jdbc.update("UPDATE inventory_item SET remaining = 0 WHERE id = ?", limes);

        make(1, Map.of(gin, 60))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.servings").value("not everything needed is at home"));
        assertThat(remaining(gin)).isEqualTo(700);
    }

    @Test
    void refusesToTakeMoreThanIsLeftAndChangesNothing() throws Exception {
        make(1, Map.of(gin, 60, limes, 4))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.deductions").value("not enough left"));

        assertThat(remaining(gin)).isEqualTo(700);
        assertThat(remaining(limes)).isEqualTo(3);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM drink_log", Integer.class)).isZero();
    }

    @Test
    void validatesTheRequest() throws Exception {
        mockMvc.perform(get("/api/recipes/" + gimlet + "/make-plan").param("servings", "0"))
                .andExpect(status().isBadRequest());
        make(0, Map.of(gin, 60)).andExpect(status().isBadRequest());
        make(1, Map.of()).andExpect(status().isBadRequest());
        mockMvc.perform(get("/api/recipes/999999/make-plan")).andExpect(status().isNotFound());
    }

    @Test
    void undoPutsEverythingBack() throws Exception {
        long logId = madeOneGimlet();

        mockMvc.perform(post("/api/drink-log/" + logId + "/undo")).andExpect(status().isNoContent());

        assertThat(remaining(gin)).isEqualTo(700);
        assertThat(remaining(limes)).isEqualTo(3);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM drink_log", Integer.class)).isZero();
        mockMvc.perform(post("/api/drink-log/" + logId + "/undo")).andExpect(status().isNotFound());
    }

    @Test
    void undoSkipsItemsDeletedSince() throws Exception {
        long logId = madeOneGimlet();
        jdbc.update("DELETE FROM inventory_item WHERE id = ?", limes);

        mockMvc.perform(post("/api/drink-log/" + logId + "/undo")).andExpect(status().isNoContent());

        assertThat(remaining(gin)).isEqualTo(700);
    }

    @Test
    void undoIsOnlyPossibleShortlyAfter() throws Exception {
        long logId = madeOneGimlet();
        jdbc.update("UPDATE drink_log SET made_at = now() - interval '1 hour' WHERE id = ?", logId);

        mockMvc.perform(post("/api/drink-log/" + logId + "/undo"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.drinkLogId").value("too late to undo"));
        assertThat(remaining(gin)).isEqualTo(640);
    }

    // --- helpers ---

    private long madeOneGimlet() throws Exception {
        String body = make(1, Map.of(gin, 60, limes, 1)).andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return ((Number) JsonPath.read(body, "$.drinkLogId")).longValue();
    }

    private ResultActions make(int servings, Map<Long, Integer> deductions) throws Exception {
        List<Map<String, Object>> list = deductions.entrySet().stream()
                .map(e -> Map.<String, Object>of("itemId", e.getKey(), "amount", e.getValue()))
                .toList();
        String body = JsonMapper.builder().build()
                .writeValueAsString(Map.of("servings", servings, "deductions", list));
        return mockMvc.perform(post("/api/recipes/" + gimlet + "/make")
                .contentType(MediaType.APPLICATION_JSON).content(body));
    }

    private long item(String name, String categoryCode, String ingredientCode, String unitType, int capacity,
            int remaining) {
        return jdbc.queryForObject("""
                INSERT INTO inventory_item (category_id, ingredient_id, name, unit_type, capacity, remaining)
                VALUES ((SELECT id FROM category WHERE code = ?), (SELECT id FROM ingredient WHERE code = ?),
                        ?, ?, ?, ?)
                RETURNING id""", Long.class, categoryCode, ingredientCode, name, unitType, capacity, remaining);
    }

    private int remaining(long itemId) {
        return jdbc.queryForObject("SELECT remaining FROM inventory_item WHERE id = ?", Integer.class, itemId);
    }
}

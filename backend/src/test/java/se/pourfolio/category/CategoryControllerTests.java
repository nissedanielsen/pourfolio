package se.pourfolio.category;

import static org.hamcrest.Matchers.empty;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import se.pourfolio.TestcontainersConfiguration;

@Import(TestcontainersConfiguration.class)
@SpringBootTest
@AutoConfigureMockMvc
// The API requires sign-in; these tests are about the API itself (see AuthControllerTests).
@WithMockUser
class CategoryControllerTests {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void returnsSeededTreeInDisplayOrder() throws Exception {
        mockMvc.perform(get("/api/categories"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(9)))
                .andExpect(jsonPath("$[0].code").value("spirits"))
                .andExpect(jsonPath("$[0].name").value("Sprit"))
                .andExpect(jsonPath("$[0].children[0].code").value("gin"))
                .andExpect(jsonPath("$[0].children[0].children", empty()))
                .andExpect(jsonPath("$[7].code").value("fresh"))
                .andExpect(jsonPath("$[7].children[*].code", hasItem("citrus")));
    }
}

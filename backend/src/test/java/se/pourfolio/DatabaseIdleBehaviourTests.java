package se.pourfolio;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import javax.sql.DataSource;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

import com.zaxxer.hikari.HikariDataSource;

/**
 * The hosted database (Neon) suspends when it isn't used. These settings make sure the app
 * doesn't keep it awake: no idle pool connections, and a health check for the hosting
 * platform that doesn't query the database.
 */
@Import(TestcontainersConfiguration.class)
// Show health components so the test can see which checks each endpoint runs.
@SpringBootTest(properties = {
		"management.endpoint.health.show-components=always",
		"management.endpoint.health.group.liveness.show-components=always" })
@AutoConfigureMockMvc
class DatabaseIdleBehaviourTests {

	@Autowired
	private DataSource dataSource;

	@Autowired
	private MockMvc mockMvc;

	@Test
	void poolDoesNotKeepIdleConnections() {
		HikariDataSource hikari = (HikariDataSource) dataSource;
		assertThat(hikari.getMinimumIdle()).isZero();
		assertThat(hikari.getIdleTimeout()).isEqualTo(60_000);
		assertThat(hikari.getMaximumPoolSize()).isEqualTo(5);
	}

	@Test
	void livenessCheckDoesNotQueryTheDatabase() throws Exception {
		mockMvc.perform(get("/actuator/health/liveness"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.status").value("UP"))
				.andExpect(jsonPath("$.components.livenessState").exists())
				.andExpect(jsonPath("$.components.db").doesNotExist());
	}

	@Test
	void fullHealthCheckStillIncludesTheDatabase() throws Exception {
		mockMvc.perform(get("/actuator/health"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.components.db.status").value("UP"));
	}
}

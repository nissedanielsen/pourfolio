package se.pourfolio;

import org.springframework.boot.SpringApplication;

public class TestPourfolioBackendApplication {

	public static void main(String[] args) {
		SpringApplication.from(PourfolioBackendApplication::main).with(TestcontainersConfiguration.class).run(args);
	}

}

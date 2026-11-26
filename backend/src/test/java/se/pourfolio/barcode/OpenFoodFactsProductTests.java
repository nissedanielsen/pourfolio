package se.pourfolio.barcode;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;

import org.junit.jupiter.api.Test;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/** Parsing real (saved) Open Food Facts responses, whose data is uneven. */
class OpenFoodFactsProductTests {

    static OpenFoodFactsProduct fixture(String name) {
        return OpenFoodFactsProduct.fromResponse(json(name)).orElseThrow();
    }

    static JsonNode json(String name) {
        try (InputStream in = OpenFoodFactsProductTests.class.getResourceAsStream("/openfoodfacts/" + name + ".json")) {
            return JsonMapper.builder().build().readTree(new String(in.readAllBytes(), StandardCharsets.UTF_8));
        } catch (IOException e) {
            throw new IllegalStateException(e);
        }
    }

    @Test
    void parsesHendricks() {
        OpenFoodFactsProduct p = fixture("5010327755014");
        // English name preferred over the generic "Gin".
        assertThat(p.name()).isEqualTo("Hendrick’s Gin");
        assertThat(p.brand()).isEqualTo("Hendrick's");
        assertThat(p.millilitres()).isEqualTo(700); // "0.7l"
        assertThat(p.abv()).isEqualByComparingTo("41.7");
        assertThat(p.categoryTags()).contains("en:gins");
    }

    @Test
    void prependsBrandAndParsesMillilitres() {
        OpenFoodFactsProduct p = fixture("5000291020706");
        assertThat(p.name()).isEqualTo("Tanqueray London Dry Gin");
        assertThat(p.millilitres()).isEqualTo(750); // "750ml"
        assertThat(p.abv()).isEqualByComparingTo("47.3");
    }

    @Test
    void skipsNonLatinNamesAndStripsTrailingAbv() {
        OpenFoodFactsProduct p = fixture("5011007003005");
        // The default name is Cyrillic; the English one is "Whisky 40%".
        assertThat(p.name()).isEqualTo("Jameson Whisky");
        assertThat(p.millilitres()).isEqualTo(700); // "700 g"
    }

    @Test
    void toleratesMissingAbv() {
        OpenFoodFactsProduct p = fixture("8000040001106");
        assertThat(p.name()).isEqualTo("Campari");
        assertThat(p.abv()).isNull();
    }

    @Test
    void treatsEmptyProductAsNotFound() {
        assertThat(OpenFoodFactsProduct.fromResponse(json("not-found"))).isEmpty();
    }

    @Test
    void parsesQuantities() {
        assertThat(OpenFoodFactsProduct.millilitres("75 cl")).isEqualTo(750);
        assertThat(OpenFoodFactsProduct.millilitres("0,5 l")).isEqualTo(500);
        assertThat(OpenFoodFactsProduct.millilitres("1 L")).isEqualTo(1000);
        assertThat(OpenFoodFactsProduct.millilitres("33cl x 4")).isEqualTo(330);
        assertThat(OpenFoodFactsProduct.millilitres("2 kg")).isEqualTo(2000);
        assertThat(OpenFoodFactsProduct.millilitres("a bottle")).isNull();
        assertThat(OpenFoodFactsProduct.millilitres("500 l")).isNull(); // not a bottle
    }
}

package se.pourfolio.barcode;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import tools.jackson.databind.JsonNode;

/**
 * The parts of an Open Food Facts product we use, already cleaned up. Their data is
 * crowd-sourced and uneven (names in any language, volumes as "0.7l", "75 cl" or even
 * "700 g"), so everything here is a best-effort suggestion the user confirms.
 */
public record OpenFoodFactsProduct(String name, String brand, Integer millilitres, BigDecimal abv,
        List<String> categoryTags) {

    private static final Pattern QUANTITY = Pattern.compile(
            "(\\d+(?:[.,]\\d+)?)\\s*(ml|cl|dl|l|g|kg)\\b", Pattern.CASE_INSENSITIVE);
    private static final Pattern TRAILING_ABV = Pattern.compile("\\s*\\d+(?:[.,]\\d+)?\\s*%\\s*(?:vol\\.?)?\\s*$",
            Pattern.CASE_INSENSITIVE);
    private static final Pattern LATIN = Pattern.compile("^[\\p{IsLatin}\\p{N}\\p{P}\\p{Zs}\\p{S}]+$");

    /** Parses an API v2 product response; empty when the product is unknown or has no usable name. */
    public static Optional<OpenFoodFactsProduct> fromResponse(JsonNode response) {
        if (response == null || response.path("status").asInt(0) != 1) {
            return Optional.empty();
        }
        JsonNode product = response.path("product");
        String brand = firstBrand(text(product, "brands"));
        String name = displayName(brand, text(product, "product_name_sv"), text(product, "product_name_en"),
                text(product, "product_name"));
        if (name == null) {
            return Optional.empty();
        }
        List<String> tags = new ArrayList<>();
        product.path("categories_tags").forEach(tag -> tags.add(tag.asString()));
        return Optional.of(new OpenFoodFactsProduct(name, brand, millilitres(text(product, "quantity")),
                abv(product.path("nutriments")), List.copyOf(tags)));
    }

    /** "Campari, fratelli Barbieri" -> "Campari". */
    static String firstBrand(String brands) {
        if (brands == null) {
            return null;
        }
        String first = brands.split(",")[0].trim();
        return first.isEmpty() ? null : first;
    }

    /**
     * The first usable name (Swedish, then English, then the default one), skipping names
     * not written in Latin script, with any trailing "40%" removed and the brand prepended
     * when the name doesn't already contain it: "London Dry Gin" -> "Tanqueray London Dry Gin".
     */
    static String displayName(String brand, String... candidates) {
        for (String candidate : candidates) {
            if (candidate == null || candidate.isBlank() || !LATIN.matcher(candidate).matches()) {
                continue;
            }
            String name = TRAILING_ABV.matcher(candidate.trim()).replaceAll("").trim();
            if (name.isEmpty()) {
                continue;
            }
            if (brand != null && !normalize(name).contains(normalize(brand))) {
                name = brand + " " + name;
            }
            return name;
        }
        return brand;
    }

    /** "0.7l" -> 700, "75 cl" -> 750, "1200ml" -> 1200; grams are taken as ml (it's a drink). */
    static Integer millilitres(String quantity) {
        if (quantity == null) {
            return null;
        }
        Matcher m = QUANTITY.matcher(quantity);
        if (!m.find()) {
            return null;
        }
        BigDecimal value = new BigDecimal(m.group(1).replace(',', '.'));
        BigDecimal factor = switch (m.group(2).toLowerCase(Locale.ROOT)) {
            case "ml", "g" -> BigDecimal.ONE;
            case "cl" -> BigDecimal.TEN;
            case "dl" -> BigDecimal.valueOf(100);
            default -> BigDecimal.valueOf(1000); // l, kg
        };
        int ml = value.multiply(factor).setScale(0, RoundingMode.HALF_UP).intValue();
        return ml >= 10 && ml <= 10_000 ? ml : null;
    }

    static BigDecimal abv(JsonNode nutriments) {
        String unit = text(nutriments, "alcohol_unit");
        if (unit != null && !unit.contains("%")) {
            return null;
        }
        JsonNode value = nutriments.has("alcohol_100g") ? nutriments.get("alcohol_100g") : nutriments.get("alcohol");
        if (value == null || !value.isNumber()) {
            return null;
        }
        BigDecimal abv = value.decimalValue().setScale(1, RoundingMode.HALF_UP);
        return abv.signum() >= 0 && abv.compareTo(BigDecimal.valueOf(100)) <= 0 ? abv : null;
    }

    private static String text(JsonNode node, String field) {
        JsonNode value = node.path(field);
        return value.isString() && !value.asString().isBlank() ? value.asString().trim() : null;
    }

    private static String normalize(String s) {
        return s.toLowerCase(Locale.ROOT).replace('’', '\'');
    }
}

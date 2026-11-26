package se.pourfolio.barcode;

import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import se.pourfolio.barcode.BarcodeLookupResponse.ExistingItem;
import se.pourfolio.barcode.BarcodeLookupResponse.Source;
import se.pourfolio.barcode.BarcodeLookupResponse.Suggestion;
import se.pourfolio.category.Category;
import se.pourfolio.category.CategoryRepository;
import se.pourfolio.common.web.InvalidRequestException;
import se.pourfolio.ingredient.Ingredient;
import se.pourfolio.ingredient.IngredientRepository;
import se.pourfolio.inventory.InventoryItemRepository;
import se.pourfolio.inventory.UnitType;

/**
 * Finds what is known about a barcode: items at home with it, a product remembered from
 * earlier, or failing that a suggestion from Open Food Facts.
 */
@Service
@Transactional(readOnly = true)
public class BarcodeLookupService {

    /** Open Food Facts category tags -> our subcategory codes, most specific first. */
    private static final List<Map.Entry<String, List<String>>> CATEGORY_TAGS = List.of(
            Map.entry("sparkling", List.of("en:sparkling-wines", "en:champagnes", "en:proseccos", "en:cavas")),
            Map.entry("vermouth", List.of("en:vermouths", "en:vermouth")),
            Map.entry("coffee_liqueur", List.of("en:coffee-liqueurs")),
            Map.entry("cream_liqueur", List.of("en:cream-liqueurs")),
            Map.entry("orange_liqueur", List.of("en:orange-liqueurs", "en:triple-sec")),
            Map.entry("tonic", List.of("en:tonic-waters", "en:tonic-water")),
            Map.entry("ginger", List.of("en:ginger-beers", "en:ginger-ales")),
            Map.entry("gin", List.of("en:gins", "en:gin", "en:london-dry-gins")),
            Map.entry("vodka", List.of("en:vodkas", "en:vodka")),
            Map.entry("rum", List.of("en:rums", "en:rum")),
            Map.entry("whisky", List.of("en:whiskies", "en:whisky", "en:whiskey", "en:bourbons", "en:scotch-whisky",
                    "en:irish-whiskey")),
            Map.entry("tequila_mezcal", List.of("en:tequilas", "en:tequila", "en:mezcals", "en:mezcal")),
            Map.entry("brandy", List.of("en:brandies", "en:brandy", "en:cognacs", "en:cognac", "en:armagnacs")),
            Map.entry("aquavit", List.of("en:aquavits", "en:akvavits")),
            Map.entry("beer", List.of("en:beers")),
            Map.entry("cider", List.of("en:ciders")),
            Map.entry("juice", List.of("en:juices", "en:fruit-juices")),
            Map.entry("soda", List.of("en:sodas", "en:colas", "en:carbonated-waters")),
            Map.entry("flavored_syrup", List.of("en:syrups")),
            Map.entry("still_wine", List.of("en:wines")));

    /** Words in a product name -> our subcategory codes, used when the tags say nothing useful. */
    private static final List<Map.Entry<Pattern, String>> NAME_KEYWORDS = List.of(
            Map.entry(word("prosecco|champagne|cava|crémant"), "sparkling"),
            Map.entry(word("vermouth"), "vermouth"),
            Map.entry(word("tonic"), "tonic"),
            Map.entry(word("gin"), "gin"),
            Map.entry(word("vodka"), "vodka"),
            Map.entry(word("rum"), "rum"),
            Map.entry(word("whisky|whiskey|bourbon|scotch"), "whisky"),
            Map.entry(word("tequila|mezcal"), "tequila_mezcal"),
            Map.entry(word("cognac|brandy"), "brandy"),
            Map.entry(word("akvavit|aquavit"), "aquavit"));

    private final InventoryItemRepository inventory;
    private final KnownProductRepository knownProducts;
    private final OpenFoodFactsClient openFoodFacts;
    private final CategoryRepository categories;
    private final IngredientRepository ingredients;

    public BarcodeLookupService(InventoryItemRepository inventory, KnownProductRepository knownProducts,
            OpenFoodFactsClient openFoodFacts, CategoryRepository categories, IngredientRepository ingredients) {
        this.inventory = inventory;
        this.knownProducts = knownProducts;
        this.openFoodFacts = openFoodFacts;
        this.categories = categories;
        this.ingredients = ingredients;
    }

    public BarcodeLookupResponse lookup(String input) {
        String barcode = Gtin.normalize(input)
                .orElseThrow(() -> new InvalidRequestException("barcode", "invalid barcode"));

        List<ExistingItem> existing = inventory.findByBarcode(barcode).stream()
                .map(i -> new ExistingItem(i.getId(), i.getName(), i.getUnitType(), i.getCapacity(),
                        i.getRemaining()))
                .toList();

        Optional<KnownProduct> known = knownProducts.findById(barcode);
        if (known.isPresent()) {
            KnownProduct p = known.get();
            return new BarcodeLookupResponse(barcode, Source.KNOWN_PRODUCT,
                    new Suggestion(p.getName(), p.getBrand(), p.getAbv(), p.getUnitType(), p.getCapacity(),
                            p.getCategory().getId(), p.getIngredient() == null ? null : p.getIngredient().getId()),
                    existing, false);
        }

        try {
            return openFoodFacts.lookup(barcode)
                    .map(product -> new BarcodeLookupResponse(barcode, Source.OPEN_FOOD_FACTS, suggest(product),
                            existing, false))
                    .orElseGet(() -> new BarcodeLookupResponse(barcode, Source.NONE, null, existing, false));
        } catch (OpenFoodFactsClient.UnavailableException e) {
            return new BarcodeLookupResponse(barcode, Source.NONE, null, existing, true);
        }
    }

    /** Turns an Open Food Facts product into form values, guessing category and ingredient. */
    Suggestion suggest(OpenFoodFactsProduct product) {
        Map<String, Category> byCode = categories.findAllOrdered().stream()
                .collect(Collectors.toMap(Category::getCode, Function.identity()));
        List<Ingredient> allIngredients = ingredients.findAllWithDetails();

        Category category = categoryFromTags(product.categoryTags()).map(byCode::get).orElse(null);
        Ingredient ingredient = guessIngredient(allIngredients, product.name(), category);
        if (category == null && ingredient != null) {
            category = ingredient.getCategory();
        }
        if (category == null) {
            category = categoryFromName(product.name()).map(byCode::get).orElse(null);
        }
        return new Suggestion(product.name(), product.brand(), product.abv(), UnitType.VOLUME, product.millilitres(),
                category == null ? null : category.getId(), ingredient == null ? null : ingredient.getId());
    }

    static Optional<String> categoryFromTags(List<String> tags) {
        return CATEGORY_TAGS.stream()
                .filter(entry -> entry.getValue().stream().anyMatch(tags::contains))
                .map(Map.Entry::getKey)
                .findFirst();
    }

    static Optional<String> categoryFromName(String name) {
        return NAME_KEYWORDS.stream()
                .filter(entry -> entry.getKey().matcher(name).find())
                .map(Map.Entry::getValue)
                .findFirst();
    }

    /** The single ingredient whose name appears in the product name (within the category, if known). */
    static Ingredient guessIngredient(List<Ingredient> candidates, String productName, Category category) {
        String name = productName.toLowerCase(Locale.ROOT);
        List<Ingredient> matches = candidates.stream()
                .filter(i -> category == null || i.getCategory().getId().equals(category.getId()))
                .filter(i -> name.contains(i.getName().split(" / ")[0].toLowerCase(Locale.ROOT)))
                .toList();
        return matches.size() == 1 ? matches.getFirst() : null;
    }

    private static Pattern word(String alternatives) {
        return Pattern.compile("\\b(" + alternatives + ")\\b", Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE);
    }
}

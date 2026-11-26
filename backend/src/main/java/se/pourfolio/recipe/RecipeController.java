package se.pourfolio.recipe;

import java.util.List;

import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import se.pourfolio.recipe.RecipeResponses.RecipeDetail;
import se.pourfolio.recipe.RecipeResponses.RecipeSummary;
import se.pourfolio.recipe.RecipeResponses.ShoppingSuggestion;

@RestController
@RequestMapping(path = "/api/recipes", produces = MediaType.APPLICATION_JSON_VALUE)
public class RecipeController {

    private final RecipeService service;

    public RecipeController(RecipeService service) {
        this.service = service;
    }

    /** All recipes matched against the inventory: makeable first, then by how little is missing. */
    @GetMapping
    public List<RecipeSummary> list(@RequestParam(defaultValue = "ALL") RecipeService.Filter filter) {
        return service.list(filter);
    }

    @GetMapping("/{id}")
    public RecipeDetail get(@PathVariable Long id) {
        return service.get(id);
    }

    /** What to buy to complete the most recipes that miss exactly one thing. */
    @GetMapping("/shopping-suggestions")
    public List<ShoppingSuggestion> shoppingSuggestions() {
        return service.shoppingSuggestions();
    }
}

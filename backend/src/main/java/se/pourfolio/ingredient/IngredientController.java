package se.pourfolio.ingredient;

import java.util.List;

import org.springframework.http.MediaType;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import io.swagger.v3.oas.annotations.media.Schema;

@RestController
@RequestMapping(path = "/api/ingredients", produces = MediaType.APPLICATION_JSON_VALUE)
public class IngredientController {

    private final IngredientRepository repository;

    public IngredientController(IngredientRepository repository) {
        this.repository = repository;
    }

    /** All ingredients, sorted by name; the frontend filters them by category. */
    @GetMapping
    @Transactional(readOnly = true)
    public List<IngredientResponse> list() {
        return repository.findAllWithDetails().stream()
                .map(i -> new IngredientResponse(i.getId(), i.getCode(), i.getName(), i.getCategory().getId(),
                        i.isAlwaysAvailable()))
                .toList();
    }

    @Schema(requiredProperties = {"id", "code", "name", "categoryId", "alwaysAvailable"})
    public record IngredientResponse(Long id, String code, String name, Long categoryId, boolean alwaysAvailable) {
    }
}

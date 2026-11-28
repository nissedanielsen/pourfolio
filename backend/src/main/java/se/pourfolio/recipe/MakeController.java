package se.pourfolio.recipe;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import se.pourfolio.recipe.MakeDtos.MakePlan;
import se.pourfolio.recipe.MakeDtos.MakeRequest;
import se.pourfolio.recipe.MakeDtos.MakeResult;

/** "Jag gjorde den!": take what a drink used from the inventory. */
@RestController
public class MakeController {

    private final MakeService service;

    public MakeController(MakeService service) {
        this.service = service;
    }

    /** What making the recipe would take from which item (nothing is changed). */
    @GetMapping(path = "/api/recipes/{id}/make-plan", produces = MediaType.APPLICATION_JSON_VALUE)
    public MakePlan plan(@PathVariable Long id,
            @RequestParam(defaultValue = "1") @Min(1) @Max(20) int servings) {
        return service.plan(id, servings);
    }

    /** Takes the given amounts and logs the drink; 400 if not everything is at home. */
    @PostMapping(path = "/api/recipes/{id}/make", produces = MediaType.APPLICATION_JSON_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public MakeResult make(@PathVariable Long id, @Valid @RequestBody MakeRequest request) {
        return service.make(id, request);
    }

    /** Puts back what a logged drink took. Only shortly after making it. */
    @PostMapping("/api/drink-log/{id}/undo")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void undo(@PathVariable Long id) {
        service.undo(id);
    }
}

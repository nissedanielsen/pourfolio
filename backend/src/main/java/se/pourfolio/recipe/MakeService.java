package se.pourfolio.recipe;

import java.time.Duration;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import se.pourfolio.common.web.InvalidRequestException;
import se.pourfolio.common.web.NotFoundException;
import se.pourfolio.inventory.InventoryItem;
import se.pourfolio.inventory.InventoryItemRepository;
import se.pourfolio.recipe.MakeDtos.Alternative;
import se.pourfolio.recipe.MakeDtos.Deduction;
import se.pourfolio.recipe.MakeDtos.MakePlan;
import se.pourfolio.recipe.MakeDtos.MakeRequest;
import se.pourfolio.recipe.MakeDtos.MakeResult;
import se.pourfolio.recipe.MakeDtos.PlannedDeduction;
import se.pourfolio.recipe.MakeDtos.PlannedLine;
import se.pourfolio.recipe.MakePlanner.LinePlan;
import se.pourfolio.recipe.MakePlanner.Plan;

/** "Jag gjorde den!": plan what to take, take it, and undo right afterwards if needed. */
@Service
@Transactional
public class MakeService {

    /** Undo is offered right after making a drink; this is the server's safety margin. */
    static final Duration UNDO_WINDOW = Duration.ofMinutes(15);

    private final RecipeService recipeService;
    private final RecipeRepository recipes;
    private final InventoryItemRepository inventory;
    private final DrinkLogRepository drinkLogs;

    public MakeService(RecipeService recipeService, RecipeRepository recipes, InventoryItemRepository inventory,
            DrinkLogRepository drinkLogs) {
        this.recipeService = recipeService;
        this.recipes = recipes;
        this.inventory = inventory;
        this.drinkLogs = drinkLogs;
    }

    @Transactional(readOnly = true)
    public MakePlan plan(Long recipeId, int servings) {
        Recipe recipe = find(recipeId);
        Plan plan = planFor(recipe, servings);
        Map<Integer, RecipeIngredient> byPosition = new LinkedHashMap<>();
        recipe.getLines().forEach(l -> byPosition.put(l.getPosition(), l));
        List<PlannedLine> lines = plan.lines().stream()
                .map(l -> toPlannedLine(byPosition.get(l.line().position()), l))
                .toList();
        return new MakePlan(recipe.getId(), recipe.getName(), servings, plan.canMake(), lines);
    }

    /**
     * Takes the given amounts from the items and logs it. Only allowed when everything the
     * recipe needs is at home (for the given number of drinks).
     */
    public MakeResult make(Long recipeId, MakeRequest request) {
        Recipe recipe = find(recipeId);
        if (!planFor(recipe, request.servings()).canMake()) {
            throw new InvalidRequestException("servings", "not everything needed is at home");
        }

        Map<Long, Integer> totals = new LinkedHashMap<>();
        for (Deduction d : request.deductions()) {
            totals.merge(d.itemId(), d.amount(), Integer::sum);
        }

        DrinkLog log = new DrinkLog(recipe, request.servings());
        for (Map.Entry<Long, Integer> entry : totals.entrySet()) {
            InventoryItem item = inventory.findById(entry.getKey())
                    .orElseThrow(() -> new InvalidRequestException("deductions", "item does not exist"));
            if (entry.getValue() > item.getRemaining()) {
                throw new InvalidRequestException("deductions", "not enough left");
            }
            item.setRemaining(item.getRemaining() - entry.getValue());
            log.addEntry(item, entry.getValue());
        }
        DrinkLog saved = drinkLogs.saveAndFlush(log);
        return new MakeResult(saved.getId(), recipe.getName(), saved.getServings());
    }

    /** Puts back what was taken (items deleted since are skipped) and removes the log entry. */
    public void undo(Long drinkLogId) {
        DrinkLog log = drinkLogs.findWithEntries(drinkLogId)
                .orElseThrow(() -> new NotFoundException("Drink log", drinkLogId));
        if (log.getMadeAt().isBefore(Instant.now().minus(UNDO_WINDOW))) {
            throw new InvalidRequestException("drinkLogId", "too late to undo");
        }
        for (DrinkLogEntry entry : log.getEntries()) {
            InventoryItem item = entry.getInventoryItem();
            if (item != null) {
                item.setRemaining(Math.min(item.getCapacity(), item.getRemaining() + entry.getAmount()));
            }
        }
        drinkLogs.delete(log);
    }

    private Recipe find(Long recipeId) {
        return recipes.findWithLines(recipeId).orElseThrow(() -> new NotFoundException("Recipe", recipeId));
    }

    private Plan planFor(Recipe recipe, int servings) {
        return new MakePlanner(recipeService.matcher()).plan(RecipeService.lines(recipe), servings);
    }

    private static PlannedLine toPlannedLine(RecipeIngredient line, LinePlan plan) {
        String name = line.getIngredient() != null ? line.getIngredient().getName() : line.getCategory().getName();
        return new PlannedLine(line.getPosition(), name, line.getAmount(), line.getUnit(), plan.kind(),
                plan.enough(),
                plan.deductions().stream()
                        .map(d -> new PlannedDeduction(d.item().id(), d.item().name(), d.item().unitType(),
                                d.amount(), d.item().remaining()))
                        .toList(),
                plan.alternatives().stream()
                        .map(i -> new Alternative(i.id(), i.name(), i.unitType(), i.remaining()))
                        .toList());
    }
}

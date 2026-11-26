package se.pourfolio.inventory;

import java.util.ArrayList;
import java.util.List;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import se.pourfolio.category.Category;
import se.pourfolio.category.CategoryService;
import se.pourfolio.common.web.InvalidRequestException;
import se.pourfolio.common.web.NotFoundException;
import se.pourfolio.common.web.PageResponse;
import se.pourfolio.ingredient.Ingredient;
import se.pourfolio.ingredient.IngredientRepository;

@Service
@Transactional
public class InventoryItemService {

    private final InventoryItemRepository repository;
    private final CategoryService categoryService;
    private final IngredientRepository ingredientRepository;

    public InventoryItemService(InventoryItemRepository repository, CategoryService categoryService,
            IngredientRepository ingredientRepository) {
        this.repository = repository;
        this.categoryService = categoryService;
        this.ingredientRepository = ingredientRepository;
    }

    @Transactional(readOnly = true)
    public PageResponse<InventoryItemResponse> search(InventoryItemSearchCriteria criteria, Pageable pageable) {
        return PageResponse.from(repository.findAll(toSpecification(criteria), pageable),
                InventoryItemResponse::from);
    }

    @Transactional(readOnly = true)
    public InventoryItemResponse get(Long id) {
        return InventoryItemResponse.from(find(id));
    }

    public InventoryItemResponse create(InventoryItemRequest request) {
        validate(request);
        Category category = resolveCategory(request.categoryId());
        InventoryItem item = new InventoryItem(category, request.name().trim(),
                trimToNull(request.brand()), request.abv(), request.unitType(), request.capacity(),
                request.remaining(), trimToNull(request.notes()));
        item.setIngredient(resolveIngredient(request.ingredientId(), category));
        return InventoryItemResponse.from(repository.saveAndFlush(item));
    }

    public InventoryItemResponse update(Long id, InventoryItemRequest request) {
        InventoryItem item = find(id);
        validate(request);
        Category category = resolveCategory(request.categoryId());
        item.update(category, request.name().trim(), trimToNull(request.brand()),
                request.abv(), request.unitType(), request.capacity(), request.remaining(),
                trimToNull(request.notes()));
        item.setIngredient(resolveIngredient(request.ingredientId(), category));
        return InventoryItemResponse.from(repository.saveAndFlush(item));
    }

    public InventoryItemResponse updateRemaining(Long id, int remaining) {
        InventoryItem item = find(id);
        requireWithinCapacity(remaining, item.getCapacity());
        item.setRemaining(remaining);
        return InventoryItemResponse.from(repository.saveAndFlush(item));
    }

    public void delete(Long id) {
        repository.delete(find(id));
    }

    private InventoryItem find(Long id) {
        return repository.findById(id).orElseThrow(() -> new NotFoundException("Inventory item", id));
    }

    private void validate(InventoryItemRequest request) {
        requireWithinCapacity(request.remaining(), request.capacity());
    }

    private static void requireWithinCapacity(int remaining, int capacity) {
        if (remaining > capacity) {
            throw new InvalidRequestException("remaining", "must not be greater than capacity");
        }
    }

    private Category resolveCategory(Long categoryId) {
        Category category;
        try {
            category = categoryService.getById(categoryId);
        } catch (NotFoundException e) {
            throw new InvalidRequestException("categoryId", "category does not exist");
        }
        if (categoryService.hasChildren(categoryId)) {
            throw new InvalidRequestException("categoryId", "must be a subcategory");
        }
        return category;
    }

    /** The optional ingredient must exist and belong to the item's category. */
    private Ingredient resolveIngredient(Long ingredientId, Category category) {
        if (ingredientId == null) {
            return null;
        }
        Ingredient ingredient = ingredientRepository.findById(ingredientId)
                .orElseThrow(() -> new InvalidRequestException("ingredientId", "ingredient does not exist"));
        if (!ingredient.getCategory().getId().equals(category.getId())) {
            throw new InvalidRequestException("ingredientId", "ingredient does not belong to the category");
        }
        return ingredient;
    }

    private Specification<InventoryItem> toSpecification(InventoryItemSearchCriteria criteria) {
        List<Specification<InventoryItem>> specs = new ArrayList<>();
        if (StringUtils.hasText(criteria.q())) {
            specs.add(InventoryItemSpecifications.matchesText(criteria.q()));
        }
        if (criteria.categoryId() != null) {
            specs.add(InventoryItemSpecifications.inCategories(
                    categoryService.getIdWithDescendants(criteria.categoryId())));
        }
        if (criteria.minAbv() != null) {
            specs.add(InventoryItemSpecifications.abvAtLeast(criteria.minAbv()));
        }
        if (criteria.maxAbv() != null) {
            specs.add(InventoryItemSpecifications.abvAtMost(criteria.maxAbv()));
        }
        if (criteria.unitType() != null) {
            specs.add(InventoryItemSpecifications.hasUnitType(criteria.unitType()));
        }
        if (Boolean.TRUE.equals(criteria.lowStock())) {
            specs.add(InventoryItemSpecifications.lowStock());
        }
        return Specification.allOf(specs);
    }

    private static String trimToNull(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }
}

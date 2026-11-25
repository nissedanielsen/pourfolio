package se.pourfolio.category;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import se.pourfolio.common.web.NotFoundException;

@Service
@Transactional(readOnly = true)
public class CategoryService {

    private final CategoryRepository repository;

    public CategoryService(CategoryRepository repository) {
        this.repository = repository;
    }

    /** Returns all top-level categories with their subcategories, in display order. */
    public List<CategoryResponse> getTree() {
        List<Category> all = repository.findAllOrdered();

        Map<Long, List<CategoryResponse>> childrenByParent = new HashMap<>();
        for (Category category : all) {
            if (!category.isTopLevel()) {
                childrenByParent.computeIfAbsent(category.getParentId(), id -> new ArrayList<>())
                        .add(new CategoryResponse(category.getId(), category.getCode(), category.getName(), List.of()));
            }
        }

        return all.stream()
                .filter(Category::isTopLevel)
                .map(top -> new CategoryResponse(top.getId(), top.getCode(), top.getName(),
                        List.copyOf(childrenByParent.getOrDefault(top.getId(), List.of()))))
                .toList();
    }

    public Category getById(Long id) {
        return repository.findById(id).orElseThrow(() -> new NotFoundException("Category", id));
    }

    /** The category itself plus its direct subcategories (the tree has two levels). */
    public List<Long> getIdWithDescendants(Long id) {
        List<Long> ids = new ArrayList<>();
        ids.add(id);
        ids.addAll(repository.findChildIds(id));
        return ids;
    }

    public boolean hasChildren(Long id) {
        return repository.hasChildren(id);
    }
}

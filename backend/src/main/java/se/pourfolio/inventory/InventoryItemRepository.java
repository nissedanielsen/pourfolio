package se.pourfolio.inventory;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;

public interface InventoryItemRepository
        extends JpaRepository<InventoryItem, Long>, JpaSpecificationExecutor<InventoryItem> {

    @Override
    @EntityGraph(attributePaths = {"category", "ingredient"})
    Page<InventoryItem> findAll(Specification<InventoryItem> spec, Pageable pageable);

    @Override
    @EntityGraph(attributePaths = {"category", "ingredient"})
    Optional<InventoryItem> findById(Long id);

    /** Items with something left, for matching recipes. */
    @Query("select i from InventoryItem i join fetch i.category left join fetch i.ingredient where i.remaining > 0")
    List<InventoryItem> findAllInStock();
}

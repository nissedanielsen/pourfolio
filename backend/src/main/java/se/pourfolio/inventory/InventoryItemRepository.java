package se.pourfolio.inventory;

import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface InventoryItemRepository
        extends JpaRepository<InventoryItem, Long>, JpaSpecificationExecutor<InventoryItem> {

    @Override
    @EntityGraph(attributePaths = "category")
    Page<InventoryItem> findAll(Specification<InventoryItem> spec, Pageable pageable);

    @Override
    @EntityGraph(attributePaths = "category")
    Optional<InventoryItem> findById(Long id);
}

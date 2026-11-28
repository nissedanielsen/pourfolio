package se.pourfolio.recipe;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface DrinkLogRepository extends JpaRepository<DrinkLog, Long> {

    @Query("select l from DrinkLog l left join fetch l.entries e left join fetch e.inventoryItem where l.id = :id")
    Optional<DrinkLog> findWithEntries(Long id);
}

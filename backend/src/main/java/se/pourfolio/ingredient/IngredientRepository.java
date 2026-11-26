package se.pourfolio.ingredient;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface IngredientRepository extends JpaRepository<Ingredient, Long> {

    @Query("select distinct i from Ingredient i join fetch i.category left join fetch i.substitutes order by i.name")
    List<Ingredient> findAllWithDetails();
}

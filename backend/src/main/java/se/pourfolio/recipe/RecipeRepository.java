package se.pourfolio.recipe;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface RecipeRepository extends JpaRepository<Recipe, Long> {

    @Query("""
            select distinct r from Recipe r
            left join fetch r.lines l
            left join fetch l.ingredient
            left join fetch l.category
            order by r.name""")
    List<Recipe> findAllWithLines();

    @Query("""
            select r from Recipe r
            left join fetch r.lines l
            left join fetch l.ingredient
            left join fetch l.category
            where r.id = :id""")
    Optional<Recipe> findWithLines(Long id);
}

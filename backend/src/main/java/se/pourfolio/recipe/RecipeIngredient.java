package se.pourfolio.recipe;

import java.math.BigDecimal;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import se.pourfolio.category.Category;
import se.pourfolio.ingredient.Ingredient;

/** One line of a recipe: a specific ingredient or any item in a category. */
@Entity
@Table(name = "recipe_ingredient")
public class RecipeIngredient {

    @Id
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "recipe_id")
    private Recipe recipe;

    private int position;

    @Column(precision = 6, scale = 1)
    private BigDecimal amount;

    @Enumerated(EnumType.STRING)
    private RecipeUnit unit;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ingredient_id")
    private Ingredient ingredient;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    private Category category;

    private boolean optional;

    protected RecipeIngredient() {
    }

    public Long getId() {
        return id;
    }

    public int getPosition() {
        return position;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public RecipeUnit getUnit() {
        return unit;
    }

    public Ingredient getIngredient() {
        return ingredient;
    }

    public Category getCategory() {
        return category;
    }

    public boolean isOptional() {
        return optional;
    }
}

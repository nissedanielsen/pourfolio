package se.pourfolio.ingredient;

import java.math.BigDecimal;
import java.util.HashSet;
import java.util.Set;

import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import se.pourfolio.category.Category;

/**
 * Something a recipe asks for, e.g. "Campari" or "Lime / limejuice". Seeded by migrations.
 * An inventory item can say which ingredient it is.
 */
@Entity
@Table(name = "ingredient")
public class Ingredient {

    @Id
    private Long id;

    private String code;

    private String name;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    private Category category;

    /** Assumed to be at home without registering it (ice, water, soda water). */
    private boolean alwaysAvailable;

    /** For fruit counted in pieces: roughly how much juice one piece gives, in ml. */
    private BigDecimal mlPerPiece;

    /** Ingredients that can be used instead of this one. */
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(name = "ingredient_substitute",
            joinColumns = @JoinColumn(name = "ingredient_id"),
            inverseJoinColumns = @JoinColumn(name = "substitute_id"))
    private Set<Ingredient> substitutes = new HashSet<>();

    protected Ingredient() {
    }

    public Long getId() {
        return id;
    }

    public String getCode() {
        return code;
    }

    public String getName() {
        return name;
    }

    public Category getCategory() {
        return category;
    }

    public boolean isAlwaysAvailable() {
        return alwaysAvailable;
    }

    public BigDecimal getMlPerPiece() {
        return mlPerPiece;
    }

    public Set<Ingredient> getSubstitutes() {
        return substitutes;
    }
}

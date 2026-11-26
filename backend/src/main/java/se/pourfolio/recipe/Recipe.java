package se.pourfolio.recipe;

import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;

/** A drink recipe. Seeded by migrations; read-only for now. */
@Entity
@Table(name = "recipe")
public class Recipe {

    @Id
    private Long id;

    private String code;

    private String name;

    private String description;

    private String method;

    private String glass;

    private String garnish;

    @OneToMany(mappedBy = "recipe", fetch = FetchType.LAZY)
    @OrderBy("position")
    private List<RecipeIngredient> lines = new ArrayList<>();

    protected Recipe() {
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

    public String getDescription() {
        return description;
    }

    public String getMethod() {
        return method;
    }

    public String getGlass() {
        return glass;
    }

    public String getGarnish() {
        return garnish;
    }

    public List<RecipeIngredient> getLines() {
        return lines;
    }
}

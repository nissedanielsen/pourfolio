package se.pourfolio.recipe;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import org.hibernate.annotations.CreationTimestamp;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import se.pourfolio.inventory.InventoryItem;

/** A drink that was made, and what was taken from which item. */
@Entity
@Table(name = "drink_log")
public class DrinkLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "recipe_id")
    private Recipe recipe;

    private int servings;

    @CreationTimestamp
    @Column(updatable = false)
    private Instant madeAt;

    @OneToMany(mappedBy = "drinkLog", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<DrinkLogEntry> entries = new ArrayList<>();

    protected DrinkLog() {
    }

    public DrinkLog(Recipe recipe, int servings) {
        this.recipe = recipe;
        this.servings = servings;
    }

    public void addEntry(InventoryItem item, int amount) {
        entries.add(new DrinkLogEntry(this, item, amount));
    }

    public Long getId() {
        return id;
    }

    public Recipe getRecipe() {
        return recipe;
    }

    public int getServings() {
        return servings;
    }

    public Instant getMadeAt() {
        return madeAt;
    }

    public List<DrinkLogEntry> getEntries() {
        return entries;
    }
}

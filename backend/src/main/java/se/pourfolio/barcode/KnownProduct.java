package se.pourfolio.barcode;

import java.math.BigDecimal;
import java.time.Instant;

import org.hibernate.annotations.UpdateTimestamp;

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
import se.pourfolio.inventory.UnitType;

/**
 * A product remembered by barcode, from the last time an item with that barcode was saved.
 * Survives deleting the items, so buying the same bottle again fills in the form.
 */
@Entity
@Table(name = "known_product")
public class KnownProduct {

    @Id
    private String barcode;

    private String name;

    private String brand;

    @Column(precision = 4, scale = 1)
    private BigDecimal abv;

    @Enumerated(EnumType.STRING)
    private UnitType unitType;

    private int capacity;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "category_id")
    private Category category;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ingredient_id")
    private Ingredient ingredient;

    @UpdateTimestamp
    private Instant updatedAt;

    protected KnownProduct() {
    }

    public KnownProduct(String barcode) {
        this.barcode = barcode;
    }

    public void update(String name, String brand, BigDecimal abv, UnitType unitType, int capacity, Category category,
            Ingredient ingredient) {
        this.name = name;
        this.brand = brand;
        this.abv = abv;
        this.unitType = unitType;
        this.capacity = capacity;
        this.category = category;
        this.ingredient = ingredient;
    }

    public String getBarcode() {
        return barcode;
    }

    public String getName() {
        return name;
    }

    public String getBrand() {
        return brand;
    }

    public BigDecimal getAbv() {
        return abv;
    }

    public UnitType getUnitType() {
        return unitType;
    }

    public int getCapacity() {
        return capacity;
    }

    public Category getCategory() {
        return category;
    }

    public Ingredient getIngredient() {
        return ingredient;
    }
}

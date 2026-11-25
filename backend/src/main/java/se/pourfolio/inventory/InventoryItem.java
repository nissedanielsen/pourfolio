package se.pourfolio.inventory;

import java.math.BigDecimal;
import java.time.Instant;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import se.pourfolio.category.Category;

/**
 * Something physical at home: a bottle, a can, or a number of pieces.
 * For {@link UnitType#VOLUME} items, capacity and remaining are millilitres;
 * for {@link UnitType#COUNT} items they are pieces.
 */
@Entity
@Table(name = "inventory_item")
public class InventoryItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "category_id")
    private Category category;

    private String name;

    private String brand;

    @Column(precision = 4, scale = 1)
    private BigDecimal abv;

    @Enumerated(EnumType.STRING)
    private UnitType unitType;

    private int capacity;

    private int remaining;

    private String notes;

    @CreationTimestamp
    @Column(updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    private Instant updatedAt;

    @Version
    private long version;

    protected InventoryItem() {
    }

    public InventoryItem(Category category, String name, String brand, BigDecimal abv, UnitType unitType,
            int capacity, int remaining, String notes) {
        update(category, name, brand, abv, unitType, capacity, remaining, notes);
    }

    public final void update(Category category, String name, String brand, BigDecimal abv, UnitType unitType,
            int capacity, int remaining, String notes) {
        this.category = category;
        this.name = name;
        this.brand = brand;
        this.abv = abv;
        this.unitType = unitType;
        this.capacity = capacity;
        this.remaining = remaining;
        this.notes = notes;
    }

    public void setRemaining(int remaining) {
        this.remaining = remaining;
    }

    public Long getId() {
        return id;
    }

    public Category getCategory() {
        return category;
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

    public int getRemaining() {
        return remaining;
    }

    public String getNotes() {
        return notes;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}

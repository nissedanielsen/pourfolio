package se.pourfolio.recipe;

import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import se.pourfolio.inventory.InventoryItem;

/** How much was taken from one item; the item is null if it has since been deleted. */
@Entity
@Table(name = "drink_log_entry")
public class DrinkLogEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "drink_log_id")
    private DrinkLog drinkLog;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "inventory_item_id")
    private InventoryItem inventoryItem;

    /** In the item's unit: ml for VOLUME, pieces for COUNT. */
    private int amount;

    protected DrinkLogEntry() {
    }

    DrinkLogEntry(DrinkLog drinkLog, InventoryItem inventoryItem, int amount) {
        this.drinkLog = drinkLog;
        this.inventoryItem = inventoryItem;
        this.amount = amount;
    }

    public InventoryItem getInventoryItem() {
        return inventoryItem;
    }

    public int getAmount() {
        return amount;
    }
}

package se.pourfolio.inventory;

/** How an item's capacity and remaining amount are measured. */
public enum UnitType {
    /** Liquids; amounts are stored in millilitres. */
    VOLUME,
    /** Countable items such as limes or eggs; amounts are stored in pieces. */
    COUNT
}

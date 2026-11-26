package se.pourfolio.recipe;

/** How a recipe line's amount is measured. */
public enum RecipeUnit {
    /** Millilitres. */
    ML,
    /** A few drops, e.g. bitters. Only presence is checked. */
    DASH,
    /** Teaspoon, about 5 ml. */
    TSP,
    /** Whole pieces, e.g. a lime or an egg. */
    PIECE,
    /** Fill up the glass; no amount. Only presence is checked. */
    TOP_UP;

    static final int ML_PER_TSP = 5;
}

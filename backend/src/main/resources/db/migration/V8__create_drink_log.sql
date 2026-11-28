-- Angostura and eggs are assumed to be at home too.
UPDATE ingredient SET always_available = TRUE WHERE code IN ('angostura', 'egg');

-- "Jag gjorde den!": each time a drink is made, what was taken from which item. Used to
-- undo right afterwards, and later for statistics.
CREATE TABLE drink_log (
    id        BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    recipe_id BIGINT      NOT NULL REFERENCES recipe (id),
    servings  INT         NOT NULL CHECK (servings > 0),
    made_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE drink_log_entry (
    id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    drink_log_id      BIGINT NOT NULL REFERENCES drink_log (id) ON DELETE CASCADE,
    -- Kept when the item is later deleted, so the log stays readable.
    inventory_item_id BIGINT REFERENCES inventory_item (id) ON DELETE SET NULL,
    -- In the item's unit: ml for VOLUME, pieces for COUNT.
    amount            INT    NOT NULL CHECK (amount > 0)
);

CREATE INDEX idx_drink_log_entry_log ON drink_log_entry (drink_log_id);

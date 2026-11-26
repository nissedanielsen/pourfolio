-- Barcodes (EAN/GTIN) on inventory items, and a memory of products seen before so a
-- scanned barcode can fill in the form even after the last bottle was deleted.

ALTER TABLE inventory_item ADD COLUMN barcode VARCHAR(14) CHECK (barcode ~ '^[0-9]{8,14}$');
CREATE INDEX idx_inventory_item_barcode ON inventory_item (barcode);

-- Updated whenever an item with a barcode is saved; never deleted with the items.
CREATE TABLE known_product (
    barcode       VARCHAR(14)   PRIMARY KEY CHECK (barcode ~ '^[0-9]{8,14}$'),
    name          VARCHAR(200)  COLLATE swedish NOT NULL,
    brand         VARCHAR(200)  COLLATE swedish,
    abv           NUMERIC(4, 1) CHECK (abv >= 0 AND abv <= 100),
    unit_type     VARCHAR(16)   NOT NULL CHECK (unit_type IN ('VOLUME', 'COUNT')),
    capacity      INT           NOT NULL CHECK (capacity > 0),
    category_id   BIGINT        NOT NULL REFERENCES category (id),
    ingredient_id BIGINT        REFERENCES ingredient (id),
    updated_at    TIMESTAMPTZ   NOT NULL DEFAULT now()
);

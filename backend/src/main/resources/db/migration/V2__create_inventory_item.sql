-- A physical item at home: a bottle, a can, or a number of pieces (e.g. limes).
-- VOLUME items store capacity/remaining in millilitres; COUNT items in pieces.
CREATE TABLE inventory_item (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    category_id BIGINT        NOT NULL REFERENCES category (id),
    name        VARCHAR(200)  NOT NULL,
    brand       VARCHAR(200),
    abv         NUMERIC(4, 1) CHECK (abv >= 0 AND abv <= 100),
    unit_type   VARCHAR(16)   NOT NULL CHECK (unit_type IN ('VOLUME', 'COUNT')),
    capacity    INT           NOT NULL CHECK (capacity > 0),
    remaining   INT           NOT NULL CHECK (remaining >= 0),
    notes       TEXT,
    created_at  TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ   NOT NULL DEFAULT now(),
    version     BIGINT        NOT NULL DEFAULT 0,
    CONSTRAINT chk_remaining_within_capacity CHECK (remaining <= capacity)
);

CREATE INDEX idx_inventory_item_category ON inventory_item (category_id);

-- Sort names the Swedish way (… X Y Z Å Ä Ö) regardless of the database's default locale.
-- Uses ICU, which is available in the official PostgreSQL images and in hosted services like Neon.
CREATE COLLATION IF NOT EXISTS swedish (provider = icu, locale = 'sv-SE');

ALTER TABLE inventory_item
    ALTER COLUMN name  TYPE VARCHAR(200) COLLATE swedish,
    ALTER COLUMN brand TYPE VARCHAR(200) COLLATE swedish;

ALTER TABLE category
    ALTER COLUMN name TYPE VARCHAR(100) COLLATE swedish;

-- Two-level category tree. Top-level categories group subcategories;
-- inventory items always belong to a subcategory.
-- `code` is a stable English key used in code; `name` is the Swedish display name.
CREATE TABLE category (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    parent_id  BIGINT REFERENCES category (id),
    code       VARCHAR(50)  NOT NULL UNIQUE,
    name       VARCHAR(100) NOT NULL,
    sort_order INT          NOT NULL DEFAULT 0
);

CREATE INDEX idx_category_parent ON category (parent_id);

INSERT INTO category (code, name, sort_order) VALUES
    ('spirits',        'Sprit',              10),
    ('liqueurs',       'Likör',              20),
    ('wine',           'Vin och starkvin',   30),
    ('beer_cider',     'Öl och cider',       40),
    ('bitters',        'Bitters',            50),
    ('mixers',         'Mixers',             60),
    ('syrups',         'Sirap',              70),
    ('fresh',          'Färskvaror',         80),
    ('pantry',         'Skafferi',           90);

INSERT INTO category (parent_id, code, name, sort_order)
SELECT p.id, c.code, c.name, c.sort_order
FROM (VALUES
    ('spirits',    'gin',              'Gin',                 10),
    ('spirits',    'vodka',            'Vodka',               20),
    ('spirits',    'rum',              'Rom',                 30),
    ('spirits',    'whisky',           'Whisky',              40),
    ('spirits',    'tequila_mezcal',   'Tequila och mezcal',  50),
    ('spirits',    'brandy',           'Brandy och cognac',   60),
    ('spirits',    'aquavit',          'Akvavit',             70),
    ('spirits',    'other_spirits',    'Övrig sprit',         99),
    ('liqueurs',   'bitter_liqueur',   'Bitterlikör',         10),
    ('liqueurs',   'orange_liqueur',   'Apelsinlikör',        20),
    ('liqueurs',   'herbal_liqueur',   'Örtlikör',            30),
    ('liqueurs',   'fruit_liqueur',    'Fruktlikör',          40),
    ('liqueurs',   'coffee_liqueur',   'Kaffelikör',          50),
    ('liqueurs',   'cream_liqueur',    'Gräddlikör',          60),
    ('liqueurs',   'nut_liqueur',      'Nötlikör',            70),
    ('liqueurs',   'other_liqueurs',   'Övrig likör',         99),
    ('wine',       'vermouth',         'Vermouth',            10),
    ('wine',       'sherry',           'Sherry',              20),
    ('wine',       'port',             'Portvin',             30),
    ('wine',       'sparkling',        'Mousserande',         40),
    ('wine',       'still_wine',       'Vin',                 50),
    ('beer_cider', 'beer',             'Öl',                  10),
    ('beer_cider', 'cider',            'Cider',               20),
    ('bitters',    'aromatic_bitters', 'Aromatisk bitter',    10),
    ('bitters',    'citrus_bitters',   'Citrusbitter',        20),
    ('bitters',    'other_bitters',    'Övrig bitter',        99),
    ('mixers',     'tonic',            'Tonic',               10),
    ('mixers',     'soda',             'Läsk och sodavatten', 20),
    ('mixers',     'ginger',           'Ginger beer och ale', 30),
    ('mixers',     'juice',            'Juice',               40),
    ('mixers',     'other_mixers',     'Övriga mixers',       99),
    ('syrups',     'simple_syrup',     'Sockerlag',           10),
    ('syrups',     'flavored_syrup',   'Smaksatt sirap',      20),
    ('syrups',     'cordial',          'Cordial',             30),
    ('fresh',      'citrus',           'Citrus',              10),
    ('fresh',      'fruit_berries',    'Frukt och bär',       20),
    ('fresh',      'herbs',            'Örter',               30),
    ('fresh',      'eggs_dairy',       'Ägg och mejeri',      40),
    ('pantry',     'sugar_spices',     'Socker och kryddor',  10),
    ('pantry',     'garnish',          'Garnityr',            20)
) AS c (parent_code, code, name, sort_order)
JOIN category p ON p.code = c.parent_code;

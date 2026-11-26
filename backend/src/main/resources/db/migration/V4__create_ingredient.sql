-- Ingredients are what recipes ask for ("Campari", "Söt vermouth", "Lime"). An inventory
-- item can optionally say which ingredient it is; recipes can also ask for a whole
-- category instead ("any gin").

-- Ice and water need a home in the category tree.
INSERT INTO category (parent_id, code, name, sort_order)
SELECT id, 'basics', 'Is och vatten', 30 FROM category WHERE code = 'pantry';

CREATE TABLE ingredient (
    id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code             VARCHAR(50)  NOT NULL UNIQUE,
    name             VARCHAR(100) COLLATE swedish NOT NULL,
    category_id      BIGINT       NOT NULL REFERENCES category (id),
    -- Assumed to be at home without registering it (ice, water, soda water).
    always_available BOOLEAN      NOT NULL DEFAULT FALSE,
    -- For fruit counted in pieces: roughly how much juice one piece gives.
    ml_per_piece     NUMERIC(6, 1) CHECK (ml_per_piece > 0)
);

CREATE INDEX idx_ingredient_category ON ingredient (category_id);

-- A recipe asking for `ingredient_id` can also be made with `substitute_id`.
CREATE TABLE ingredient_substitute (
    ingredient_id BIGINT NOT NULL REFERENCES ingredient (id),
    substitute_id BIGINT NOT NULL REFERENCES ingredient (id),
    PRIMARY KEY (ingredient_id, substitute_id),
    CHECK (ingredient_id <> substitute_id)
);

ALTER TABLE inventory_item ADD COLUMN ingredient_id BIGINT REFERENCES ingredient (id);
CREATE INDEX idx_inventory_item_ingredient ON inventory_item (ingredient_id);

INSERT INTO ingredient (code, name, category_id, always_available, ml_per_piece)
SELECT v.code, v.name, c.id, v.always_available, v.ml_per_piece
FROM (VALUES
    -- Spirits
    ('white_rum',           'Ljus rom',               'rum',              FALSE, NULL::NUMERIC),
    ('dark_rum',            'Mörk rom',               'rum',              FALSE, NULL),
    ('bourbon',             'Bourbon',                'whisky',           FALSE, NULL),
    ('rye',                 'Rye whiskey',            'whisky',           FALSE, NULL),
    ('scotch',              'Scotch whisky',          'whisky',           FALSE, NULL),
    ('tequila',             'Tequila',                'tequila_mezcal',   FALSE, NULL),
    ('mezcal',              'Mezcal',                 'tequila_mezcal',   FALSE, NULL),
    ('cachaca',             'Cachaça',                'other_spirits',    FALSE, NULL),
    -- Liqueurs
    ('campari',             'Campari',                'bitter_liqueur',   FALSE, NULL),
    ('aperol',              'Aperol',                 'bitter_liqueur',   FALSE, NULL),
    ('maraschino',          'Maraschinolikör',        'fruit_liqueur',    FALSE, NULL),
    ('creme_de_cassis',     'Crème de cassis',        'fruit_liqueur',    FALSE, NULL),
    ('elderflower_liqueur', 'Fläderblomslikör',       'fruit_liqueur',    FALSE, NULL),
    ('green_chartreuse',    'Grön Chartreuse',        'herbal_liqueur',   FALSE, NULL),
    ('amaretto',            'Amaretto',               'nut_liqueur',      FALSE, NULL),
    -- Wine
    ('sweet_vermouth',      'Söt vermouth',           'vermouth',         FALSE, NULL),
    ('dry_vermouth',        'Torr vermouth',          'vermouth',         FALSE, NULL),
    ('lillet_blanc',        'Lillet Blanc',           'vermouth',         FALSE, NULL),
    -- Bitters
    ('angostura',           'Angostura bitter',       'aromatic_bitters', FALSE, NULL),
    ('orange_bitters',      'Apelsinbitter',          'citrus_bitters',   FALSE, NULL),
    -- Mixers
    ('soda_water',          'Sodavatten',             'soda',             TRUE,  NULL),
    ('cola',                'Cola',                   'soda',             FALSE, NULL),
    ('ginger_beer',         'Ginger beer',            'ginger',           FALSE, NULL),
    ('ginger_ale',          'Ginger ale',             'ginger',           FALSE, NULL),
    ('cranberry_juice',     'Tranbärsjuice',          'juice',            FALSE, NULL),
    ('pineapple_juice',     'Ananasjuice',            'juice',            FALSE, NULL),
    ('tomato_juice',        'Tomatjuice',             'juice',            FALSE, NULL),
    ('coconut_cream',       'Kokosgrädde',            'other_mixers',     FALSE, NULL),
    -- Syrups
    ('simple_syrup',        'Sockerlag',              'simple_syrup',     FALSE, NULL),
    ('grenadine',           'Grenadin',               'flavored_syrup',   FALSE, NULL),
    ('honey_syrup',         'Honungssirap',           'flavored_syrup',   FALSE, NULL),
    ('orgeat',              'Orgeat (mandelsirap)',   'flavored_syrup',   FALSE, NULL),
    ('agave_syrup',         'Agavesirap',             'flavored_syrup',   FALSE, NULL),
    -- Fresh: one ingredient covers both the fruit (pieces) and bottled juice (cl).
    ('lime',                'Lime / limejuice',       'citrus',           FALSE, 30),
    ('lemon',               'Citron / citronjuice',   'citrus',           FALSE, 40),
    ('orange',              'Apelsin / apelsinjuice', 'citrus',           FALSE, 80),
    ('grapefruit',          'Grapefrukt / grapefruktjuice', 'citrus',     FALSE, 150),
    ('mint',                'Mynta',                  'herbs',            FALSE, NULL),
    ('egg',                 'Ägg',                    'eggs_dairy',       FALSE, NULL),
    ('cream',               'Grädde',                 'eggs_dairy',       FALSE, NULL),
    -- Pantry
    ('sugar',               'Socker',                 'sugar_spices',     FALSE, NULL),
    ('worcestershire',      'Worcestershiresås',      'sugar_spices',     FALSE, NULL),
    ('tabasco',             'Tabasco',                'sugar_spices',     FALSE, NULL),
    ('ice',                 'Is',                     'basics',           TRUE,  NULL),
    ('water',               'Vatten',                 'basics',           TRUE,  NULL)
) AS v (code, name, category_code, always_available, ml_per_piece)
JOIN category c ON c.code = v.category_code;

INSERT INTO ingredient_substitute (ingredient_id, substitute_id)
SELECT i.id, s.id
FROM (VALUES
    ('bourbon',      'rye'),
    ('rye',          'bourbon'),
    ('simple_syrup', 'sugar'),
    ('sugar',        'simple_syrup'),
    ('agave_syrup',  'simple_syrup'),
    ('tequila',      'mezcal')
) AS v (ingredient_code, substitute_code)
JOIN ingredient i ON i.code = v.ingredient_code
JOIN ingredient s ON s.code = v.substitute_code;

-- Best effort for existing items: link an item to an ingredient in its own category when
-- the item's name contains exactly one ingredient name (e.g. "Campari" -> Campari).
UPDATE inventory_item item
SET ingredient_id = match.ingredient_id
FROM (
    SELECT i.id AS item_id, MIN(g.id) AS ingredient_id
    FROM inventory_item i
    JOIN ingredient g ON g.category_id = i.category_id
        AND lower(i.name) LIKE '%' || lower(split_part(g.name, ' / ', 1)) || '%'
    GROUP BY i.id
    HAVING COUNT(*) = 1
) AS match
WHERE item.id = match.item_id;

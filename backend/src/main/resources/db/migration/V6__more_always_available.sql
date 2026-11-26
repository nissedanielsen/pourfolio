-- Sugar, simple syrup and salt are assumed to be at home, like ice and water.

UPDATE ingredient SET always_available = TRUE WHERE code IN ('sugar', 'simple_syrup');

INSERT INTO ingredient (code, name, category_id, always_available)
SELECT 'salt', 'Salt', id, TRUE FROM category WHERE code = 'sugar_spices';

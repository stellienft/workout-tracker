-- Give the catalog recipes food-matching cover images by reusing a relevant,
-- already-loaded image from an existing recipe (matched by food keyword).
WITH map(slug, kw, off) AS (VALUES
 ('ares-pb-banana-protein-oats','oat',0),
 ('ares-greek-yogurt-granola-bowl','yogurt',0),
 ('ares-veggie-cheese-omelette','omelette',0),
 ('ares-berry-protein-pancakes','pancake',0),
 ('ares-avocado-eggs-toast','avocado',0),
 ('ares-berry-overnight-oats','oat',1),
 ('ares-tofu-scramble-toast','tofu',0),
 ('ares-whey-oat-smoothie','smoothie',0),
 ('ares-egg-white-spinach-scramble','egg',0),
 ('ares-skyr-seed-bowl','yogurt',1),
 ('ares-chicken-rice-bowl','chicken',0),
 ('ares-chicken-salad-wrap','chicken',1),
 ('ares-chicken-quinoa-bowl','chicken',2),
 ('ares-chicken-fajitas','chicken',3),
 ('ares-roast-chicken-potatoes','chicken',4),
 ('ares-chicken-caesar','chicken',5),
 ('ares-beef-noodle-stirfry','beef',0),
 ('ares-beef-burrito-bowl','beef',1),
 ('ares-beef-chilli-rice','beef',2),
 ('ares-beef-mince-tacos','beef',3),
 ('ares-baked-salmon-potatoes','salmon',0),
 ('ares-salmon-poke-bowl','salmon',1),
 ('ares-tuna-pasta-salad','fish',0),
 ('ares-white-fish-sweet-potato','fish',1),
 ('ares-prawn-noodle-stirfry','prawn',0),
 ('ares-tuna-salad-bowl','fish',2),
 ('ares-pork-sweet-potato-mash','pork',0),
 ('ares-lentil-chickpea-bowl','lentil',0),
 ('ares-halloumi-quinoa-plate','halloumi',0),
 ('ares-tofu-buddha-bowl','tofu',1),
 ('ares-paneer-curry-rice','curry',0),
 ('ares-cottage-cheese-pineapple','cottage',0),
 ('ares-whey-shake-banana','shake',0),
 ('ares-yogurt-nuts','yogurt',2),
 ('ares-apple-boiled-eggs','egg',1),
 ('ares-pb-banana-toast','banana',0),
 ('ares-protein-shake','protein',0),
 ('ares-edamame-nuts','tofu',2),
 ('ares-hummus-veg-crackers','hummus',0),
 ('ares-skyr-berries','yogurt',3)
),
pick AS (
  SELECT m.slug, (
    SELECT r.image_url FROM recipes r
    WHERE r.image_url IS NOT NULL AND r.slug NOT LIKE 'ares-%' AND lower(r.title) LIKE '%'||m.kw||'%'
    ORDER BY r.title
    OFFSET (m.off % GREATEST(1,(SELECT count(*) FROM recipes r2 WHERE r2.image_url IS NOT NULL AND r2.slug NOT LIKE 'ares-%' AND lower(r2.title) LIKE '%'||m.kw||'%')))
    LIMIT 1
  ) AS img
  FROM map m
)
UPDATE recipes t SET image_url = p.img
FROM pick p WHERE t.slug = p.slug AND p.img IS NOT NULL;


-- ── 1. Business type enum ─────────────────────────────────────────────────────
CREATE TYPE business_type AS ENUM (
  'supermarket',
  'restaurant',
  'clothing',
  'pharmacy',
  'electronics',
  'salon',
  'general'
);

-- ── 2. Add business_type to tenants ──────────────────────────────────────────
ALTER TABLE tenants
  ADD COLUMN business_type business_type NULL,
  ADD COLUMN onboarding_completed boolean NOT NULL DEFAULT false;

-- ── 3. Templates table ────────────────────────────────────────────────────────
CREATE TABLE business_templates (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_type   business_type NOT NULL UNIQUE,
  display_name    text NOT NULL,
  icon            text NOT NULL DEFAULT 'Store',
  description     text NOT NULL,
  default_categories  jsonb NOT NULL DEFAULT '[]',
  default_products    jsonb NOT NULL DEFAULT '[]',
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ── 4. Seeding log (idempotency guard) ───────────────────────────────────────
CREATE TABLE template_seeding_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES business_templates(id),
  seeded_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id)           -- one seed per tenant, ever
);

-- ── 5. RLS ────────────────────────────────────────────────────────────────────
ALTER TABLE business_templates   ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_seeding_log ENABLE ROW LEVEL SECURITY;

-- Templates: anyone authenticated can read (needed to render the wizard)
CREATE POLICY "authenticated_read_templates"
  ON business_templates FOR SELECT TO authenticated
  USING (true);

-- Seeding log: only service role writes; owners can read their own row
CREATE POLICY "owner_read_own_seeding_log"
  ON template_seeding_log FOR SELECT TO authenticated
  USING (tenant_id = get_my_tenant_id());

-- ── 6. Seed all 7 templates ───────────────────────────────────────────────────
INSERT INTO business_templates (business_type, display_name, icon, description, default_categories, default_products) VALUES

-- SUPERMARKET
('supermarket', 'Supermarket / Grocery', 'ShoppingBasket', 'Full grocery store with fresh produce, dairy, bakery, and household goods.', 
'[
  {"name":"Fresh Produce","sort_order":1},
  {"name":"Dairy & Eggs","sort_order":2},
  {"name":"Bakery","sort_order":3},
  {"name":"Meat & Seafood","sort_order":4},
  {"name":"Beverages","sort_order":5},
  {"name":"Snacks & Confectionery","sort_order":6},
  {"name":"Household & Cleaning","sort_order":7},
  {"name":"Personal Care","sort_order":8}
]'::jsonb,
'[
  {"name":"Whole Milk 1L","sku":"DAI-001","price":1.50,"cost_price":0.90,"unit":"ltr","category":"Dairy & Eggs"},
  {"name":"White Bread 500g","sku":"BAK-001","price":1.20,"cost_price":0.65,"unit":"pcs","category":"Bakery"},
  {"name":"Tomatoes 1kg","sku":"PRO-001","price":2.00,"cost_price":1.10,"unit":"kg","category":"Fresh Produce"},
  {"name":"Eggs (Tray 30)","sku":"DAI-002","price":5.50,"cost_price":3.80,"unit":"tray","category":"Dairy & Eggs"},
  {"name":"Mineral Water 500ml","sku":"BEV-001","price":0.80,"cost_price":0.40,"unit":"pcs","category":"Beverages"},
  {"name":"Cooking Oil 1L","sku":"GRO-001","price":3.20,"cost_price":2.10,"unit":"ltr","category":"Household & Cleaning"},
  {"name":"Sugar 1kg","sku":"GRO-002","price":1.80,"cost_price":1.10,"unit":"kg","category":"Snacks & Confectionery"},
  {"name":"Beef Mince 500g","sku":"MEA-001","price":6.00,"cost_price":4.20,"unit":"pcs","category":"Meat & Seafood"}
]'::jsonb),

-- RESTAURANT
('restaurant', 'Restaurant / Café', 'UtensilsCrossed', 'Food service business with meals, beverages, and desserts.',
'[
  {"name":"Main Dishes","sort_order":1},
  {"name":"Starters & Sides","sort_order":2},
  {"name":"Beverages","sort_order":3},
  {"name":"Desserts","sort_order":4},
  {"name":"Specials","sort_order":5}
]'::jsonb,
'[
  {"name":"Espresso","sku":"CAF-001","price":2.50,"cost_price":0.60,"unit":"cup","category":"Beverages"},
  {"name":"Cappuccino","sku":"CAF-002","price":3.50,"cost_price":0.80,"unit":"cup","category":"Beverages"},
  {"name":"Grilled Chicken Burger","sku":"MAN-001","price":9.50,"cost_price":4.20,"unit":"pcs","category":"Main Dishes"},
  {"name":"Beef Pasta","sku":"MAN-002","price":11.00,"cost_price":5.00,"unit":"pcs","category":"Main Dishes"},
  {"name":"Caesar Salad","sku":"STA-001","price":7.50,"cost_price":3.00,"unit":"pcs","category":"Starters & Sides"},
  {"name":"French Fries","sku":"STA-002","price":3.50,"cost_price":1.20,"unit":"pcs","category":"Starters & Sides"},
  {"name":"Chocolate Cake Slice","sku":"DES-001","price":4.50,"cost_price":1.80,"unit":"pcs","category":"Desserts"},
  {"name":"Fresh Orange Juice","sku":"BEV-002","price":4.00,"cost_price":1.50,"unit":"glass","category":"Beverages"}
]'::jsonb),

-- CLOTHING
('clothing', 'Clothing Store', 'Shirt', 'Fashion retail with tops, bottoms, footwear, and accessories.',
'[
  {"name":"Men''s Clothing","sort_order":1},
  {"name":"Women''s Clothing","sort_order":2},
  {"name":"Children''s Clothing","sort_order":3},
  {"name":"Footwear","sort_order":4},
  {"name":"Accessories","sort_order":5}
]'::jsonb,
'[
  {"name":"Men''s T-Shirt (M)","sku":"MEN-001","price":14.99,"cost_price":6.00,"unit":"pcs","category":"Men''s Clothing"},
  {"name":"Men''s Chinos (32)","sku":"MEN-002","price":34.99,"cost_price":15.00,"unit":"pcs","category":"Men''s Clothing"},
  {"name":"Women''s Blouse (S)","sku":"WOM-001","price":22.99,"cost_price":9.00,"unit":"pcs","category":"Women''s Clothing"},
  {"name":"Women''s Jeans (28)","sku":"WOM-002","price":39.99,"cost_price":17.00,"unit":"pcs","category":"Women''s Clothing"},
  {"name":"Kids T-Shirt (6–8y)","sku":"KID-001","price":9.99,"cost_price":3.50,"unit":"pcs","category":"Children''s Clothing"},
  {"name":"Leather Belt","sku":"ACC-001","price":12.99,"cost_price":4.50,"unit":"pcs","category":"Accessories"},
  {"name":"Sneakers (Size 42)","sku":"SHO-001","price":49.99,"cost_price":22.00,"unit":"pair","category":"Footwear"},
  {"name":"Sunglasses","sku":"ACC-002","price":19.99,"cost_price":7.00,"unit":"pcs","category":"Accessories"}
]'::jsonb),

-- PHARMACY
('pharmacy', 'Pharmacy', 'Pill', 'Health and wellness with OTC medicines, supplements, and personal care.',
'[
  {"name":"Pain Relief","sort_order":1},
  {"name":"Cold & Flu","sort_order":2},
  {"name":"Vitamins & Supplements","sort_order":3},
  {"name":"First Aid","sort_order":4},
  {"name":"Personal Care","sort_order":5},
  {"name":"Baby Care","sort_order":6}
]'::jsonb,
'[
  {"name":"Paracetamol 500mg (24s)","sku":"PAI-001","price":3.50,"cost_price":1.20,"unit":"pack","category":"Pain Relief"},
  {"name":"Ibuprofen 400mg (16s)","sku":"PAI-002","price":4.20,"cost_price":1.80,"unit":"pack","category":"Pain Relief"},
  {"name":"Vitamin C 1000mg (30s)","sku":"VIT-001","price":7.50,"cost_price":3.00,"unit":"bottle","category":"Vitamins & Supplements"},
  {"name":"Multivitamin (60s)","sku":"VIT-002","price":12.00,"cost_price":5.50,"unit":"bottle","category":"Vitamins & Supplements"},
  {"name":"Cough Syrup 100ml","sku":"COL-001","price":5.80,"cost_price":2.40,"unit":"bottle","category":"Cold & Flu"},
  {"name":"Antiseptic Cream 50g","sku":"FAI-001","price":4.50,"cost_price":1.90,"unit":"tube","category":"First Aid"},
  {"name":"Bandages (Box)","sku":"FAI-002","price":3.00,"cost_price":1.10,"unit":"box","category":"First Aid"},
  {"name":"Hand Sanitiser 250ml","sku":"PCA-001","price":3.20,"cost_price":1.30,"unit":"bottle","category":"Personal Care"}
]'::jsonb),

-- ELECTRONICS
('electronics', 'Electronics Store', 'Cpu', 'Consumer electronics, accessories, and repair parts.',
'[
  {"name":"Phones & Tablets","sort_order":1},
  {"name":"Laptops & Computers","sort_order":2},
  {"name":"Audio","sort_order":3},
  {"name":"Accessories & Cables","sort_order":4},
  {"name":"Smart Home","sort_order":5},
  {"name":"Gaming","sort_order":6}
]'::jsonb,
'[
  {"name":"USB-C Charging Cable 1m","sku":"ACC-001","price":8.99,"cost_price":2.50,"unit":"pcs","category":"Accessories & Cables"},
  {"name":"Phone Screen Protector","sku":"PHO-001","price":6.99,"cost_price":1.80,"unit":"pcs","category":"Phones & Tablets"},
  {"name":"Wireless Earbuds","sku":"AUD-001","price":34.99,"cost_price":14.00,"unit":"pcs","category":"Audio"},
  {"name":"Bluetooth Speaker","sku":"AUD-002","price":49.99,"cost_price":20.00,"unit":"pcs","category":"Audio"},
  {"name":"Phone Case (Universal)","sku":"ACC-002","price":9.99,"cost_price":3.00,"unit":"pcs","category":"Accessories & Cables"},
  {"name":"Power Bank 10000mAh","sku":"ACC-003","price":24.99,"cost_price":10.00,"unit":"pcs","category":"Accessories & Cables"},
  {"name":"HDMI Cable 2m","sku":"CAB-001","price":12.99,"cost_price":4.00,"unit":"pcs","category":"Accessories & Cables"},
  {"name":"Laptop Stand","sku":"LAP-001","price":19.99,"cost_price":7.50,"unit":"pcs","category":"Laptops & Computers"}
]'::jsonb),

-- SALON
('salon', 'Salon / Barber', 'Scissors', 'Hair, beauty, and grooming services with retail products.',
'[
  {"name":"Hair Services","sort_order":1},
  {"name":"Nail Services","sort_order":2},
  {"name":"Skin Care","sort_order":3},
  {"name":"Retail Products","sort_order":4}
]'::jsonb,
'[
  {"name":"Haircut (Men)","sku":"HAI-001","price":12.00,"cost_price":2.00,"unit":"service","category":"Hair Services"},
  {"name":"Haircut (Women)","sku":"HAI-002","price":22.00,"cost_price":4.00,"unit":"service","category":"Hair Services"},
  {"name":"Hair Colour (Full)","sku":"HAI-003","price":45.00,"cost_price":15.00,"unit":"service","category":"Hair Services"},
  {"name":"Manicure","sku":"NAI-001","price":18.00,"cost_price":4.00,"unit":"service","category":"Nail Services"},
  {"name":"Pedicure","sku":"NAI-002","price":22.00,"cost_price":5.00,"unit":"service","category":"Nail Services"},
  {"name":"Facial Treatment","sku":"SKI-001","price":35.00,"cost_price":10.00,"unit":"service","category":"Skin Care"},
  {"name":"Shampoo 400ml (Retail)","sku":"RET-001","price":9.99,"cost_price":4.00,"unit":"bottle","category":"Retail Products"},
  {"name":"Hair Oil 100ml (Retail)","sku":"RET-002","price":7.99,"cost_price":3.00,"unit":"bottle","category":"Retail Products"}
]'::jsonb),

-- GENERAL
('general', 'General Business', 'Store', 'Flexible setup for any retail or service business.',
'[
  {"name":"Products","sort_order":1},
  {"name":"Services","sort_order":2},
  {"name":"Other","sort_order":3}
]'::jsonb,
'[
  {"name":"Item 1","sku":"GEN-001","price":10.00,"cost_price":5.00,"unit":"pcs","category":"Products"},
  {"name":"Item 2","sku":"GEN-002","price":20.00,"cost_price":10.00,"unit":"pcs","category":"Products"},
  {"name":"Service A","sku":"SVC-001","price":25.00,"cost_price":5.00,"unit":"service","category":"Services"}
]'::jsonb);

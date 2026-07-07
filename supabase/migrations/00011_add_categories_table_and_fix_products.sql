-- Ensure category column exists on products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'General';

-- Create tenant-scoped categories table
CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, name)
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_view_categories" ON public.categories;
CREATE POLICY "tenant_view_categories" ON public.categories
  FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant(auth.uid()) OR get_user_role(auth.uid()) = 'superadmin');

DROP POLICY IF EXISTS "owner_manage_categories" ON public.categories;
CREATE POLICY "owner_manage_categories" ON public.categories
  FOR ALL TO authenticated
  USING (tenant_id = get_user_tenant(auth.uid()) AND get_user_role(auth.uid()) IN ('owner', 'superadmin'));

-- Seed default categories for existing tenants
INSERT INTO public.categories (tenant_id, name)
SELECT t.id, c.name
FROM public.tenants t
CROSS JOIN (
  VALUES
    ('Food'), ('Beverages'), ('Electronics'), ('Electricals'),
    ('Mobile Phones'), ('Computers & Accessories'), ('Home Appliances'),
    ('Furniture'), ('Hardware'), ('Building Materials'), ('Stationery'),
    ('Cosmetics & Beauty'), ('Clothing & Fashion'), ('Footwear'),
    ('Pharmacy'), ('Agricultural Products'), ('Automotive Parts'),
    ('Kitchenware'), ('Cleaning Supplies'), ('Sports & Fitness'),
    ('Toys & Games'), ('Books & Magazines'), ('General Merchandise'),
    ('Services'), ('Other')
) AS c(name)
ON CONFLICT (tenant_id, name) DO NOTHING;
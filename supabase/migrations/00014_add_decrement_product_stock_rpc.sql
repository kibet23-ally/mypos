
-- Atomic stock decrement — avoids race condition from stale in-memory stock value
CREATE OR REPLACE FUNCTION public.decrement_product_stock(p_product_id uuid, p_qty integer)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE public.products
  SET stock = GREATEST(stock - p_qty, 0)
  WHERE id = p_product_id
    AND tenant_id = get_user_tenant(auth.uid());
$$;

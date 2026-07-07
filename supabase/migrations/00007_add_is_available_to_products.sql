-- Add is_available column (controls POS visibility without archiving the product)
-- Wrapped in DO block so it safely skips if products table doesn't exist yet
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'products'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'is_available'
    ) THEN
      ALTER TABLE public.products ADD COLUMN is_available boolean NOT NULL DEFAULT true;
      UPDATE public.products SET is_available = true;
    END IF;
  END IF;
END;
$$;

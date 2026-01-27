-- Add alt_unit_value column to products table
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS alt_unit_value NUMERIC;

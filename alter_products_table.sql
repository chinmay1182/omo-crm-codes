-- Add alt_unit_type and alt_qty_in_numbers columns to products table if they don't exist
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS alt_unit_type TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS alt_qty_in_numbers NUMERIC;

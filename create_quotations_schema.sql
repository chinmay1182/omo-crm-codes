/* SQL Script to ensure Quotations Schema supports JSONB structure */
/* User asked for "script" to support discount dropdowns and tables. */
/* Since Supabase (PostgreSQL) uses JSONB for flexible item storage in 'products' column, */
/* we primarily just need to ensure the column exists. */

-- Enable Extension if not exists (for UUIDs)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Ensure quotations table exists
CREATE TABLE IF NOT EXISTS public.quotations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    quotation_id TEXT UNIQUE NOT NULL, -- e.g. Q-1001
    contact_name TEXT,
    company_name TEXT,
    source TEXT DEFAULT 'Website',
    stage TEXT DEFAULT 'Created',
    amount NUMERIC,
    received_amount NUMERIC,
    transaction_id TEXT,
    payment_status TEXT DEFAULT 'Full',
    discount_type TEXT DEFAULT 'All', -- Global discount type (Deprecated but kept for legacy)
    discount_value NUMERIC DEFAULT 0, -- Global discount value (Deprecated)
    gst_rate NUMERIC DEFAULT 18,
    notes TEXT,
    products JSONB DEFAULT '[]'::jsonb, -- Stores array of products {id, name, qty, discount, discount_type, sale_price}
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Note: The JSONB structure for 'products' will naturally support the new fields:
-- [
--   {
--     "id": "...",
--     "qty": 10,
--     "discount": 5,
--     "discount_type": "Retailer",  <-- New Field supported automatically
--     "product_name": "...",
--     "sale_price": ...
--   }
-- ]

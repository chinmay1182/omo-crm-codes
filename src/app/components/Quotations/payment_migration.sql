ALTER TABLE public.product_quotations 
ADD COLUMN IF NOT EXISTS payment_status TEXT, -- 'Full' or 'Partial'
ADD COLUMN IF NOT EXISTS received_amount NUMERIC,
ADD COLUMN IF NOT EXISTS transaction_id TEXT,
ADD COLUMN IF NOT EXISTS payment_date TIMESTAMP WITH TIME ZONE;

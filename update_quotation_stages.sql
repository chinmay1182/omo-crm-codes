-- Script to add new columns for quotation stages
ALTER TABLE product_quotations
ADD COLUMN dispatch_reference TEXT,
ADD COLUMN dispatch_notes TEXT,
ADD COLUMN billed_reference TEXT,
ADD COLUMN billed_notes TEXT,
ADD COLUMN payment_notes TEXT;

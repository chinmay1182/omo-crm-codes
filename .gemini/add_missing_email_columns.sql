-- Add missing columns for email threading and details
-- Run this in Supabase SQL Editor to enable Reply All, CC, and robust Threading

ALTER TABLE emails 
ADD COLUMN IF NOT EXISTS email_references TEXT,
ADD COLUMN IF NOT EXISTS cc TEXT,
ADD COLUMN IF NOT EXISTS bcc TEXT;

COMMENT ON COLUMN emails.email_references IS 'References header for threading';
COMMENT ON COLUMN emails.cc IS 'Cc recipients';
COMMENT ON COLUMN emails.bcc IS 'Bcc recipients';

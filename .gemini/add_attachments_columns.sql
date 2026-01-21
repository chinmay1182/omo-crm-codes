-- Add attachments columns to emails table
-- Run this in Supabase SQL Editor

-- Add attachments column (JSON text field)
ALTER TABLE emails 
ADD COLUMN IF NOT EXISTS attachments TEXT;

-- Add has_attachments column (boolean)
ALTER TABLE emails 
ADD COLUMN IF NOT EXISTS has_attachments BOOLEAN DEFAULT FALSE;

-- Add comment for documentation
COMMENT ON COLUMN emails.attachments IS 'JSON array of attachment metadata: [{filename, size, contentType}]';
COMMENT ON COLUMN emails.has_attachments IS 'Quick flag to check if email has attachments';

-- Create index for faster queries on emails with attachments
CREATE INDEX IF NOT EXISTS idx_emails_has_attachments ON emails(has_attachments) WHERE has_attachments = TRUE;

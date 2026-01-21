-- Add signature column to workspace_emails table
ALTER TABLE workspace_emails 
ADD COLUMN IF NOT EXISTS signature TEXT;

COMMENT ON COLUMN workspace_emails.signature IS 'HTML content of the email signature';

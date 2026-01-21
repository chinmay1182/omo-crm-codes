-- 1. Add missing columns for Reply All, CC, and Threading
ALTER TABLE emails 
ADD COLUMN IF NOT EXISTS email_references TEXT,
ADD COLUMN IF NOT EXISTS cc TEXT,
ADD COLUMN IF NOT EXISTS bcc TEXT;

COMMENT ON COLUMN emails.email_references IS 'References header for threading';
COMMENT ON COLUMN emails.cc IS 'Cc recipients';
COMMENT ON COLUMN emails.bcc IS 'Bcc recipients';

-- 2. Create a computed function to calculate Thread Count across ALL folders
-- This allows selecting 'thread_count' in the API
CREATE OR REPLACE FUNCTION thread_count(email_row emails)
RETURNS bigint AS $$
  SELECT COUNT(*)
  FROM emails e
  WHERE 
    -- Match by Normalized Subject (removing Re:, Fwd: prefixes)
    -- Regex: Remove one or more occurences of Re:/Fwd: at the start
    trim(lower(regexp_replace(e.subject, '^((re|fwd|fw):\s*)+', '', 'i'))) = 
    trim(lower(regexp_replace(email_row.subject, '^((re|fwd|fw):\s*)+', '', 'i')))
    
    -- Function to ensure access control logic matches (Agents vs Users owner_id)
    AND (
        (e.owner_id IS NULL AND email_row.owner_id IS NULL) OR
        (e.owner_id = email_row.owner_id)
    );
$$ LANGUAGE sql STABLE;

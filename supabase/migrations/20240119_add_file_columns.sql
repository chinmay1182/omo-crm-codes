-- Add missing columns to company_files table
ALTER TABLE company_files 
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS file_content bytea;

-- Add missing columns to contact_files table
ALTER TABLE contact_files 
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS file_content bytea;

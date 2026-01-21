-- Create contact_files table if it doesn't exist
CREATE TABLE IF NOT EXISTS contact_files (
  id SERIAL PRIMARY KEY,
  contact_id INTEGER NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT,
  file_type TEXT,
  file_size INTEGER,
  description TEXT,
  file_content BYTEA,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create company_files table if it doesn't exist
CREATE TABLE IF NOT EXISTS company_files (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT,
  file_type TEXT,
  file_size INTEGER,
  description TEXT,
  file_content BYTEA,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add missing columns to contact_files if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contact_files' AND column_name = 'file_path') THEN
    ALTER TABLE contact_files ADD COLUMN file_path TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contact_files' AND column_name = 'file_name') THEN
    ALTER TABLE contact_files ADD COLUMN file_name TEXT NOT NULL DEFAULT 'untitled';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contact_files' AND column_name = 'file_type') THEN
    ALTER TABLE contact_files ADD COLUMN file_type TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contact_files' AND column_name = 'file_size') THEN
    ALTER TABLE contact_files ADD COLUMN file_size INTEGER;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contact_files' AND column_name = 'description') THEN
    ALTER TABLE contact_files ADD COLUMN description TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contact_files' AND column_name = 'file_content') THEN
    ALTER TABLE contact_files ADD COLUMN file_content BYTEA;
  END IF;
END $$;

-- Add missing columns to company_files if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'company_files' AND column_name = 'file_path') THEN
    ALTER TABLE company_files ADD COLUMN file_path TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'company_files' AND column_name = 'file_name') THEN
    ALTER TABLE company_files ADD COLUMN file_name TEXT NOT NULL DEFAULT 'untitled';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'company_files' AND column_name = 'file_type') THEN
    ALTER TABLE company_files ADD COLUMN file_type TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'company_files' AND column_name = 'file_size') THEN
    ALTER TABLE company_files ADD COLUMN file_size INTEGER;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'company_files' AND column_name = 'description') THEN
    ALTER TABLE company_files ADD COLUMN description TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'company_files' AND column_name = 'file_content') THEN
    ALTER TABLE company_files ADD COLUMN file_content BYTEA;
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_contact_files_contact_id ON contact_files(contact_id);
CREATE INDEX IF NOT EXISTS idx_company_files_company_id ON company_files(company_id);

-- Add updated_at trigger for contact_files
CREATE OR REPLACE FUNCTION update_contact_files_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_contact_files_updated_at ON contact_files;
CREATE TRIGGER update_contact_files_updated_at
  BEFORE UPDATE ON contact_files
  FOR EACH ROW
  EXECUTE FUNCTION update_contact_files_updated_at();

-- Add updated_at trigger for company_files
CREATE OR REPLACE FUNCTION update_company_files_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_company_files_updated_at ON company_files;
CREATE TRIGGER update_company_files_updated_at
  BEFORE UPDATE ON company_files
  FOR EACH ROW
  EXECUTE FUNCTION update_company_files_updated_at();

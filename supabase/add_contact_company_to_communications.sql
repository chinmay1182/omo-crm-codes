-- First, let's check what type contacts.id and companies.id actually are
-- They might be TEXT/VARCHAR or BIGINT, not UUID

-- Add contact_id and company_id to emails table
-- Using TEXT type to be compatible with most id formats
ALTER TABLE public.emails 
ADD COLUMN IF NOT EXISTS contact_id TEXT,
ADD COLUMN IF NOT EXISTS company_id TEXT;

-- Add contact_id and company_id to messages table (WhatsApp)
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS contact_id TEXT,
ADD COLUMN IF NOT EXISTS company_id TEXT;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_emails_contact_id ON public.emails(contact_id);
CREATE INDEX IF NOT EXISTS idx_emails_company_id ON public.emails(company_id);
CREATE INDEX IF NOT EXISTS idx_messages_contact_id ON public.messages(contact_id);
CREATE INDEX IF NOT EXISTS idx_messages_company_id ON public.messages(company_id);

-- Create a function to auto-link emails to contacts based on email address
CREATE OR REPLACE FUNCTION link_email_to_contact()
RETURNS TRIGGER AS $$
BEGIN
  -- Try to find matching contact by email (from or to)
  IF NEW.contact_id IS NULL THEN
    -- Check if 'from' matches a contact email
    SELECT id::TEXT, company_id::TEXT INTO NEW.contact_id, NEW.company_id
    FROM public.contacts
    WHERE email = NEW."from"
    LIMIT 1;
    
    -- If not found, check if 'to' matches
    IF NEW.contact_id IS NULL THEN
      SELECT id::TEXT, company_id::TEXT INTO NEW.contact_id, NEW.company_id
      FROM public.contacts
      WHERE email = NEW."to"
      LIMIT 1;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-linking emails
DROP TRIGGER IF EXISTS trigger_link_email_to_contact ON public.emails;
CREATE TRIGGER trigger_link_email_to_contact
  BEFORE INSERT OR UPDATE ON public.emails
  FOR EACH ROW
  EXECUTE FUNCTION link_email_to_contact();

-- Create a function to auto-link WhatsApp messages to contacts based on phone number
CREATE OR REPLACE FUNCTION link_message_to_contact()
RETURNS TRIGGER AS $$
DECLARE
  v_contact_id TEXT;
  v_company_id TEXT;
  v_phone_digits TEXT;
BEGIN
  -- Try to find matching contact by phone number
  IF NEW.contact_id IS NULL THEN
    -- Extract last 10 digits from the contact number (either from_number or to_number)
    -- Assuming from_number is the contact when direction is IN, to_number when direction is OUT
    IF NEW.direction = 'IN' THEN
      v_phone_digits := regexp_replace(NEW.from_number, '[^0-9]', '', 'g');
      v_phone_digits := right(v_phone_digits, 10);
    ELSE
      v_phone_digits := regexp_replace(NEW.to_number, '[^0-9]', '', 'g');
      v_phone_digits := right(v_phone_digits, 10);
    END IF;
    
    -- Try to match with contact's mobile or phone
    SELECT id::TEXT, company_id::TEXT INTO v_contact_id, v_company_id
    FROM public.contacts
    WHERE regexp_replace(COALESCE(mobile, phone, ''), '[^0-9]', '', 'g') LIKE '%' || v_phone_digits
    LIMIT 1;
    
    IF v_contact_id IS NOT NULL THEN
      NEW.contact_id := v_contact_id;
      NEW.company_id := v_company_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-linking WhatsApp messages
DROP TRIGGER IF EXISTS trigger_link_message_to_contact ON public.messages;
CREATE TRIGGER trigger_link_message_to_contact
  BEFORE INSERT OR UPDATE ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION link_message_to_contact();

-- Backfill existing emails with contact/company relationships
UPDATE public.emails e
SET contact_id = c.id::TEXT, company_id = c.company_id::TEXT
FROM public.contacts c
WHERE e.contact_id IS NULL 
  AND (c.email = e."from" OR c.email = e."to");

-- Backfill existing messages with contact/company relationships
UPDATE public.messages m
SET contact_id = c.id::TEXT, company_id = c.company_id::TEXT
FROM public.contacts c
WHERE m.contact_id IS NULL
  AND (
    regexp_replace(COALESCE(c.mobile, c.phone, ''), '[^0-9]', '', 'g') LIKE '%' || right(regexp_replace(m.from_number, '[^0-9]', '', 'g'), 10)
    OR regexp_replace(COALESCE(c.mobile, c.phone, ''), '[^0-9]', '', 'g') LIKE '%' || right(regexp_replace(m.to_number, '[^0-9]', '', 'g'), 10)
  );

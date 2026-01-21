-- Add attachment columns to emails table
ALTER TABLE public.emails 
ADD COLUMN IF NOT EXISTS has_attachments BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS attachments JSONB,
ADD COLUMN IF NOT EXISTS cc TEXT,
ADD COLUMN IF NOT EXISTS bcc TEXT,
ADD COLUMN IF NOT EXISTS thread_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS thread_has_attachments BOOLEAN DEFAULT FALSE;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_emails_has_attachments ON public.emails(has_attachments);
CREATE INDEX IF NOT EXISTS idx_emails_folder ON public.emails(folder);
CREATE INDEX IF NOT EXISTS idx_emails_message_id ON public.emails(message_id);

-- Add comment
COMMENT ON COLUMN public.emails.has_attachments IS 'Boolean flag indicating if email has attachments';
COMMENT ON COLUMN public.emails.attachments IS 'JSON array of attachment metadata (filename, size, contentType)';
COMMENT ON COLUMN public.emails.thread_count IS 'Number of emails in the conversation thread';
COMMENT ON COLUMN public.emails.thread_has_attachments IS 'Boolean flag indicating if any email in the thread has attachments';

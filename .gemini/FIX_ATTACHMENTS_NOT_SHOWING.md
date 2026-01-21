# Fix: Attachments Not Showing in Email List

## Problem
The attachment indicators are not showing in the inbox because the database table is missing the required columns (`has_attachments`, `attachments`, `cc`, `bcc`, `thread_count`).

## Solution

### Step 1: Run the Database Migration

You need to add the missing columns to your Supabase `emails` table. 

**Option A: Using Supabase Dashboard (Recommended)**

1. Go to your Supabase Dashboard: https://app.supabase.com
2. Select your project
3. Go to **SQL Editor** (in the left sidebar)
4. Click **New Query**
5. Copy and paste the following SQL:

```sql
-- Add attachment columns to emails table
ALTER TABLE public.emails 
ADD COLUMN IF NOT EXISTS has_attachments BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS attachments JSONB,
ADD COLUMN IF NOT EXISTS cc TEXT,
ADD COLUMN IF NOT EXISTS bcc TEXT,
ADD COLUMN IF NOT EXISTS thread_count INTEGER DEFAULT 0;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_emails_has_attachments ON public.emails(has_attachments);
CREATE INDEX IF NOT EXISTS idx_emails_folder ON public.emails(folder);
CREATE INDEX IF NOT EXISTS idx_emails_message_id ON public.emails(message_id);

-- Add comment
COMMENT ON COLUMN public.emails.has_attachments IS 'Boolean flag indicating if email has attachments';
COMMENT ON COLUMN public.emails.attachments IS 'JSON array of attachment metadata (filename, size, contentType)';
COMMENT ON COLUMN public.emails.thread_count IS 'Number of emails in the conversation thread';
```

6. Click **Run** or press `Ctrl+Enter`
7. You should see "Success. No rows returned"

**Option B: Using Supabase CLI**

If you have Supabase CLI installed:

```bash
supabase db push
```

### Step 2: Re-sync Your Emails

After running the migration:

1. Go to your email page in the app
2. Click the **Refresh/Sync** button (🔄 icon)
3. This will fetch emails from Gmail again and store them with attachment data
4. Check the browser console (F12) - you should see logs like:
   - `✅ Loaded X emails from INBOX`
   - `📎 Emails with attachments: X`
   - If there are attachments, you'll see sample data

### Step 3: Verify

After syncing, emails with attachments should now show:
- Date on the right side
- Below the date: `📎 filename.pdf` (or whatever the attachment name is)

## Why This Happened

The original database schema (`create_emails_table.sql`) didn't include columns for:
- `has_attachments` - boolean flag
- `attachments` - JSON data with attachment metadata
- `cc`, `bcc` - email CC and BCC fields
- `thread_count` - conversation thread count

The IMAP fetch code was trying to save this data, but it was being silently ignored because the columns didn't exist.

## Next Steps

Once the migration is complete and you've re-synced:
1. All new emails will automatically have attachment data
2. Old emails will be updated when you sync them again
3. The attachment indicator will appear in the list for any email with attachments

# Attachment Debugging Guide

## Step-by-Step Debug Process:

### 1. Open Browser Console (F12)
- Go to **Console** tab
- Clear all logs

### 2. Open an Email with Attachment
- Click on any sent email
- Watch console logs

### 3. Check These Logs:

**Look for**:
```
📁 Folder changed to: Sent, syncing from Gmail...
✅ Loaded X emails from Sent
```

**Then check**:
```
Supabase Upsert Error: {...}
```

### 4. Network Tab Check:

**Go to Network tab**:
1. Filter by "fetch-imap"
2. Click on the request
3. Go to **Response** tab
4. Look for errors

**Also check**:
1. Filter by "list" (emails/list API)
2. Check response
3. See if attachments field is present

### 5. Database Direct Check:

**Supabase Dashboard**:
1. Go to Table Editor
2. Open `emails` table
3. Find a sent email
4. Check these columns:
   - `attachments` → Should have JSON data
   - `has_attachments` → Should be `true`

### 6. Share These Details:

Please share:
1. Any "Supabase Upsert Error" from console
2. Network response for `/api/emails/list`
3. Database value of `attachments` column for one email

This will tell us exactly where the issue is!

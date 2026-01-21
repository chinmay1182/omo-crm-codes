# Email System Issues Analysis

## Issues Reported:

1. **Failed to send email** - New Email and reply to existing email not working
2. **Inbox showing duplicate emails** - When opening an email, if multiple emails exist from same email ID, all are showing
3. **Gmail deletion not syncing** - If email deleted from Gmail, it still shows in CRM inbox
4. **Draft option not working** - Emails draft functionality broken
5. **Failed to fetch task** - Task fetching API error

## Root Cause Analysis:

### Issue 1: Failed to Send Email
**Location**: `/api/email/send/route.ts`
**Problem**: The send API is working but there might be:
- Missing error handling for attachment processing
- IMAP append to Sent folder might be failing silently
- Frontend not properly handling errors

### Issue 2: Duplicate Email Threading
**Location**: `/api/email/thread/route.ts` (lines 174-252)
**Problem**: The threading logic is matching by subject only when messageId is not available, causing unrelated emails with similar subjects to appear in the same thread.

### Issue 3: Gmail Deletion Not Syncing
**Location**: `/api/email/delete/route.ts` and `/api/emails/list/route.ts`
**Problem**: 
- Delete API only moves email to trash in Gmail IMAP
- Does NOT delete from local database (`emails` table)
- List API continues to show emails from database even if deleted from Gmail

### Issue 4: Draft Option Not Working
**Location**: Frontend - `page.tsx` has no "Save as Draft" button
**Problem**: 
- Draft API exists at `/api/email/draft/route.ts`
- But frontend compose modal has no "Save as Draft" button
- Only "Send" and "Cancel" options available

### Issue 5: Failed to Fetch Task
**Location**: `/api/contacts/tasks/route.ts`
**Problem**: Needs investigation - might be authentication or database query issue

## Fix Plan:

1. ✅ Add better error handling to send email API
2. ✅ Fix email threading to not show unrelated emails
3. ✅ Update delete API to also delete from database
4. ✅ Add "Save as Draft" button to compose modal
5. ✅ Fix task fetching API error handling

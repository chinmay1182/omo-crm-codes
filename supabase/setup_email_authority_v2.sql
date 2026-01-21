-- Re-create workspace_emails table to support both UUID (Admin) and Integer (Agent) IDs
DROP TABLE IF EXISTS public.workspace_emails;

CREATE TABLE public.workspace_emails (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    email TEXT NOT NULL,
    app_password TEXT NOT NULL,
    -- stored as TEXT to accomodate both UUIDs (auth.users) and Integers (agents table)
    assigned_agent_id TEXT NOT NULL, 
    agent_name TEXT
);

-- RLS for workspace_emails
ALTER TABLE public.workspace_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow admins to manage email configs" ON public.workspace_emails
    FOR ALL
    USING (auth.role() = 'authenticated') 
    WITH CHECK (auth.role() = 'authenticated');

-- Grant access to service role
GRANT ALL ON public.workspace_emails TO service_role;

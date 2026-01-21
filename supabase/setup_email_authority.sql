-- Create workspace_emails table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.workspace_emails (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    email TEXT NOT NULL,
    app_password TEXT NOT NULL,
    assigned_agent_id UUID REFERENCES auth.users(id),
    agent_name TEXT, -- Optional, for display convenience if join is hard
    status TEXT DEFAULT 'active'
);

-- Enable RLS
ALTER TABLE public.workspace_emails ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow authenticated users to view email settings" ON public.workspace_emails
    FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert/update email settings" ON public.workspace_emails
    FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Grant permissions
GRANT ALL ON public.workspace_emails TO service_role;

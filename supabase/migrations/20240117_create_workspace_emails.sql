-- Create table for Workspace Emails
create table public.workspace_emails (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default now(),
  email text not null,
  app_password text not null, -- App Password for Gmail
  assigned_agent_id uuid references auth.users(id) on delete set null, -- Link to the agent/user
  agent_name text, -- Optional: cache name for easier display
  is_active boolean default true
);

-- Enable RLS
alter table public.workspace_emails enable row level security;

-- Policies (Adjust based on your Auth setup)
-- Allow Admins to do everything
create policy "Admins can do everything on workspace_emails"
  on public.workspace_emails
  for all
  using (true); -- Replace 'true' with proper admin check logic later

-- Allow Agents to read their OWN assigned email
create policy "Agents can read assigned email"
  on public.workspace_emails
  for select
  using (auth.uid() = assigned_agent_id);

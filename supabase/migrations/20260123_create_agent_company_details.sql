create table if not exists agent_company_details (
  id uuid default gen_random_uuid() primary key,
  agent_id bigint references agents(id) on delete cascade not null,
  company_name text,
  address_street text,
  address_street_2 text,
  address_landmark text,
  address_state text,
  address_city text,
  address_pincode text,
  company_email text,
  company_phone text,
  contact_person text,
  cin text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(agent_id)
);

-- Enable RLS
alter table agent_company_details enable row level security;

-- Policies (Adjust based on how auth is handled)
-- Note: 'agents.id' is bigint, but 'auth.uid()' is uuid. A direct comparison will fail.
-- Assuming the backend handles authorization via Service Role or explicit checks, we can keep policies minimal or comment them out.
-- If 'agents' table has a 'auth_user_id' column linked to auth.users, the policy should be:
-- using (agent_id in (select id from agents where auth_user_id = auth.uid()))

-- For now, commenting out the policy to prevent type mismatch errors during creation. 
-- The API routes perform explicit permission checks.

/*
create policy "Allow agents to manage their own company details"
  on agent_company_details
  for all
  using (agent_id::text = auth.uid()::text) -- dangerous cast if id types don't match semantically
  with check (agent_id::text = auth.uid()::text);
*/

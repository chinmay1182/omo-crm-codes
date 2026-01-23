create table if not exists agent_meeting_apis (
  id uuid default gen_random_uuid() primary key,
  agent_id bigint references agents(id) on delete cascade not null,
  google_client_id text,
  google_client_secret text,
  google_redirect_uri text,
  google_api_key text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(agent_id)
);

-- Enable RLS (managed via service role in API for now)
alter table agent_meeting_apis enable row level security;

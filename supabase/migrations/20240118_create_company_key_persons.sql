create table if not exists company_key_persons (
  id uuid default gen_random_uuid() primary key,
  company_id bigint references companies(id) on delete cascade not null unique,
  name text not null,
  mobile text,
  designation text,
  email text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS Policies (allowing all operations since auth is handled at API level)
alter table company_key_persons enable row level security;

create policy "Enable all access for service role" on company_key_persons
  for all using (true) with check (true);

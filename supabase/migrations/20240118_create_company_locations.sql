create table if not exists company_locations (
  id uuid default gen_random_uuid() primary key,
  company_id bigint references companies(id) on delete cascade not null,
  name text,
  address text not null,
  city text,
  state text,
  country text,
  postal_code text,
  latitude decimal(10, 8),
  longitude decimal(11, 8),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS Policies (allowing all operations since auth is handled at API level)
alter table company_locations enable row level security;

create policy "Enable all access for service role" on company_locations
  for all using (true) with check (true);

create table if not exists company_registrations (
  id uuid default gen_random_uuid() primary key,
  company_id bigint references companies(id) on delete cascade not null,
  registration_name text not null,
  registration_number text not null,
  start_date date,
  end_date date,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS Policies (allowing all operations since auth is handled at API level)
alter table company_registrations enable row level security;

create policy "Enable all access for service role" on company_registrations
  for all using (true) with check (true);

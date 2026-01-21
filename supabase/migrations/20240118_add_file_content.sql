-- Add file_content column to contact_files if it doesn't exist
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name = 'contact_files' and column_name = 'file_content') then
    alter table contact_files add column file_content bytea;
  end if;
end $$;

-- Ensure company_files has file_content as bytea
-- (Assuming it exists, but good to be safe if we need to cast/alter)

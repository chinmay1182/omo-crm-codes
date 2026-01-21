-- Enable Realtime for messages table
alter publication supabase_realtime add table messages;

-- Verify Realtime is enabled
select schemaname, tablename 
from pg_publication_tables 
where pubname = 'supabase_realtime';

-- Create Supabase Storage bucket for WhatsApp media
insert into storage.buckets (id, name, public)
values ('whatsapp-media', 'whatsapp-media', true);

-- Set up storage policies for public access
create policy "Public Access"
on storage.objects for select
using ( bucket_id = 'whatsapp-media' );

create policy "Authenticated users can upload"
on storage.objects for insert
with check ( bucket_id = 'whatsapp-media' );

create policy "Authenticated users can update"
on storage.objects for update
using ( bucket_id = 'whatsapp-media' );

create policy "Authenticated users can delete"
on storage.objects for delete
using ( bucket_id = 'whatsapp-media' );

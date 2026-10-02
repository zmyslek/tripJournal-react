-- Private media storage for authenticated trip photos and videos.

insert into storage.buckets (id, name, public)
values ('trip-media', 'trip-media', false)
on conflict (id) do nothing;

create policy "Users can read their trip media"
on storage.objects
for select
using (
    bucket_id = 'trip-media'
    and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can upload their trip media"
on storage.objects
for insert
with check (
    bucket_id = 'trip-media'
    and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can update their trip media"
on storage.objects
for update
using (
    bucket_id = 'trip-media'
    and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
    bucket_id = 'trip-media'
    and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can delete their trip media"
on storage.objects
for delete
using (
    bucket_id = 'trip-media'
    and (storage.foldername(name))[1] = auth.uid()::text
);
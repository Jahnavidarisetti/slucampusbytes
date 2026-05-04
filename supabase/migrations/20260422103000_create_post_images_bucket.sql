-- Storage bucket for post images used by create post composer.
insert into storage.buckets (id, name, public)
values ('post-images', 'post-images', true)
on conflict (id) do nothing;

drop policy if exists "Post images are publicly readable" on storage.objects;
drop policy if exists "Authenticated users can upload post images" on storage.objects;
drop policy if exists "Users can update their own post images" on storage.objects;

create policy "Post images are publicly readable"
on storage.objects
for select
using (bucket_id = 'post-images');

create policy "Authenticated users can upload post images"
on storage.objects
for insert
with check (
  bucket_id = 'post-images'
  and auth.role() = 'authenticated'
);

create policy "Users can update their own post images"
on storage.objects
for update
using (
  bucket_id = 'post-images'
  and auth.uid() = owner
);


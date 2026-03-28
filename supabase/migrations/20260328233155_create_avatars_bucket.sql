-- Storage bucket for profile avatars
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Storage policies
create policy "Avatar images are publicly readable"
on storage.objects
for select
using (bucket_id = 'avatars');

create policy "Users can upload their avatar"
on storage.objects
for insert
with check (bucket_id = 'avatars' and auth.uid() = owner);

create policy "Users can update their avatar"
on storage.objects
for update
using (bucket_id = 'avatars' and auth.uid() = owner);

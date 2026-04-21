create table if not exists public.organization_followers (
  user_id uuid not null references public.profiles(id) on delete cascade,
  organization_id uuid not null,
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  primary key (user_id, organization_id)
);

create index if not exists organization_followers_organization_id_idx
  on public.organization_followers (organization_id);

create index if not exists organization_followers_user_id_idx
  on public.organization_followers (user_id);

alter table public.organization_followers enable row level security;

drop policy if exists "Organization followers are viewable by everyone" on public.organization_followers;
drop policy if exists "Users can follow organizations" on public.organization_followers;
drop policy if exists "Users can unfollow organizations" on public.organization_followers;

create policy "Organization followers are viewable by everyone"
on public.organization_followers
for select
using (true);

create policy "Users can follow organizations"
on public.organization_followers
for insert
with check (auth.uid() = user_id);

create policy "Users can unfollow organizations"
on public.organization_followers
for delete
using (auth.uid() = user_id);

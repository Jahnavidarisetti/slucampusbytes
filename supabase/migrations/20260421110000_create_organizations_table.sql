create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  username text not null unique,
  name text not null,
  description text,
  logo_url text,
  created_at timestamp with time zone not null default timezone('utc'::text, now())
);

create index if not exists organizations_profile_id_idx
  on public.organizations (profile_id);

create index if not exists organizations_username_idx
  on public.organizations (username);

insert into public.organizations (profile_id, username, name, description, logo_url)
select
  p.id,
  coalesce(nullif(trim(p.username), ''), split_part(p.email, '@', 1)),
  coalesce(nullif(trim(p.full_name), ''), nullif(trim(p.username), ''), split_part(p.email, '@', 1)),
  nullif(trim(p.organization_description), ''),
  nullif(trim(p.avatar_url), '')
from public.profiles p
where p.role = 'Organization'
on conflict (profile_id) do update
set
  username = excluded.username,
  name = excluded.name,
  description = excluded.description,
  logo_url = excluded.logo_url;

create table if not exists public.organization_followers_v2 (
  user_id uuid not null references public.profiles(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  primary key (user_id, organization_id)
);

insert into public.organization_followers_v2 (user_id, organization_id, created_at)
select
  followers.user_id,
  organizations.id,
  followers.created_at
from public.organization_followers followers
join public.organizations organizations
  on organizations.profile_id = followers.organization_id
on conflict (user_id, organization_id) do nothing;

drop table if exists public.organization_followers;

alter table public.organization_followers_v2
  rename to organization_followers;

create index if not exists organization_followers_organization_id_idx
  on public.organization_followers (organization_id);

create index if not exists organization_followers_user_id_idx
  on public.organization_followers (user_id);

alter table public.organizations enable row level security;
alter table public.organization_followers enable row level security;

drop policy if exists "Organizations are viewable by everyone" on public.organizations;
drop policy if exists "Users can create their own organization profile" on public.organizations;
drop policy if exists "Users can update their own organization profile" on public.organizations;
drop policy if exists "Users can delete their own organization profile" on public.organizations;

create policy "Organizations are viewable by everyone"
on public.organizations
for select
using (true);

create policy "Users can create their own organization profile"
on public.organizations
for insert
with check (auth.uid() = profile_id);

create policy "Users can update their own organization profile"
on public.organizations
for update
using (auth.uid() = profile_id)
with check (auth.uid() = profile_id);

create policy "Users can delete their own organization profile"
on public.organizations
for delete
using (auth.uid() = profile_id);

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

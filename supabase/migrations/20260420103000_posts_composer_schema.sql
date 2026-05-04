create extension if not exists pgcrypto;

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  title text,
  description text,
  image_url text,
  likes integer not null default 0,
  comments jsonb not null default '[]'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table if exists public.posts
  add column if not exists title text;

alter table if exists public.posts
  add column if not exists description text;

alter table if exists public.posts
  add column if not exists image_url text;

alter table if exists public.posts
  add column if not exists likes integer not null default 0;

alter table if exists public.posts
  add column if not exists comments jsonb not null default '[]'::jsonb;

alter table if exists public.posts
  add column if not exists created_at timestamp with time zone default timezone('utc'::text, now());

update public.posts
set description = content
where description is null;

alter table if exists public.posts
  alter column content set not null;

alter table if exists public.posts
  alter column likes set default 0;

alter table if exists public.posts
  alter column comments set default '[]'::jsonb;

alter table if exists public.posts
  enable row level security;

drop policy if exists "Posts are viewable by everyone" on public.posts;
drop policy if exists "Users can create posts" on public.posts;
drop policy if exists "Users can update their own posts" on public.posts;
drop policy if exists "Users can delete their own posts" on public.posts;

create policy "Posts are viewable by everyone"
on public.posts
for select
using (true);

create policy "Users can create posts"
on public.posts
for insert
with check (auth.uid() = user_id);

create policy "Users can update their own posts"
on public.posts
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their own posts"
on public.posts
for delete
using (auth.uid() = user_id);

create extension if not exists pgcrypto;

-- Core tables
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  role text not null default 'user',
  created_at timestamp with time zone default timezone('utc'::text, now())
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Row level security
alter table public.profiles enable row level security;
alter table public.posts enable row level security;

-- Profile policies
drop policy if exists "Public profiles are viewable by everyone" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;
drop policy if exists "Users can insert their own profile" on public.profiles;

create policy "Public profiles are viewable by everyone"
on public.profiles
for select
using (true);

create policy "Users can update their own profile"
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "Users can insert their own profile"
on public.profiles
for insert
with check (auth.uid() = id);

-- Post policies
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

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

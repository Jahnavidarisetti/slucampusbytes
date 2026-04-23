create extension if not exists pgcrypto;

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  content text not null,
  title text,
  description text,
  image_url text,
  likes integer not null default 0,
  liked_by uuid[] not null default '{}'::uuid[],
  comments jsonb not null default '[]'::jsonb,
  created_at timestamp with time zone not null default timezone('utc'::text, now())
);

alter table if exists public.posts
  add column if not exists user_id uuid;

alter table if exists public.posts
  add column if not exists content text;

alter table if exists public.posts
  add column if not exists title text;

alter table if exists public.posts
  add column if not exists description text;

alter table if exists public.posts
  add column if not exists image_url text;

alter table if exists public.posts
  add column if not exists likes integer not null default 0;

alter table if exists public.posts
  add column if not exists liked_by uuid[] not null default '{}'::uuid[];

alter table if exists public.posts
  add column if not exists comments jsonb not null default '[]'::jsonb;

alter table if exists public.posts
  add column if not exists created_at timestamp with time zone default timezone('utc'::text, now());

update public.posts
set content = coalesce(nullif(trim(content), ''), coalesce(nullif(trim(description), ''), 'Post update'))
where content is null or trim(content) = '';

update public.posts
set description = content
where description is null or trim(description) = '';

update public.posts
set likes = 0
where likes is null;

update public.posts
set liked_by = '{}'::uuid[]
where liked_by is null;

update public.posts
set comments = '[]'::jsonb
where comments is null;

update public.posts
set created_at = timezone('utc'::text, now())
where created_at is null;

alter table if exists public.posts
  alter column content set not null;

alter table if exists public.posts
  alter column likes set not null;

alter table if exists public.posts
  alter column likes set default 0;

alter table if exists public.posts
  alter column liked_by set not null;

alter table if exists public.posts
  alter column liked_by set default '{}'::uuid[];

alter table if exists public.posts
  alter column comments set not null;

alter table if exists public.posts
  alter column comments set default '[]'::jsonb;

alter table if exists public.posts
  alter column created_at set not null;

alter table if exists public.posts
  alter column created_at set default timezone('utc'::text, now());

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'posts_user_id_fkey'
      and conrelid = 'public.posts'::regclass
  ) then
    begin
      alter table public.posts
        add constraint posts_user_id_fkey
        foreign key (user_id)
        references public.profiles(id)
        on delete cascade
        not valid;

      alter table public.posts
        validate constraint posts_user_id_fkey;
    exception
      when others then
        raise notice 'Skipping posts_user_id_fkey validation due to existing data mismatch: %', sqlerrm;
    end;
  end if;
end $$;

create index if not exists posts_created_at_idx on public.posts (created_at desc);

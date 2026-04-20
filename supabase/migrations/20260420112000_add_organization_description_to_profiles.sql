alter table if exists public.profiles
  add column if not exists organization_description text;

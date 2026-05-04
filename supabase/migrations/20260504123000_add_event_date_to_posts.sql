alter table if exists public.posts
  add column if not exists event_date date;

create index if not exists posts_event_date_idx
  on public.posts (event_date);

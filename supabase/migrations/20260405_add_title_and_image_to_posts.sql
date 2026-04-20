-- Migration: add title and image_url to posts
alter table public.posts
  add column if not exists title text,
  add column if not exists image_url text;

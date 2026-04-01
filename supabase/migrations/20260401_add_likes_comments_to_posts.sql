-- Migration: add likes and comments persistence to posts

alter table if exists public.posts
  add column if not exists likes integer not null default 0;

alter table if exists public.posts
  add column if not exists comments jsonb not null default '[]';

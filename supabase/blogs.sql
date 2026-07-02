create extension if not exists pgcrypto;

create table if not exists public.blogs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  summary text,
  content_markdown text not null,
  cover_image text,
  tags text[] not null default '{}',
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists blogs_status_published_at_idx
  on public.blogs (status, published_at desc);

alter table public.blogs enable row level security;

drop policy if exists "Service role can manage blogs" on public.blogs;
create policy "Service role can manage blogs"
  on public.blogs
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "Anyone can read published blogs" on public.blogs;
create policy "Anyone can read published blogs"
  on public.blogs
  for select
  using (status = 'published');

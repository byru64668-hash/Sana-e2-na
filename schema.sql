-- Run in Supabase SQL Editor.
create extension if not exists pgcrypto;
create table if not exists public.inventory_items (
  id uuid primary key,
  name text not null,
  category text not null default 'Other',
  quantity integer not null default 0 check (quantity >= 0),
  available integer not null default 0 check (available >= 0),
  borrowed integer not null default 0 check (borrowed >= 0),
  condition text not null default 'Good',
  location text,
  responsible text,
  threshold integer not null default 2,
  updated_at timestamptz not null default now()
);
create table if not exists public.reports (
  id uuid primary key,
  type text not null,
  item text,
  details text not null,
  status text not null default 'Pending',
  created_at timestamptz not null default now()
);
create table if not exists public.activity_history (
  id uuid primary key default gen_random_uuid(),
  action text not null,
  detail text,
  created_at timestamptz not null default now()
);
create table if not exists public.admin_sessions (
  token_hash text primary key,
  expires_at timestamptz not null
);
alter table public.inventory_items enable row level security;
alter table public.reports enable row level security;
alter table public.activity_history enable row level security;
alter table public.admin_sessions enable row level security;
-- No direct client writes. All shared changes go through the Edge Function.
create policy "public can read inventory" on public.inventory_items for select to anon, authenticated using (true);
create policy "public can read reports" on public.reports for select to anon, authenticated using (true);
create policy "public can read activity" on public.activity_history for select to anon, authenticated using (true);

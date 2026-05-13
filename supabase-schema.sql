-- Run this in your Supabase SQL Editor

-- Profiles (linked to auth.users)
create table if not exists profiles (
  id uuid references auth.users primary key,
  full_name text,
  role text check (role in ('master', 'trader')),
  city text,
  bio text,
  created_at timestamptz default now()
);

-- Gigs (one per master)
create table if not exists gigs (
  id uuid primary key default gen_random_uuid(),
  master_id uuid references profiles(id) on delete cascade unique,
  style text,
  instruments text[] default '{}',
  performance_fee int default 10,
  is_active boolean default true,
  roi_30d numeric default 0,
  win_rate numeric default 0,
  created_at timestamptz default now()
);

-- Follows (trader → master)
create table if not exists follows (
  id uuid primary key default gen_random_uuid(),
  trader_id uuid references profiles(id) on delete cascade,
  master_id uuid references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  unique(trader_id, master_id)
);

-- Trades
create table if not exists trades (
  id uuid primary key default gen_random_uuid(),
  master_id uuid references profiles(id) on delete cascade,
  pair text not null,
  direction text check (direction in ('BUY', 'SELL')),
  pnl_pips numeric default 0,
  result text check (result in ('WIN', 'LOSS', 'OPEN')) default 'OPEN',
  opened_at timestamptz default now(),
  closed_at timestamptz
);

-- Enable RLS
alter table profiles enable row level security;
alter table gigs enable row level security;
alter table follows enable row level security;
alter table trades enable row level security;

-- Profiles: anyone can read, only owner can write
create policy "profiles_select" on profiles for select using (true);
create policy "profiles_insert" on profiles for insert with check (auth.uid() = id);
create policy "profiles_update" on profiles for update using (auth.uid() = id);

-- Gigs: anyone can read active ones, master manages own
create policy "gigs_select" on gigs for select using (true);
create policy "gigs_insert" on gigs for insert with check (auth.uid() = master_id);
create policy "gigs_update" on gigs for update using (auth.uid() = master_id);
create policy "gigs_delete" on gigs for delete using (auth.uid() = master_id);

-- Follows: anyone can read, trader manages own
create policy "follows_select" on follows for select using (true);
create policy "follows_insert" on follows for insert with check (auth.uid() = trader_id);
create policy "follows_delete" on follows for delete using (auth.uid() = trader_id);

-- Trades: anyone can read, master manages own
create policy "trades_select" on trades for select using (true);
create policy "trades_insert" on trades for insert with check (auth.uid() = master_id);
create policy "trades_update" on trades for update using (auth.uid() = master_id);

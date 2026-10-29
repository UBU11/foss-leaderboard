-- Supabase Database Schema for OSM StreetComplete Leaderboard
-- Run this script in the Supabase Dashboard -> SQL Editor (https://supabase.com/dashboard/project/_/sql/new)

-- 1. Create the participants table
create table if not exists public.participants (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  display_name text,
  total_changes integer not null default 0,
  total_sets integer not null default 0,
  last_active timestamptz,
  history jsonb not null default '[]'::jsonb,
  quests jsonb not null default '{}'::jsonb,
  avatar_url text,
  last_synced_at timestamptz default now(),
  created_at timestamptz default now()
);

-- 2. Create indices for fast leaderboard ordering and username lookups
create index if not exists idx_participants_ranking 
  on public.participants (total_changes desc, total_sets desc);

create index if not exists idx_participants_username 
  on public.participants (username);

-- 3. Enable Row Level Security (RLS)
alter table public.participants enable row level security;

-- 4. Create RLS Policies (Idempotent: drop first if exists)
-- Allow anyone to read leaderboard entries
drop policy if exists "Allow public read on participants" on public.participants;
create policy "Allow public read on participants" 
  on public.participants 
  for select 
  using (true);

-- Allow anyone to register new participants
drop policy if exists "Allow public insert on participants" on public.participants;
create policy "Allow public insert on participants" 
  on public.participants 
  for insert 
  with check (true);

-- Allow public updates to sync score statistics
drop policy if exists "Allow public update on participants" on public.participants;
create policy "Allow public update on participants" 
  on public.participants 
  for update 
  using (true);

-- Allow public delete if a participant needs to be removed
drop policy if exists "Allow public delete on participants" on public.participants;
create policy "Allow public delete on participants" 
  on public.participants 
  for delete 
  using (true);

-- 5. Enable Realtime broadcast for participants table safely
do $$
begin
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' 
    and schemaname = 'public' 
    and tablename = 'participants'
  ) then
    alter publication supabase_realtime add table public.participants;
  end if;
end $$;

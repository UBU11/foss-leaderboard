# Design: Supabase Persistent Storage for OSM Leaderboard

## 1. Overview
The OSM StreetComplete Challenge Leaderboard tracks participant edits and ranks contributors. Previously, participant state was held only in React client-side memory, meaning participants added at runtime were lost on page refresh or across different devices.

This design introduces **Supabase as persistent storage**, storing both participant profiles and their cached scores/quest breakdowns. This gives:
- Persistent participant roster across all sessions and devices.
- Instant initial load directly from Supabase (sub-second render without waiting for OSM API latency).
- Background sync that queries OSM API and updates Supabase (`upsert`).
- Multi-client synchronization via Supabase Realtime so projection displays, laptops, and mobile phones update when new participants are added or standings change.

## 2. Supabase SQL Schema
The database requires the `participants` table. The following SQL script can be executed in the Supabase SQL Editor:

```sql
-- Create participants table
create table if not exists public.participants (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  display_name text,
  total_changes integer not null default 0,
  total_sets integer not null default 0,
  last_active timestamptz,
  history jsonb not null default '[]'::jsonb,
  quests jsonb not null default '[]'::jsonb,
  avatar_url text,
  last_synced_at timestamptz default now(),
  created_at timestamptz default now()
);

-- Index for instant leaderboard ranking and lookup
create index if not exists idx_participants_ranking 
  on public.participants (total_changes desc, total_sets desc);

create index if not exists idx_participants_username 
  on public.participants (username);

-- Enable Row Level Security (RLS)
alter table public.participants enable row level security;

-- Allow public read access to leaderboard
create policy "Allow public read on participants" 
  on public.participants for select using (true);

-- Allow public insert to register new participants
create policy "Allow public insert on participants" 
  on public.participants for insert with check (true);

-- Allow public update to sync scores
create policy "Allow public update on participants" 
  on public.participants for update using (true);

-- Enable Realtime broadcast (for multi-screen live sync)
alter publication supabase_realtime add table public.participants;
```

## 3. Architecture & Data Flow

### 3.1 Environment Configuration (`.env`)
The app uses the existing keys in `.env`:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (compatible with `NEXT_PUBLIC_SUPABASE_ANON_KEY`)

### 3.2 Supabase Client (`src/lib/supabase.ts`)
- Initializes `createClient` from `@supabase/supabase-js`.
- Exports typed client instance `supabase`.
- Provides fallback helper to verify whether Supabase credentials are configured.

### 3.3 Database Operations Service (`src/lib/db.ts`)
- `fetchStoredParticipants(): Promise<ParticipantScore[]>`
  Fetches all participants from Supabase ordered by `total_changes DESC, total_sets DESC`, mapping database rows to `ParticipantScore` objects.
- `saveParticipant(participant: ParticipantScore): Promise<boolean>`
  Inserts or updates a single participant in Supabase.
- `bulkUpdateParticipantScores(scores: ParticipantScore[]): Promise<boolean>`
  Upserts participant score updates into Supabase following an OSM sync.
- `seedInitialParticipants(usernames: string[]): Promise<ParticipantScore[]>`
  If the Supabase `participants` table is empty on first boot, seeds the default participant handles (`INITIAL_PARTICIPANTS`) into Supabase.
- `subscribeToParticipantChanges(onUpdate: () => void): () => void`
  Subscribes to Realtime Postgres changes on `public.participants` and returns an unsubscribe cleanup function.

### 3.4 UI Integration (`src/app/page.tsx` & `AddParticipantDialog.tsx`)
- **Initial Load (`useEffect`)**:
  1. Queries Supabase for existing participants.
  2. If empty, seeds initial participants into Supabase.
  3. Displays cached standings immediately (0ms wait time).
  4. Triggers background sync with OSM API to ensure live data is up to date, then updates Supabase.
- **Auto-Refresh (60s timer & manual "Sync" button)**:
  Queries OSM API for all participants currently in Supabase, recalculates ranks, and updates Supabase.
- **Adding a Participant**:
  1. Validates username.
  2. Fetches immediate score from OSM API.
  3. Inserts into Supabase `participants` table.
  4. Updates local state and recalculates standings.
- **Realtime Listener**:
  Subscribes to Supabase Realtime channel so any updates or new participants immediately reflect across all open clients.

## 4. Verification & Testing Plan
1. **Build Verification**: Run `bun run build` to verify clean compilation with TypeScript and Next.js.
2. **Schema Verification**: Validate that all database mappings (`ParticipantScore` <-> `participants` table row) match exact types and field names.
3. **Graceful Fallback**: Ensure that if Supabase is temporarily unreachable (e.g., table not created yet or network timeout), the app falls back to local memory without crashing.

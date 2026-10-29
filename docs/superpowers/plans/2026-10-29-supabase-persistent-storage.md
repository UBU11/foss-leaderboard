# Implementation Plan: Supabase Persistent Storage for OSM Leaderboard

This implementation plan details the integration of Supabase as persistent storage for the OpenStreetMap StreetComplete challenge leaderboard.

## User Requirements & Context
- Fresh Supabase database using keys configured in `.env`.
- Keys: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- Persistent storage of user data, details, scores, and quest history.
- Zero-downtime / graceful fallback if the database table is not yet migrated or network is interrupted.
- Supabase Realtime synchronization across all client screens.

---

## Proposed Changes

### Database & Client Layer
#### 1. `supabase/schema.sql`
- Contains complete SQL migration for the `participants` table, indices, RLS policies, and realtime broadcast.
- Can be run directly in the Supabase SQL editor.

#### 2. `src/lib/supabase.ts`
- Initializes the Supabase client using `@supabase/supabase-js`.
- Reads `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
- Safe null-checked export with fallback logger if environment keys are missing.

#### 3. `src/lib/db.ts`
- Data mapping between Supabase table row and frontend `ParticipantScore` type.
- Functions:
  - `fetchStoredParticipants()`: Queries `participants` table ordered by rank (`total_changes DESC, total_sets DESC`).
  - `saveParticipant(score: ParticipantScore)`: Upserts a single participant.
  - `bulkUpdateParticipantScores(scores: ParticipantScore[])`: Batched upsert to persist refreshed scores.
  - `seedInitialParticipants(usernames: string[])`: Seeds initial default participants if the table is empty.
  - `subscribeToParticipantChanges(callback: () => void)`: Sets up Supabase Realtime postgres changes channel.

### Application Layer
#### 4. `src/app/page.tsx`
- Replace hardcoded in-memory state with Supabase hydration.
- Initial load:
  1. Fetch stored participants from Supabase.
  2. If empty, automatically seed with default participants (`INITIAL_PARTICIPANTS`).
  3. Render instantly from cached scores.
  4. Perform background sync from OSM API and persist updated stats back into Supabase.
- Periodic 60s auto-refresh & manual sync:
  - Query OSM for all registered participants.
  - Upsert updated stats to Supabase.
- Realtime subscription:
  - Listens for realtime updates on `participants` and refreshes standings on all connected displays.

#### 5. `src/components/AddParticipantDialog.tsx`
- Ensure error handling and optimistic feedback when registering a participant to Supabase.

---

## Tasks

### Task 1: Supabase SQL Schema Script
- **File**: `supabase/schema.sql`
- Write the complete DDL script including table definition, indices, RLS policies, and realtime publication.

### Task 2: Supabase Client Initializer
- **File**: `src/lib/supabase.ts`
- Implement `createClient` with credentials from `.env`.
- Handle potential missing credentials with warnings.

### Task 3: Database Service Layer
- **File**: `src/lib/db.ts`
- Implement conversion functions between database rows and `ParticipantScore`.
- Implement `fetchStoredParticipants`, `saveParticipant`, `bulkUpdateParticipantScores`, `seedInitialParticipants`, and `subscribeToParticipantChanges`.
- Wrap calls in try/catch to ensure graceful fallback if the database table has not yet been executed in Supabase.

### Task 4: Integrate Persistent Storage in Page Component
- **File**: `src/app/page.tsx`
- Mount hook fetches from Supabase.
- Seed default participants if DB is empty.
- Sync standing updates back to Supabase.
- Setup Realtime channel subscription.

### Task 5: Enhance Participant Dialog & Feedback
- **File**: `src/components/AddParticipantDialog.tsx`
- Support adding username and optional display name, persisting directly to Supabase.

### Task 6: Verification & Build
- Run `bun run build` to verify Next.js build and TypeScript type-safety.
- Ensure zero errors or regressions.

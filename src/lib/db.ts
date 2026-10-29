import { supabase, isSupabaseConfigured, supabaseProjectRef } from "./supabase";
import { ParticipantScore } from "@/types/osm";

export interface ParticipantRow {
  id?: string;
  username: string;
  display_name: string | null;
  total_changes: number;
  total_sets: number;
  last_active: string | null;
  history: any;
  quests: any;
  avatar_url: string | null;
  last_synced_at?: string;
  created_at?: string;
}

const LOCAL_STORAGE_KEY = "osm_streetcomplete_leaderboard_data_v1";

export interface SupabaseHealth {
  isConfigured: boolean;
  isTableReady: boolean;
  error: string | null;
  projectRef: string;
}

/**
 * Check if browser localStorage is available
 */
function isLocalStorageAvailable(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const testKey = "__storage_test__";
    window.localStorage.setItem(testKey, testKey);
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Read cached participants from localStorage
 */
export function getLocalParticipants(): ParticipantScore[] {
  if (!isLocalStorageAvailable()) return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch (err) {
    console.warn("[Storage] Failed to read from localStorage:", err);
    return [];
  }
}

/**
 * Persist participants to localStorage
 */
export function setLocalParticipants(scores: ParticipantScore[]): void {
  if (!isLocalStorageAvailable()) return;
  try {
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(scores));
  } catch (err) {
    console.warn("[Storage] Failed to write to localStorage:", err);
  }
}

export function scoreToRow(
  score: ParticipantScore
): Omit<ParticipantRow, "id" | "created_at"> {
  return {
    username: score.username,
    display_name: score.displayName || score.username,
    total_changes: score.totalChanges ?? 0,
    total_sets: score.totalStreetCompleteSets ?? 0,
    last_active: score.lastActive ?? null,
    history: score.history || [],
    quests: score.quests || {},
    avatar_url:
      score.avatarUrl ||
      `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${encodeURIComponent(
        score.username
      )}`,
    last_synced_at: new Date().toISOString(),
  };
}

export function rowToScore(row: ParticipantRow, rank: number): ParticipantScore {
  return {
    rank,
    username: row.username,
    displayName: row.display_name || row.username,
    totalChanges: row.total_changes ?? 0,
    totalStreetCompleteSets: row.total_sets ?? 0,
    lastActive: row.last_active ?? null,
    history: Array.isArray(row.history) ? row.history : [],
    quests:
      typeof row.quests === "object" && row.quests !== null ? row.quests : {},
    avatarUrl:
      row.avatar_url ||
      `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${encodeURIComponent(
        row.username
      )}`,
  };
}

/**
 * Probe Supabase connectivity and verify if 'public.participants' table exists
 */
export async function checkSupabaseHealth(): Promise<SupabaseHealth> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      isConfigured: false,
      isTableReady: false,
      error: "Supabase credentials are not configured in .env",
      projectRef: "",
    };
  }

  try {
    const { error } = await supabase
      .from("participants")
      .select("id")
      .limit(1);

    if (error) {
      const isMissingTable =
        error.code === "PGRST205" ||
        error.message?.includes("participants") ||
        error.message?.toLowerCase().includes("schema cache");

      return {
        isConfigured: true,
        isTableReady: false,
        error: isMissingTable
          ? "Table 'participants' has not been created yet in Supabase."
          : error.message,
        projectRef: supabaseProjectRef,
      };
    }

    return {
      isConfigured: true,
      isTableReady: true,
      error: null,
      projectRef: supabaseProjectRef,
    };
  } catch (err: any) {
    return {
      isConfigured: true,
      isTableReady: false,
      error: err?.message || "Unknown error connecting to Supabase",
      projectRef: supabaseProjectRef,
    };
  }
}

/**
 * Fetch participants with dual-tier fallback:
 * 1. Checks Supabase cloud database
 * 2. If table does not exist or Supabase fails, seamlessly falls back to localStorage
 * 3. If Supabase is connected and empty but local data exists, automatically pushes local data to Supabase
 */
export async function fetchStoredParticipants(): Promise<ParticipantScore[]> {
  const localScores = getLocalParticipants();

  if (!isSupabaseConfigured || !supabase) {
    return localScores;
  }

  try {
    const { data, error } = await supabase
      .from("participants")
      .select("*")
      .order("total_changes", { ascending: false })
      .order("total_sets", { ascending: false });

    if (error) {
      console.warn(
        `[Supabase] Could not fetch remote participants (${error.message}). Using local cache (${localScores.length} records).`
      );
      return localScores;
    }

    if (data && data.length > 0) {
      const remoteScores = data.map((row: ParticipantRow, idx: number) =>
        rowToScore(row, idx + 1)
      );
      // Keep local storage synchronized with remote
      setLocalParticipants(remoteScores);
      return remoteScores;
    }

    // Remote table exists but is empty; if we have local scores, upload them to Supabase
    if (localScores.length > 0) {
      try {
        const rows = localScores.map(scoreToRow);
        await supabase.from("participants").upsert(rows, { onConflict: "username" });
      } catch (uploadErr) {
        console.warn("[Supabase] Failed to push local cache to empty remote table:", uploadErr);
      }
    }

    return localScores;
  } catch (err) {
    console.warn("[Supabase] Query exception, falling back to local storage:", err);
    return localScores;
  }
}

/**
 * Persist or update a single participant across both localStorage and Supabase
 */
export async function saveParticipant(
  score: ParticipantScore
): Promise<boolean> {
  // 1. Immediately persist to localStorage so data is NEVER lost on refresh
  const current = getLocalParticipants();
  const existingIdx = current.findIndex(
    (s) => s.username.toLowerCase() === score.username.toLowerCase()
  );

  let updatedList: ParticipantScore[];
  if (existingIdx >= 0) {
    updatedList = [...current];
    updatedList[existingIdx] = { ...current[existingIdx], ...score };
  } else {
    updatedList = [...current, score];
  }

  // Recalculate rank order locally
  updatedList.sort((a, b) => {
    if (b.totalChanges !== a.totalChanges) return b.totalChanges - a.totalChanges;
    return b.totalStreetCompleteSets - a.totalStreetCompleteSets;
  });
  updatedList.forEach((s, idx) => {
    s.rank = idx + 1;
  });

  setLocalParticipants(updatedList);

  // 2. Persist to Supabase if configured
  if (!isSupabaseConfigured || !supabase) {
    return true;
  }

  try {
    const row = scoreToRow(score);
    const { error } = await supabase
      .from("participants")
      .upsert(row, { onConflict: "username" });

    if (error) {
      console.warn("[Supabase] Could not save to remote database (saved to local cache):", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("[Supabase] Exception saving participant (saved to local cache):", err);
    return false;
  }
}

/**
 * Bulk persist updated scores from OSM background sync across both localStorage and Supabase
 */
export async function bulkUpdateParticipantScores(
  scores: ParticipantScore[]
): Promise<boolean> {
  if (scores.length === 0) return true;

  // 1. Persist to localStorage immediately
  setLocalParticipants(scores);

  // 2. Persist to Supabase if configured
  if (!isSupabaseConfigured || !supabase) {
    return true;
  }

  try {
    const rows = scores.map(scoreToRow);
    const { error } = await supabase
      .from("participants")
      .upsert(rows, { onConflict: "username" });

    if (error) {
      console.warn("[Supabase] Bulk update remote error (cached locally):", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("[Supabase] Exception bulk updating participants (cached locally):", err);
    return false;
  }
}

/**
 * Delete a participant from both localStorage and Supabase
 */
export async function deleteStoredParticipant(
  username: string
): Promise<boolean> {
  // 1. Remove from localStorage
  const current = getLocalParticipants();
  const filtered = current.filter(
    (s) => s.username.toLowerCase() !== username.toLowerCase()
  );
  filtered.forEach((s, idx) => {
    s.rank = idx + 1;
  });
  setLocalParticipants(filtered);

  // 2. Remove from Supabase
  if (!isSupabaseConfigured || !supabase) {
    return true;
  }

  try {
    const { error } = await supabase
      .from("participants")
      .delete()
      .eq("username", username);

    if (error) {
      console.warn("[Supabase] Error deleting remote participant:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("[Supabase] Exception deleting remote participant:", err);
    return false;
  }
}

/**
 * Subscribe to realtime changes on the participants table
 */
export function subscribeToParticipantChanges(
  onChange: () => void
): (() => void) | null {
  if (!isSupabaseConfigured || !supabase) {
    return null;
  }

  try {
    const channel = supabase
      .channel("realtime-participants")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "participants" },
        () => {
          onChange();
        }
      )
      .subscribe();

    return () => {
      supabase?.removeChannel(channel);
    };
  } catch (err) {
    console.warn("[Supabase] Could not subscribe to realtime changes:", err);
    return null;
  }
}

import { ParticipantScore } from "@/types/osm";

const HEADERS = {
  "User-Agent": "FOSS-College-OSM-Leaderboard/1.0 (NextJS/Bun)",
  Accept: "application/json",
};

/**
 * Fetch StreetComplete edits for an OSM user with exponential backoff
 */
export async function fetchUserEdits(
  username: string,
  eventStartIso: string,
  retries = 2,
  backoffMs = 500
): Promise<{
  totalChanges: number;
  sets: number;
  lastActive: string | null;
  history: {
    timestamp: string;
    changes: number;
    questType?: string;
    comment?: string;
    changesetId?: number;
  }[];
  quests: Record<string, number>;
}> {
  const trimmed = username.trim();
  if (!trimmed) {
    return { totalChanges: 0, sets: 0, lastActive: null, history: [], quests: {} };
  }

  const url = `https://api.openstreetmap.org/api/0.6/changesets.json?display_name=${encodeURIComponent(
    trimmed
  )}&time=${encodeURIComponent(eventStartIso)}`;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { headers: HEADERS });

      if (res.status === 429 || res.status === 503) {
        if (attempt < retries) {
          await new Promise((resolve) =>
            setTimeout(resolve, backoffMs * Math.pow(2, attempt))
          );
          continue;
        }
      }

      if (!res.ok) {
        // If 404 user not found or other non-OK response
        return { totalChanges: 0, sets: 0, lastActive: null, history: [], quests: {} };
      }

      const data = await res.json();
      const changesets: Array<{
        id?: number;
        created_at: string;
        closed_at?: string;
        open?: boolean;
        num_changes?: number;
        changes_count?: number;
        tags?: Record<string, string>;
      }> = data.changesets || [];

      let totalChanges = 0;
      let sets = 0;
      let lastActive: string | null = null;
      const history: {
        timestamp: string;
        changes: number;
        questType?: string;
        comment?: string;
        changesetId?: number;
      }[] = [];
      const quests: Record<string, number> = {};

      for (const cs of changesets) {
        const createdBy = cs.tags?.created_by || "";
        const isStreetComplete =
          createdBy.toLowerCase().startsWith("streetcomplete") ||
          Boolean(cs.tags?.["StreetComplete:quest_type"]);

        if (isStreetComplete) {
          sets += 1;
          const count = cs.num_changes ?? cs.changes_count ?? 0;
          totalChanges += count;

          const questType =
            cs.tags?.["StreetComplete:quest_type"] ||
            extractQuestFromComment(cs.tags?.comment) ||
            "StreetComplete Edit";

          quests[questType] = (quests[questType] || 0) + count;

          history.push({
            timestamp: cs.created_at,
            changes: count,
            questType,
            comment: cs.tags?.comment,
            changesetId: cs.id,
          });

          if (!lastActive || new Date(cs.created_at) > new Date(lastActive)) {
            lastActive = cs.created_at;
          }
        }
      }

      // Sort history chronologically
      history.sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      return { totalChanges, sets, lastActive, history, quests };
    } catch (err) {
      if (attempt < retries) {
        await new Promise((resolve) =>
          setTimeout(resolve, backoffMs * Math.pow(2, attempt))
        );
        continue;
      }
      console.error(`Fetch failed for user ${username}:`, err);
      return { totalChanges: 0, sets: 0, lastActive: null, history: [], quests: {} };
    }
  }

  return { totalChanges: 0, sets: 0, lastActive: null, history: [], quests: {} };
}

function extractQuestFromComment(comment?: string): string | null {
  if (!comment) return null;
  // Common SC comments e.g. "Survey buildings", "Specify road surfaces", etc.
  return comment.split(";")[0]?.trim() || null;
}

/**
 * Concurrently fetch leaderboard scores for multiple users with concurrency limiting
 */
export async function fetchLeaderboardData(
  users: (string | { username: string; displayName?: string })[],
  eventStartIso: string,
  concurrencyLimit = 4
): Promise<ParticipantScore[]> {
  const results: ParticipantScore[] = [];
  const queue = users.map((u) =>
    typeof u === "string" ? { username: u, displayName: u } : u
  );

  // Run workers with concurrency limit to respect OSM API guidelines
  const runWorker = async () => {
    while (queue.length > 0) {
      const item = queue.shift();
      if (!item) break;

      const userEdits = await fetchUserEdits(item.username, eventStartIso);
      results.push({
        rank: 0, // Will be computed after sorting
        username: item.username,
        displayName: item.displayName || item.username,
        totalChanges: userEdits.totalChanges,
        totalStreetCompleteSets: userEdits.sets,
        lastActive: userEdits.lastActive,
        history: userEdits.history,
        quests: userEdits.quests,
        avatarUrl: `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${encodeURIComponent(
          item.username
        )}`,
      });

      // Small delay between requests to avoid burst rate limits
      await new Promise((resolve) => setTimeout(resolve, 80));
    }
  };

  const workers = Array.from(
    { length: Math.min(concurrencyLimit, queue.length) },
    () => runWorker()
  );
  await Promise.all(workers);

  // Sort descending by totalChanges, then by totalStreetCompleteSets, then alphabetical
  results.sort((a, b) => {
    if (b.totalChanges !== a.totalChanges) {
      return b.totalChanges - a.totalChanges;
    }
    if (b.totalStreetCompleteSets !== a.totalStreetCompleteSets) {
      return b.totalStreetCompleteSets - a.totalStreetCompleteSets;
    }
    return a.username.localeCompare(b.username);
  });

  // Assign ranks
  results.forEach((item, index) => {
    item.rank = index + 1;
  });

  return results;
}

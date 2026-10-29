export interface OSMChangeset {
  id: number;
  created_at: string;
  closed_at?: string;
  open: boolean;
  num_changes: number;
  changes_count?: number;
  tags?: {
    created_by?: string;
    comment?: string;
    locale?: string;
    source?: string;
    [key: string]: string | undefined;
  };
}

export interface ParticipantScore {
  rank: number;
  username: string;
  displayName?: string;
  totalChanges: number;
  totalStreetCompleteSets: number;
  lastActive: string | null;
  history: {
    timestamp: string;
    changes: number;
    questType?: string;
    comment?: string;
    changesetId?: number;
  }[];
  quests?: Record<string, number>;
  avatarUrl?: string;
  status?: "active" | "idle" | "new";
}

export interface CompetitionConfig {
  eventName: string;
  eventStartIso: string;
  eventEndIso: string;
  refreshIntervalSeconds: number;
}

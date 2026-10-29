"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import {
  Trophy,
  RefreshCw,
  Search,
  ExternalLink,
  Layers,
  Clock,
  Download,
  Flame,
  Users,
  ChevronRight,
} from "lucide-react";
import { TextureButton } from "@/components/ui/texture-button";
import { GradientHeading } from "@/components/ui/gradient-heading";
import { HaloBadge } from "@/components/ui/halo-badge";
import { RollingNumber } from "@/components/ui/rolling-number";
import { TextureOverlay } from "@/components/ui/texture-overlay";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TactileCard } from "@/components/ui/tactile-card";
import { PodiumCard } from "@/components/PodiumCard";
import { LiveTicker } from "@/components/LiveTicker";
import { CountdownTimer } from "@/components/CountdownTimer";
import { AddParticipantDialog } from "@/components/AddParticipantDialog";
import { ParticipantDetailDialog } from "@/components/ParticipantDetailDialog";
import { VisxShowcase } from "@/components/charts/VisxShowcase";
import { ParticipantScore } from "@/types/osm";
import { fetchLeaderboardData, fetchUserEdits } from "@/lib/osm";
import {
  fetchStoredParticipants,
  saveParticipant,
  bulkUpdateParticipantScores,
  deleteStoredParticipant,
  subscribeToParticipantChanges,
} from "@/lib/db";

// Target event ends tomorrow at 9:00 AM local time
const TARGET_END_ISO = "2026-10-30T09:00:00+05:30";
// Event start time default (last 36 hours for challenge window)
const EVENT_START_ISO = "2026-10-28T00:00:00Z";

export default function LeaderboardPage() {
  const [participants, setParticipants] = useState<string[]>([]);
  const [scores, setScores] = useState<ParticipantScore[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [selectedUser, setSelectedUser] = useState<ParticipantScore | null>(null);

  // 60-second auto-refresh countdown
  const [countdown, setCountdown] = useState(60);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);

  // Sync leaderboard from OpenStreetMap API & persist standings
  const syncStandings = useCallback(
    async (currentScores = scores) => {
      if (currentScores.length === 0) {
        setCountdown(60);
        return;
      }

      setIsRefreshing(true);
      try {
        const userPayload = currentScores.map((s) => ({
          username: s.username,
          displayName: s.displayName || s.username,
        }));
        const freshScores = await fetchLeaderboardData(
          userPayload,
          EVENT_START_ISO
        );
        setScores(freshScores);
        setLastSynced(new Date());
        setCountdown(60);

        // Persist fresh standings
        await bulkUpdateParticipantScores(freshScores);
      } catch (err) {
        console.error("Failed to sync standings:", err);
      } finally {
        setIsRefreshing(false);
        setIsLoading(false);
      }
    },
    [scores]
  );

  // Initial load: hydrate from storage & background sync OSM
  useEffect(() => {
    let active = true;

    async function loadData() {
      setIsLoading(true);
      try {
        const stored = await fetchStoredParticipants();

        if (stored && stored.length > 0) {
          if (active) {
            setScores(stored);
            setParticipants(stored.map((s) => s.username));
            setLastSynced(new Date());
            setIsLoading(false);
          }

          // Background sync with live OSM API while preserving custom display names
          const userPayload = stored.map((s) => ({
            username: s.username,
            displayName: s.displayName || s.username,
          }));
          const fresh = await fetchLeaderboardData(userPayload, EVENT_START_ISO);
          if (active) {
            setScores(fresh);
            setLastSynced(new Date());
            await bulkUpdateParticipantScores(fresh);
          }
        } else {
          if (active) {
            setScores([]);
            setParticipants([]);
            setIsLoading(false);
          }
        }
      } catch (err) {
        console.error("Failed to load participants:", err);
        if (active) {
          setIsLoading(false);
        }
      }
    }

    loadData();

    // Setup Realtime subscription
    const unsubscribe = subscribeToParticipantChanges(async () => {
      const updated = await fetchStoredParticipants();
      if (updated && active) {
        setScores(updated);
        setParticipants(updated.map((s) => s.username));
      }
    });

    return () => {
      active = false;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  // 60-second timer effect
  useEffect(() => {
    if (!autoRefreshEnabled) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          syncStandings();
          return 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [autoRefreshEnabled, syncStandings]);

  // Handle adding a participant (persisted immediately)
  const handleAddParticipant = async (username: string, displayName?: string) => {
    const trimmed = username.trim();
    if (!trimmed || participants.includes(trimmed)) return false;

    try {
      // Fetch immediate score from OSM
      const userEdits = await fetchUserEdits(trimmed, EVENT_START_ISO);
      const newEntry: ParticipantScore = {
        rank: scores.length + 1,
        username: trimmed,
        displayName: displayName?.trim() || trimmed,
        totalChanges: userEdits.totalChanges,
        totalStreetCompleteSets: userEdits.sets,
        lastActive: userEdits.lastActive,
        history: userEdits.history,
        quests: userEdits.quests,
        avatarUrl: `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${encodeURIComponent(
          trimmed
        )}`,
      };

      // Persist to storage
      await saveParticipant(newEntry);

      const nextScores = [...scores, newEntry].sort((a, b) => {
        if (b.totalChanges !== a.totalChanges) return b.totalChanges - a.totalChanges;
        return b.totalStreetCompleteSets - a.totalStreetCompleteSets;
      });

      nextScores.forEach((s, idx) => {
        s.rank = idx + 1;
      });

      setParticipants((prev) => [...prev, trimmed]);
      setScores(nextScores);
      return true;
    } catch (err) {
      console.error("Error adding participant:", err);
      return false;
    }
  };

  // Handle deleting a participant
  const handleDeleteParticipant = async (username: string) => {
    try {
      await deleteStoredParticipant(username);
      setParticipants((prev) => prev.filter((u) => u !== username));
      setScores((prev) => {
        const next = prev.filter((s) => s.username !== username);
        next.forEach((s, idx) => {
          s.rank = idx + 1;
        });
        return next;
      });
      if (selectedUser?.username === username) {
        setSelectedUser(null);
      }
      return true;
    } catch (err) {
      console.error("Error deleting participant:", err);
      return false;
    }
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = ["Rank", "Name", "Total_Edits", "SC_Changesets", "Last_Active"];
    const rows = scores.map((s) => [
      s.rank,
      s.displayName || s.username,
      s.totalChanges,
      s.totalStreetCompleteSets,
      s.lastActive || "None",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `leaderboard_${new Date().toISOString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered participants for table (searches both display name and username)
  const filteredScores = scores.filter((s) => {
    const query = searchQuery.toLowerCase();
    const matchesUser = s.username.toLowerCase().includes(query);
    const matchesDisplay = s.displayName
      ? s.displayName.toLowerCase().includes(query)
      : false;
    return matchesUser || matchesDisplay;
  });

  const topThree = scores.slice(0, 3);
  const totalEditsAggregate = scores.reduce(
    (acc, curr) => acc + curr.totalChanges,
    0
  );
  const totalSetsAggregate = scores.reduce(
    (acc, curr) => acc + curr.totalStreetCompleteSets,
    0
  );
  const activeMappersCount = scores.filter((s) => s.totalChanges > 0).length;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans selection:bg-neutral-700 selection:text-white">
      {/* Top Banner Notice */}
      <header className="relative w-full border-b border-neutral-800/90 bg-neutral-900/80 px-4 py-2.5 backdrop-blur-md">
        <TextureOverlay texture="dots" opacity={0.06} />
        <div className="relative z-10 max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 text-xs text-neutral-300">
            <HaloBadge live={true} variant="default" className="font-mono text-[10px] font-bold">
              LIVE
            </HaloBadge>
            <span className="text-neutral-300">
              Competition ends at 9:00 AM. Final winners verified via in-app stars.
            </span>
          </div>

          <CountdownTimer targetIso={TARGET_END_ISO} />
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8 space-y-7">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 pb-4 border-b border-neutral-800/80">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <HaloBadge variant="outline" className="font-mono text-[10px] uppercase tracking-wider font-semibold">
                OSM CHALLENGE
              </HaloBadge>
            </div>

            <GradientHeading size="md" weight="black" className="tracking-tight">
              StreetComplete Leaderboard
            </GradientHeading>
          </div>

          {/* Action Bar */}
          <div className="flex items-center flex-wrap gap-2.5">
            {/* Auto Refresh Indicator */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 text-xs font-mono shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]">
              <button
                onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
                className="flex items-center gap-1.5 text-neutral-400 hover:text-neutral-200 transition-colors cursor-pointer"
                title="Toggle Auto Refresh"
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    autoRefreshEnabled ? "bg-emerald-400 shadow-[0_0_8px_#34d399]" : "bg-neutral-600"
                  }`}
                />
                <span className="text-neutral-300">Auto-sync</span>
              </button>
              <span className="text-neutral-600">|</span>
              <div className="w-7 text-center text-neutral-200 font-bold tabular-nums">
                {countdown}s
              </div>
            </div>

            {/* Manual Sync Standings Button */}
            <TextureButton
              onClick={() => syncStandings()}
              disabled={isRefreshing}
              variant="accent"
              size="sm"
              className="w-auto cursor-pointer"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 mr-1.5 ${isRefreshing ? "animate-spin" : ""}`}
              />
              <span className="font-mono text-xs font-semibold">
                {isRefreshing ? "Syncing..." : "Sync"}
              </span>
            </TextureButton>

            {/* Add Participant Modal */}
            <AddParticipantDialog
              onAdd={handleAddParticipant}
              existingUsers={participants}
            />

            {/* CSV Export */}
            <TextureButton
              onClick={exportToCSV}
              variant="minimal"
              size="sm"
              className="w-auto cursor-pointer"
              title="Export standings to CSV"
            >
              <Download className="h-3.5 w-3.5 mr-1.5" />
              <span className="font-mono text-xs hidden sm:inline">Export</span>
            </TextureButton>
          </div>
        </div>

        {/* Live Status Ticker */}
        <LiveTicker participants={scores} />

        {/* Metric Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
          <TactileCard className="p-0">
            <div className="flex items-center justify-between">
              <span className="text-xs text-neutral-400 font-mono">Total Edits</span>
              <Flame className="h-4 w-4 text-orange-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold font-mono text-neutral-100 mt-1.5 tracking-tight">
              <RollingNumber value={totalEditsAggregate} />
            </div>
          </TactileCard>

          <TactileCard className="p-0">
            <div className="flex items-center justify-between">
              <span className="text-xs text-neutral-400 font-mono">Changesets</span>
              <Layers className="h-4 w-4 text-neutral-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold font-mono text-neutral-100 mt-1.5 tracking-tight">
              <RollingNumber value={totalSetsAggregate} />
            </div>
          </TactileCard>

          <TactileCard className="p-0">
            <div className="flex items-center justify-between">
              <span className="text-xs text-neutral-400 font-mono">Active Mappers</span>
              <Users className="h-4 w-4 text-neutral-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold font-mono text-emerald-400 mt-1.5 tracking-tight">
              <RollingNumber value={activeMappersCount} /> / {scores.length}
            </div>
          </TactileCard>

          <TactileCard className="p-0">
            <div className="flex items-center justify-between">
              <span className="text-xs text-neutral-400 font-mono">Last Updated</span>
              <Clock className="h-4 w-4 text-neutral-400" />
            </div>
            <div className="text-base sm:text-lg font-bold font-mono text-neutral-200 mt-2">
              {lastSynced
                ? lastSynced.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })
                : "—"}
            </div>
          </TactileCard>
        </div>

        {/* Podium Showcase Section */}
        {scores.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-400" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-200 font-mono">
                Top Contributors
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {topThree.map((participant) => (
                <PodiumCard
                  key={participant.username}
                  participant={participant}
                  onSelect={setSelectedUser}
                />
              ))}
            </div>
          </section>
        )}

        {/* Visualizations */}
        {scores.length > 0 && (
          <section className="pt-1">
            <VisxShowcase data={scores} />
          </section>
        )}

        {/* Leaderboard Table Section */}
        <section className="space-y-3.5 pt-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-neutral-100 tracking-tight font-mono">
                Standings
              </h2>
            </div>

            {/* Search Filter */}
            {scores.length > 0 && (
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-500" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search participant..."
                  className="pl-8 text-xs bg-neutral-900 border-neutral-800 text-neutral-100 placeholder:text-neutral-500 h-9 rounded-xl font-mono focus-visible:ring-neutral-400"
                />
              </div>
            )}
          </div>

          {/* Table Container */}
          <div className="relative overflow-hidden rounded-2xl border border-neutral-800/90 bg-neutral-900/60 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] backdrop-blur-md">
            <TextureOverlay texture="dots" opacity={0.05} />
            <div className="relative z-10">
              <Table>
                <TableHeader className="bg-neutral-950/80">
                  <TableRow className="border-neutral-800 hover:bg-transparent">
                    <TableHead className="w-16 text-center font-mono text-xs text-neutral-400">Rank</TableHead>
                    <TableHead className="font-mono text-xs text-neutral-400">Participant</TableHead>
                    <TableHead className="text-right font-mono text-xs text-neutral-400">Edits</TableHead>
                    <TableHead className="text-right font-mono text-xs text-neutral-400">Changesets</TableHead>
                    <TableHead className="text-right font-mono text-xs text-neutral-400">Last Active</TableHead>
                    <TableHead className="w-24 text-center font-mono text-xs text-neutral-400">Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-neutral-400 font-mono text-xs">
                        <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-neutral-300" />
                        Loading standings...
                      </TableCell>
                    </TableRow>
                  ) : filteredScores.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-14 text-neutral-400 font-mono text-xs">
                        {scores.length === 0 ? (
                          <div className="space-y-1">
                            <Users className="h-6 w-6 mx-auto mb-2 text-neutral-600" />
                            <p className="font-semibold text-neutral-300">No participants registered yet</p>
                            <p className="text-neutral-500 text-[11px]">
                              Click &quot;Add Participant&quot; to add the first contributor.
                            </p>
                          </div>
                        ) : (
                          "No matching participants found."
                        )}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredScores.map((p) => {
                      return (
                        <TableRow
                          key={p.username}
                          onClick={() => setSelectedUser(p)}
                          className="border-neutral-800/60 hover:bg-neutral-800/50 cursor-pointer transition-colors"
                        >
                          {/* Rank Badge */}
                          <TableCell className="text-center font-mono font-bold text-xs">
                            {p.rank === 1 && (
                              <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                1
                              </span>
                            )}
                            {p.rank === 2 && (
                              <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-slate-400/20 text-slate-200 border border-slate-400/40">
                                2
                              </span>
                            )}
                            {p.rank === 3 && (
                              <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/40">
                                3
                              </span>
                            )}
                            {p.rank > 3 && (
                              <span className="text-neutral-500">#{p.rank}</span>
                            )}
                          </TableCell>

                          {/* Username & Avatar */}
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="relative h-8 w-8 rounded-full overflow-hidden bg-neutral-800 border border-neutral-700 shrink-0">
                                <Image
                                  src={
                                    p.avatarUrl ||
                                    `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${p.username}`
                                  }
                                  alt={p.username}
                                  fill
                                  className="object-cover"
                                  unoptimized
                                />
                              </div>
                              <div>
                                <div className="font-bold text-neutral-100 hover:text-white font-mono text-xs">
                                  {p.displayName || p.username}
                                </div>
                              </div>
                            </div>
                          </TableCell>

                          {/* Total Edits */}
                          <TableCell className="text-right font-mono font-bold text-neutral-100 text-xs">
                            {p.totalChanges.toLocaleString()}
                          </TableCell>

                          {/* StreetComplete Changesets */}
                          <TableCell className="text-right font-mono text-neutral-300 text-xs">
                            {p.totalStreetCompleteSets.toLocaleString()}
                          </TableCell>

                          {/* Last Active */}
                          <TableCell className="text-right font-mono text-[11px] text-neutral-400">
                            {p.lastActive ? (
                              <span>
                                {new Date(p.lastActive).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            ) : (
                              <span className="text-neutral-600">Never</span>
                            )}
                          </TableCell>

                          {/* Action */}
                          <TableCell className="text-center">
                            <span className="inline-flex items-center gap-1 text-[11px] font-mono text-neutral-400 hover:text-white transition-colors">
                              <span>Log</span>
                              <ChevronRight className="h-3 w-3" />
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-12 border-t border-neutral-800/80 bg-neutral-900/60 py-6 text-center text-xs text-neutral-500 font-mono">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>StreetComplete Real-Time OSM Challenge Dashboard</span>
          <span>End Time: Tomorrow 9:00 AM • Verified via StreetComplete Changeset Tags</span>
        </div>
      </footer>

      {/* Participant Detail Drawer/Modal */}
      <ParticipantDetailDialog
        participant={selectedUser}
        onClose={() => setSelectedUser(null)}
        onDelete={handleDeleteParticipant}
      />
    </div>
  );
}

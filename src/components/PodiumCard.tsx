"use client";

import React from "react";
import Image from "next/image";
import { ShiftCard } from "@/components/ui/shift-card";
import { ParticipantScore } from "@/types/osm";
import { Trophy, Award, Medal, Zap, Layers, Clock, ArrowRight } from "lucide-react";
import { HaloBadge } from "@/components/ui/halo-badge";
import { RollingNumber } from "@/components/ui/rolling-number";
import { TextureOverlay } from "@/components/ui/texture-overlay";
import { cn } from "@/lib/utils";

interface PodiumCardProps {
  participant: ParticipantScore;
  onSelect: (participant: ParticipantScore) => void;
}

export function PodiumCard({ participant, onSelect }: PodiumCardProps) {
  const { rank, username, totalChanges, totalStreetCompleteSets, lastActive, avatarUrl, quests } =
    participant;

  const podiumConfig = {
    1: {
      badgeClass: "ring-1 ring-amber-500/50 bg-amber-500/10 text-amber-300",
      accentColor: "text-amber-400",
      borderGlow: "border-amber-500/30 hover:border-amber-500/60 shadow-[0_0_20px_-8px_rgba(245,158,11,0.25)]",
      icon: <Trophy className="h-3.5 w-3.5 text-amber-400" />,
      title: "1st Place",
      haloVariant: "default" as const,
    },
    2: {
      badgeClass: "ring-1 ring-slate-400/50 bg-slate-400/10 text-slate-200",
      accentColor: "text-slate-200",
      borderGlow: "border-slate-500/30 hover:border-slate-400/60 shadow-[0_0_20px_-8px_rgba(148,163,184,0.2)]",
      icon: <Award className="h-3.5 w-3.5 text-slate-300" />,
      title: "2nd Place",
      haloVariant: "secondary" as const,
    },
    3: {
      badgeClass: "ring-1 ring-orange-500/50 bg-orange-500/10 text-orange-300",
      accentColor: "text-orange-400",
      borderGlow: "border-orange-500/30 hover:border-orange-500/60 shadow-[0_0_20px_-8px_rgba(249,115,22,0.2)]",
      icon: <Medal className="h-3.5 w-3.5 text-orange-400" />,
      title: "3rd Place",
      haloVariant: "default" as const,
    },
  }[rank] || {
    badgeClass: "ring-1 ring-neutral-500/50 bg-neutral-500/10 text-neutral-300",
    accentColor: "text-neutral-300",
    borderGlow: "border-neutral-800",
    icon: <Zap className="h-3.5 w-3.5 text-neutral-400" />,
    title: `#${rank}`,
    haloVariant: "default" as const,
  };

  const questEntries = Object.entries(quests || {}).slice(0, 3);

  return (
    <div
      onClick={() => onSelect(participant)}
      className="w-full flex justify-center"
    >
      <ShiftCard
        className={cn(
          "w-full min-h-[340px] max-w-none rounded-2xl border bg-neutral-900/90 backdrop-blur-md transition-all duration-300",
          podiumConfig.borderGlow
        )}
        topContent={
          <div className="flex items-center justify-between w-full px-1 pt-1">
            <div className="flex items-center gap-3">
              <div className="relative h-11 w-11 rounded-full overflow-hidden bg-neutral-800 border-2 border-neutral-700/80 shadow-md shrink-0">
                <Image
                  src={avatarUrl || `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${username}`}
                  alt={username}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
              <div className="min-w-0">
                <div className="font-bold text-sm text-neutral-100 truncate tracking-tight">
                  {participant.displayName || username}
                </div>
              </div>
            </div>

            <span
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-bold tracking-wider shrink-0",
                podiumConfig.badgeClass
              )}
            >
              {podiumConfig.icon}
              {podiumConfig.title}
            </span>
          </div>
        }
        middleContent={
          <div className="flex flex-col items-center justify-center text-center mt-2 px-2">
            <div className="text-[11px] uppercase font-mono tracking-widest text-neutral-400 mb-1">
              Total Edits
            </div>
            <div className={cn("text-4xl font-extrabold font-mono tracking-tight", podiumConfig.accentColor)}>
              <RollingNumber value={totalChanges} />
            </div>

            <div className="grid grid-cols-2 gap-2 w-full mt-4">
              <div className="rounded-lg bg-neutral-950/70 border border-neutral-800/80 p-2 text-left">
                <div className="flex items-center gap-1 text-[10px] text-neutral-400 font-mono">
                  <Layers className="h-3 w-3 text-neutral-400" />
                  <span>Batches</span>
                </div>
                <div className="text-base font-bold font-mono text-neutral-100">
                  <RollingNumber value={totalStreetCompleteSets} />
                </div>
              </div>

              <div className="rounded-lg bg-neutral-950/70 border border-neutral-800/80 p-2 text-left">
                <div className="flex items-center gap-1 text-[10px] text-neutral-400 font-mono">
                  <Clock className="h-3 w-3 text-neutral-400" />
                  <span>Activity</span>
                </div>
                <div className="text-xs font-mono text-neutral-300 truncate mt-0.5">
                  {lastActive
                    ? new Date(lastActive).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                    : "No edits"}
                </div>
              </div>
            </div>
          </div>
        }
        bottomContent={
          <div className="w-full h-full bg-neutral-950/95 border-t border-neutral-800/90 p-3 flex flex-col justify-between rounded-b-xl">
            <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400 pb-1.5 border-b border-neutral-800/60">
              <span className="text-neutral-300 font-semibold flex items-center gap-1">
                <Zap className="h-3 w-3 text-amber-400" />
                Quest Breakdown
              </span>
              <span className="text-[10px] text-neutral-500">
                {totalStreetCompleteSets} changesets
              </span>
            </div>

            <div className="space-y-1.5 py-1">
              {questEntries.length > 0 ? (
                questEntries.map(([qType, count]) => (
                  <div key={qType} className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-neutral-400 truncate max-w-[170px]">
                      {qType.replace("Add", "").replace("Overlay", "")}
                    </span>
                    <span className="text-neutral-200 font-bold bg-neutral-900 px-1.5 py-0.2 rounded border border-neutral-800">
                      +{count}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-[11px] font-mono text-neutral-500 py-2">
                  No quest categorizations recorded
                </div>
              )}
            </div>

            <div className="pt-2 flex items-center justify-between text-[11px] font-mono text-neutral-300 hover:text-white transition-colors">
              <span>View full changeset logs</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </div>
          </div>
        }
      />
    </div>
  );
}

export default PodiumCard;

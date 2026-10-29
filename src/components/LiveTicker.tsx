"use client";

import React from "react";
import { CheckCircle2, Activity } from "lucide-react";
import { ParticipantScore } from "@/types/osm";
import { HaloBadge } from "@/components/ui/halo-badge";
import { TextureOverlay } from "@/components/ui/texture-overlay";

export function LiveTicker({ participants }: { participants: ParticipantScore[] }) {
  // Extract latest recent events across all participants
  const events = React.useMemo(() => {
    const list: {
      username: string;
      questType: string;
      changes: number;
      timestamp: string;
    }[] = [];

    participants.forEach((p) => {
      const name = p.displayName || p.username;
      p.history.forEach((h) => {
        list.push({
          username: name,
          questType: h.questType || "StreetComplete Quest",
          changes: h.changes,
          timestamp: h.timestamp,
        });
      });
    });

    list.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return list.slice(0, 10);
  }, [participants]);

  if (events.length === 0) {
    return (
      <div className="relative overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900/60 p-3 shadow-sm backdrop-blur-md">
        <TextureOverlay texture="dots" opacity={0.08} />
        <div className="relative z-10 flex items-center gap-3 text-xs text-neutral-400">
          <HaloBadge live={true} variant="secondary" className="font-mono text-[11px]">
            ACTIVITY
          </HaloBadge>
          <span className="font-mono text-neutral-400 text-xs">
            No recent edits recorded yet.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-xl border border-neutral-800/90 bg-neutral-900/70 p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-md">
      <TextureOverlay texture="dots" opacity={0.08} />
      <div className="relative z-10 flex items-center gap-3">
        <HaloBadge live={true} variant="default" className="font-mono text-[10px] shrink-0 font-bold uppercase tracking-wider">
          RECENT EDITS
        </HaloBadge>

        <div className="flex items-center gap-6 overflow-x-auto no-scrollbar whitespace-nowrap text-xs">
          {events.map((evt, idx) => (
            <div
              key={`evt-${idx}-${evt.username}-${evt.timestamp}`}
              className="flex items-center gap-2 text-neutral-300 shrink-0 font-mono text-[12px]"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span className="font-bold text-neutral-100">{evt.username}</span>
              <span className="text-neutral-500">resolved</span>
              <span className="font-bold text-neutral-200 bg-neutral-800 px-1.5 py-0.5 rounded border border-neutral-700/60">
                +{evt.changes} {evt.changes === 1 ? "node" : "nodes"}
              </span>
              <span className="text-neutral-500 text-[11px]">
                ({evt.questType.replace("Add", "").replace("Overlay", "")})
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default LiveTicker;

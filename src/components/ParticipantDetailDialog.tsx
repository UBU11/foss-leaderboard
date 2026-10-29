"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ParticipantScore } from "@/types/osm";
import { Layers, Clock, Zap, Trash2 } from "lucide-react";
import { HaloBadge } from "@/components/ui/halo-badge";
import { RollingNumber } from "@/components/ui/rolling-number";
import { TextureOverlay } from "@/components/ui/texture-overlay";

interface ParticipantDetailProps {
  participant: ParticipantScore | null;
  onClose: () => void;
  onDelete?: (username: string) => Promise<boolean>;
}

export function ParticipantDetailDialog({
  participant,
  onClose,
  onDelete,
}: ParticipantDetailProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!participant) return null;

  const questList = Object.entries(participant.quests || {}).sort(
    (a, b) => b[1] - a[1]
  );

  const handleDelete = async () => {
    if (!onDelete) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }

    setIsDeleting(true);
    try {
      await onDelete(participant.username);
      setConfirmDelete(false);
      onClose();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={Boolean(participant)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl bg-neutral-900 border-neutral-800 text-neutral-100 max-h-[85vh] overflow-hidden flex flex-col shadow-2xl">
        <TextureOverlay texture="dots" opacity={0.05} />
        <DialogHeader className="shrink-0 pb-2 relative z-10">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="relative h-13 w-13 rounded-full overflow-hidden bg-neutral-800 border-2 border-neutral-700 shadow-md">
                <Image
                  src={
                    participant.avatarUrl ||
                    `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${participant.username}`
                  }
                  alt={participant.username}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-xl font-bold text-neutral-100 font-mono">
                    {participant.displayName || participant.username}
                  </DialogTitle>
                  <HaloBadge variant="default" className="font-mono text-xs">
                    Rank #{participant.rank}
                  </HaloBadge>
                </div>
                <div className="text-xs text-neutral-400 font-mono">
                  @{participant.username}
                </div>
              </div>
            </div>

            {onDelete && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono transition-colors cursor-pointer border ${
                  confirmDelete
                    ? "bg-rose-950 border-rose-800 text-rose-300 hover:bg-rose-900"
                    : "bg-neutral-800/80 border-neutral-700 text-neutral-400 hover:text-rose-400 hover:border-rose-900/60"
                }`}
                title={confirmDelete ? "Click again to confirm deletion" : "Remove participant"}
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>{confirmDelete ? "Confirm Remove?" : "Remove"}</span>
              </button>
            )}
          </div>
        </DialogHeader>

        {/* Metric summary bar */}
        <div className="relative z-10 grid grid-cols-3 gap-2 py-2">
          <div className="bg-neutral-950/80 p-2.5 rounded-xl border border-neutral-800/80 text-center">
            <div className="text-[10px] text-neutral-400 font-mono uppercase">
              Total Edits
            </div>
            <div className="text-xl font-extrabold font-mono text-neutral-100">
              <RollingNumber value={participant.totalChanges} />
            </div>
          </div>
          <div className="bg-neutral-950/80 p-2.5 rounded-xl border border-neutral-800/80 text-center">
            <div className="text-[10px] text-neutral-400 font-mono uppercase">
              Changesets
            </div>
            <div className="text-xl font-extrabold font-mono text-amber-300">
              <RollingNumber value={participant.totalStreetCompleteSets} />
            </div>
          </div>
          <div className="bg-neutral-950/80 p-2.5 rounded-xl border border-neutral-800/80 text-center">
            <div className="text-[10px] text-neutral-400 font-mono uppercase">
              Last Active
            </div>
            <div className="text-xs font-semibold font-mono text-neutral-200 mt-1">
              {participant.lastActive
                ? new Date(participant.lastActive).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "None"}
            </div>
          </div>
        </div>

        {/* Scrollable Quest History & Breakdown */}
        <div className="relative z-10 flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
          {/* Quest Archetypes breakdown */}
          {questList.length > 0 && (
            <div>
              <div className="text-xs font-mono font-medium text-neutral-300 mb-2 flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-blue-400" />
                <span>Quest Categories</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {questList.map(([name, count]) => (
                  <div
                    key={name}
                    className="flex items-center justify-between p-2 rounded-lg bg-neutral-950/60 border border-neutral-800/60"
                  >
                    <span className="text-neutral-300 truncate mr-2">{name}</span>
                    <span className="font-mono font-bold text-neutral-100 shrink-0">
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Chronological Recent Activity */}
          <div>
            <div className="text-xs font-mono font-medium text-neutral-300 mb-2 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-emerald-400" />
              <span>Recent Activity Timeline</span>
            </div>
            {participant.history.length === 0 ? (
              <div className="text-center py-6 text-neutral-500 font-mono">
                No changesets registered during challenge period
              </div>
            ) : (
              <div className="space-y-1.5">
                {participant.history.map((h, i) => (
                  <div
                    key={`${h.timestamp}-${i}`}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-neutral-950/40 border border-neutral-800/40 text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="text-neutral-200 font-medium flex items-center gap-1">
                        <Zap className="h-3 w-3 text-amber-400" />
                        <span>{h.questType || "StreetComplete Quest Batch"}</span>
                      </div>
                      <div className="text-neutral-500 text-[10px]">
                        {new Date(h.timestamp).toLocaleString([], {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-neutral-100 bg-neutral-900 px-2 py-0.5 rounded border border-neutral-800">
                        +{h.changes} nodes
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ParticipantDetailDialog;

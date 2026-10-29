"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { TextureButton } from "@/components/ui/texture-button";
import { Input } from "@/components/ui/input";
import { UserPlus, Info, AlertCircle, Database } from "lucide-react";
import { HaloBadge } from "@/components/ui/halo-badge";

interface AddParticipantDialogProps {
  onAdd: (username: string, displayName?: string) => Promise<boolean>;
  existingUsers: string[];
}

export function AddParticipantDialog({
  onAdd,
  existingUsers,
}: AddParticipantDialogProps) {
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUser = username.trim();
    const cleanDisplay = displayName.trim();

    if (!cleanUser) {
      setError("Please provide an OpenStreetMap username.");
      return;
    }

    if (
      existingUsers.some(
        (u) => u.toLowerCase() === cleanUser.toLowerCase()
      )
    ) {
      setError("This username is already in the competition roster.");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const success = await onAdd(cleanUser, cleanDisplay || cleanUser);
      if (success) {
        setUsername("");
        setDisplayName("");
        setOpen(false);
      } else {
        setError("Could not register participant. Please verify the OSM username.");
      }
    } catch {
      setError("An error occurred while adding the participant.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <TextureButton
            variant="minimal"
            size="sm"
            className="w-auto cursor-pointer"
          />
        }
      >
        <UserPlus className="h-3.5 w-3.5 mr-1.5" />
        <span className="font-mono text-xs">Add Participant</span>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-neutral-900 border-neutral-800 text-neutral-100 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-neutral-100 font-mono text-base">
            <UserPlus className="h-4 w-4 text-neutral-300" />
            Add Participant
          </DialogTitle>
          <DialogDescription className="text-neutral-400 text-xs">
            Enter an OpenStreetMap username to add them to the leaderboard.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <label className="text-xs font-mono font-medium text-neutral-300">
              Username <span className="text-rose-400">*</span>
            </label>
            <Input
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                if (error) setError(null);
              }}
              placeholder="e.g. street_surveyor"
              className="bg-neutral-950 border-neutral-800 text-neutral-100 placeholder:text-neutral-500 font-mono text-xs focus-visible:ring-neutral-400"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-mono font-medium text-neutral-300">
              Display Name <span className="text-neutral-500 text-[10px]">(Optional)</span>
            </label>
            <Input
              value={displayName}
              onChange={(e) => {
                setDisplayName(e.target.value);
                if (error) setError(null);
              }}
              placeholder="e.g. Alex"
              className="bg-neutral-950 border-neutral-800 text-neutral-100 placeholder:text-neutral-500 font-mono text-xs focus-visible:ring-neutral-400"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-xs text-rose-300 bg-rose-950/40 p-2.5 rounded-lg border border-rose-800/40 font-mono">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <DialogFooter className="mt-4 gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="px-3 py-1.5 rounded-lg text-xs font-mono text-neutral-400 hover:text-neutral-200 transition-colors"
            >
              Cancel
            </button>
            <TextureButton
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSubmitting || !username.trim()}
              className="w-auto"
            >
              <span className="font-mono text-xs">
                {isSubmitting ? "Adding..." : "Add Participant"}
              </span>
            </TextureButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

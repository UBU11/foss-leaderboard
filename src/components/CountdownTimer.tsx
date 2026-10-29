"use client";

import React, { useState, useEffect } from "react";
import { Clock, ShieldAlert } from "lucide-react";
import { HaloBadge } from "@/components/ui/halo-badge";

interface CountdownProps {
  targetIso: string;
}

export function CountdownTimer({ targetIso }: CountdownProps) {
  const [timeLeft, setTimeLeft] = useState<{
    hours: number;
    minutes: number;
    seconds: number;
    isFinished: boolean;
  }>({ hours: 0, minutes: 0, seconds: 0, isFinished: false });

  useEffect(() => {
    const calculateTime = () => {
      const now = new Date().getTime();
      const target = new Date(targetIso).getTime();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0, isFinished: true });
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ hours, minutes, seconds, isFinished: false });
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [targetIso]);

  if (timeLeft.isFinished) {
    return (
      <HaloBadge variant="destructive" live={true} className="px-3 py-1 text-xs">
        <ShieldAlert className="h-3.5 w-3.5 mr-1" />
        CHALLENGE CONCLUDED (9:00 AM)
      </HaloBadge>
    );
  }

  return (
    <div className="inline-flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900/80 px-3 py-1.5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] backdrop-blur-md">
      <div className="flex items-center gap-1.5 text-[11px] font-mono text-neutral-400">
        <Clock className="h-3.5 w-3.5 text-neutral-300" />
        <span className="uppercase tracking-wider hidden sm:inline text-neutral-400">Ends 9:00 AM:</span>
      </div>
      <div className="flex items-center gap-1 font-mono text-xs font-bold text-neutral-100">
        <span className="rounded bg-neutral-800/90 px-1.5 py-0.5 text-neutral-100 border border-neutral-700/60 tabular-nums">
          {String(timeLeft.hours).padStart(2, "0")}h
        </span>
        <span className="text-neutral-500">:</span>
        <span className="rounded bg-neutral-800/90 px-1.5 py-0.5 text-neutral-100 border border-neutral-700/60 tabular-nums">
          {String(timeLeft.minutes).padStart(2, "0")}m
        </span>
        <span className="text-neutral-500">:</span>
        <span className="rounded bg-neutral-800/90 px-1.5 py-0.5 text-amber-300 border border-amber-500/30 tabular-nums">
          {String(timeLeft.seconds).padStart(2, "0")}s
        </span>
      </div>
    </div>
  );
}

export default CountdownTimer;

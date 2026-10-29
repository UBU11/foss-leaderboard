"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { TextureOverlay, TextureType } from "@/components/ui/texture-overlay";

export interface TactileCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "gold" | "silver" | "bronze" | "interactive";
  texture?: TextureType;
  textureOpacity?: number;
}

export function TactileCard({
  children,
  className,
  variant = "default",
  texture = "dots",
  textureOpacity = 0.08,
  ...props
}: TactileCardProps) {
  const variantStyles = {
    default:
      "border-neutral-800 bg-neutral-900/90 text-neutral-100 dark:border-neutral-800/80 dark:bg-neutral-900/85",
    gold:
      "border-amber-500/40 bg-gradient-to-b from-amber-950/20 via-neutral-900/90 to-neutral-950/95 shadow-[0_0_20px_-8px_rgba(245,158,11,0.25)] text-neutral-100",
    silver:
      "border-slate-400/40 bg-gradient-to-b from-slate-900/30 via-neutral-900/90 to-neutral-950/95 shadow-[0_0_20px_-8px_rgba(148,163,184,0.2)] text-neutral-100",
    bronze:
      "border-orange-500/40 bg-gradient-to-b from-orange-950/20 via-neutral-900/90 to-neutral-950/95 shadow-[0_0_20px_-8px_rgba(249,115,22,0.2)] text-neutral-100",
    interactive:
      "border-neutral-800 bg-neutral-900/90 hover:border-neutral-700 text-neutral-100 transition-all duration-200 cursor-pointer",
  };

  return (
    <div
      className={cn(
        // Outer rim
        "relative rounded-[18px] border p-[1px] transition-all duration-200",
        "shadow-[0_1px_0_0_rgba(255,255,255,0.06)_inset,0_0_0_1px_rgba(255,255,255,0.02)_inset,0_4px_12px_rgba(0,0,0,0.4)]",
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {/* Nested secondary border for tactile depth */}
      <div className="relative h-full w-full rounded-[17px] border border-black/30 dark:border-white/5 overflow-hidden p-4 sm:p-5">
        {/* Subtle Cult UI Texture Overlay */}
        <TextureOverlay texture={texture} opacity={textureOpacity} />

        {/* Content */}
        <div className="relative z-10">{children}</div>
      </div>
    </div>
  );
}

export default TactileCard;

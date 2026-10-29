"use client";

import React, { useMemo, useState } from "react";
import { scaleBand, scaleLinear } from "@visx/scale";
import { Group } from "@visx/group";
import { Bar } from "@visx/shape";
import { LinearGradient } from "@visx/gradient";
import { ParentSize } from "@visx/responsive";
import { useTooltip, TooltipWithBounds, defaultStyles } from "@visx/tooltip";
import { localPoint } from "@visx/event";
import { ParticipantScore } from "@/types/osm";
import { Trophy, Award, Medal, Activity } from "lucide-react";
import { TextureOverlay } from "@/components/ui/texture-overlay";

interface ChartProps {
  data: ParticipantScore[];
  width: number;
  height: number;
}

interface TooltipData {
  participant: ParticipantScore;
  index: number;
}

const tooltipStyles = {
  ...defaultStyles,
  backgroundColor: "rgba(15, 23, 42, 0.95)",
  color: "#F8FAFC",
  borderRadius: "8px",
  border: "1px solid rgba(51, 65, 85, 0.8)",
  boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)",
  padding: "8px 12px",
  fontSize: "12px",
  lineHeight: "1.4",
  pointerEvents: "none" as const,
  zIndex: 100,
};

function InnerRankChart({ data, width, height }: ChartProps) {
  const margin = { top: 20, right: 45, bottom: 20, left: 120 };
  const xMax = Math.max(width - margin.left - margin.right, 0);
  const yMax = Math.max(height - margin.top - margin.bottom, 0);

  const [hoveredUser, setHoveredUser] = useState<string | null>(null);

  const {
    showTooltip,
    hideTooltip,
    tooltipOpen,
    tooltipData,
    tooltipLeft,
    tooltipTop,
  } = useTooltip<TooltipData>();

  // Display top 8 participants or all if fewer
  const displayData = useMemo(() => data.slice(0, 8), [data]);

  const yScale = useMemo(
    () =>
      scaleBand<string>({
        range: [0, yMax],
        round: true,
        domain: displayData.map((d) => d.username),
        padding: 0.35,
      }),
    [yMax, displayData]
  );

  const maxVal = Math.max(...displayData.map((d) => d.totalChanges), 10);
  const xScale = useMemo(
    () =>
      scaleLinear<number>({
        range: [0, xMax],
        round: true,
        domain: [0, maxVal],
      }),
    [xMax, maxVal]
  );

  if (displayData.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center text-slate-500 font-mono text-sm">
        No participant edit data recorded yet.
      </div>
    );
  }

  return (
    <div className="relative">
      <svg width={width} height={height} className="overflow-visible">
        {/* Podium Gradients */}
        <LinearGradient from="#F59E0B" to="#D97706" id="gold-grad" />
        <LinearGradient from="#CBD5E1" to="#64748B" id="silver-grad" />
        <LinearGradient from="#F97316" to="#C2410C" id="bronze-grad" />
        <LinearGradient from="#38BDF8" to="#0284C7" id="standard-grad" />
        <LinearGradient from="#06B6D4" to="#0284C7" id="hover-grad" />

        <Group left={margin.left} top={margin.top}>
          {/* Subtle grid lines */}
          {xScale.ticks(5).map((tick) => {
            const xPos = xScale(tick);
            return (
              <g key={`tick-${tick}`}>
                <line
                  x1={xPos}
                  x2={xPos}
                  y1={0}
                  y2={yMax}
                  stroke="#334155"
                  strokeDasharray="2 3"
                  strokeOpacity={0.4}
                />
                <text
                  x={xPos}
                  y={yMax + 14}
                  fill="#64748B"
                  fontSize={10}
                  textAnchor="middle"
                  className="font-mono select-none"
                >
                  {tick}
                </text>
              </g>
            );
          })}

          {displayData.map((d, index) => {
            const barHeight = yScale.bandwidth();
            const barWidth = Math.max(xScale(d.totalChanges), 4);
            const barY = yScale(d.username) ?? 0;
            const isHovered = hoveredUser === d.username;

            let gradientId = "url(#standard-grad)";
            if (index === 0) gradientId = "url(#gold-grad)";
            else if (index === 1) gradientId = "url(#silver-grad)";
            else if (index === 2) gradientId = "url(#bronze-grad)";
            if (isHovered) gradientId = "url(#hover-grad)";

            return (
              <Group
                key={`bar-${d.username}`}
                className="transition-opacity duration-200 cursor-pointer"
                onMouseEnter={(event) => {
                  setHoveredUser(d.username);
                  const point = localPoint(event);
                  if (point) {
                    showTooltip({
                      tooltipData: { participant: d, index },
                      tooltipTop: point.y,
                      tooltipLeft: point.x,
                    });
                  }
                }}
                onMouseLeave={() => {
                  setHoveredUser(null);
                  hideTooltip();
                }}
              >
                {/* Username/DisplayName label with Rank indicator */}
                <text
                  x={-12}
                  y={barY + barHeight / 2}
                  fill={
                    index === 0
                      ? "#FBBF24"
                      : index === 1
                      ? "#E2E8F0"
                      : index === 2
                      ? "#FB923C"
                      : "#94A3B8"
                  }
                  fontSize={12}
                  fontWeight={index < 3 ? "bold" : "normal"}
                  textAnchor="end"
                  dominantBaseline="central"
                  className="font-mono transition-colors"
                >
                  {index + 1}.{" "}
                  {(d.displayName || d.username).length > 12
                    ? `${(d.displayName || d.username).slice(0, 10)}…`
                    : d.displayName || d.username}
                </text>

                {/* Animated Bar Background Track */}
                <Bar
                  x={0}
                  y={barY}
                  width={xMax}
                  height={barHeight}
                  fill="#1E293B"
                  fillOpacity={0.3}
                  rx={4}
                />

                {/* Value Bar */}
                <Bar
                  x={0}
                  y={barY}
                  width={barWidth}
                  height={barHeight}
                  fill={gradientId}
                  rx={4}
                  className="transition-all duration-500 ease-out"
                />

                {/* Edit Count Value */}
                <text
                  x={barWidth + 8}
                  y={barY + barHeight / 2}
                  fill="#F8FAFC"
                  fontSize={11}
                  fontWeight="bold"
                  dominantBaseline="central"
                  className="font-mono select-none"
                >
                  {d.totalChanges}
                </text>
              </Group>
            );
          })}
        </Group>
      </svg>

      {/* Visx Interactive Tooltip */}
      {tooltipOpen && tooltipData && (
        <TooltipWithBounds
          top={tooltipTop}
          left={tooltipLeft}
          style={tooltipStyles}
        >
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-slate-100">
              {tooltipData.index === 0 && <Trophy className="h-3.5 w-3.5 text-amber-400" />}
              {tooltipData.index === 1 && <Award className="h-3.5 w-3.5 text-slate-300" />}
              {tooltipData.index === 2 && <Medal className="h-3.5 w-3.5 text-orange-400" />}
              <span>{tooltipData.participant.displayName || tooltipData.participant.username}</span>
              <span className="text-[10px] text-cyan-400 font-mono">
                #{tooltipData.index + 1}
              </span>
            </div>
            <div className="text-[11px] text-slate-300 grid grid-cols-2 gap-x-2 pt-1 border-t border-slate-700/60">
              <span className="text-slate-400">Total Edits:</span>
              <span className="font-mono font-semibold text-right text-emerald-400">
                {tooltipData.participant.totalChanges}
              </span>
              <span className="text-slate-400">StreetComplete Batches:</span>
              <span className="font-mono text-right text-cyan-300">
                {tooltipData.participant.totalStreetCompleteSets}
              </span>
              {tooltipData.participant.lastActive && (
                <>
                  <span className="text-slate-400">Last Active:</span>
                  <span className="font-mono text-[10px] text-right text-slate-400">
                    {new Date(tooltipData.participant.lastActive).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </>
              )}
            </div>
          </div>
        </TooltipWithBounds>
      )}
    </div>
  );
}

export function RankChartWrapper({ data }: { data: ParticipantScore[] }) {
  return (
    <div className="relative overflow-hidden w-full h-84 rounded-2xl bg-neutral-900/80 p-5 border border-neutral-800 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] backdrop-blur-md flex flex-col">
      <TextureOverlay texture="dots" opacity={0.06} />
      <div className="relative z-10 flex items-center justify-between mb-2 px-1">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-neutral-400" />
          <h3 className="text-sm font-semibold tracking-tight text-neutral-200 font-mono">
            Quest Volume Standings (Top 8 Mappers)
          </h3>
        </div>
        <span className="text-xs font-mono text-neutral-500">
          Metric: StreetComplete Verified Changes
        </span>
      </div>
      <div className="relative z-10 flex-1 w-full min-h-[220px]">
        <ParentSize debounceTime={10}>
          {({ width, height }) => (
            <InnerRankChart
              data={data}
              height={Math.max(height, 220)}
              width={Math.max(width, 280)}
            />
          )}
        </ParentSize>
      </div>
    </div>
  );
}
export default RankChartWrapper;

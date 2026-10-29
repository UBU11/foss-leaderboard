"use client";

import React, { useMemo } from "react";
import { Pie } from "@visx/shape";
import { Group } from "@visx/group";
import { scaleOrdinal } from "@visx/scale";
import { ParentSize } from "@visx/responsive";
import { useTooltip, TooltipWithBounds, defaultStyles } from "@visx/tooltip";
import { ParticipantScore } from "@/types/osm";
import { PieChart, Layers } from "lucide-react";

interface QuestCount {
  questName: string;
  count: number;
}

const colorScheme = [
  "#38BDF8", // Cyan
  "#F59E0B", // Amber
  "#10B981", // Emerald
  "#EC4899", // Pink
  "#8B5CF6", // Purple
  "#F97316", // Orange
  "#06B6D4", // Teal
  "#6366F1", // Indigo
  "#E2E8F0", // Slate
];

const tooltipStyles = {
  ...defaultStyles,
  backgroundColor: "rgba(15, 23, 42, 0.95)",
  color: "#F8FAFC",
  borderRadius: "8px",
  border: "1px solid rgba(56, 189, 248, 0.3)",
  padding: "6px 10px",
  fontSize: "12px",
  boxShadow: "0 8px 20px rgba(0, 0, 0, 0.5)",
  pointerEvents: "none" as const,
  zIndex: 100,
};

function InnerQuestBreakdown({
  data,
  width,
  height,
}: {
  data: QuestCount[];
  width: number;
  height: number;
}) {
  const {
    showTooltip,
    hideTooltip,
    tooltipOpen,
    tooltipData,
    tooltipLeft,
    tooltipTop,
  } = useTooltip<QuestCount>();

  const radius = Math.min(width, height) / 2 - 25;
  const centerY = height / 2;
  const centerX = Math.min(width / 2.6, radius + 20);

  const colorScale = useMemo(
    () =>
      scaleOrdinal({
        domain: data.map((d) => d.questName),
        range: colorScheme,
      }),
    [data]
  );

  const total = useMemo(
    () => data.reduce((sum, item) => sum + item.count, 0),
    [data]
  );

  if (data.length === 0 || radius <= 0) {
    return (
      <div className="flex h-full w-full items-center justify-center text-slate-500 font-mono text-xs">
        No quest category data available yet.
      </div>
    );
  }

  return (
    <div className="relative flex h-full w-full items-center">
      <svg width={width} height={height}>
        <Group top={centerY} left={centerX}>
          <Pie<QuestCount>
            data={data}
            pieValue={(d) => d.count}
            outerRadius={radius}
            innerRadius={radius * 0.58}
            cornerRadius={3}
            padAngle={0.03}
          >
            {(pie) =>
              pie.arcs.map((arc, i) => {
                const [centroidX, centroidY] = pie.path.centroid(arc);
                const hasSpace = arc.endAngle - arc.startAngle > 0.25;
                const arcPath = pie.path(arc) || undefined;
                const arcFill = colorScale(arc.data.questName);

                return (
                  <g
                    key={`arc-${arc.data.questName}-${i}`}
                    className="cursor-pointer transition-opacity hover:opacity-80"
                    onMouseEnter={() => {
                      showTooltip({
                        tooltipData: arc.data,
                        tooltipLeft: centerX + centroidX,
                        tooltipTop: centerY + centroidY,
                      });
                    }}
                    onMouseLeave={hideTooltip}
                  >
                    <path d={arcPath} fill={arcFill} />
                    {hasSpace && (
                      <text
                        x={centroidX}
                        y={centroidY}
                        dy=".33em"
                        fill="#0F172A"
                        fontSize={10}
                        fontWeight="bold"
                        textAnchor="middle"
                        pointerEvents="none"
                        className="font-mono"
                      >
                        {Math.round((arc.data.count / total) * 100)}%
                      </text>
                    )}
                  </g>
                );
              })
            }
          </Pie>

          {/* Center stats */}
          <text
            textAnchor="middle"
            dominantBaseline="central"
            fill="#F8FAFC"
            fontSize={18}
            fontWeight="bold"
            className="font-mono"
          >
            {total}
          </text>
          <text
            y={16}
            textAnchor="middle"
            dominantBaseline="central"
            fill="#64748B"
            fontSize={10}
            className="font-mono"
          >
            Quests
          </text>
        </Group>
      </svg>

      {/* Legend on the right */}
      <div className="absolute right-2 top-2 bottom-2 w-44 overflow-y-auto pr-1 space-y-1.5 flex flex-col justify-center text-xs">
        {data.slice(0, 6).map((item) => (
          <div
            key={item.questName}
            className="flex items-center justify-between text-slate-300 gap-2"
          >
            <div className="flex items-center gap-1.5 truncate">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: colorScale(item.questName) }}
              />
              <span className="truncate text-[11px]" title={item.questName}>
                {item.questName.replace("Add", "").replace("Overlay", "")}
              </span>
            </div>
            <span className="font-mono text-[11px] text-slate-400 font-semibold">
              {item.count}
            </span>
          </div>
        ))}
      </div>

      {tooltipOpen && tooltipData && (
        <TooltipWithBounds
          top={tooltipTop}
          left={tooltipLeft}
          style={tooltipStyles}
        >
          <div className="font-mono text-xs">
            <div className="font-semibold text-cyan-400">{tooltipData.questName}</div>
            <div className="text-slate-300">
              {tooltipData.count} quests ({Math.round((tooltipData.count / total) * 100)}%)
            </div>
          </div>
        </TooltipWithBounds>
      )}
    </div>
  );
}

export function QuestBreakdownChart({ data }: { data: ParticipantScore[] }) {
  const aggregatedQuests: QuestCount[] = useMemo(() => {
    const map: Record<string, number> = {};
    data.forEach((p) => {
      if (p.quests) {
        Object.entries(p.quests).forEach(([q, count]) => {
          map[q] = (map[q] || 0) + count;
        });
      }
    });

    return Object.entries(map)
      .map(([questName, count]) => ({ questName, count }))
      .sort((a, b) => b.count - a.count);
  }, [data]);

  return (
    <div className="w-full h-80 rounded-xl bg-slate-950/40 p-4 border border-slate-800 flex flex-col">
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="flex items-center gap-2">
          <PieChart className="h-4 w-4 text-pink-400" />
          <h3 className="text-sm font-semibold tracking-tight text-slate-200">
            Quest Archetypes Showcase
          </h3>
        </div>
        <div className="flex items-center gap-1 font-mono text-xs text-slate-500">
          <Layers className="h-3 w-3" />
          <span>{aggregatedQuests.length} Varieties</span>
        </div>
      </div>
      <div className="flex-1 w-full min-h-[220px]">
        <ParentSize debounceTime={10}>
          {({ width, height }) => (
            <InnerQuestBreakdown
              data={aggregatedQuests}
              height={Math.max(height, 220)}
              width={Math.max(width, 280)}
            />
          )}
        </ParentSize>
      </div>
    </div>
  );
}
export default QuestBreakdownChart;

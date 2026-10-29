"use client";

import React, { useMemo } from "react";
import { AreaClosed, LinePath } from "@visx/shape";
import { curveMonotoneX } from "@visx/curve";
import { scaleTime, scaleLinear } from "@visx/scale";
import { LinearGradient } from "@visx/gradient";
import { AxisBottom, AxisLeft } from "@visx/axis";
import { ParentSize } from "@visx/responsive";
import { useTooltip, TooltipWithBounds, defaultStyles } from "@visx/tooltip";
import { localPoint } from "@visx/event";
import { ParticipantScore } from "@/types/osm";
import { Activity, Zap } from "lucide-react";

interface ActivityPoint {
  date: Date;
  changes: number;
  cumulativeChanges: number;
}

interface TimelineProps {
  data: ParticipantScore[];
  width: number;
  height: number;
}

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

function InnerTimelineChart({ data, width, height }: TimelineProps) {
  const margin = { top: 20, right: 25, bottom: 35, left: 45 };
  const innerWidth = Math.max(width - margin.left - margin.right, 0);
  const innerHeight = Math.max(height - margin.top - margin.bottom, 0);

  const {
    showTooltip,
    hideTooltip,
    tooltipOpen,
    tooltipData,
    tooltipLeft,
    tooltipTop,
  } = useTooltip<ActivityPoint>();

  // Aggregate all participant history chronologically
  const timelineData: ActivityPoint[] = useMemo(() => {
    const rawPoints: { timestamp: string; changes: number }[] = [];
    data.forEach((p) => {
      p.history.forEach((h) => {
        rawPoints.push({ timestamp: h.timestamp, changes: h.changes });
      });
    });

    if (rawPoints.length === 0) return [];

    rawPoints.sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    let cumulative = 0;
    return rawPoints.map((p) => {
      cumulative += p.changes;
      return {
        date: new Date(p.timestamp),
        changes: p.changes,
        cumulativeChanges: cumulative,
      };
    });
  }, [data]);

  const timeScale = useMemo(() => {
    const dates = timelineData.map((d) => d.date);
    const minDate = dates.length > 0 ? dates[0] : new Date("2026-10-28T00:00:00Z");
    const maxDate = dates.length > 0 ? dates[dates.length - 1] : new Date("2026-10-30T09:00:00Z");

    return scaleTime<number>({
      range: [0, innerWidth],
      domain: [minDate, maxDate],
    });
  }, [timelineData, innerWidth]);

  const valueScale = useMemo(() => {
    const maxVal =
      timelineData.length > 0
        ? Math.max(...timelineData.map((d) => d.cumulativeChanges))
        : 10;
    return scaleLinear<number>({
      range: [innerHeight, 0],
      domain: [0, Math.max(maxVal * 1.15, 10)],
      nice: true,
    });
  }, [timelineData, innerHeight]);

  if (timelineData.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center text-slate-500 font-mono text-xs">
        No edit timeline available yet.
      </div>
    );
  }

  return (
    <div className="relative">
      <svg width={width} height={height}>
        <LinearGradient
          id="area-cyan-gradient"
          from="#06B6D4"
          fromOpacity={0.4}
          to="#3B82F6"
          toOpacity={0.0}
        />
        <LinearGradient
          id="line-cyan-gradient"
          from="#22D3EE"
          to="#3B82F6"
        />

        <g transform={`translate(${margin.left},${margin.top})`}>
          {/* Background area fill */}
          <AreaClosed<ActivityPoint>
            data={timelineData}
            x={(d) => timeScale(d.date) ?? 0}
            y={(d) => valueScale(d.cumulativeChanges) ?? 0}
            yScale={valueScale}
            strokeWidth={1}
            stroke="transparent"
            fill="url(#area-cyan-gradient)"
            curve={curveMonotoneX}
          />

          {/* Glowing line stroke */}
          <LinePath<ActivityPoint>
            data={timelineData}
            x={(d) => timeScale(d.date) ?? 0}
            y={(d) => valueScale(d.cumulativeChanges) ?? 0}
            stroke="url(#line-cyan-gradient)"
            strokeWidth={2.5}
            curve={curveMonotoneX}
          />

          {/* Interactive touch points */}
          {timelineData.map((d, i) => {
            const cx = timeScale(d.date);
            const cy = valueScale(d.cumulativeChanges);
            return (
              <circle
                key={`point-${i}`}
                cx={cx}
                cy={cy}
                r={3}
                fill="#06B6D4"
                stroke="#0F172A"
                strokeWidth={1.5}
                className="cursor-pointer transition-transform hover:scale-150"
                onMouseEnter={(event) => {
                  const point = localPoint(event);
                  if (point) {
                    showTooltip({
                      tooltipData: d,
                      tooltipLeft: point.x,
                      tooltipTop: point.y,
                    });
                  }
                }}
                onMouseLeave={hideTooltip}
              />
            );
          })}

          {/* Axes */}
          <AxisBottom
            top={innerHeight}
            scale={timeScale}
            numTicks={width < 450 ? 3 : 5}
            stroke="#334155"
            tickStroke="#475569"
            tickLabelProps={{
              fill: "#94A3B8",
              fontSize: 10,
              textAnchor: "middle",
              fontFamily: "monospace",
            }}
          />

          <AxisLeft
            scale={valueScale}
            numTicks={4}
            stroke="#334155"
            tickStroke="#475569"
            tickLabelProps={{
              fill: "#94A3B8",
              fontSize: 10,
              textAnchor: "end",
              dx: -4,
              dy: 3,
              fontFamily: "monospace",
            }}
          />
        </g>
      </svg>

      {tooltipOpen && tooltipData && (
        <TooltipWithBounds
          top={tooltipTop}
          left={tooltipLeft}
          style={tooltipStyles}
        >
          <div className="font-mono text-xs">
            <div className="text-cyan-400 font-semibold">
              +{tooltipData.changes} edits
            </div>
            <div className="text-slate-300">
              Total cumulative: {tooltipData.cumulativeChanges}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              {tooltipData.date.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          </div>
        </TooltipWithBounds>
      )}
    </div>
  );
}

export function ActivityTimelineChart({ data }: { data: ParticipantScore[] }) {
  const totalEdits = useMemo(
    () => data.reduce((acc, curr) => acc + curr.totalChanges, 0),
    [data]
  );

  return (
    <div className="w-full h-80 rounded-xl bg-slate-950/40 p-4 border border-slate-800 flex flex-col">
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-emerald-400" />
          <h3 className="text-sm font-semibold tracking-tight text-slate-200">
            Collective Quest Velocity Timeline
          </h3>
        </div>
        <div className="flex items-center gap-1.5 font-mono text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded-full">
          <Zap className="h-3 w-3" />
          <span>{totalEdits} Total Edits</span>
        </div>
      </div>
      <div className="flex-1 w-full min-h-[220px]">
        <ParentSize debounceTime={10}>
          {({ width, height }) => (
            <InnerTimelineChart
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
export default ActivityTimelineChart;

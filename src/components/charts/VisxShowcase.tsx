"use client";

import React, { useState } from "react";
import { RankChartWrapper } from "@/components/charts/RankChart";
import { ActivityTimelineChart } from "@/components/charts/ActivityTimelineChart";
import { QuestBreakdownChart } from "@/components/charts/QuestBreakdownChart";
import { ParticipantScore } from "@/types/osm";
import { BarChart3, LineChart, PieChart, Layers } from "lucide-react";
import {
  HaloTabs,
  HaloTabsList,
  HaloTabsTrigger,
  HaloTabsIndicator,
  HaloTabsContent,
} from "@/components/ui/halo-tabs";
import { HaloBadge } from "@/components/ui/halo-badge";

interface VisxShowcaseProps {
  data: ParticipantScore[];
}

export function VisxShowcase({ data }: VisxShowcaseProps) {
  const [activeTab, setActiveTab] = useState<string>("ranking");

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-300 shadow-inner">
            <Layers className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-neutral-100 tracking-tight">
              Activity & Trends
            </h2>
          </div>
        </div>

        {/* Tab Controls */}
        <HaloTabs
          value={activeTab}
          onValueChange={(val) => setActiveTab(val as string)}
          className="w-auto"
        >
          <HaloTabsList variant="pill" className="self-start sm:self-auto">
            <HaloTabsTrigger value="ranking" className="flex items-center gap-1.5 font-mono text-xs cursor-pointer">
              <BarChart3 className="h-3.5 w-3.5" />
              <span>Rankings</span>
            </HaloTabsTrigger>

            <HaloTabsTrigger value="timeline" className="flex items-center gap-1.5 font-mono text-xs cursor-pointer">
              <LineChart className="h-3.5 w-3.5" />
              <span>Timeline</span>
            </HaloTabsTrigger>

            <HaloTabsTrigger value="archetypes" className="flex items-center gap-1.5 font-mono text-xs cursor-pointer">
              <PieChart className="h-3.5 w-3.5" />
              <span>Quests</span>
            </HaloTabsTrigger>
            <HaloTabsIndicator variant="pill" />
          </HaloTabsList>

          <HaloTabsContent value="ranking" className="pt-2">
            <RankChartWrapper data={data} />
          </HaloTabsContent>

          <HaloTabsContent value="timeline" className="pt-2">
            <ActivityTimelineChart data={data} />
          </HaloTabsContent>

          <HaloTabsContent value="archetypes" className="pt-2">
            <QuestBreakdownChart data={data} />
          </HaloTabsContent>
        </HaloTabs>
      </div>
    </div>
  );
}

export default VisxShowcase;

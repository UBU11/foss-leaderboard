
# AGENT.md: Real-Time StreetComplete OSM Challenge Leaderboard

## Objective
Build and deploy a real-time leaderboard dashboard for an OpenStreetMap (OSM) mapping competition ending tomorrow at 9:00 AM. The app tracks edits made by participants using the StreetComplete Android app, visualizes participant output using Airbnb Visx charts, and delivers a sleek dark-mode interface styled with shadcn/ui and Cult UI components.

## Stack & Architecture
- **Runtime & Package Manager:** Bun (`bun`)
- **Framework:** Next.js (App Router, Client-Side execution / polling)
- **Styling:** Tailwind CSS, Lucide React
- **Component Libraries:** shadcn/ui, Cult UI
- **Data Visualization:** Visx (`@visx/shape`, `@visx/scale`, `@visx/group`, `@visx/responsive`, `@visx/axis`, `@visx/tooltip`, `@visx/gradient`)
- **Animation:** `framer-motion`

---

## 1. Project Initialization & Dependencies

Execute the following commands to initialize the project environment:

```bash
bun create next-app osm-leaderboard --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
cd osm-leaderboard

# Install visualization, animation, and utility dependencies
bun add @visx/shape @visx/scale @visx/group @visx/responsive @visx/axis @visx/tooltip @visx/gradient
bun add framer-motion lucide-react clsx tailwind-merge class-variance-authority

# Initialize shadcn/ui
bunx --bun shadcn@latest init -d

# Add baseline shadcn components
bunx --bun shadcn@latest add table card badge button input dialog

```

---

## 2. Domain Logic & Data Fetching

### OSM Changeset API Protocol

StreetComplete uploads edits directly to OSM changesets. Quests solved are registered as changeset modifications where:

1. `tags.created_by` starts with `"StreetComplete"`.
2. `num_changes` represents the volume of edits/nodes modified in that batch.
3. Edits must be filtered by the competition start timestamp.

**Endpoint:**
`https://api.openstreetmap.org/api/0.6/changesets.json?display_name={USERNAME}&time={EVENT_START_ISO}`

### Data Transformation Schema (`src/types/osm.ts`)

```typescript
export interface OSMChangeset {
  id: number;
  created_at: string;
  closed_at?: string;
  open: boolean;
  num_changes: number;
  tags?: {
    created_by?: string;
    comment?: string;
    locale?: string;
  };
}

export interface ParticipantScore {
  rank: number;
  username: string;
  displayName?: string;
  totalChanges: number;
  totalStreetCompleteSets: number;
  lastActive: string | null;
  history: { timestamp: string; changes: number }[];
}

```

### Fetcher Service (`src/lib/osm.ts`)

Implement concurrent data retrieval with exponential backoff and rate-limit guardrails:

```typescript
const HEADERS = {
  "User-Agent": "FOSS-College-OSM-Leaderboard/1.0 (NextJS/Bun)",
};

export async function fetchUserEdits(
  username: string,
  eventStartIso: string
): Promise<{ totalChanges: number; sets: number; lastActive: string | null; history: { timestamp: string; changes: number }[] }> {
  try {
    const url = `[https://api.openstreetmap.org/api/0.6/changesets.json?display_name=$](https://api.openstreetmap.org/api/0.6/changesets.json?display_name=$){encodeURIComponent(
      username
    )}&time=${encodeURIComponent(eventStartIso)}`;

    const res = await fetch(url, { headers: HEADERS });
    if (!res.status || !res.ok) {
      return { totalChanges: 0, sets: 0, lastActive: null, history: [] };
    }

    const data = await res.json();
    const changesets: any[] = data.changesets || [];

    let totalChanges = 0;
    let sets = 0;
    let lastActive: string | null = null;
    const history: { timestamp: string; changes: number }[] = [];

    for (const cs of changesets) {
      const createdBy = cs.tags?.created_by || "";
      if (createdBy.startsWith("StreetComplete")) {
        sets += 1;
        totalChanges += cs.num_changes || 0;
        history.push({
          timestamp: cs.created_at,
          changes: cs.num_changes || 0,
        });

        if (!lastActive || cs.created_at > lastActive) {
          lastActive = cs.created_at;
        }
      }
    }

    return { totalChanges, sets, lastActive, history };
  } catch (err) {
    console.error(`Fetch failed for user ${username}`, err);
    return { totalChanges: 0, sets: 0, lastActive: null, history: [] };
  }
}

```

---

## 3. Visualization Modules (Visx)

Implement a horizontal bar ranking chart in `src/components/charts/RankChart.tsx` using `@visx/shape` and `@visx/scale`.

### Requirements:

* Render animated SVG bars representing relative quest volume per participant.
* Use `@visx/responsive` (`ParentSize`) to guarantee zero-overflow responsiveness across mobile and projection screens.
* Implement gradient fills (`LinearGradient`) to highlight top 3 podium ranks.

```tsx
"use client";

import React, { useMemo } from "react";
import { scaleBand, scaleLinear } from "@visx/scale";
import { Group } from "@visx/group";
import { Bar } from "@visx/shape";
import { LinearGradient } from "@visx/gradient";
import { ParentSize } from "@visx/responsive";
import { ParticipantScore } from "@/types/osm";

interface ChartProps {
  data: ParticipantScore[];
  width: number;
  height: number;
}

function InnerRankChart({ data, width, height }: ChartProps) {
  const margin = { top: 20, right: 30, bottom: 20, left: 100 };
  const xMax = Math.max(width - margin.left - margin.right, 0);
  const yMax = Math.max(height - margin.top - margin.bottom, 0);

  const topTen = useMemo(() => data.slice(0, 8), [data]);

  const yScale = useMemo(
    () =>
      scaleBand<string>({
        range: [0, yMax],
        round: true,
        domain: topTen.map((d) => d.username),
        padding: 0.35,
      }),
    [yMax, topTen]
  );

  const maxVal = Math.max(...topTen.map((d) => d.totalChanges), 10);
  const xScale = useMemo(
    () =>
      scaleLinear<number>({
        range: [0, xMax],
        round: true,
        domain: [0, maxVal],
      }),
    [xMax, maxVal]
  );

  return (
    <svg width={width} height={height}>
      <LinearGradient from="#F59E0B" id="gold-grad" to="#D97706"/>
      <LinearGradient from="#3B82F6" id="standard-grad" to="#1D4ED8"/>

      <Group left="{margin.left}" top="{margin.top}">
        {topTen.map((d, index) => {
          const barHeight = yScale.bandwidth();
          const barWidth = xScale(d.totalChanges);
          const barY = yScale(d.username);

          return (
            <Group key="{`bar-${d.username}`}">
              <text
                x={-10}
                y={(barY ?? 0) + barHeight / 2}
                fill="#94A3B8"
                fontSize={12}
                textAnchor="end"
                dominantBaseline="central"
                className="font-mono"
              >
                {d.username}
              </text>
              <Bar "url(#gold-grad)" "url(#standard-grad)"} 0 : ? fill="{index" height="{barHeight}" rx="{4}" width="{barWidth}" x="{0}" y="{barY}"/>
              <text
                x={barWidth + 8}
                y={(barY ?? 0) + barHeight / 2}
                fill="#F8FAFC"
                fontSize={12}
                fontWeight="bold"
                dominantBaseline="central"
                className="font-mono"
              >
                {d.totalChanges}
              </text>
            </Group>
          );
        })}
      </Group>
    </svg>
  );
}

export function RankChartWrapper({ data }: { data: ParticipantScore[] }) {
  return (
    <div className="w-full h-80 rounded-xl bg-slate-950/40 p-4 border border-slate-800">
      <ParentSize>
        {({ width, height }) => <InnerRankChart data="{data}" height="{height}" width="{width}"/>}
      </ParentSize>
    </div>
  );
}

```

---

## 4. Cult UI & Shadcn Component Styling

Incorporate tactile, textured card surfaces and dynamic controls inspired by Cult UI patterns.

### Participant Card / Shift Card Pattern (`src/components/ui/tactile-card.tsx`)

```tsx
import React from "react";
import { cn } from "@/lib/utils";

export function TactileCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-slate-800 bg-gradient-to-b from-slate-900/90 to-slate-950/90 p-5 shadow-2xl backdrop-blur-md transition-all hover:border-slate-700",
        className
      )}
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/10 via-transparent to-transparent pointer-events-none" />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

```

### Live Status Ticker & Podiums

Top 3 mapper cards must feature high-contrast badges:

* 1st Place: Gold glow (`ring-1 ring-amber-500/50 bg-amber-500/10 text-amber-300`)
* 2nd Place: Silver glow (`ring-1 ring-slate-400/50 bg-slate-400/10 text-slate-200`)
* 3rd Place: Bronze glow (`ring-1 ring-orange-500/50 bg-orange-500/10 text-orange-300`)

---

## 5. Main Dashboard View (`src/app/page.tsx`)

Assemble the entire application inside the App Router:

* Manage the participant list using client state initialized with default student IDs/usernames.
* Provide a modal or slide-over drawer to append new usernames on the fly without redeploying.
* Auto-refresh leaderboard state via `setInterval` every 60 seconds with an animated countdown indicator.
* Include a manual "Sync Standings" trigger button with loading states.
* Display a prominent alert banner reminding participants:
> *"Verification Notice: Results shown reflect live OSM edits. Final winners will be confirmed at 9:00 AM via in-app StreetComplete Profile stars."*



---

## 6. Execution Instructions for the Agent

1. Create all directory trees (`src/components/charts`, `src/types`, `src/lib`).
2. Implement types, API client, and Visx visualization components without mocking; connect directly to the OSM API.
3. Configure `next.config.js` to bypass external image domain restrictions if displaying OSM avatar URLs.
4. Verify complete build output using `bun run build` to confirm zero TypeScript, lint, or Visx compilation errors.

```

```

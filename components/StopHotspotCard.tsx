"use client";

import { MapPin, Brain, Radio, Loader2, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { AceInsight } from "@/types";

interface StopHotspotCardProps {
  insight: AceInsight | null;
  loading?: boolean;
  /** When provided, clicking a stop marker navigates to the context briefing */
  onStopClick?: (lat: number, lon: number, name: string) => void;
}

export function StopHotspotCardSkeleton() {
  return (
    <div className="bg-white border border-border rounded-xl p-4 space-y-3 shadow-[0_1px_3px_rgba(14,36,64,0.04)]">
      <div className="flex items-center gap-2 mb-3">
        <Skeleton className="h-7 w-7 rounded-lg" />
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-5 w-12 rounded-full ml-auto" />
      </div>
      <div className="space-y-2.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-6 w-6 rounded-full shrink-0" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-3.5 w-36" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-5 w-10 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function StopHotspotCard({
  insight,
  loading,
  onStopClick,
}: StopHotspotCardProps) {
  if (loading) return <StopHotspotCardSkeleton />;

  if (!insight || insight.rows.length === 0) {
    return (
      <div className="bg-white border border-border rounded-xl p-4 shadow-[0_1px_3px_rgba(14,36,64,0.04)]">
        <div className="flex items-center gap-2 mb-3">
          <div className="rounded-lg bg-fleet-orange/10 p-1.5">
            <MapPin className="h-3.5 w-3.5 text-fleet-orange" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">Stop Hotspots</h3>
        </div>
        <p className="text-xs text-muted-foreground py-4 text-center">
          No stop hotspot data available
        </p>
      </div>
    );
  }

  const maxVisits = Math.max(
    ...insight.rows.map((r) => Number(r["visit_count"] ?? 0))
  );

  // Assign heat colors by rank
  const heatColors = [
    "#ea7c1e", // #1 — orange (hottest)
    "#f59e0b", // #2
    "#1a56db", // #3
    "#3b82f6", // #4
    "#60a5fa", // #5+
  ];

  return (
    <div className="bg-white border border-border rounded-xl p-4 shadow-[0_1px_3px_rgba(14,36,64,0.04)]">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="rounded-lg bg-fleet-orange/10 p-1.5 shrink-0">
          <MapPin className="h-3.5 w-3.5 text-fleet-orange" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-foreground">Stop Hotspots</h3>
          <p className="text-xs text-muted-foreground">Most-visited locations (30d)</p>
        </div>
        <Badge
          variant={insight.fromCache ? "cached" : "live"}
          className="shrink-0 gap-1 text-xs"
        >
          {insight.fromCache ? (
            <Loader2 className="h-2.5 w-2.5" />
          ) : (
            <Radio className="h-2.5 w-2.5" />
          )}
          {insight.fromCache ? "Cached" : "Live"}
        </Badge>
      </div>

      {/* Hotspot rows */}
      <div className="space-y-2.5">
        {insight.rows.slice(0, 7).map((row, i) => {
          const name = String(row["location_name"] ?? "Unknown");
          const visits = Number(row["visit_count"] ?? 0);
          const dwell = Number(row["avg_dwell_minutes"] ?? 0);
          const pct = maxVisits > 0 ? (visits / maxVisits) * 100 : 0;
          const lat = Number(row["lat"] ?? 0);
          const lon = Number(row["lon"] ?? 0);
          const color = heatColors[Math.min(i, heatColors.length - 1)];
          const hasCoords = lat !== 0 && lon !== 0;

          return (
            <div
              key={i}
              onClick={() => {
                if (hasCoords && onStopClick) onStopClick(lat, lon, name);
              }}
              className={
                hasCoords && onStopClick
                  ? "cursor-pointer group hover:bg-muted/20 -mx-2 px-2 rounded-lg transition-colors"
                  : ""
              }
            >
              <div className="flex items-center gap-2.5 mb-1">
                {/* Rank dot */}
                <div
                  className="h-5 w-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                  style={{ backgroundColor: color }}
                >
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">
                    {name}
                  </p>
                  {dwell > 0 && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <Clock className="h-2.5 w-2.5 text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground">
                        avg {Math.round(dwell)} min dwell
                      </span>
                    </div>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <span
                    className="text-xs font-bold tabular-nums"
                    style={{ color }}
                  >
                    {visits}
                  </span>
                  <span className="text-[10px] text-muted-foreground ml-0.5">
                    visits
                  </span>
                </div>
              </div>
              {/* Bar */}
              <div className="ml-7 h-1 rounded-full bg-muted/50 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, backgroundColor: color }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {insight.reasoning && (
        <div className="mt-3 pt-3 border-t border-border">
          <p className="text-xs text-muted-foreground leading-relaxed">
            <span className="font-semibold text-fleet-amber">Ace: </span>
            {insight.reasoning}
          </p>
        </div>
      )}
    </div>
  );
}

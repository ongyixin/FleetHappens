"use client";

import { ArrowRight, Brain, Radio, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { AceInsight } from "@/types";

interface RoutePatternCardProps {
  insight: AceInsight | null;
  loading?: boolean;
}

export function RoutePatternCardSkeleton() {
  return (
    <div className="bg-white border border-border rounded-xl p-4 space-y-3 shadow-[0_1px_3px_rgba(14,36,64,0.04)]">
      <div className="flex items-center gap-2 mb-3">
        <Skeleton className="h-7 w-7 rounded-lg" />
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-5 w-12 rounded-full ml-auto" />
      </div>
      <div className="space-y-2.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-3 w-3 rounded-full" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-10 ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function RoutePatternCard({
  insight,
  loading,
}: RoutePatternCardProps) {
  if (loading) return <RoutePatternCardSkeleton />;

  if (!insight || insight.rows.length === 0) {
    return (
      <div className="bg-white border border-border rounded-xl p-4 shadow-[0_1px_3px_rgba(14,36,64,0.04)]">
        <div className="flex items-center gap-2 mb-3">
          <div className="rounded-lg bg-fleet-blue/10 p-1.5">
            <Brain className="h-3.5 w-3.5 text-fleet-blue" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">Route Patterns</h3>
        </div>
        <p className="text-xs text-muted-foreground py-4 text-center">
          No route pattern data available
        </p>
      </div>
    );
  }

  const maxTrips = Math.max(...insight.rows.map((r) => Number(r["trip_count"] ?? 0)));

  return (
    <div className="bg-white border border-border rounded-xl p-4 shadow-[0_1px_3px_rgba(14,36,64,0.04)]">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="rounded-lg bg-fleet-blue/10 p-1.5 shrink-0">
          <Brain className="h-3.5 w-3.5 text-fleet-blue" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-foreground">Route Patterns</h3>
          <p className="text-xs text-muted-foreground">Top origin-destination pairs</p>
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

      {/* Route rows */}
      <div className="space-y-3">
        {insight.rows.slice(0, 5).map((row, i) => {
          const origin = String(row["origin"] ?? "—");
          const dest = String(row["destination"] ?? "—");
          const trips = Number(row["trip_count"] ?? 0);
          const dist = Number(row["avg_distance_km"] ?? 0);
          const dur = Number(row["avg_duration_minutes"] ?? 0);
          const pct = maxTrips > 0 ? (trips / maxTrips) * 100 : 0;

          return (
            <div key={i} className="group">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold text-muted-foreground w-4 tabular-nums shrink-0">
                  {i + 1}
                </span>
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <span className="text-xs font-medium text-foreground truncate">
                    {origin}
                  </span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                  <span className="text-xs text-muted-foreground truncate">
                    {dest}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0 text-xs">
                  <span className="font-semibold text-foreground tabular-nums">
                    {trips}×
                  </span>
                  {dist > 0 && (
                    <span className="text-muted-foreground tabular-nums hidden sm:block">
                      {dist.toFixed(0)} km
                    </span>
                  )}
                  {dur > 0 && (
                    <span className="text-muted-foreground tabular-nums hidden md:block">
                      {dur >= 60
                        ? `${(dur / 60).toFixed(1)}h`
                        : `${Math.round(dur)}m`}
                    </span>
                  )}
                </div>
              </div>
              <div className="ml-5 h-1 rounded-full bg-muted/50 overflow-hidden">
                <div
                  className="h-full rounded-full bg-fleet-blue/60 transition-all duration-500"
                  style={{ width: `${pct}%` }}
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

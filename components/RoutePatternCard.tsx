"use client";

import { ArrowRight, Brain, Radio, Loader2 } from "lucide-react";
import type { AceInsight } from "@/types";

interface RoutePatternCardProps { insight: AceInsight | null; loading?: boolean; }

export function RoutePatternCardSkeleton() {
  return (
    <div className="atlas-card rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-7 w-7 rounded-xl skeleton-shimmer" />
        <div className="h-4 w-32 rounded skeleton-shimmer flex-1" />
        <div className="h-5 w-12 rounded-full skeleton-shimmer" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i}>
            <div className="flex items-center gap-2 mb-1">
              <div className="h-3 flex-1 rounded skeleton-shimmer" />
              <div className="h-3 w-3 rounded-full skeleton-shimmer" />
              <div className="h-3 flex-1 rounded skeleton-shimmer" />
              <div className="h-3 w-8 rounded skeleton-shimmer" />
            </div>
            <div className="h-1 rounded-full skeleton-shimmer ml-4" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function RoutePatternCard({ insight, loading }: RoutePatternCardProps) {
  if (loading) return <RoutePatternCardSkeleton />;

  if (!insight || insight.rows.length === 0) {
    return (
      <div className="atlas-card rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="rounded-xl bg-[rgba(56,189,248,0.1)] p-1.5">
            <Brain className="h-3.5 w-3.5 text-[#38bdf8]" />
          </div>
          <h3 className="text-sm font-display font-bold text-white">Route Patterns</h3>
        </div>
        <p className="text-xs text-[rgba(232,237,248,0.4)] py-4 text-center font-body">No route pattern data available</p>
      </div>
    );
  }

  const maxTrips = Math.max(...insight.rows.map((r) => Number(r["trip_count"] ?? 0)));

  return (
    <div className="atlas-card rounded-xl p-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="rounded-xl bg-[rgba(56,189,248,0.1)] p-1.5 shrink-0">
          <Brain className="h-3.5 w-3.5 text-[#38bdf8]" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-[13px] font-display font-bold text-white">Route Patterns</h3>
          <p className="text-[10px] text-[rgba(232,237,248,0.4)] font-body">Top origin-destination pairs</p>
        </div>
        <span className={`shrink-0 flex items-center gap-1 text-[10px] font-bold rounded-full px-2 py-0.5 font-body ${
          insight.fromCache
            ? "text-[rgba(232,237,248,0.45)] bg-[rgba(255,255,255,0.06)]"
            : "text-[#34d399] bg-[rgba(52,211,153,0.08)] border border-[rgba(52,211,153,0.2)]"
        }`}>
          {insight.fromCache ? <Loader2 className="h-2.5 w-2.5" /> : <Radio className="h-2.5 w-2.5" />}
          {insight.fromCache ? "Cached" : "Live"}
        </span>
      </div>

      {/* Route rows */}
      <div className="space-y-3">
        {insight.rows.slice(0, 5).map((row, i) => {
          const origin = String(row["origin"] ?? "—");
          const dest   = String(row["destination"] ?? "—");
          const trips  = Number(row["trip_count"] ?? 0);
          const dist   = Number(row["avg_distance_km"] ?? 0);
          const dur    = Number(row["avg_duration_minutes"] ?? 0);
          const pct    = maxTrips > 0 ? (trips / maxTrips) * 100 : 0;

          return (
            <div key={i}>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[10px] font-data font-bold text-[rgba(232,237,248,0.3)] w-4 tabular-nums shrink-0">{i + 1}</span>
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <span className="text-[11px] font-body font-semibold text-white truncate">{origin}</span>
                  <ArrowRight className="h-3 w-3 text-[rgba(232,237,248,0.3)] shrink-0" />
                  <span className="text-[11px] font-body text-[rgba(232,237,248,0.55)] truncate">{dest}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0 text-[10px]">
                  <span className="font-data font-bold text-white tabular-nums">{trips}×</span>
                  {dist > 0 && <span className="font-data text-[rgba(232,237,248,0.45)] tabular-nums hidden sm:block">{dist.toFixed(0)} km</span>}
                  {dur > 0 && <span className="font-data text-[rgba(232,237,248,0.45)] tabular-nums hidden md:block">{dur >= 60 ? `${(dur / 60).toFixed(1)}h` : `${Math.round(dur)}m`}</span>}
                </div>
              </div>
              <div className="ml-5 h-1 rounded-full bg-[rgba(255,255,255,0.06)] overflow-hidden">
                <div className="h-full rounded-full bg-[#38bdf8]/50 transition-all duration-700" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      {insight.reasoning && (
        <div className="mt-3 pt-3 border-t border-[rgba(255,255,255,0.07)]">
          <p className="text-[10px] text-[rgba(232,237,248,0.5)] font-body leading-relaxed">
            <span className="font-bold text-[#f5a623]">Ace: </span>{insight.reasoning}
          </p>
        </div>
      )}
    </div>
  );
}

"use client";

import { MapPin, Brain, Radio, Loader2, Clock } from "lucide-react";
import type { AceInsight } from "@/types";

interface StopHotspotCardProps {
  insight: AceInsight | null;
  loading?: boolean;
  onStopClick?: (lat: number, lon: number, name: string) => void;
}

const HEAT_COLORS = ["#f5a623", "#fb923c", "#38bdf8", "#34d399", "#a78bfa"];

export function StopHotspotCardSkeleton() {
  return (
    <div className="atlas-card rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-7 w-7 rounded-xl skeleton-shimmer" />
        <div className="h-4 w-32 rounded skeleton-shimmer flex-1" />
        <div className="h-5 w-12 rounded-full skeleton-shimmer" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2.5">
            <div className="h-6 w-6 rounded-full skeleton-shimmer shrink-0" />
            <div className="flex-1 space-y-1">
              <div className="h-3 w-36 rounded skeleton-shimmer" />
              <div className="h-2.5 w-24 rounded skeleton-shimmer" />
            </div>
            <div className="h-4 w-10 rounded skeleton-shimmer" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function StopHotspotCard({ insight, loading, onStopClick }: StopHotspotCardProps) {
  if (loading) return <StopHotspotCardSkeleton />;

  if (!insight || insight.rows.length === 0) {
    return (
      <div className="atlas-card rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="rounded-xl bg-[rgba(251,146,60,0.1)] p-1.5">
            <MapPin className="h-3.5 w-3.5 text-[#fb923c]" />
          </div>
          <h3 className="text-[13px] font-display font-bold text-white">Stop Hotspots</h3>
        </div>
        <p className="text-xs text-[rgba(232,237,248,0.4)] py-4 text-center font-body">No stop hotspot data available</p>
      </div>
    );
  }

  const maxVisits = Math.max(...insight.rows.map((r) => Number(r["visit_count"] ?? 0)));

  return (
    <div className="atlas-card rounded-xl p-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="rounded-xl bg-[rgba(251,146,60,0.1)] p-1.5 shrink-0">
          <MapPin className="h-3.5 w-3.5 text-[#fb923c]" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-[13px] font-display font-bold text-white">Stop Hotspots</h3>
          <p className="text-[10px] text-[rgba(232,237,248,0.4)] font-body">Most-visited locations (30d)</p>
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

      {/* Hotspot rows */}
      <div className="space-y-3">
        {insight.rows.slice(0, 7).map((row, i) => {
          const name   = String(row["location_name"] ?? "Unknown");
          const visits = Number(row["visit_count"] ?? 0);
          const dwell  = Number(row["avg_dwell_minutes"] ?? 0);
          const pct    = maxVisits > 0 ? (visits / maxVisits) * 100 : 0;
          const lat    = Number(row["lat"] ?? 0);
          const lon    = Number(row["lon"] ?? 0);
          const color  = HEAT_COLORS[Math.min(i, HEAT_COLORS.length - 1)];
          const hasCoords = lat !== 0 && lon !== 0;

          return (
            <div
              key={i}
              onClick={() => { if (hasCoords && onStopClick) onStopClick(lat, lon, name); }}
              className={hasCoords && onStopClick ? "cursor-pointer group -mx-2 px-2 py-1 rounded-lg hover:bg-[rgba(255,255,255,0.04)] transition-colors" : ""}
            >
              <div className="flex items-center gap-2.5 mb-1.5">
                <div className="h-5 w-5 rounded-full flex items-center justify-center text-[#09090e] text-[9px] font-display font-bold shrink-0"
                  style={{ background: color }}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-body font-semibold text-white truncate">{name}</p>
                  {dwell > 0 && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <Clock className="h-2.5 w-2.5 text-[rgba(232,237,248,0.3)]" />
                      <span className="text-[9px] text-[rgba(232,237,248,0.4)] font-body">avg {Math.round(dwell)} min dwell</span>
                    </div>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <span className="text-xs font-data font-bold tabular-nums" style={{ color }}>{visits}</span>
                  <span className="text-[9px] text-[rgba(232,237,248,0.35)] font-body ml-0.5">visits</span>
                </div>
              </div>
              <div className="ml-7 h-1 rounded-full bg-[rgba(255,255,255,0.06)] overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color, opacity: 0.7 }} />
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

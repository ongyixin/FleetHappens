"use client";

import { Truck, Brain, Radio, Loader2, Navigation, RotateCcw, TrendingUp } from "lucide-react";
import type { AceInsight } from "@/types";

interface VehicleOutliersCardProps {
  insight: AceInsight | null;
  loading?: boolean;
  onSelectVehicle?: (vehicleName: string) => void;
}

export function VehicleOutliersCardSkeleton() {
  return (
    <div className="atlas-card rounded-xl p-4">
      <div className="flex items-center gap-2 mb-4">
        <div className="h-7 w-7 rounded-xl skeleton-shimmer" />
        <div className="h-4 w-36 rounded skeleton-shimmer flex-1" />
        <div className="h-5 w-12 rounded-full skeleton-shimmer" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-[rgba(255,255,255,0.08)]">
            <div className="h-8 w-8 rounded-xl skeleton-shimmer shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 w-32 rounded skeleton-shimmer" />
              <div className="h-2.5 w-20 rounded skeleton-shimmer" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function VehicleOutliersCard({ insight, loading, onSelectVehicle }: VehicleOutliersCardProps) {
  if (loading) return <VehicleOutliersCardSkeleton />;

  if (!insight || insight.rows.length === 0) {
    return (
      <div className="atlas-card rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="rounded-xl bg-[rgba(52,211,153,0.1)] p-1.5">
            <Brain className="h-3.5 w-3.5 text-[#34d399]" />
          </div>
          <h3 className="text-[13px] font-display font-bold text-white">Vehicle Outliers</h3>
        </div>
        <p className="text-xs text-[rgba(232,237,248,0.4)] py-4 text-center font-body">No outlier data available</p>
      </div>
    );
  }

  const rows = insight.rows.slice(0, 5);
  const topDistance = rows[0];
  const topIdle  = [...rows].sort((a, b) => Number(b["avg_idle_pct"] ?? 0) - Number(a["avg_idle_pct"] ?? 0))[0];
  const topTrips = [...rows].sort((a, b) => Number(b["trip_count"] ?? 0)   - Number(a["trip_count"] ?? 0))[0];

  const outliers = [
    { label: "Most Distance", icon: Navigation, color: "#38bdf8", bg: "rgba(56,189,248,0.1)",  row: topDistance, metricKey: "total_distance_km", suffix: " km",    fmt: (v: number) => Math.round(v).toLocaleString() },
    { label: "Most Idle",     icon: RotateCcw,  color: "#f5a623", bg: "rgba(245,166,35,0.1)", row: topIdle,     metricKey: "avg_idle_pct",       suffix: "% idle", fmt: (v: number) => v.toFixed(1) },
    { label: "Most Trips",    icon: TrendingUp, color: "#34d399", bg: "rgba(52,211,153,0.1)", row: topTrips,    metricKey: "trip_count",         suffix: " trips", fmt: (v: number) => Math.round(v).toString() },
  ];

  return (
    <div className="atlas-card rounded-xl p-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="rounded-xl bg-[rgba(52,211,153,0.1)] p-1.5 shrink-0">
          <Brain className="h-3.5 w-3.5 text-[#34d399]" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-[13px] font-display font-bold text-white">Vehicle Outliers</h3>
          <p className="text-[10px] text-[rgba(232,237,248,0.4)] font-body">Standout vehicles this week</p>
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

      {/* Outlier rows */}
      <div className="space-y-2.5">
        {outliers.map(({ label, icon: Icon, color, bg, row, metricKey, suffix, fmt }) => {
          const name  = String(row["device_name"] ?? "—");
          const value = fmt(Number(row[metricKey] ?? 0)) + suffix;
          return (
            <div
              key={label}
              onClick={() => onSelectVehicle?.(name)}
              className={`flex items-center gap-3 p-3 rounded-xl border border-[rgba(255,255,255,0.07)] transition-all ${
                onSelectVehicle ? "cursor-pointer hover:border-[rgba(245,166,35,0.25)] hover:bg-[rgba(245,166,35,0.04)] group" : ""
              }`}
            >
              <div className="h-8 w-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: bg }}>
                <Icon className="h-3.5 w-3.5" style={{ color }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[12px] font-body font-semibold text-white truncate">{name}</p>
                  <span className="text-[11px] font-data font-bold tabular-nums shrink-0" style={{ color }}>{value}</span>
                </div>
                <p className="text-[10px] text-[rgba(232,237,248,0.38)] font-body mt-0.5">{label}</p>
              </div>
              {onSelectVehicle && (
                <svg className="h-4 w-4 text-[rgba(232,237,248,0.2)] group-hover:text-[#f5a623] transition-colors shrink-0"
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              )}
            </div>
          );
        })}
      </div>

      {/* All top vehicles */}
      {rows.length > 1 && (
        <div className="mt-4 pt-3 border-t border-[rgba(255,255,255,0.07)]">
          <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[rgba(232,237,248,0.3)] font-body mb-2">
            All Top Vehicles
          </p>
          <div className="space-y-1.5">
            {rows.map((row, i) => (
              <div
                key={i}
                onClick={() => onSelectVehicle?.(String(row["device_name"] ?? ""))}
                className={`flex items-center gap-2 text-[11px] ${onSelectVehicle ? "cursor-pointer group" : ""}`}
              >
                <span className="text-[rgba(232,237,248,0.3)] font-data w-4 tabular-nums shrink-0">{i + 1}.</span>
                <Truck className="h-3 w-3 text-[rgba(232,237,248,0.3)] shrink-0" />
                <span className="font-body font-medium text-white flex-1 truncate group-hover:text-[#f5a623] transition-colors">
                  {String(row["device_name"] ?? "—")}
                </span>
                <span className="font-data tabular-nums text-[rgba(232,237,248,0.45)]">
                  {Math.round(Number(row["total_distance_km"] ?? 0)).toLocaleString()} km
                </span>
                <span className="font-data tabular-nums text-[rgba(232,237,248,0.45)]">
                  {Number(row["trip_count"] ?? 0)} trips
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

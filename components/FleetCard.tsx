"use client";

import { Truck, Activity, Navigation, TrendingUp } from "lucide-react";
import type { FleetSummary, AceInsight } from "@/types";

interface FleetCardProps {
  summary: FleetSummary;
  aceRow?: Record<string, string | number> | null;
  onClick: () => void;
}

function StatRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-3 w-3 shrink-0 text-[rgba(232,237,248,0.3)]" />
      <span className="text-[11px] text-[rgba(232,237,248,0.45)] font-body">{label}</span>
      <span className="text-[11px] font-data font-semibold text-white tabular-nums ml-auto">{value}</span>
    </div>
  );
}

export function FleetCardSkeleton() {
  return (
    <div className="atlas-card rounded-xl p-5 space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="h-10 w-10 rounded-xl skeleton-shimmer" />
          <div className="space-y-1.5">
            <div className="h-4 w-32 rounded skeleton-shimmer" />
            <div className="h-3 w-20 rounded skeleton-shimmer" />
          </div>
        </div>
        <div className="h-5 w-16 rounded-full skeleton-shimmer" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-4 rounded skeleton-shimmer" />)}
      </div>
      <div className="h-1.5 rounded-full skeleton-shimmer" />
    </div>
  );
}

export default function FleetCard({ summary, aceRow, onClick }: FleetCardProps) {
  const { group } = summary;

  const distanceKm = aceRow ? Number(aceRow["total_distance_km"] ?? 0) : summary.totalDistanceKm;
  const tripCount  = aceRow ? Number(aceRow["trip_count"] ?? 0)        : summary.totalTrips;
  const activeRatio = summary.totalVehicles > 0 ? Math.round((summary.activeVehicles / summary.totalVehicles) * 100) : 0;
  const formattedDist = distanceKm >= 1000 ? `${(distanceKm / 1000).toFixed(1)}k km` : `${Math.round(distanceKm).toLocaleString()} km`;
  const accentColor   = group.color ?? "#f5a623";

  return (
    <button
      onClick={onClick}
      className="w-full text-left atlas-card rounded-xl p-5 hover:border-[rgba(245,166,35,0.3)] hover:bg-[rgba(245,166,35,0.03)] transition-all duration-150 group overflow-hidden relative"
    >
      {/* Hover amber top bar */}
      <div className="absolute top-0 left-0 right-0 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        style={{ background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)` }} />

      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: `${accentColor}12` }}>
            <Truck className="h-4.5 w-4.5" style={{ color: accentColor }} />
          </div>
          <div className="min-w-0">
            <p className="font-display font-bold text-sm text-white truncate">{group.name}</p>
            <p className="text-[11px] text-[rgba(232,237,248,0.4)] font-body">
              {group.vehicleCount} vehicle{group.vehicleCount !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] font-bold rounded-full px-2 py-0.5 font-body"
            style={{ background: `${accentColor}15`, color: accentColor, border: `1px solid ${accentColor}30` }}>
            {activeRatio}% active
          </span>
          <svg className="h-4 w-4 text-[rgba(232,237,248,0.25)] group-hover:text-[#f5a623] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>

      {/* Stats */}
      <div className="space-y-2">
        <StatRow icon={Truck}      label="Vehicles" value={`${summary.activeVehicles}/${summary.totalVehicles}`} />
        <StatRow icon={Activity}   label="Active"   value={`${activeRatio}%`} />
        <StatRow icon={Navigation} label="Distance" value={distanceKm > 0 ? formattedDist : "—"} />
        <StatRow icon={TrendingUp} label="Trips"    value={tripCount > 0 ? tripCount.toLocaleString() : "—"} />
      </div>

      {/* Activity bar */}
      <div className="mt-4">
        <div className="flex justify-between text-[10px] text-[rgba(232,237,248,0.35)] mb-1.5 font-body">
          <span>Active vehicles</span>
          <span className="font-data">{summary.activeVehicles} / {summary.totalVehicles}</span>
        </div>
        <div className="h-1 rounded-full bg-[rgba(255,255,255,0.07)] overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${activeRatio}%`, background: accentColor }}
          />
        </div>
      </div>
    </button>
  );
}

export function mergeAceDistanceData(
  fleets: FleetSummary[],
  aceInsight: AceInsight | null
): Map<string, Record<string, string | number>> {
  const map = new Map<string, Record<string, string | number>>();
  if (!aceInsight) return map;
  for (const row of aceInsight.rows) {
    const groupName = String(row["group_name"] ?? "");
    if (groupName) map.set(groupName.toLowerCase(), row);
  }
  const result = new Map<string, Record<string, string | number>>();
  for (const fleet of fleets) {
    const row = map.get(fleet.group.name.toLowerCase());
    if (row) result.set(fleet.group.id, row);
  }
  return result;
}

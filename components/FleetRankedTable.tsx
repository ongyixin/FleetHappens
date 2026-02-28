"use client";

import { useState } from "react";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import type { FleetSummary } from "@/types";

type SortKey = "name" | "vehicles" | "active" | "distance" | "trips" | "idle";
type SortDir = "asc" | "desc";

interface FleetRankedTableProps {
  fleets: FleetSummary[];
  aceRowById?: Map<string, Record<string, string | number>>;
  onSelectFleet: (groupId: string) => void;
}

function SortIcon({ column, current, direction }: { column: SortKey; current: SortKey; direction: SortDir }) {
  if (column !== current) return <ChevronsUpDown className="h-3 w-3 text-[rgba(232,237,248,0.25)]" />;
  return direction === "asc"
    ? <ChevronUp className="h-3 w-3 text-[#f5a623]" />
    : <ChevronDown className="h-3 w-3 text-[#f5a623]" />;
}

export function FleetRankedTableSkeleton() {
  return (
    <div className="atlas-card rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-[rgba(255,255,255,0.07)]">
        <div className="h-4 w-48 rounded skeleton-shimmer" />
      </div>
      <div className="divide-y divide-[rgba(255,255,255,0.05)]">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3">
            <div className="h-5 w-5 rounded skeleton-shimmer" />
            <div className="h-4 w-32 flex-1 rounded skeleton-shimmer" />
            <div className="h-4 w-14 rounded skeleton-shimmer" />
            <div className="h-4 w-14 rounded skeleton-shimmer" />
            <div className="h-4 w-20 rounded skeleton-shimmer" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function FleetRankedTable({ fleets, aceRowById, onSelectFleet }: FleetRankedTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("distance");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  function handleSort(key: SortKey) {
    if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  }

  const enriched = fleets.map((f) => {
    const aceRow = aceRowById?.get(f.group.id);
    return {
      ...f,
      displayDistance: aceRow ? Number(aceRow["total_distance_km"] ?? 0) : f.totalDistanceKm,
      displayTrips:    aceRow ? Number(aceRow["trip_count"] ?? 0)        : f.totalTrips,
      activeRatio: f.totalVehicles > 0 ? Math.round((f.activeVehicles / f.totalVehicles) * 100) : 0,
    };
  });

  const sorted = [...enriched].sort((a, b) => {
    let cmp = 0;
    if (sortKey === "name")     cmp = a.group.name.localeCompare(b.group.name);
    if (sortKey === "vehicles") cmp = a.totalVehicles - b.totalVehicles;
    if (sortKey === "active")   cmp = a.activeRatio - b.activeRatio;
    if (sortKey === "distance") cmp = a.displayDistance - b.displayDistance;
    if (sortKey === "trips")    cmp = a.displayTrips - b.displayTrips;
    if (sortKey === "idle")     cmp = a.avgIdlePct - b.avgIdlePct;
    return sortDir === "asc" ? cmp : -cmp;
  });

  const cols: { key: SortKey; label: string; align?: "right" }[] = [
    { key: "name",     label: "Fleet" },
    { key: "vehicles", label: "Vehicles", align: "right" },
    { key: "active",   label: "Active %", align: "right" },
    { key: "distance", label: "Distance",  align: "right" },
    { key: "trips",    label: "Trips",     align: "right" },
  ];

  return (
    <div className="atlas-card rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.03)]">
              <th className="px-4 py-3 text-left">
                <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-[rgba(232,237,248,0.3)] font-body">#</span>
              </th>
              {cols.map((col) => (
                <th key={col.key} className={`px-4 py-3 ${col.align === "right" ? "text-right" : "text-left"}`}>
                  <button
                    onClick={() => handleSort(col.key)}
                    className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.16em] text-[rgba(232,237,248,0.38)] hover:text-[rgba(232,237,248,0.7)] transition-colors font-body"
                  >
                    {col.label}
                    <SortIcon column={col.key} current={sortKey} direction={sortDir} />
                  </button>
                </th>
              ))}
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[rgba(255,255,255,0.05)]">
            {sorted.map((fleet, idx) => {
              const accentColor = fleet.group.color ?? "#f5a623";
              const formattedDist = fleet.displayDistance >= 1000
                ? `${(fleet.displayDistance / 1000).toFixed(1)}k km`
                : `${Math.round(fleet.displayDistance).toLocaleString()} km`;

              return (
                <tr
                  key={fleet.group.id}
                  onClick={() => onSelectFleet(fleet.group.id)}
                  className="hover:bg-[rgba(255,255,255,0.03)] transition-colors cursor-pointer group"
                >
                  <td className="px-4 py-3">
                    <span className="text-xs font-data font-bold text-[rgba(232,237,248,0.25)] tabular-nums w-5 inline-block">
                      {idx + 1}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className="h-2 w-2 rounded-full shrink-0" style={{ background: accentColor }} />
                      <span className="font-body font-semibold text-white">{fleet.group.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-data tabular-nums text-[rgba(232,237,248,0.55)]">
                    {fleet.totalVehicles}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-body font-bold"
                      style={{ background: `${accentColor}15`, color: accentColor }}>
                      {fleet.activeRatio}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-data tabular-nums font-semibold text-white">
                    {fleet.displayDistance > 0 ? formattedDist : "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-data tabular-nums text-[rgba(232,237,248,0.55)]">
                    {fleet.displayTrips > 0 ? fleet.displayTrips.toLocaleString() : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <svg className="h-4 w-4 text-[rgba(232,237,248,0.25)] group-hover:text-[#f5a623] transition-colors ml-auto"
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

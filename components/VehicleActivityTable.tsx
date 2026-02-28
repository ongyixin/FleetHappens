"use client";

import { useState } from "react";
import { ChevronUp, ChevronDown, ChevronsUpDown, Search } from "lucide-react";
import type { VehicleActivity, VehicleStatus } from "@/types";
import { formatDistanceToNow } from "date-fns";

type SortKey = "name" | "status" | "lastTrip" | "distance" | "trips";
type SortDir = "asc" | "desc";

interface VehicleActivityTableProps {
  vehicles: VehicleActivity[];
  onSelectVehicle: (vehicleId: string, vehicleName: string) => void;
}

const STATUS_ORDER: Record<VehicleStatus, number> = { active: 0, idle: 1, offline: 2 };

const STATUS_CONFIG: Record<VehicleStatus, { label: string; color: string; bg: string; border: string }> = {
  active:  { label: "Active",  color: "#34d399", bg: "rgba(52,211,153,0.1)",  border: "rgba(52,211,153,0.25)" },
  idle:    { label: "Idle",    color: "#f5a623", bg: "rgba(245,166,35,0.1)",  border: "rgba(245,166,35,0.25)" },
  offline: { label: "Offline", color: "rgba(232,237,248,0.4)", bg: "rgba(255,255,255,0.05)", border: "rgba(255,255,255,0.1)" },
};

function SortIcon({ column, current, direction }: { column: SortKey; current: SortKey; direction: SortDir }) {
  if (column !== current) return <ChevronsUpDown className="h-3 w-3 text-[rgba(232,237,248,0.25)]" />;
  return direction === "asc"
    ? <ChevronUp className="h-3 w-3 text-[#f5a623]" />
    : <ChevronDown className="h-3 w-3 text-[#f5a623]" />;
}

export function VehicleActivityTableSkeleton() {
  return (
    <div className="atlas-card rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-[rgba(255,255,255,0.07)] flex items-center gap-3">
        <div className="h-8 flex-1 rounded-lg skeleton-shimmer" />
      </div>
      <div className="divide-y divide-[rgba(255,255,255,0.05)]">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3">
            <div className="h-4 w-32 rounded skeleton-shimmer flex-1" />
            <div className="h-5 w-16 rounded-full skeleton-shimmer" />
            <div className="h-4 w-20 rounded skeleton-shimmer" />
            <div className="h-4 w-16 rounded skeleton-shimmer" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function VehicleActivityTable({ vehicles, onSelectVehicle }: VehicleActivityTableProps) {
  const [sortKey, setSortKey]   = useState<SortKey>("status");
  const [sortDir, setSortDir]   = useState<SortDir>("asc");
  const [searchQuery, setSearchQuery] = useState("");

  function handleSort(key: SortKey) {
    if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir(key === "status" ? "asc" : "desc"); }
  }

  const filtered = vehicles.filter((v) =>
    !searchQuery || v.vehicle.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0;
    if (sortKey === "name")     cmp = a.vehicle.name.localeCompare(b.vehicle.name);
    if (sortKey === "status")   cmp = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    if (sortKey === "lastTrip") cmp = new Date(a.lastTripEnd ?? 0).getTime() - new Date(b.lastTripEnd ?? 0).getTime();
    if (sortKey === "distance") cmp = (a.distanceTodayKm ?? 0) - (b.distanceTodayKm ?? 0);
    if (sortKey === "trips")    cmp = (a.tripCountToday ?? 0) - (b.tripCountToday ?? 0);
    return sortDir === "asc" ? cmp : -cmp;
  });

  const cols: { key: SortKey; label: string; align?: "right" }[] = [
    { key: "name",     label: "Vehicle" },
    { key: "status",   label: "Status" },
    { key: "lastTrip", label: "Last Seen", align: "right" },
    { key: "distance", label: "Distance (today)", align: "right" },
    { key: "trips",    label: "Trips (today)", align: "right" },
  ];

  return (
    <div className="atlas-card rounded-xl overflow-hidden">
      {/* Search toolbar */}
      <div className="px-4 py-3 border-b border-[rgba(255,255,255,0.07)] flex items-center gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[rgba(232,237,248,0.3)]" />
          <input
            type="text"
            placeholder="Search vehicles…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-8 bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-lg pl-9 pr-3 text-xs font-body text-white placeholder:text-[rgba(232,237,248,0.3)] focus:outline-none focus:border-[rgba(245,166,35,0.4)] focus:bg-[rgba(245,166,35,0.04)] transition-all"
          />
        </div>
        <span className="text-[10px] text-[rgba(232,237,248,0.35)] font-data shrink-0">
          {filtered.length} vehicles
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.02)]">
              {cols.map((col) => (
                <th key={col.key} className={`px-4 py-3 ${col.align === "right" ? "text-right" : "text-left"}`}>
                  <button
                    onClick={() => handleSort(col.key)}
                    className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.16em] text-[rgba(232,237,248,0.35)] hover:text-[rgba(232,237,248,0.65)] transition-colors font-body"
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
            {sorted.map((v) => {
              const sc = STATUS_CONFIG[v.status];
              return (
                <tr
                  key={v.vehicle.id}
                  onClick={() => onSelectVehicle(v.vehicle.id, v.vehicle.name)}
                  className="hover:bg-[rgba(255,255,255,0.03)] transition-colors cursor-pointer group"
                >
                  <td className="px-4 py-3">
                    <span className="font-body font-semibold text-white text-[13px]">{v.vehicle.name}</span>
                    {v.vehicle.deviceType && (
                      <p className="text-[10px] text-[rgba(232,237,248,0.35)] font-body">{v.vehicle.deviceType}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold font-body"
                      style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: sc.color }} />
                      {sc.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-[11px] font-data text-[rgba(232,237,248,0.45)]">
                    {v.lastTripEnd ? formatDistanceToNow(new Date(v.lastTripEnd), { addSuffix: true }) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-data tabular-nums font-semibold text-white text-[12px]">
                    {v.distanceTodayKm != null ? `${v.distanceTodayKm.toLocaleString()} km` : "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-data tabular-nums text-[rgba(232,237,248,0.55)] text-[12px]">
                    {v.tripCountToday != null ? v.tripCountToday.toLocaleString() : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <svg className="h-4 w-4 text-[rgba(232,237,248,0.2)] group-hover:text-[#f5a623] transition-colors ml-auto"
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

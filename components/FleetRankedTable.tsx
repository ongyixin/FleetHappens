"use client";

import { useState } from "react";
import { ChevronRight, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { FleetSummary } from "@/types";

type SortKey = "name" | "vehicles" | "active" | "distance" | "trips" | "idle";
type SortDir = "asc" | "desc";

interface FleetRankedTableProps {
  fleets: FleetSummary[];
  aceRowById?: Map<string, Record<string, string | number>>;
  onSelectFleet: (groupId: string) => void;
}

function SortIcon({
  column,
  current,
  direction,
}: {
  column: SortKey;
  current: SortKey;
  direction: SortDir;
}) {
  if (column !== current) {
    return <ChevronsUpDown className="h-3 w-3 text-muted-foreground/40" />;
  }
  return direction === "asc" ? (
    <ChevronUp className="h-3 w-3 text-fleet-blue" />
  ) : (
    <ChevronDown className="h-3 w-3 text-fleet-blue" />
  );
}

export function FleetRankedTableSkeleton() {
  return (
    <div className="bg-white border border-border rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="divide-y divide-border">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3">
            <Skeleton className="h-6 w-6 rounded-md" />
            <Skeleton className="h-4 w-32 flex-1" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function FleetRankedTable({
  fleets,
  aceRowById,
  onSelectFleet,
}: FleetRankedTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("distance");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const enriched = fleets.map((f) => {
    const aceRow = aceRowById?.get(f.group.id);
    return {
      ...f,
      displayDistance: aceRow
        ? Number(aceRow["total_distance_km"] ?? 0)
        : f.totalDistanceKm,
      displayTrips: aceRow
        ? Number(aceRow["trip_count"] ?? 0)
        : f.totalTrips,
      activeRatio:
        f.totalVehicles > 0
          ? Math.round((f.activeVehicles / f.totalVehicles) * 100)
          : 0,
    };
  });

  const sorted = [...enriched].sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case "name":
        cmp = a.group.name.localeCompare(b.group.name);
        break;
      case "vehicles":
        cmp = a.totalVehicles - b.totalVehicles;
        break;
      case "active":
        cmp = a.activeRatio - b.activeRatio;
        break;
      case "distance":
        cmp = a.displayDistance - b.displayDistance;
        break;
      case "trips":
        cmp = a.displayTrips - b.displayTrips;
        break;
      case "idle":
        cmp = a.avgIdlePct - b.avgIdlePct;
        break;
    }
    return sortDir === "asc" ? cmp : -cmp;
  });

  const cols: { key: SortKey; label: string; align?: "right" }[] = [
    { key: "name", label: "Fleet" },
    { key: "vehicles", label: "Vehicles", align: "right" },
    { key: "active", label: "Active %", align: "right" },
    { key: "distance", label: "Distance (7d)", align: "right" },
    { key: "trips", label: "Trips (7d)", align: "right" },
  ];

  return (
    <div className="bg-white border border-border rounded-xl overflow-hidden shadow-[0_1px_3px_rgba(14,36,64,0.04)]">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="px-4 py-3 text-left">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  #
                </span>
              </th>
              {cols.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "px-4 py-3",
                    col.align === "right" ? "text-right" : "text-left"
                  )}
                >
                  <button
                    onClick={() => handleSort(col.key)}
                    className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {col.label}
                    <SortIcon column={col.key} current={sortKey} direction={sortDir} />
                  </button>
                </th>
              ))}
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sorted.map((fleet, idx) => {
              const accentColor = fleet.group.color ?? "#1a56db";
              const formattedDist =
                fleet.displayDistance >= 1000
                  ? `${(fleet.displayDistance / 1000).toFixed(1)}k km`
                  : `${Math.round(fleet.displayDistance).toLocaleString()} km`;

              return (
                <tr
                  key={fleet.group.id}
                  onClick={() => onSelectFleet(fleet.group.id)}
                  className="hover:bg-muted/20 transition-colors cursor-pointer group"
                >
                  <td className="px-4 py-3">
                    <span className="text-xs font-bold text-muted-foreground tabular-nums w-5 inline-block">
                      {idx + 1}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: accentColor }}
                      />
                      <span className="font-semibold text-foreground">
                        {fleet.group.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                    {fleet.totalVehicles}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className="inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold"
                      style={{
                        backgroundColor: `${accentColor}15`,
                        color: accentColor,
                      }}
                    >
                      {fleet.activeRatio}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-medium text-foreground">
                    {fleet.displayDistance > 0 ? formattedDist : "—"}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                    {fleet.displayTrips > 0 ? fleet.displayTrips.toLocaleString() : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-fleet-blue transition-colors ml-auto" />
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

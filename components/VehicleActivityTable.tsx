"use client";

import { useState } from "react";
import {
  ChevronRight,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Circle,
  Search,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { VehicleActivity, VehicleStatus } from "@/types";
import { formatDistanceToNow } from "date-fns";

type SortKey = "name" | "status" | "lastTrip" | "distance" | "trips";
type SortDir = "asc" | "desc";

interface VehicleActivityTableProps {
  vehicles: VehicleActivity[];
  onSelectVehicle: (vehicleId: string, vehicleName: string) => void;
}

const STATUS_ORDER: Record<VehicleStatus, number> = {
  active: 0,
  idle: 1,
  offline: 2,
};

const STATUS_CONFIG: Record<
  VehicleStatus,
  { label: string; dotColor: string; badgeClass: string }
> = {
  active: {
    label: "Active",
    dotColor: "#059669",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  idle: {
    label: "Idle",
    dotColor: "#f59e0b",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
  },
  offline: {
    label: "Offline",
    dotColor: "#9ca3af",
    badgeClass: "bg-gray-50 text-gray-500 border-gray-200",
  },
};

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

export function VehicleActivityTableSkeleton() {
  return (
    <div className="bg-white border border-border rounded-xl overflow-hidden shadow-[0_1px_3px_rgba(14,36,64,0.04)]">
      <div className="px-4 py-3 border-b border-border flex items-center gap-3">
        <Skeleton className="h-8 flex-1 rounded-lg" />
        <Skeleton className="h-8 w-24 rounded-lg" />
      </div>
      <div className="divide-y divide-border">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3">
            <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
            <Skeleton className="h-4 w-36 flex-1" />
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-4 w-24 hidden sm:block" />
            <Skeleton className="h-4 w-16 hidden md:block" />
            <Skeleton className="h-4 w-12 hidden lg:block" />
            <Skeleton className="h-4 w-4" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function VehicleActivityTable({
  vehicles,
  onSelectVehicle,
}: VehicleActivityTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("status");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [search, setSearch] = useState("");

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "status" ? "asc" : "desc");
    }
  }

  const filtered = vehicles.filter((v) =>
    v.vehicle.name.toLowerCase().includes(search.toLowerCase())
  );

  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case "name":
        cmp = a.vehicle.name.localeCompare(b.vehicle.name);
        break;
      case "status":
        cmp = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
        break;
      case "lastTrip":
        cmp =
          (a.lastTripEnd ? new Date(a.lastTripEnd).getTime() : 0) -
          (b.lastTripEnd ? new Date(b.lastTripEnd).getTime() : 0);
        break;
      case "distance":
        cmp = (a.distanceTodayKm ?? 0) - (b.distanceTodayKm ?? 0);
        break;
      case "trips":
        cmp = (a.tripCountToday ?? 0) - (b.tripCountToday ?? 0);
        break;
    }
    return sortDir === "asc" ? cmp : -cmp;
  });

  const cols: { key: SortKey; label: string; align?: "right"; hidden?: string }[] = [
    { key: "name", label: "Vehicle" },
    { key: "status", label: "Status" },
    { key: "lastTrip", label: "Last Trip", hidden: "hidden sm:table-cell" },
    { key: "distance", label: "Distance (today)", align: "right", hidden: "hidden md:table-cell" },
    { key: "trips", label: "Trips (today)", align: "right", hidden: "hidden lg:table-cell" },
  ];

  const statusCounts = vehicles.reduce(
    (acc, v) => {
      acc[v.status] = (acc[v.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<VehicleStatus, number>
  );

  return (
    <div className="bg-white border border-border rounded-xl overflow-hidden shadow-[0_1px_3px_rgba(14,36,64,0.04)]">
      {/* Table toolbar */}
      <div className="px-4 py-3 border-b border-border flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search vehicles…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-border rounded-lg bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-fleet-blue/40"
          />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {(["active", "idle", "offline"] as VehicleStatus[]).map((s) => (
            <div key={s} className="flex items-center gap-1 text-xs">
              <Circle
                className="h-2 w-2 fill-current"
                style={{ color: STATUS_CONFIG[s].dotColor }}
              />
              <span className="text-muted-foreground tabular-nums">
                {statusCounts[s] ?? 0}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              {cols.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "px-4 py-3",
                    col.align === "right" ? "text-right" : "text-left",
                    col.hidden
                  )}
                >
                  <button
                    onClick={() => handleSort(col.key)}
                    className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {col.label}
                    <SortIcon
                      column={col.key}
                      current={sortKey}
                      direction={sortDir}
                    />
                  </button>
                </th>
              ))}
              <th className="px-4 py-3 w-8" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sorted.length === 0 && (
              <tr>
                <td
                  colSpan={cols.length + 1}
                  className="px-4 py-8 text-center text-sm text-muted-foreground"
                >
                  No vehicles found
                </td>
              </tr>
            )}
            {sorted.map((v) => {
              const cfg = STATUS_CONFIG[v.status];
              const lastSeen = v.lastTripEnd
                ? formatDistanceToNow(new Date(v.lastTripEnd), {
                    addSuffix: true,
                  })
                : v.vehicle.lastCommunication
                ? formatDistanceToNow(new Date(v.vehicle.lastCommunication), {
                    addSuffix: true,
                  })
                : "—";

              return (
                <tr
                  key={v.vehicle.id}
                  onClick={() =>
                    onSelectVehicle(v.vehicle.id, v.vehicle.name)
                  }
                  className="hover:bg-muted/20 transition-colors cursor-pointer group"
                >
                  {/* Name */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{ backgroundColor: cfg.dotColor }}
                      />
                      <span className="font-semibold text-foreground truncate max-w-[180px]">
                        {v.vehicle.name}
                      </span>
                    </div>
                  </td>
                  {/* Status */}
                  <td className="px-4 py-3">
                    <Badge
                      className={cn(
                        "text-xs font-medium border",
                        cfg.badgeClass
                      )}
                    >
                      {cfg.label}
                    </Badge>
                  </td>
                  {/* Last trip */}
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                    {lastSeen}
                  </td>
                  {/* Distance */}
                  <td className="px-4 py-3 text-right tabular-nums font-medium hidden md:table-cell">
                    {v.distanceTodayKm != null && v.distanceTodayKm > 0
                      ? `${v.distanceTodayKm} km`
                      : <span className="text-muted-foreground">—</span>}
                  </td>
                  {/* Trip count */}
                  <td className="px-4 py-3 text-right tabular-nums text-muted-foreground hidden lg:table-cell">
                    {v.tripCountToday != null && v.tripCountToday > 0
                      ? v.tripCountToday
                      : "—"}
                  </td>
                  {/* Arrow */}
                  <td className="px-4 py-3">
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-fleet-blue transition-colors" />
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

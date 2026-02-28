"use client";

import { ChevronRight, Truck, Activity, Navigation, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { FleetSummary, AceInsight } from "@/types";

interface FleetCardProps {
  summary: FleetSummary;
  aceRow?: Record<string, string | number> | null;
  onClick: () => void;
}

function StatPill({
  icon: Icon,
  label,
  value,
  className,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-1.5 text-xs", className)}>
      <Icon className="h-3 w-3 shrink-0 text-muted-foreground" />
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold text-foreground tabular-nums">{value}</span>
    </div>
  );
}

export function FleetCardSkeleton() {
  return (
    <div className="bg-white border border-border rounded-xl p-5 space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-8 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-2 rounded-full" />
    </div>
  );
}

export default function FleetCard({ summary, aceRow, onClick }: FleetCardProps) {
  const { group } = summary;

  const distanceKm = aceRow
    ? Number(aceRow["total_distance_km"] ?? 0)
    : summary.totalDistanceKm;
  const tripCount = aceRow
    ? Number(aceRow["trip_count"] ?? 0)
    : summary.totalTrips;

  const activeRatio =
    summary.totalVehicles > 0
      ? Math.round((summary.activeVehicles / summary.totalVehicles) * 100)
      : 0;

  const formattedDist =
    distanceKm >= 1000
      ? `${(distanceKm / 1000).toFixed(1)}k km`
      : `${Math.round(distanceKm).toLocaleString()} km`;

  const accentColor = group.color ?? "#1a56db";

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white border border-border rounded-xl p-5 shadow-[0_1px_3px_rgba(14,36,64,0.04)] hover:border-fleet-blue/40 hover:shadow-[0_2px_8px_rgba(26,86,219,0.08)] transition-all duration-150 group"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${accentColor}18` }}
          >
            <Truck className="h-4 w-4" style={{ color: accentColor }} />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm text-fleet-navy truncate">
              {group.name}
            </p>
            <p className="text-xs text-muted-foreground">
              {group.vehicleCount} vehicle{group.vehicleCount !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge
            variant="secondary"
            className="text-xs font-semibold"
            style={{
              backgroundColor: `${accentColor}12`,
              color: accentColor,
              borderColor: `${accentColor}30`,
            }}
          >
            {activeRatio}% active
          </Badge>
          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-fleet-blue transition-colors" />
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-y-2.5 gap-x-4">
        <StatPill
          icon={Truck}
          label="Vehicles"
          value={`${summary.activeVehicles}/${summary.totalVehicles}`}
        />
        <StatPill
          icon={Activity}
          label="Active"
          value={`${activeRatio}%`}
        />
        <StatPill
          icon={Navigation}
          label="Dist."
          value={distanceKm > 0 ? formattedDist : "—"}
        />
        <StatPill
          icon={TrendingUp}
          label="Trips"
          value={tripCount > 0 ? tripCount.toLocaleString() : "—"}
        />
      </div>

      {/* Active vehicle bar */}
      <div className="mt-4">
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span>Active vehicles</span>
          <span>{summary.activeVehicles} of {summary.totalVehicles}</span>
        </div>
        <div className="h-1.5 rounded-full bg-muted/50 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${activeRatio}%`,
              backgroundColor: accentColor,
            }}
          />
        </div>
      </div>
    </button>
  );
}

/** Merge Ace distance-by-group rows into FleetSummary array. */
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

  // Try to match by name (case-insensitive)
  const result = new Map<string, Record<string, string | number>>();
  for (const fleet of fleets) {
    const row = map.get(fleet.group.name.toLowerCase());
    if (row) result.set(fleet.group.id, row);
  }

  return result;
}

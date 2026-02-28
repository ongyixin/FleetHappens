"use client";

import { Truck, Brain, Radio, Loader2, Navigation, RotateCcw, TrendingUp, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { AceInsight } from "@/types";

interface VehicleOutliersCardProps {
  insight: AceInsight | null;
  loading?: boolean;
  onSelectVehicle?: (vehicleName: string) => void;
}

export function VehicleOutliersCardSkeleton() {
  return (
    <div className="bg-white border border-border rounded-xl p-4 shadow-[0_1px_3px_rgba(14,36,64,0.04)]">
      <div className="flex items-center gap-2 mb-4">
        <Skeleton className="h-7 w-7 rounded-lg" />
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-5 w-12 rounded-full ml-auto" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-border">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-4 w-4" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function VehicleOutliersCard({
  insight,
  loading,
  onSelectVehicle,
}: VehicleOutliersCardProps) {
  if (loading) return <VehicleOutliersCardSkeleton />;

  if (!insight || insight.rows.length === 0) {
    return (
      <div className="bg-white border border-border rounded-xl p-4 shadow-[0_1px_3px_rgba(14,36,64,0.04)]">
        <div className="flex items-center gap-2 mb-3">
          <div className="rounded-lg bg-fleet-teal/10 p-1.5">
            <Brain className="h-3.5 w-3.5 text-fleet-teal" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">Vehicle Outliers</h3>
        </div>
        <p className="text-xs text-muted-foreground py-4 text-center">
          No outlier data available
        </p>
      </div>
    );
  }

  // The Ace insight has rows sorted by distance descending.
  // Top vehicle = row 0 (most distance)
  // Most idle = highest avg_idle_pct
  // Most trips = highest trip_count

  const rows = insight.rows.slice(0, 5);

  const topDistance = rows[0];
  const topIdle = [...rows].sort(
    (a, b) => Number(b["avg_idle_pct"] ?? 0) - Number(a["avg_idle_pct"] ?? 0)
  )[0];
  const topTrips = [...rows].sort(
    (a, b) => Number(b["trip_count"] ?? 0) - Number(a["trip_count"] ?? 0)
  )[0];

  const outliers = [
    {
      label: "Most Distance",
      icon: Navigation,
      color: "#1a56db",
      bg: "rgb(239 246 255)",
      row: topDistance,
      metricKey: "total_distance_km",
      metricSuffix: " km",
      metricFormat: (v: number) => Math.round(v).toLocaleString(),
    },
    {
      label: "Most Idle",
      icon: RotateCcw,
      color: "#ea7c1e",
      bg: "rgb(255 247 237)",
      row: topIdle,
      metricKey: "avg_idle_pct",
      metricSuffix: "% idle",
      metricFormat: (v: number) => v.toFixed(1),
    },
    {
      label: "Most Trips",
      icon: TrendingUp,
      color: "#059669",
      bg: "rgb(236 253 245)",
      row: topTrips,
      metricKey: "trip_count",
      metricSuffix: " trips",
      metricFormat: (v: number) => Math.round(v).toString(),
    },
  ];

  return (
    <div className="bg-white border border-border rounded-xl p-4 shadow-[0_1px_3px_rgba(14,36,64,0.04)]">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="rounded-lg bg-fleet-teal/10 p-1.5 shrink-0">
          <Brain className="h-3.5 w-3.5 text-fleet-teal" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-foreground">Vehicle Outliers</h3>
          <p className="text-xs text-muted-foreground">Standout vehicles this week</p>
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

      {/* Outlier rows */}
      <div className="space-y-2.5">
        {outliers.map(({ label, icon: Icon, color, bg, row, metricKey, metricSuffix, metricFormat }) => {
          const name = String(row["device_name"] ?? "—");
          const rawValue = Number(row[metricKey] ?? 0);
          const formattedValue = metricFormat(rawValue) + metricSuffix;

          return (
            <div
              key={label}
              onClick={() => onSelectVehicle?.(name)}
              className={
                onSelectVehicle
                  ? "flex items-center gap-3 p-3 rounded-lg border border-border hover:border-fleet-blue/40 hover:bg-muted/10 cursor-pointer group transition-colors"
                  : "flex items-center gap-3 p-3 rounded-lg border border-border"
              }
            >
              <div
                className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ backgroundColor: bg }}
              >
                <Icon className="h-3.5 w-3.5" style={{ color }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-foreground truncate">
                    {name}
                  </p>
                  <span
                    className="text-xs font-bold tabular-nums shrink-0"
                    style={{ color }}
                  >
                    {formattedValue}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {label}
                </p>
              </div>
              {onSelectVehicle && (
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-fleet-blue transition-colors shrink-0" />
              )}
            </div>
          );
        })}
      </div>

      {/* All vehicles sub-section */}
      {rows.length > 1 && (
        <div className="mt-4 pt-3 border-t border-border">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            All top vehicles
          </p>
          <div className="space-y-1.5">
            {rows.map((row, i) => (
              <div
                key={i}
                onClick={() => onSelectVehicle?.(String(row["device_name"] ?? ""))}
                className={cn(
                  "flex items-center gap-2 text-xs",
                  onSelectVehicle ? "cursor-pointer hover:text-fleet-blue group" : ""
                )}
              >
                <span className="text-muted-foreground w-4 tabular-nums shrink-0">
                  {i + 1}.
                </span>
                <Truck className="h-3 w-3 text-muted-foreground shrink-0" />
                <span className="font-medium text-foreground flex-1 truncate group-hover:text-fleet-blue transition-colors">
                  {String(row["device_name"] ?? "—")}
                </span>
                <span className="tabular-nums text-muted-foreground">
                  {Math.round(Number(row["total_distance_km"] ?? 0)).toLocaleString()} km
                </span>
                <span className="tabular-nums text-muted-foreground">
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


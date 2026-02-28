"use client";

import { Truck, Activity, Navigation, RotateCcw, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { CompanyPulseSummary, AceInsight } from "@/types";

interface KpiCardProps {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  iconColor?: string;
  iconBg?: string;
}

function KpiCard({ icon: Icon, label, value, sub, iconColor, iconBg }: KpiCardProps) {
  return (
    <div className="bg-white border border-border rounded-xl p-4 shadow-[0_1px_3px_rgba(14,36,64,0.04)] flex items-center gap-4 flex-1 min-w-0">
      <div
        className="rounded-lg p-2.5 shrink-0"
        style={{ backgroundColor: iconBg ?? "rgb(239 246 255)" }}
      >
        <Icon className="h-4 w-4" style={{ color: iconColor ?? "#1a56db" }} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground truncate">{label}</p>
        <p className="text-xl font-bold text-fleet-navy tabular-nums leading-tight">
          {value}
        </p>
        {sub && (
          <p className="text-xs text-muted-foreground truncate">{sub}</p>
        )}
      </div>
    </div>
  );
}

export function FleetPulseSummaryStripSkeleton() {
  return (
    <div className="flex gap-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="bg-white border border-border rounded-xl p-4 flex-1 flex items-center gap-4"
        >
          <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
          <div className="space-y-1.5 flex-1">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-6 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

interface FleetPulseSummaryStripProps {
  summary: CompanyPulseSummary;
  aceInsight?: AceInsight | null;
}

export default function FleetPulseSummaryStrip({
  summary,
  aceInsight,
}: FleetPulseSummaryStripProps) {
  const { totals } = summary;

  // Merge Ace totals into displayed values if available
  let distanceKm = totals.distanceKm;
  let trips = totals.trips;
  let avgIdlePct = totals.avgIdlePct;

  if (aceInsight && aceInsight.rows.length > 0) {
    distanceKm = aceInsight.rows.reduce(
      (sum, r) => sum + Number(r["total_distance_km"] ?? 0),
      0
    );
    trips = aceInsight.rows.reduce(
      (sum, r) => sum + Number(r["trip_count"] ?? 0),
      0
    );
  }

  const activeRatio =
    totals.vehicles > 0
      ? Math.round((totals.activeVehicles / totals.vehicles) * 100)
      : 0;

  const formattedDistance =
    distanceKm >= 1000
      ? `${(distanceKm / 1000).toFixed(1)}k km`
      : `${Math.round(distanceKm).toLocaleString()} km`;

  return (
    <div className="flex gap-3 flex-wrap sm:flex-nowrap">
      <KpiCard
        icon={Truck}
        label="Total Vehicles"
        value={totals.vehicles.toString()}
        sub={`${totals.activeVehicles} active`}
        iconColor="#1a56db"
        iconBg="rgb(239 246 255)"
      />
      <KpiCard
        icon={Activity}
        label="Active Today"
        value={`${totals.activeVehicles}`}
        sub={`${activeRatio}% of fleet`}
        iconColor="#059669"
        iconBg="rgb(236 253 245)"
      />
      <KpiCard
        icon={Navigation}
        label="Distance (7d)"
        value={distanceKm > 0 ? formattedDistance : "—"}
        sub={aceInsight ? "via Ace" : "loading…"}
        iconColor="#0e2440"
        iconBg="rgb(239 241 245)"
      />
      <KpiCard
        icon={TrendingUp}
        label="Trips (7d)"
        value={trips > 0 ? trips.toLocaleString() : "—"}
        sub={aceInsight ? "all fleets" : "loading…"}
        iconColor="#f59e0b"
        iconBg="rgb(255 251 235)"
      />
      <KpiCard
        icon={RotateCcw}
        label="Avg Idle %"
        value={avgIdlePct > 0 ? `${avgIdlePct.toFixed(1)}%` : "—"}
        sub={aceInsight ? "fleet average" : "loading…"}
        iconColor="#ea7c1e"
        iconBg="rgb(255 247 237)"
      />
    </div>
  );
}

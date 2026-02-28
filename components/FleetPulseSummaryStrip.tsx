"use client";

import { Truck, Activity, Navigation, RotateCcw, TrendingUp } from "lucide-react";
import type { CompanyPulseSummary, AceInsight } from "@/types";

interface KpiCardProps {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  accentColor: string;
  accentBg: string;
}

function KpiCard({ icon: Icon, label, value, sub, accentColor, accentBg }: KpiCardProps) {
  return (
    <div className="atlas-card rounded-xl p-4 flex items-center gap-3.5 flex-1 min-w-0 animate-fade-up">
      <div className="rounded-xl p-2.5 shrink-0" style={{ background: accentBg }}>
        <Icon className="h-4 w-4" style={{ color: accentColor }} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[rgba(232,237,248,0.38)] font-body truncate">{label}</p>
        <p className="text-2xl font-display font-bold text-white tabular-nums leading-tight">{value}</p>
        {sub && <p className="text-[11px] text-[rgba(232,237,248,0.4)] font-body truncate">{sub}</p>}
      </div>
    </div>
  );
}

export function FleetPulseSummaryStripSkeleton() {
  return (
    <div className="flex gap-3 flex-wrap sm:flex-nowrap">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="atlas-card rounded-xl p-4 flex-1 flex items-center gap-3.5">
          <div className="h-10 w-10 rounded-xl skeleton-shimmer shrink-0" />
          <div className="space-y-2 flex-1">
            <div className="h-2.5 w-20 rounded skeleton-shimmer" />
            <div className="h-6 w-14 rounded skeleton-shimmer" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function FleetPulseSummaryStrip({ summary, aceInsight }: { summary: CompanyPulseSummary; aceInsight?: AceInsight | null }) {
  const { totals } = summary;

  let distanceKm = totals.distanceKm;
  let trips      = totals.trips;
  const avgIdlePct = totals.avgIdlePct;

  if (aceInsight && aceInsight.rows.length > 0) {
    distanceKm = aceInsight.rows.reduce((sum, r) => sum + Number(r["total_distance_km"] ?? 0), 0);
    trips      = aceInsight.rows.reduce((sum, r) => sum + Number(r["trip_count"] ?? 0), 0);
  }

  const activeRatio = totals.vehicles > 0 ? Math.round((totals.activeVehicles / totals.vehicles) * 100) : 0;
  const formattedDistance = distanceKm >= 1000 ? `${(distanceKm / 1000).toFixed(1)}k km` : `${Math.round(distanceKm).toLocaleString()} km`;

  return (
    <div className="flex gap-3 flex-wrap sm:flex-nowrap stagger">
      <KpiCard icon={Truck}      label="Total Vehicles" value={totals.vehicles.toString()} sub={`${totals.activeVehicles} active`}   accentColor="#38bdf8"  accentBg="rgba(56,189,248,0.1)" />
      <KpiCard icon={Activity}   label="Active Today"   value={`${totals.activeVehicles}`}  sub={`${activeRatio}% of fleet`}          accentColor="#34d399"  accentBg="rgba(52,211,153,0.1)" />
      <KpiCard icon={Navigation} label="Distance (7d)"  value={distanceKm > 0 ? formattedDistance : "—"} sub={aceInsight ? "via Ace" : "loading…"} accentColor="#f5a623"  accentBg="rgba(245,166,35,0.1)" />
      <KpiCard icon={TrendingUp} label="Trips (7d)"     value={trips > 0 ? trips.toLocaleString() : "—"} sub={aceInsight ? "all fleets" : "loading…"} accentColor="#f5a623" accentBg="rgba(245,166,35,0.08)" />
      <KpiCard icon={RotateCcw}  label="Avg Idle %"     value={avgIdlePct > 0 ? `${avgIdlePct.toFixed(1)}%` : "—"} sub="fleet average" accentColor="#fb923c" accentBg="rgba(251,146,60,0.1)" />
    </div>
  );
}

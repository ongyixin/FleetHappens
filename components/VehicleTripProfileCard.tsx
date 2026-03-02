"use client";

/**
 * VehicleTripProfileCard
 *
 * Vehicle-specific intelligence card showing trip statistics, distance trends,
 * and daily patterns computed from the vehicle's own TripSummary records.
 *
 * Two modes:
 *   compact — KPI row + mini bar chart of recent trips (for column grid)
 *   expanded — full KPI tiles, trend line, day-of-week breakdown, trip table
 */

import { useMemo, useState, useEffect } from "react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis,
  ResponsiveContainer, Tooltip, CartesianGrid, Cell,
} from "recharts";
import { Route, TrendingUp, Clock, Gauge } from "lucide-react";
import type { TripSummary } from "@/types";
import { computeTripProfile, type TripProfileResult } from "@/lib/vehicle/analytics";
import { cn } from "@/lib/utils";

// ─── Colors ───────────────────────────────────────────────────────────────────

const ACCENT  = "#2dd4bf";       // teal
const ACCENT2 = "#38bdf8";       // sky
const DIM     = "rgba(232,237,248,0.35)";
const DIMMER  = "rgba(232,237,248,0.18)";

// ─── KPI tile ─────────────────────────────────────────────────────────────────

function KpiPill({
  icon: Icon, label, value, sub, color,
}: {
  icon: React.ElementType; label: string; value: string | number;
  sub?: string; color?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-1 mb-0.5">
        <Icon className="h-2.5 w-2.5" style={{ color: color ?? ACCENT }} />
        <span className="text-xs font-bold uppercase tracking-[0.13em] font-body" style={{ color: DIMMER }}>
          {label}
        </span>
      </div>
      <span className="text-[18px] font-bold font-data leading-none" style={{ color: color ?? ACCENT }}>
        {value}
      </span>
      {sub && <span className="text-sm font-body" style={{ color: DIM }}>{sub}</span>}
    </div>
  );
}

// ─── Compact card ─────────────────────────────────────────────────────────────

function CompactView({ data }: { data: TripProfileResult }) {
  const [animated, setAnimated] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 60);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="p-3.5 space-y-3">
      {/* KPI row */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        <KpiPill icon={Route}     label="Total km"   value={`${data.totalDistanceKm.toLocaleString()}`} sub="km driven"    />
        <KpiPill icon={TrendingUp} label="Trips"     value={data.totalTrips}      sub="recorded"       color={ACCENT2}    />
        <KpiPill icon={Gauge}      label="Avg trip"  value={`${data.avgDistanceKm}`} sub="km / trip"   />
        <KpiPill icon={Clock}      label="Drive time" value={`${Math.round(data.totalDrivingMinutes / 60)}h`} sub={`${data.avgIdleRatioPct}% idle`} color={ACCENT2} />
      </div>

      {/* Mini distance bar chart */}
      {data.recentTrips.length > 0 && (
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] mb-1.5 font-body" style={{ color: DIMMER }}>
            Recent trips · km
          </p>
          <ResponsiveContainer width="100%" height={52}>
            <BarChart data={[...data.recentTrips].reverse()} barSize={8} margin={{ top: 0, right: 0, left: -28, bottom: 0 }}>
              <YAxis tick={false} axisLine={false} tickLine={false} />
              <XAxis dataKey="label" tick={{ fill: DIMMER, fontSize: 8, fontFamily: "var(--font-jetbrains-mono)" }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: "#101318", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, fontSize: 10, fontFamily: "var(--font-dm-sans)", color: "rgba(232,237,248,0.9)" }}
                formatter={(v: number) => [`${v} km`, "Distance"]}
                labelStyle={{ color: DIM }}
              />
              <Bar dataKey="km" radius={[2, 2, 0, 0]}>
                {data.recentTrips.map((_, i) => (
                  <Cell key={i} fill={i === 0 ? ACCENT : `rgba(45,212,191,${animated ? 0.35 : 0})`}
                    style={{ transition: `fill 400ms ${i * 40}ms` }}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {data.totalTrips === 0 && (
        <p className="text-sm text-[rgba(232,237,248,0.3)] font-body text-center py-2">No trip data available</p>
      )}
    </div>
  );
}

// ─── Expanded card ─────────────────────────────────────────────────────────────

function ExpandedView({ data }: { data: TripProfileResult }) {
  return (
    <div className="space-y-5">
      {/* KPI grid */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Total Distance", value: `${data.totalDistanceKm.toLocaleString()} km`,  sub: `${data.totalTrips} trips`, icon: Route,     color: ACCENT  },
          { label: "Avg Trip",       value: `${data.avgDistanceKm} km`,                     sub: `median ${data.medianDistanceKm} km`,  icon: TrendingUp, color: ACCENT2 },
          { label: "Drive Time",     value: `${Math.round(data.totalDrivingMinutes / 60)}h ${data.totalDrivingMinutes % 60}m`, sub: `${data.avgDrivingMinutes} min avg`, icon: Clock, color: ACCENT },
          { label: "Idle Ratio",     value: `${data.avgIdleRatioPct}%`,                     sub: `${Math.round(data.totalIdlingMinutes / 60)}h total idle`, icon: Gauge, color: data.avgIdleRatioPct > 25 ? "#fb923c" : ACCENT2 },
        ].map(({ label, value, sub, icon: Icon, color }) => (
          <div key={label} className="atlas-card rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <Icon className="h-3 w-3" style={{ color }} />
              <span className="text-xs font-bold uppercase tracking-[0.13em] font-body" style={{ color: DIMMER }}>{label}</span>
            </div>
            <div className="text-[20px] font-bold font-data leading-none mb-1" style={{ color }}>{value}</div>
            <div className="text-sm font-body" style={{ color: DIM }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* Daily distance trend */}
      {data.dailyDistance.length > 1 && (
        <div className="atlas-card rounded-xl p-4">
          <p className="text-xs font-bold uppercase tracking-[0.13em] font-body mb-3" style={{ color: DIMMER }}>
            Daily Distance Trend
          </p>
          <ResponsiveContainer width="100%" height={120}>
            <LineChart data={data.dailyDistance} margin={{ top: 4, right: 8, left: -28, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="date" tick={{ fill: DIMMER, fontSize: 9, fontFamily: "var(--font-jetbrains-mono)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: DIMMER, fontSize: 9, fontFamily: "var(--font-jetbrains-mono)" }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: "#101318", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, fontSize: 11, fontFamily: "var(--font-dm-sans)", color: "rgba(232,237,248,0.9)" }}
                formatter={(v: number, name: string) => [name === "km" ? `${v} km` : v, name === "km" ? "Distance" : "Trips"]}
                labelStyle={{ color: DIM }}
              />
              <Line type="monotone" dataKey="km" stroke={ACCENT} strokeWidth={2} dot={false} activeDot={{ r: 4, fill: ACCENT, strokeWidth: 0 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Day-of-week breakdown */}
      {data.byDayOfWeek.some((d) => d.tripCount > 0) && (
        <div className="atlas-card rounded-xl p-4">
          <p className="text-xs font-bold uppercase tracking-[0.13em] font-body mb-3" style={{ color: DIMMER }}>
            Avg Distance by Day of Week
          </p>
          <ResponsiveContainer width="100%" height={100}>
            <BarChart data={data.byDayOfWeek} barSize={22} margin={{ top: 0, right: 0, left: -28, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: DIMMER, fontSize: 9, fontFamily: "var(--font-jetbrains-mono)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: DIMMER, fontSize: 9, fontFamily: "var(--font-jetbrains-mono)" }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: "#101318", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, fontSize: 11, fontFamily: "var(--font-dm-sans)", color: "rgba(232,237,248,0.9)" }}
                formatter={(v: number) => [`${v} km`, "Avg distance"]}
                labelStyle={{ color: DIM }}
              />
              <Bar dataKey="avgKm" radius={[3, 3, 0, 0]}>
                {data.byDayOfWeek.map((d, i) => {
                  const isWeekend = i === 0 || i === 6;
                  return <Cell key={i} fill={isWeekend ? `rgba(56,189,248,0.5)` : `rgba(45,212,191,0.6)`} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-3 mt-2">
            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm" style={{ background: "rgba(45,212,191,0.6)" }} /><span className="text-sm font-body" style={{ color: DIM }}>Weekdays</span></div>
            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm" style={{ background: "rgba(56,189,248,0.5)" }} /><span className="text-sm font-body" style={{ color: DIM }}>Weekends</span></div>
          </div>
        </div>
      )}

      {/* Recent trips table */}
      {data.recentTrips.length > 0 && (
        <div className="atlas-card rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-[rgba(255,255,255,0.06)]">
            <p className="text-xs font-bold uppercase tracking-[0.13em] font-body" style={{ color: DIMMER }}>Recent Trips</p>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-[rgba(255,255,255,0.04)]">
                {["Date", "Distance", "Drive Time", "Idle"].map((h) => (
                  <th key={h} className="px-4 py-2 text-left text-xs font-bold uppercase tracking-[0.12em] font-body" style={{ color: DIMMER }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.recentTrips.map((t, i) => (
                <tr key={i} className="border-b border-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                  <td className="px-4 py-2 text-sm font-data" style={{ color: DIM }}>{t.date}</td>
                  <td className="px-4 py-2 text-[12px] font-bold font-data" style={{ color: ACCENT }}>{t.km} km</td>
                  <td className="px-4 py-2 text-sm font-data" style={{ color: DIM }}>{t.drivingMin}m</td>
                  <td className="px-4 py-2 text-sm font-data" style={{ color: t.idleMin > 15 ? "#fb923c" : DIM }}>{t.idleMin}m</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface VehicleTripProfileCardProps {
  trips: TripSummary[];
  expanded?: boolean;
}

export default function VehicleTripProfileCard({ trips, expanded = false }: VehicleTripProfileCardProps) {
  const data = useMemo(() => computeTripProfile(trips), [trips]);

  return (
    <div
      className={cn(
        "rounded-xl border overflow-hidden h-full",
        "bg-[#0d1117] border-[rgba(45,212,191,0.14)]",
        expanded && "w-full",
      )}
    >
      {/* Ambient glow */}
      <div className="absolute -top-10 -left-10 w-40 h-40 rounded-full bg-[#2dd4bf] opacity-[0.03] blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 px-3.5 pt-3 pb-2.5 border-b border-[rgba(45,212,191,0.09)]">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-[rgba(45,212,191,0.1)] flex items-center justify-center shrink-0">
            <Route className="w-3.5 h-3.5 text-[#2dd4bf]" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-sm font-bold font-display text-white">Trip Profile</span>
            <span className="text-sm font-body ml-1.5" style={{ color: "rgba(45,212,191,0.65)" }}>
              {data.totalTrips} trips
            </span>
          </div>
          <span className="text-sm font-bold font-data uppercase tracking-wider px-1.5 py-0.5 rounded border" style={{ color: "rgba(45,212,191,0.7)", borderColor: "rgba(45,212,191,0.2)", background: "rgba(45,212,191,0.06)" }}>
            Vehicle
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="relative z-10">
        {expanded ? <ExpandedView data={data} /> : <CompactView data={data} />}
      </div>

      {/* Footer line */}
      <div className="h-px bg-gradient-to-r from-transparent via-[rgba(45,212,191,0.2)] to-transparent" />
    </div>
  );
}

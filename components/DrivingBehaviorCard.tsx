"use client";

/**
 * DrivingBehaviorCard
 *
 * Vehicle-specific intelligence card analyzing speed, idle patterns, and
 * departure time distributions from the vehicle's own trip records.
 *
 * Visual identity: amber/orange warns of elevated idle/speed, sky-blue
 * for healthy metrics. Industrial gauge aesthetic — numbers that feel
 * like they belong on a dashboard instrument cluster.
 */

import { useMemo, useState, useEffect } from "react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis,
  ResponsiveContainer, Tooltip, CartesianGrid, Cell, ReferenceLine,
} from "recharts";
import { Gauge, Zap, Clock3, AlertTriangle } from "lucide-react";
import type { TripSummary } from "@/types";
import { computeDrivingBehavior } from "@/lib/vehicle/analytics";
import { cn } from "@/lib/utils";

// ─── Colors ───────────────────────────────────────────────────────────────────

const ACCENT   = "#f5a623";       // amber — matches existing fleet intelligence amber
const ACCENT2  = "#38bdf8";       // sky
const WARN     = "#fb923c";       // orange
const DIM      = "rgba(232,237,248,0.35)";
const DIMMER   = "rgba(232,237,248,0.18)";

function speedColor(speed: number): string {
  if (speed > 100) return WARN;
  if (speed > 80)  return ACCENT;
  return ACCENT2;
}

// ─── Compact gauge bar ────────────────────────────────────────────────────────

function GaugeBar({ value, max, color, label }: { value: number; max: number; color: string; label: string }) {
  const [animated, setAnimated] = useState(false);
  useEffect(() => { const t = setTimeout(() => setAnimated(true), 80); return () => clearTimeout(t); }, []);
  const pct = Math.min(100, (value / max) * 100);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-sm font-body uppercase tracking-[0.12em]" style={{ color: DIMMER }}>{label}</span>
        <span className="text-sm font-bold font-data" style={{ color }}>{value}</span>
      </div>
      <div className="h-1.5 bg-[rgba(255,255,255,0.06)] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: animated ? `${pct}%` : "0%", background: color }}
        />
      </div>
    </div>
  );
}

// ─── Compact card ─────────────────────────────────────────────────────────────

function CompactView({ data }: { data: ReturnType<typeof computeDrivingBehavior> }) {
  return (
    <div className="p-3.5 space-y-3">
      {/* Speed & idle gauges */}
      <div className="space-y-2">
        <GaugeBar value={data.avgSpeedKmh}        max={120} color={speedColor(data.avgSpeedKmh)}   label="Avg speed km/h" />
        <GaugeBar value={data.maxSpeedKmh}        max={160} color={speedColor(data.maxSpeedKmh)}   label="Peak speed km/h" />
        <GaugeBar value={data.fleetIdleRatioPct}  max={50}  color={data.fleetIdleRatioPct > 25 ? WARN : ACCENT2} label="Idle ratio %" />
      </div>

      {/* Alert badges */}
      <div className="flex flex-wrap gap-1.5">
        {data.highSpeedTripCount > 0 && (
          <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-[rgba(251,146,60,0.08)] border border-[rgba(251,146,60,0.2)]">
            <AlertTriangle className="h-2.5 w-2.5 text-[#fb923c]" />
            <span className="text-sm font-bold font-data text-[#fb923c]">{data.highSpeedTripCount}</span>
            <span className="text-sm font-body" style={{ color: DIM }}>high-speed trips</span>
          </div>
        )}
        {data.fleetIdleRatioPct > 20 && (
          <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-[rgba(245,166,35,0.07)] border border-[rgba(245,166,35,0.18)]">
            <Clock3 className="h-2.5 w-2.5 text-[#f5a623]" />
            <span className="text-sm font-body text-[#f5a623]">High idle detected</span>
          </div>
        )}
      </div>

      {/* Mini departure hour chart */}
      {data.departureByHour.some((h) => h.count > 0) && (
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] mb-1.5 font-body" style={{ color: DIMMER }}>
            Departures by hour
          </p>
          <ResponsiveContainer width="100%" height={40}>
            <BarChart data={data.departureByHour} barSize={5} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
              <XAxis dataKey="label" hide />
              <Bar dataKey="count" radius={[1, 1, 0, 0]}>
                {data.departureByHour.map((h, i) => (
                  <Cell key={i} fill={h.count > 0 ? `rgba(245,166,35,${Math.max(0.15, Math.min(0.9, h.count * 0.2))})` : "rgba(255,255,255,0.04)"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex justify-between text-sm font-data mt-0.5" style={{ color: DIMMER }}>
            <span>12a</span><span>6a</span><span>12p</span><span>6p</span><span>11p</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Expanded card ─────────────────────────────────────────────────────────────

function ExpandedView({ data }: { data: ReturnType<typeof computeDrivingBehavior> }) {
  return (
    <div className="space-y-5">
      {/* KPI grid */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Avg Speed",        value: `${data.avgSpeedKmh} km/h`, icon: Gauge,         color: speedColor(data.avgSpeedKmh)     },
          { label: "Peak Speed",       value: `${data.maxSpeedKmh} km/h`, icon: Zap,           color: speedColor(data.maxSpeedKmh)     },
          { label: "Idle Ratio",       value: `${data.fleetIdleRatioPct}%`, icon: Clock3,      color: data.fleetIdleRatioPct > 25 ? WARN : ACCENT2 },
          { label: "High-Speed Trips", value: data.highSpeedTripCount,    icon: AlertTriangle, color: data.highSpeedTripCount > 0 ? WARN : ACCENT2 },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="atlas-card rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <Icon className="h-3 w-3" style={{ color }} />
              <span className="text-xs font-bold uppercase tracking-[0.13em] font-body" style={{ color: DIMMER }}>{label}</span>
            </div>
            <div className="text-[20px] font-bold font-data leading-none" style={{ color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Speed distribution */}
      <div className="atlas-card rounded-xl p-4">
        <p className="text-xs font-bold uppercase tracking-[0.13em] font-body mb-3" style={{ color: DIMMER }}>
          Average Speed Distribution (trips)
        </p>
        <ResponsiveContainer width="100%" height={100}>
          <BarChart data={data.speedBuckets} barSize={36} margin={{ top: 0, right: 0, left: -28, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis dataKey="range" tick={{ fill: DIMMER, fontSize: 9, fontFamily: "var(--font-jetbrains-mono)" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: DIMMER, fontSize: 9, fontFamily: "var(--font-jetbrains-mono)" }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: "#101318", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, fontSize: 11, fontFamily: "var(--font-dm-sans)", color: "rgba(232,237,248,0.9)" }}
              formatter={(v: number) => [`${v} trips`, "Count"]}
              labelStyle={{ color: DIM }}
            />
            <Bar dataKey="count" radius={[3, 3, 0, 0]}>
              {data.speedBuckets.map((b, i) => (
                <Cell key={i} fill={b.range === "100+" ? "rgba(251,146,60,0.7)" : i >= 3 ? "rgba(245,166,35,0.6)" : "rgba(56,189,248,0.55)"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Departure by hour */}
      <div className="atlas-card rounded-xl p-4">
        <p className="text-xs font-bold uppercase tracking-[0.13em] font-body mb-3" style={{ color: DIMMER }}>
          Departure Time Distribution (24h)
        </p>
        <ResponsiveContainer width="100%" height={80}>
          <BarChart data={data.departureByHour} barSize={9} margin={{ top: 0, right: 0, left: -28, bottom: 0 }}>
            <XAxis
              dataKey="label"
              tick={{ fill: DIMMER, fontSize: 8, fontFamily: "var(--font-jetbrains-mono)" }}
              axisLine={false} tickLine={false}
              interval={3}
            />
            <YAxis hide />
            <Tooltip
              contentStyle={{ background: "#101318", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, fontSize: 11, fontFamily: "var(--font-dm-sans)", color: "rgba(232,237,248,0.9)" }}
              formatter={(v: number) => [`${v} trip${v !== 1 ? "s" : ""}`, "Departures"]}
              labelStyle={{ color: DIM }}
            />
            <Bar dataKey="count" radius={[2, 2, 0, 0]}>
              {data.departureByHour.map((h, i) => {
                const isNight = h.hour < 6 || h.hour >= 20;
                const isPeak  = h.hour >= 7 && h.hour <= 9;
                return (
                  <Cell key={i} fill={
                    isPeak ? "rgba(245,166,35,0.75)" :
                    isNight ? "rgba(56,189,248,0.3)" :
                    "rgba(245,166,35,0.4)"
                  } />
                );
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Per-trip speed trend */}
      {data.perTrip.length > 1 && (
        <div className="atlas-card rounded-xl p-4">
          <p className="text-xs font-bold uppercase tracking-[0.13em] font-body mb-3" style={{ color: DIMMER }}>
            Speed Trend — Per Trip
          </p>
          <ResponsiveContainer width="100%" height={120}>
            <LineChart data={data.perTrip} margin={{ top: 4, right: 8, left: -28, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="date" tick={{ fill: DIMMER, fontSize: 9, fontFamily: "var(--font-jetbrains-mono)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: DIMMER, fontSize: 9, fontFamily: "var(--font-jetbrains-mono)" }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: "#101318", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, fontSize: 11, fontFamily: "var(--font-dm-sans)", color: "rgba(232,237,248,0.9)" }}
                formatter={(v: number, name: string) => [
                  name === "avgSpeed" ? `${v} km/h` : name === "idlePct" ? `${v}%` : `${v}`,
                  name === "avgSpeed" ? "Avg Speed" : name === "idlePct" ? "Idle %" : name,
                ]}
                labelStyle={{ color: DIM }}
              />
              <ReferenceLine y={data.avgSpeedKmh} stroke="rgba(245,166,35,0.3)" strokeDasharray="4 4" />
              <Line type="monotone" dataKey="avgSpeed" stroke={ACCENT} strokeWidth={1.5} dot={false} activeDot={{ r: 3, fill: ACCENT, strokeWidth: 0 }} />
              <Line type="monotone" dataKey="idlePct"  stroke={ACCENT2} strokeWidth={1.5} dot={false} activeDot={{ r: 3, fill: ACCENT2, strokeWidth: 0 }} />
            </LineChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-4 mt-2">
            <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 rounded" style={{ background: ACCENT }} /><span className="text-sm font-body" style={{ color: DIM }}>Avg speed</span></div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 rounded" style={{ background: ACCENT2 }} /><span className="text-sm font-body" style={{ color: DIM }}>Idle %</span></div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface DrivingBehaviorCardProps {
  trips: TripSummary[];
  expanded?: boolean;
}

export default function DrivingBehaviorCard({ trips, expanded = false }: DrivingBehaviorCardProps) {
  const data = useMemo(() => computeDrivingBehavior(trips), [trips]);

  const hasAlert = data.highSpeedTripCount > 0 || data.fleetIdleRatioPct > 25;

  return (
    <div
      className={cn(
        "rounded-xl border overflow-hidden h-full",
        "bg-[#0d1117]",
        hasAlert ? "border-[rgba(251,146,60,0.18)]" : "border-[rgba(245,166,35,0.14)]",
        expanded && "w-full",
      )}
    >
      {/* Ambient glow */}
      <div className="absolute -top-8 -left-8 w-36 h-36 rounded-full bg-[#f5a623] opacity-[0.03] blur-3xl pointer-events-none" />

      {/* Header */}
      <div className={cn(
        "relative z-10 px-3.5 pt-3 pb-2.5 border-b",
        hasAlert ? "border-[rgba(251,146,60,0.1)]" : "border-[rgba(245,166,35,0.09)]"
      )}>
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-6 h-6 rounded-lg flex items-center justify-center shrink-0",
            hasAlert ? "bg-[rgba(251,146,60,0.12)]" : "bg-[rgba(245,166,35,0.1)]"
          )}>
            <Gauge className={cn("w-3.5 h-3.5", hasAlert ? "text-[#fb923c]" : "text-[#f5a623]")} />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-sm font-bold font-display text-white">Driving Behavior</span>
            <span className="text-sm font-body ml-1.5" style={{ color: hasAlert ? "rgba(251,146,60,0.65)" : "rgba(245,166,35,0.65)" }}>
              {data.perTrip.length} trips analyzed
            </span>
          </div>
          {hasAlert && (
            <span className="flex items-center gap-1 text-sm font-bold font-data uppercase tracking-wider px-1.5 py-0.5 rounded border text-[#fb923c] border-[rgba(251,146,60,0.2)] bg-[rgba(251,146,60,0.07)]">
              <AlertTriangle className="w-2 h-2" />
              Alert
            </span>
          )}
          {!hasAlert && (
            <span className="text-sm font-bold font-data uppercase tracking-wider px-1.5 py-0.5 rounded border" style={{ color: "rgba(245,166,35,0.7)", borderColor: "rgba(245,166,35,0.2)", background: "rgba(245,166,35,0.06)" }}>
              Vehicle
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="relative z-10">
        {expanded ? <ExpandedView data={data} /> : <CompactView data={data} />}
      </div>

      {/* Footer line */}
      <div className={cn("h-px bg-gradient-to-r from-transparent to-transparent", hasAlert ? "via-[rgba(251,146,60,0.2)]" : "via-[rgba(245,166,35,0.2)]")} />
    </div>
  );
}

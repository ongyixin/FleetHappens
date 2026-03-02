"use client";

/**
 * RouteFingerPrintCard
 *
 * Vehicle-specific intelligence card showing common origin-destination
 * corridors derived from the vehicle's own trip history.
 *
 * Clusters trip start/end points geographically (1.5 km radius) to surface
 * recurring route patterns without requiring any additional API calls.
 */

import { useMemo, useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell,
} from "recharts";
import { MapPin, ArrowRight, Navigation2, Layers } from "lucide-react";
import type { TripSummary } from "@/types";
import { computeRouteFingerprint, type ODPair } from "@/lib/vehicle/analytics";
import { cn } from "@/lib/utils";

// ─── Colors ───────────────────────────────────────────────────────────────────

const ACCENT  = "#a78bfa";       // violet — distinct from teal (profile) and amber (fleet)
const ACCENT2 = "#c4b5fd";
const DIM     = "rgba(232,237,248,0.35)";
const DIMMER  = "rgba(232,237,248,0.18)";

function odColor(i: number): string {
  const palette = [
    "rgba(167,139,250,0.75)",
    "rgba(167,139,250,0.5)",
    "rgba(167,139,250,0.35)",
    "rgba(167,139,250,0.25)",
    "rgba(167,139,250,0.18)",
  ];
  return palette[i] ?? palette[palette.length - 1]!;
}

// ─── OD Row ───────────────────────────────────────────────────────────────────

function ODRow({ pair, index, total }: { pair: ODPair; index: number; total: number }) {
  const [animated, setAnimated] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 100 + index * 80);
    return () => clearTimeout(t);
  }, [index]);

  const pct = Math.round(pair.shareOfTrips * 100);

  return (
    <div className={cn(
      "rounded-lg px-3 py-2.5 space-y-1.5",
      index === 0
        ? "bg-[rgba(167,139,250,0.06)] border border-[rgba(167,139,250,0.16)] hover:border-[rgba(167,139,250,0.28)]"
        : "border border-transparent hover:bg-[rgba(255,255,255,0.03)]",
      "transition-all duration-200"
    )}>
      {/* Route label */}
      <div className="flex items-center gap-1.5 min-w-0">
        <div className={cn(
          "shrink-0 w-4 h-4 rounded flex items-center justify-center text-sm font-bold font-data",
          index === 0 ? "bg-[rgba(167,139,250,0.2)] text-[#a78bfa]" : "bg-[rgba(255,255,255,0.06)] text-[rgba(232,237,248,0.35)]"
        )}>
          {index + 1}
        </div>
        <span className={cn("text-sm font-semibold font-body truncate", index === 0 ? "text-white" : "text-[rgba(232,237,248,0.7)]")}>
          {pair.originLabel}
        </span>
        <ArrowRight className="shrink-0 h-2.5 w-2.5 text-[rgba(167,139,250,0.4)]" />
        <span className={cn("text-sm font-semibold font-body truncate", index === 0 ? "text-white" : "text-[rgba(232,237,248,0.7)]")}>
          {pair.destinationLabel}
        </span>
      </div>

      {/* Share bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1 bg-[rgba(255,255,255,0.06)] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: animated ? `${pct}%` : "0%",
              background: odColor(index),
              transitionDelay: `${index * 60}ms`,
            }}
          />
        </div>
        <span className="text-sm font-data shrink-0" style={{ color: DIM }}>{pct}%</span>
      </div>

      {/* Meta */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-data" style={{ color: index === 0 ? ACCENT2 : DIM }}>
          {pair.tripCount}× trips
        </span>
        <span className="text-sm font-data" style={{ color: DIM }}>
          {pair.avgDistanceKm} km avg
        </span>
        <span className="text-sm font-data" style={{ color: DIM }}>
          {pair.avgDrivingMinutes}m drive
        </span>
      </div>
    </div>
  );
}

// ─── Compact card ─────────────────────────────────────────────────────────────

function CompactView({ data: fp }: { data: ReturnType<typeof computeRouteFingerprint> }) {
  const top3 = fp.topPairs.slice(0, 3);

  return (
    <div className="p-3.5 space-y-2.5">
      {/* Summary pills */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-[rgba(167,139,250,0.07)] border border-[rgba(167,139,250,0.15)]">
          <Navigation2 className="h-2.5 w-2.5" style={{ color: ACCENT }} />
          <span className="text-sm font-bold font-data" style={{ color: ACCENT }}>{fp.uniqueOrigins}</span>
          <span className="text-sm font-body" style={{ color: DIM }}>origins</span>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-[rgba(167,139,250,0.07)] border border-[rgba(167,139,250,0.15)]">
          <MapPin className="h-2.5 w-2.5" style={{ color: ACCENT2 }} />
          <span className="text-sm font-bold font-data" style={{ color: ACCENT2 }}>{fp.uniqueDestinations}</span>
          <span className="text-sm font-body" style={{ color: DIM }}>destinations</span>
        </div>
      </div>

      {/* Top OD pairs */}
      {top3.length > 0 ? (
        <div className="space-y-1">
          {top3.map((pair, i) => <ODRow key={i} pair={pair} index={i} total={fp.topPairs.length} />)}
        </div>
      ) : (
        <p className="text-sm text-[rgba(232,237,248,0.3)] font-body text-center py-2">
          Not enough trips to detect patterns
        </p>
      )}
    </div>
  );
}

// ─── Expanded card ─────────────────────────────────────────────────────────────

function ExpandedView({ data: fp }: { data: ReturnType<typeof computeRouteFingerprint> }) {
  const chartData = fp.topPairs.map((p, i) => ({
    name: `Route ${i + 1}`,
    trips: p.tripCount,
    km: p.avgDistanceKm,
  }));

  return (
    <div className="space-y-5">
      {/* Header stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Unique Origins",      value: fp.uniqueOrigins,      icon: Navigation2, color: ACCENT  },
          { label: "Unique Destinations", value: fp.uniqueDestinations,  icon: MapPin,      color: ACCENT2 },
          { label: "Pattern Coverage",    value: `${fp.coveragePct}%`,   icon: Layers,      color: ACCENT  },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="atlas-card rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <Icon className="h-3 w-3" style={{ color }} />
              <span className="text-xs font-bold uppercase tracking-[0.13em] font-body" style={{ color: DIMMER }}>{label}</span>
            </div>
            <div className="text-[22px] font-bold font-data leading-none" style={{ color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Bar chart — trip count per route */}
      {chartData.length > 0 && (
        <div className="atlas-card rounded-xl p-4">
          <p className="text-xs font-bold uppercase tracking-[0.13em] font-body mb-3" style={{ color: DIMMER }}>
            Trip Count by Route Corridor
          </p>
          <ResponsiveContainer width="100%" height={100}>
            <BarChart data={chartData} barSize={28} margin={{ top: 0, right: 0, left: -28, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fill: DIMMER, fontSize: 9, fontFamily: "var(--font-jetbrains-mono)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: DIMMER, fontSize: 9, fontFamily: "var(--font-jetbrains-mono)" }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: "#101318", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, fontSize: 11, fontFamily: "var(--font-dm-sans)", color: "rgba(232,237,248,0.9)" }}
                formatter={(v: number) => [`${v}`, "Trips"]}
                labelStyle={{ color: DIM }}
              />
              <Bar dataKey="trips" radius={[3, 3, 0, 0]}>
                {chartData.map((_, i) => <Cell key={i} fill={odColor(i)} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* All OD pairs */}
      <div className="atlas-card rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-[rgba(255,255,255,0.06)]">
          <p className="text-xs font-bold uppercase tracking-[0.13em] font-body" style={{ color: DIMMER }}>
            Route Patterns — All Corridors
          </p>
        </div>
        <div className="p-3 space-y-1">
          {fp.topPairs.length > 0
            ? fp.topPairs.map((pair, i) => <ODRow key={i} pair={pair} index={i} total={fp.topPairs.length} />)
            : <p className="text-sm font-body text-center py-4" style={{ color: DIM }}>Not enough trip data</p>
          }
        </div>
      </div>

      {/* Cluster counts */}
      <div className="grid grid-cols-2 gap-3">
        <div className="atlas-card rounded-xl p-3">
          <p className="text-xs font-bold uppercase tracking-[0.13em] font-body mb-2" style={{ color: DIMMER }}>Origin Clusters</p>
          <div className="space-y-1.5">
            {fp.originClusters.slice(0, 5).sort((a, b) => b.count - a.count).map((c, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-4 h-4 rounded flex items-center justify-center text-sm font-bold font-data bg-[rgba(167,139,250,0.1)] text-[#a78bfa]">{i + 1}</div>
                <div className="flex-1 h-1 bg-[rgba(255,255,255,0.06)] rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-[rgba(167,139,250,0.55)]" style={{ width: `${Math.min(100, (c.count / (fp.originClusters[0]?.count ?? 1)) * 100)}%` }} />
                </div>
                <span className="text-sm font-data shrink-0" style={{ color: DIM }}>{c.count}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="atlas-card rounded-xl p-3">
          <p className="text-xs font-bold uppercase tracking-[0.13em] font-body mb-2" style={{ color: DIMMER }}>Destination Clusters</p>
          <div className="space-y-1.5">
            {fp.destinationClusters.slice(0, 5).sort((a, b) => b.count - a.count).map((c, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-4 h-4 rounded flex items-center justify-center text-sm font-bold font-data bg-[rgba(196,181,253,0.1)] text-[#c4b5fd]">{i + 1}</div>
                <div className="flex-1 h-1 bg-[rgba(255,255,255,0.06)] rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-[rgba(196,181,253,0.55)]" style={{ width: `${Math.min(100, (c.count / (fp.destinationClusters[0]?.count ?? 1)) * 100)}%` }} />
                </div>
                <span className="text-sm font-data shrink-0" style={{ color: DIM }}>{c.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface RouteFingerPrintCardProps {
  trips: TripSummary[];
  expanded?: boolean;
}

export default function RouteFingerPrintCard({ trips, expanded = false }: RouteFingerPrintCardProps) {
  const data = useMemo(() => computeRouteFingerprint(trips), [trips]);

  return (
    <div
      className={cn(
        "rounded-xl border overflow-hidden h-full",
        "bg-[#0d1117] border-[rgba(167,139,250,0.14)]",
        expanded && "w-full",
      )}
    >
      {/* Ambient glow */}
      <div className="absolute -top-8 -right-8 w-36 h-36 rounded-full bg-[#a78bfa] opacity-[0.03] blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 px-3.5 pt-3 pb-2.5 border-b border-[rgba(167,139,250,0.09)]">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-[rgba(167,139,250,0.1)] flex items-center justify-center shrink-0">
            <Navigation2 className="w-3.5 h-3.5 text-[#a78bfa]" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-sm font-bold font-display text-white">Route Fingerprint</span>
            <span className="text-sm font-body ml-1.5" style={{ color: "rgba(167,139,250,0.65)" }}>
              {data.topPairs.length} corridors
            </span>
          </div>
          <span className="text-sm font-bold font-data uppercase tracking-wider px-1.5 py-0.5 rounded border" style={{ color: "rgba(167,139,250,0.7)", borderColor: "rgba(167,139,250,0.2)", background: "rgba(167,139,250,0.06)" }}>
            Vehicle
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="relative z-10">
        {expanded ? <ExpandedView data={data} /> : <CompactView data={data} />}
      </div>

      {/* Footer line */}
      <div className="h-px bg-gradient-to-r from-transparent via-[rgba(167,139,250,0.2)] to-transparent" />
    </div>
  );
}

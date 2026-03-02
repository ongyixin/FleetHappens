"use client";

/**
 * TripAnomaliesCard
 *
 * Vehicle-specific intelligence card using statistical z-score analysis
 * to surface trips that deviate significantly from this vehicle's own
 * historical baseline — not the fleet average.
 *
 * Visual identity: deep red/rose for high severity, with a forensic
 * data-investigation aesthetic. Anomalies feel surfaced, not generated.
 */

import { useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip,
  CartesianGrid, Cell, ReferenceLine,
} from "recharts";
import { ShieldAlert, TriangleAlert, CheckCircle2, Activity } from "lucide-react";
import type { TripSummary } from "@/types";
import { detectTripAnomalies, type TripAnomaly, type AnomalyReason } from "@/lib/vehicle/analytics";
import { cn } from "@/lib/utils";

// ─── Colors ───────────────────────────────────────────────────────────────────

const DIM    = "rgba(232,237,248,0.35)";
const DIMMER = "rgba(232,237,248,0.18)";

function severityColor(s: TripAnomaly["severity"]): string {
  return s === "high" ? "#f87171" : s === "medium" ? "#fb923c" : "#fbbf24";
}

function severityBg(s: TripAnomaly["severity"]): string {
  return s === "high" ? "rgba(248,113,113,0.07)" : s === "medium" ? "rgba(251,146,60,0.06)" : "rgba(251,191,36,0.05)";
}

function severityBorder(s: TripAnomaly["severity"]): string {
  return s === "high" ? "rgba(248,113,113,0.2)" : s === "medium" ? "rgba(251,146,60,0.18)" : "rgba(251,191,36,0.15)";
}

const REASON_LABELS: Record<AnomalyReason, string> = {
  unusually_long:  "Long trip",
  unusually_short: "Short trip",
  high_idle:       "High idle",
  high_speed:      "High speed",
  late_departure:  "Late depart",
  early_departure: "Early depart",
  low_speed:       "Low speed",
};

// ─── Anomaly row ──────────────────────────────────────────────────────────────

function AnomalyRow({ anomaly, compact }: { anomaly: TripAnomaly; compact?: boolean }) {
  const color  = severityColor(anomaly.severity);
  const bg     = severityBg(anomaly.severity);
  const border = severityBorder(anomaly.severity);

  return (
    <div className="rounded-lg px-3 py-2.5 space-y-1.5" style={{ background: bg, border: `1px solid ${border}` }}>
      {/* Header */}
      <div className="flex items-start gap-2">
        <TriangleAlert className="h-3 w-3 mt-0.5 shrink-0" style={{ color }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm font-bold font-data" style={{ color }}>
              {anomaly.date} · {anomaly.startTime}
            </span>
            <span className={cn(
              "text-xs font-bold uppercase tracking-wider px-1.5 py-0.5 rounded font-data",
              `border`
            )} style={{ color, borderColor: border, background: "transparent" }}>
              {anomaly.severity}
            </span>
          </div>
          <p className="text-sm font-body mt-0.5 leading-snug" style={{ color: DIM }}>
            {anomaly.summary}
          </p>
        </div>
      </div>

      {/* Reason tags */}
      <div className="flex flex-wrap gap-1">
        {anomaly.reasons.map((r) => (
          <span key={r} className="text-sm font-bold font-data uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ color: "rgba(232,237,248,0.4)", background: "rgba(255,255,255,0.05)" }}>
            {REASON_LABELS[r]}
          </span>
        ))}
      </div>

      {/* Stats */}
      {!compact && (
        <div className="flex items-center gap-3 pt-0.5">
          <span className="text-sm font-data" style={{ color: DIM }}>{anomaly.km} km</span>
          <span className="text-sm font-data" style={{ color: DIM }}>{anomaly.drivingMin}m drive</span>
          <span className="text-sm font-data" style={{ color: anomaly.idlePct > 30 ? severityColor("medium") : DIM }}>{anomaly.idlePct}% idle</span>
          <span className="text-sm font-data" style={{ color: anomaly.avgSpeedKmh > 100 ? severityColor("high") : DIM }}>{anomaly.avgSpeedKmh} km/h avg</span>
        </div>
      )}
    </div>
  );
}

// ─── Compact card ─────────────────────────────────────────────────────────────

function CompactView({ data }: { data: ReturnType<typeof detectTripAnomalies> }) {
  const top3 = data.anomalies.slice(0, 3);

  if (data.totalFlagged === 0) {
    return (
      <div className="p-4 flex flex-col items-center gap-2 py-6">
        <CheckCircle2 className="h-7 w-7 text-[#34d399] opacity-60" />
        <p className="text-[12px] font-semibold font-body text-[rgba(52,211,153,0.8)]">No anomalies detected</p>
        <p className="text-sm font-body text-center" style={{ color: DIM }}>
          {data.normalTripCount} trips analyzed — all within normal parameters
        </p>
      </div>
    );
  }

  return (
    <div className="p-3.5 space-y-2.5">
      {/* Summary */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md" style={{ background: "rgba(248,113,113,0.07)", border: "1px solid rgba(248,113,113,0.18)" }}>
          <ShieldAlert className="h-2.5 w-2.5 text-[#f87171]" />
          <span className="text-sm font-bold font-data text-[#f87171]">{data.totalFlagged}</span>
          <span className="text-sm font-body" style={{ color: DIM }}>flagged</span>
        </div>
        <span className="text-sm font-body" style={{ color: DIMMER }}>of {data.totalFlagged + data.normalTripCount} trips</span>
      </div>

      {/* Top anomalies */}
      <div className="space-y-1.5">
        {top3.map((a) => <AnomalyRow key={a.tripId} anomaly={a} compact />)}
      </div>

      {data.totalFlagged > 3 && (
        <p className="text-sm font-body text-center" style={{ color: DIMMER }}>
          +{data.totalFlagged - 3} more flagged trips — expand to view
        </p>
      )}
    </div>
  );
}

// ─── Expanded card ─────────────────────────────────────────────────────────────

function ExpandedView({ data }: { data: ReturnType<typeof detectTripAnomalies> }) {
  // Deviation chart data
  const devChartData = data.deviations.slice(-20);

  return (
    <div className="space-y-5">
      {/* Summary tiles */}
      <div className="grid grid-cols-3 gap-3">
        {[
          {
            label: "Flagged Trips",
            value: data.totalFlagged,
            color: data.totalFlagged > 0 ? "#f87171" : "#34d399",
            icon: ShieldAlert,
          },
          {
            label: "Normal Trips",
            value: data.normalTripCount,
            color: "#34d399",
            icon: CheckCircle2,
          },
          {
            label: "Flag Rate",
            value: `${data.totalFlagged + data.normalTripCount > 0 ? Math.round((data.totalFlagged / (data.totalFlagged + data.normalTripCount)) * 100) : 0}%`,
            color: data.totalFlagged > 0 ? "#fb923c" : "#34d399",
            icon: Activity,
          },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="atlas-card rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <Icon className="h-3 w-3" style={{ color }} />
              <span className="text-xs font-bold uppercase tracking-[0.13em] font-body" style={{ color: DIMMER }}>{label}</span>
            </div>
            <div className="text-[22px] font-bold font-data leading-none" style={{ color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Deviation chart */}
      {devChartData.length > 1 && (
        <div className="atlas-card rounded-xl p-4">
          <p className="text-xs font-bold uppercase tracking-[0.13em] font-body mb-1" style={{ color: DIMMER }}>
            Trip Deviation from Baseline (z-score · distance)
          </p>
          <p className="text-sm font-body mb-3" style={{ color: DIMMER }}>Bars above 2.0 are statistical outliers</p>
          <ResponsiveContainer width="100%" height={100}>
            <BarChart data={devChartData} barSize={8} margin={{ top: 0, right: 0, left: -28, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: DIMMER, fontSize: 8, fontFamily: "var(--font-jetbrains-mono)" }} axisLine={false} tickLine={false} interval={3} />
              <YAxis tick={{ fill: DIMMER, fontSize: 9, fontFamily: "var(--font-jetbrains-mono)" }} axisLine={false} tickLine={false} />
              <ReferenceLine y={2} stroke="rgba(248,113,113,0.35)" strokeDasharray="4 4" label={{ value: "2σ", position: "insideTopRight", fill: "rgba(248,113,113,0.5)", fontSize: 9 }} />
              <Tooltip
                contentStyle={{ background: "#101318", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, fontSize: 11, fontFamily: "var(--font-dm-sans)", color: "rgba(232,237,248,0.9)" }}
                formatter={(v: number, name: string) => [name === "z" ? `${v}σ` : `${v} km`, name === "z" ? "Deviation" : "Distance"]}
                labelStyle={{ color: DIM }}
              />
              <Bar dataKey="z" radius={[2, 2, 0, 0]}>
                {devChartData.map((d, i) => (
                  <Cell key={i} fill={d.z > 3.5 ? "rgba(248,113,113,0.8)" : d.z > 2 ? "rgba(251,146,60,0.7)" : "rgba(255,255,255,0.12)"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* All anomalies */}
      {data.anomalies.length > 0 ? (
        <div className="atlas-card rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-[rgba(255,255,255,0.06)]">
            <p className="text-xs font-bold uppercase tracking-[0.13em] font-body" style={{ color: DIMMER }}>
              Flagged Trips — All Anomalies
            </p>
          </div>
          <div className="p-3 space-y-2">
            {data.anomalies.map((a) => <AnomalyRow key={a.tripId} anomaly={a} />)}
          </div>
        </div>
      ) : (
        <div className="atlas-card rounded-xl p-6 flex flex-col items-center gap-3 text-center">
          <CheckCircle2 className="h-8 w-8 text-[#34d399] opacity-50" />
          <div>
            <p className="text-sm font-semibold font-body text-[rgba(52,211,153,0.8)]">All clear</p>
            <p className="text-sm font-body mt-1" style={{ color: DIM }}>
              {data.normalTripCount} trips analyzed — no statistical anomalies detected
            </p>
          </div>
        </div>
      )}

      {/* Z-score legend */}
      {data.anomalies.length > 0 && (
        <div className="atlas-card rounded-xl p-3">
          <p className="text-xs font-bold uppercase tracking-[0.12em] font-body mb-2" style={{ color: DIMMER }}>Deviation Guide</p>
          <div className="flex items-center gap-4 flex-wrap">
            {[
              { label: "High (>3.5σ)",  color: "#f87171"  },
              { label: "Medium (>2.5σ)", color: "#fb923c" },
              { label: "Low (>2.0σ)",   color: "#fbbf24"  },
            ].map(({ label, color }) => (
              <div key={label} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm" style={{ background: color, opacity: 0.7 }} />
                <span className="text-sm font-body" style={{ color: DIM }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface TripAnomaliesCardProps {
  trips: TripSummary[];
  expanded?: boolean;
}

export default function TripAnomaliesCard({ trips, expanded = false }: TripAnomaliesCardProps) {
  const data = useMemo(() => detectTripAnomalies(trips), [trips]);

  const hasHigh = data.anomalies.some((a) => a.severity === "high");

  return (
    <div
      className={cn(
        "rounded-xl border overflow-hidden h-full",
        "bg-[#0d1117]",
        hasHigh
          ? "border-[rgba(248,113,113,0.2)]"
          : data.totalFlagged > 0
          ? "border-[rgba(251,146,60,0.18)]"
          : "border-[rgba(52,211,153,0.12)]",
        expanded && "w-full",
      )}
    >
      {/* Ambient glow */}
      <div className="absolute -top-10 -right-8 w-36 h-36 rounded-full opacity-[0.03] blur-3xl pointer-events-none"
        style={{ background: hasHigh ? "#f87171" : data.totalFlagged > 0 ? "#fb923c" : "#34d399" }}
      />

      {/* Header */}
      <div className={cn(
        "relative z-10 px-3.5 pt-3 pb-2.5 border-b",
        hasHigh ? "border-[rgba(248,113,113,0.12)]" : "border-[rgba(255,255,255,0.06)]"
      )}>
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-6 h-6 rounded-lg flex items-center justify-center shrink-0",
            hasHigh ? "bg-[rgba(248,113,113,0.12)]" : "bg-[rgba(255,255,255,0.06)]"
          )}>
            <ShieldAlert className={cn("w-3.5 h-3.5", hasHigh ? "text-[#f87171]" : "text-[rgba(232,237,248,0.4)]")} />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-sm font-bold font-display text-white">Trip Anomalies</span>
            <span className="text-sm font-body ml-1.5" style={{ color: hasHigh ? "rgba(248,113,113,0.65)" : DIM }}>
              {data.totalFlagged > 0 ? `${data.totalFlagged} flagged` : "All clear"}
            </span>
          </div>
          {data.totalFlagged > 0 ? (
            <span className="flex items-center gap-1 text-sm font-bold font-data uppercase tracking-wider px-1.5 py-0.5 rounded border"
              style={{
                color: hasHigh ? "#f87171" : "#fb923c",
                borderColor: hasHigh ? "rgba(248,113,113,0.25)" : "rgba(251,146,60,0.2)",
                background: hasHigh ? "rgba(248,113,113,0.07)" : "rgba(251,146,60,0.07)",
              }}>
              <TriangleAlert className="w-2 h-2" />
              {hasHigh ? "High" : "Medium"}
            </span>
          ) : (
            <span className="text-sm font-bold font-data uppercase tracking-wider px-1.5 py-0.5 rounded border text-[#34d399] border-[rgba(52,211,153,0.2)] bg-[rgba(52,211,153,0.06)]">
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
      <div className="h-px bg-gradient-to-r from-transparent to-transparent"
        style={{ backgroundImage: hasHigh ? "linear-gradient(to right, transparent, rgba(248,113,113,0.2), transparent)" : "linear-gradient(to right, transparent, rgba(52,211,153,0.15), transparent)" }}
      />
    </div>
  );
}

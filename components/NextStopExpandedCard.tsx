"use client";

/**
 * NextStopExpandedCard
 *
 * Full-width maximised view for the Next-Stop Prediction intelligence column.
 * Follows the same structural pattern as AceInsightExpandedCard:
 *   - Header with title, badges, and origin context
 *   - KPI tile strip (4 derived metrics)
 *   - Signal analysis: grouped bar chart + ranked signal table
 *   - LLM justification per prediction
 *   - Anomaly callout (conditional)
 *   - Pre-loaded area briefing + nearby amenities (conditional)
 *
 * Receives a pre-fetched NextStopPredictionResult — no API call is made here.
 */

import { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  CartesianGrid,
  Legend,
} from "recharts";
import {
  Navigation,
  Brain,
  Radio,
  Loader2,
  TriangleAlert,
  AlertOctagon,
  MapPin,
  Clock,
  Zap,
  Activity,
  Route,
  Coffee,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { NextStopPredictionResult, StopPrediction } from "@/types";

// ─── Signal colour convention (matches compact SignalBreakdown) ───────────────

const SIGNAL_COLORS = {
  frequency: "rgba(45,212,191,0.85)",   // teal
  temporal:  "rgba(56,189,248,0.85)",   // sky blue
  recency:   "rgba(167,139,250,0.85)",  // purple
  sequence:  "rgba(245,166,35,0.85)",   // amber
} as const;

const SIGNAL_LABELS = {
  frequency: "Frequency",
  temporal:  "Temporal",
  recency:   "Recency",
  sequence:  "Sequence",
} as const;

function ChartTooltip({
  active,
  payload,
  label,
  formatter,
}: {
  active?: boolean;
  payload?: Array<{ value: number; name: string; color: string }>;
  label?: string;
  formatter?: (value: number, name: string) => [React.ReactNode, string];
}) {
  if (!active || !payload?.length) return null;

  return (
    <div
      style={{
        background: "#171b24",
        border: "1px solid rgba(255,255,255,0.15)",
        borderRadius: 10,
        padding: "8px 12px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.07)",
        minWidth: 110,
        pointerEvents: "none",
      }}
    >
      {label && (
        <p
          style={{
            fontSize: 9,
            fontFamily: "DM Sans, sans-serif",
            fontWeight: 700,
            letterSpacing: "0.13em",
            textTransform: "uppercase",
            color: "rgba(232,237,248,0.38)",
            marginBottom: 6,
            paddingBottom: 5,
            borderBottom: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          {label}
        </p>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {payload.map((entry, i) => {
          const [formattedVal, formattedName] = formatter
            ? formatter(entry.value, entry.name)
            : [entry.value, entry.name];
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <span
                style={{
                  display: "inline-block",
                  width: 6,
                  height: 6,
                  borderRadius: 2,
                  background: entry.color,
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontSize: 12,
                  fontFamily: "JetBrains Mono, monospace",
                  fontWeight: 600,
                  color: "#e8edf8",
                  letterSpacing: "-0.02em",
                }}
              >
                {formattedVal}
              </span>
              {formattedName && (
                <span
                  style={{
                    fontSize: 10,
                    fontFamily: "DM Sans, sans-serif",
                    color: "rgba(232,237,248,0.38)",
                  }}
                >
                  {formattedName}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function KpiTile({
  label,
  value,
  sub,
  accent,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
  icon?: React.ElementType;
}) {
  return (
    <div className="flex-1 min-w-0 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.07)] px-4 py-3">
      <div className="flex items-center gap-1.5 mb-1">
        {Icon && (
          <Icon
            className="h-3 w-3 shrink-0"
            style={{ color: accent ?? "rgba(232,237,248,0.35)" }}
          />
        )}
        <p
          className="text-[10px] font-bold uppercase tracking-[0.14em] font-body truncate"
          style={{ color: accent ?? "rgba(232,237,248,0.35)" }}
        >
          {label}
        </p>
      </div>
      <p className="text-[22px] font-display font-extrabold text-white leading-none tracking-tight">
        {value}
      </p>
      {sub && (
        <p className="text-[10px] text-[rgba(232,237,248,0.4)] font-body mt-1 truncate">
          {sub}
        </p>
      )}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[rgba(232,237,248,0.35)] font-body mb-2.5">
      {children}
    </p>
  );
}

// ─── Confidence badge ─────────────────────────────────────────────────────────

function ConfidencePill({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color =
    pct >= 60 ? "#2dd4bf" : pct >= 35 ? "#38bdf8" : pct >= 15 ? "#f5a623" : "rgba(232,237,248,0.35)";
  const label =
    pct >= 60 ? "Very Likely" : pct >= 35 ? "Likely" : pct >= 15 ? "Possible" : "Low Signal";

  return (
    <span
      className="inline-flex items-center gap-1 text-[9px] font-bold font-data px-1.5 py-0.5 rounded"
      style={{ color, background: `${color}18`, border: `1px solid ${color}30` }}
    >
      {label} · {pct}%
    </span>
  );
}

// ─── Animated signal bar (used in the table) ──────────────────────────────────

function MiniSignalBar({
  value,
  color,
  delay,
}: {
  value: number;
  color: string;
  delay: number;
}) {
  const [animated, setAnimated] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <div className="flex items-center gap-1.5">
      <div className="w-14 h-[3px] bg-[rgba(255,255,255,0.05)] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: animated ? `${Math.round(value * 100)}%` : "0%", background: color }}
        />
      </div>
      <span className="text-[9px] font-data tabular-nums text-[rgba(232,237,248,0.3)]">
        {Math.round(value * 100)}
      </span>
    </div>
  );
}

// ─── Signal comparison chart ──────────────────────────────────────────────────

function SignalComparisonChart({
  predictions,
}: {
  predictions: StopPrediction[];
}) {
  const candidates = predictions.filter((p) => p.signals).slice(0, 5);
  if (!candidates.length) return null;

  const chartData = candidates.map((p) => ({
    name: p.locationName.split(" ").slice(0, 2).join(" ").slice(0, 14),
    frequency: Math.round((p.signals!.frequency) * 100),
    temporal:  Math.round((p.signals!.temporal)  * 100),
    recency:   Math.round((p.signals!.recency)   * 100),
    sequence:  Math.round((p.signals!.sequence)  * 100),
  }));

  return (
    <div>
      <SectionLabel>Signal Breakdown — All Candidates</SectionLabel>
      <div className="h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 4, right: 0, bottom: 0, left: -16 }}
            barCategoryGap="25%"
          >
            <CartesianGrid
              stroke="rgba(255,255,255,0.04)"
              strokeDasharray="3 3"
              vertical={false}
            />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 9, fill: "rgba(232,237,248,0.35)", fontFamily: "JetBrains Mono" }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 9, fill: "rgba(232,237,248,0.35)", fontFamily: "JetBrains Mono" }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              content={
                <ChartTooltip
                  formatter={(v, name) => [
                    `${v}`,
                    SIGNAL_LABELS[name as keyof typeof SIGNAL_LABELS] ?? name,
                  ]}
                />
              }
              cursor={{ fill: "rgba(255,255,255,0.04)" }}
            />
            <Legend
              wrapperStyle={{ fontSize: 9, fontFamily: "JetBrains Mono", color: "rgba(232,237,248,0.4)" }}
            />
            <Bar dataKey="frequency" name="Frequency" fill={SIGNAL_COLORS.frequency} radius={[2, 2, 0, 0]} maxBarSize={12} />
            <Bar dataKey="temporal"  name="Temporal"  fill={SIGNAL_COLORS.temporal}  radius={[2, 2, 0, 0]} maxBarSize={12} />
            <Bar dataKey="recency"   name="Recency"   fill={SIGNAL_COLORS.recency}   radius={[2, 2, 0, 0]} maxBarSize={12} />
            <Bar dataKey="sequence"  name="Sequence"  fill={SIGNAL_COLORS.sequence}  radius={[2, 2, 0, 0]} maxBarSize={12} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ─── Signal table ─────────────────────────────────────────────────────────────

function SignalTable({ predictions }: { predictions: StopPrediction[] }) {
  const candidates = predictions.slice(0, 5);

  return (
    <div>
      <SectionLabel>Candidate Rankings — Signal Detail</SectionLabel>
      <div className="rounded-xl overflow-hidden border border-[rgba(255,255,255,0.08)]">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-[rgba(255,255,255,0.04)]">
              {["#", "Destination", "Confidence", "Freq", "Temporal", "Recency", "Seq", "Visits", "Dwell"].map(
                (h) => (
                  <th
                    key={h}
                    className="px-3 py-2 text-left font-bold text-[rgba(232,237,248,0.35)] uppercase tracking-wider text-[9px] font-body"
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-[rgba(255,255,255,0.05)]">
            {candidates.map((p, i) => (
              <tr
                key={p.rank}
                className={cn(
                  "hover:bg-[rgba(255,255,255,0.03)] transition-colors",
                  i === 0 && "bg-[rgba(45,212,191,0.04)]"
                )}
              >
                <td className="px-3 py-2.5">
                  <span
                    className={cn(
                      "w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-bold font-data",
                      i === 0
                        ? "bg-[rgba(45,212,191,0.2)] text-[#2dd4bf]"
                        : "bg-[rgba(255,255,255,0.06)] text-[rgba(232,237,248,0.35)]"
                    )}
                  >
                    {p.rank}
                  </span>
                </td>
                <td className="px-3 py-2.5 font-body font-medium text-white max-w-[140px] truncate">
                  {p.locationName}
                </td>
                <td className="px-3 py-2.5">
                  <ConfidencePill value={p.confidence} />
                </td>
                {/* Signal bars */}
                {p.signals ? (
                  <>
                    <td className="px-3 py-2.5">
                      <MiniSignalBar value={p.signals.frequency} color={SIGNAL_COLORS.frequency} delay={100 + i * 80} />
                    </td>
                    <td className="px-3 py-2.5">
                      <MiniSignalBar value={p.signals.temporal} color={SIGNAL_COLORS.temporal} delay={160 + i * 80} />
                    </td>
                    <td className="px-3 py-2.5">
                      <MiniSignalBar value={p.signals.recency} color={SIGNAL_COLORS.recency} delay={220 + i * 80} />
                    </td>
                    <td className="px-3 py-2.5">
                      <MiniSignalBar value={p.signals.sequence} color={SIGNAL_COLORS.sequence} delay={280 + i * 80} />
                    </td>
                  </>
                ) : (
                  <td className="px-3 py-2.5 text-[rgba(232,237,248,0.2)] font-data" colSpan={4}>
                    —
                  </td>
                )}
                <td className="px-3 py-2.5 font-data tabular-nums text-[rgba(232,237,248,0.55)]">
                  {p.visitCount}×
                </td>
                <td className="px-3 py-2.5 font-data tabular-nums text-[rgba(232,237,248,0.4)]">
                  {p.avgDwellMinutes != null ? `${p.avgDwellMinutes}m` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── LLM justification block ──────────────────────────────────────────────────

function JustificationBlock({ predictions }: { predictions: StopPrediction[] }) {
  const withReasoning = predictions.filter((p) => p.reasoning);
  if (!withReasoning.length) return null;

  return (
    <div className="rounded-xl bg-[rgba(45,212,191,0.04)] border border-[rgba(45,212,191,0.14)] p-4">
      <div className="flex items-center gap-2 mb-3">
        <Brain className="h-3.5 w-3.5 text-[#2dd4bf] shrink-0" />
        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#2dd4bf] font-body">
          AI Prediction Justification
        </span>
      </div>
      <div className="space-y-3">
        {withReasoning.map((p) => (
          <div key={p.rank} className="flex gap-3">
            <span
              className={cn(
                "shrink-0 mt-0.5 w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-bold font-data",
                p.rank === 1
                  ? "bg-[rgba(45,212,191,0.2)] text-[#2dd4bf]"
                  : "bg-[rgba(255,255,255,0.06)] text-[rgba(232,237,248,0.35)]"
              )}
            >
              {p.rank}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-body font-semibold text-[rgba(232,237,248,0.75)] mb-0.5">
                {p.locationName}
              </p>
              <p className="text-[12px] text-[rgba(232,237,248,0.6)] font-body leading-relaxed italic">
                {p.reasoning}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Anomaly callout ──────────────────────────────────────────────────────────

function AnomalyCallout({ text }: { text: string }) {
  return (
    <div className="rounded-xl p-4" style={{ background: "rgba(251,146,60,0.07)", border: "1px solid rgba(251,146,60,0.22)" }}>
      <div className="flex items-center gap-2 mb-2">
        <AlertOctagon className="h-4 w-4 text-[#fb923c] shrink-0" />
        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#fb923c] font-body">
          Route Anomaly Detected
        </span>
      </div>
      <p className="text-[13px] text-[rgba(251,146,60,0.85)] font-body leading-relaxed">
        {text}
      </p>
    </div>
  );
}

// ─── Pre-loaded area briefing ─────────────────────────────────────────────────

function PreloadedBriefingCard({
  prediction,
}: {
  prediction: StopPrediction;
}) {
  const briefing = prediction.preloadedBriefing;
  if (!briefing) return null;

  const amenities = briefing.nearbyAmenities ?? [];

  return (
    <div className="rounded-xl bg-[rgba(56,189,248,0.04)] border border-[rgba(56,189,248,0.14)] p-4">
      <div className="flex items-center gap-2 mb-3">
        <MapPin className="h-3.5 w-3.5 text-[#38bdf8] shrink-0" />
        <div className="flex-1 min-w-0">
          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#38bdf8] font-body">
            Area Briefing
          </span>
          {briefing.placeName && (
            <span className="ml-2 text-[10px] text-[rgba(232,237,248,0.45)] font-body">
              · {briefing.placeName}
            </span>
          )}
        </div>
        <span
          className="shrink-0 text-[8.5px] font-bold font-data uppercase tracking-wider px-1.5 py-0.5 rounded"
          style={{
            color: "rgba(45,212,191,0.8)",
            background: "rgba(45,212,191,0.1)",
            border: "1px solid rgba(45,212,191,0.2)",
          }}
        >
          Pre-loaded
        </span>
      </div>

      {briefing.areaBriefing && (
        <p className="text-[13px] text-[rgba(232,237,248,0.65)] font-body leading-relaxed mb-3">
          {briefing.areaBriefing}
        </p>
      )}

      {amenities.length > 0 && (
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[rgba(232,237,248,0.3)] font-body mb-2">
            Nearby
          </p>
          <div className="flex flex-wrap gap-1.5">
            {amenities.slice(0, 8).map((a, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 text-[10px] text-[rgba(232,237,248,0.55)] bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-full px-2.5 py-0.5 font-body"
              >
                {a.name}
                {a.category && (
                  <span className="text-[rgba(232,237,248,0.25)]">· {a.category}</span>
                )}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Typical arrival timing card ──────────────────────────────────────────────

function ArrivalTimingCard({ predictions }: { predictions: StopPrediction[] }) {
  const withTiming = predictions.filter((p) => p.typicalArrivalHour !== undefined);
  if (!withTiming.length) return null;

  function fmtHour(h: number): string {
    const period  = h < 12 ? "AM" : "PM";
    const display = h % 12 === 0 ? 12 : h % 12;
    return `${display}:00 ${period}`;
  }

  return (
    <div>
      <SectionLabel>Typical Arrival Windows</SectionLabel>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {withTiming.map((p) => {
          const isTop = p.rank === 1;
          return (
            <div
              key={p.rank}
              className="rounded-xl px-3 py-2.5"
              style={{
                background: isTop ? "rgba(45,212,191,0.06)" : "rgba(255,255,255,0.03)",
                border: isTop ? "1px solid rgba(45,212,191,0.2)" : "1px solid rgba(255,255,255,0.07)",
              }}
            >
              <div className="flex items-center gap-1 mb-1">
                <Clock className="w-2.5 h-2.5" style={{ color: isTop ? "#2dd4bf" : "rgba(232,237,248,0.3)" }} />
                <span
                  className="text-[9px] font-data font-bold uppercase tracking-wider"
                  style={{ color: isTop ? "#2dd4bf" : "rgba(232,237,248,0.3)" }}
                >
                  #{p.rank}
                </span>
              </div>
              <p className="text-[13px] font-display font-bold text-white leading-none mb-1">
                {fmtHour(p.typicalArrivalHour!)}
              </p>
              <p className="text-[9px] font-body text-[rgba(232,237,248,0.4)] truncate">
                {p.locationName.split(" ").slice(0, 3).join(" ")}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

interface NextStopExpandedCardProps {
  result: NextStopPredictionResult;
}

export default function NextStopExpandedCard({ result }: NextStopExpandedCardProps) {
  const { predictions, basedOnTrips, fromCoordinates, fromCache, fromLLM } = result;
  const top = predictions[0];

  const confidentCount = predictions.filter((p) => p.confidence >= 0.15).length;
  const avgDwell       = top?.avgDwellMinutes;

  return (
    <div className="atlas-card rounded-xl p-5 space-y-6">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 pb-4 border-b border-[rgba(255,255,255,0.07)]">
        <div className="flex items-start gap-3 min-w-0">
          <div className="shrink-0 rounded-xl p-2 bg-[rgba(45,212,191,0.12)]">
            <Navigation className="h-[18px] w-[18px] text-[#2dd4bf]" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] font-body mb-0.5 text-[#2dd4bf]">
              Next-Stop Prediction
            </p>
            <p className="text-sm font-semibold text-white font-body leading-snug">
              Destination inference from {basedOnTrips} historical trips
            </p>
            <p className="text-[10px] text-[rgba(232,237,248,0.35)] font-data mt-0.5">
              Origin: {fromCoordinates.lat.toFixed(4)}, {fromCoordinates.lon.toFixed(4)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
          {fromLLM && (
            <span className="flex items-center gap-1 text-[9px] font-bold font-data uppercase tracking-wider px-2 py-1 rounded-full border text-[rgba(167,139,250,0.9)] border-[rgba(167,139,250,0.25)] bg-[rgba(167,139,250,0.07)]">
              <Brain className="w-2.5 h-2.5" />
              AI Re-ranked
            </span>
          )}
          <span
            className={cn(
              "flex items-center gap-1 text-[9px] font-bold font-data uppercase tracking-wider px-2 py-1 rounded-full border",
              fromCache
                ? "text-[rgba(232,237,248,0.45)] border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)]"
                : "text-[#2dd4bf] border-[rgba(45,212,191,0.25)] bg-[rgba(45,212,191,0.07)]"
            )}
          >
            {fromCache ? (
              <Loader2 className="w-2.5 h-2.5" />
            ) : (
              <Radio className="w-2.5 h-2.5" />
            )}
            {fromCache ? "Cached" : "Live"}
          </span>
        </div>
      </div>

      {/* ── KPI strip ────────────────────────────────────────────────────── */}
      <div className="flex gap-3">
        <KpiTile
          label="Top Prediction"
          value={`${Math.round((top?.confidence ?? 0) * 100)}%`}
          sub={top?.locationName ?? "—"}
          accent="#2dd4bf"
          icon={TrendingUp}
        />
        <KpiTile
          label="Historical Trips"
          value={basedOnTrips.toLocaleString()}
          sub="from this origin"
          accent="#38bdf8"
          icon={Route}
        />
        <KpiTile
          label="Avg Dwell"
          value={avgDwell != null ? `${avgDwell}m` : "—"}
          sub="at top destination"
          accent="#34d399"
          icon={Coffee}
        />
        <KpiTile
          label="Strong Signals"
          value={confidentCount}
          sub={`of ${predictions.length} destinations ≥15%`}
          accent="#f5a623"
          icon={Activity}
        />
      </div>

      {/* ── Anomaly callout (before everything else if present) ────────── */}
      {top?.anomaly && <AnomalyCallout text={top.anomaly} />}

      {/* ── Signal comparison chart ──────────────────────────────────────── */}
      <SignalComparisonChart predictions={predictions} />

      {/* ── Ranked signal table ───────────────────────────────────────────── */}
      <SignalTable predictions={predictions} />

      {/* ── Arrival timing ────────────────────────────────────────────────── */}
      <ArrivalTimingCard predictions={predictions} />

      {/* ── LLM justification ─────────────────────────────────────────────── */}
      <JustificationBlock predictions={predictions} />

      {/* ── Pre-loaded briefing ───────────────────────────────────────────── */}
      {top?.preloadedBriefing && <PreloadedBriefingCard prediction={top} />}
    </div>
  );
}

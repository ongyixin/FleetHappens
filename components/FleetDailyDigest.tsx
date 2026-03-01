"use client";

import { useState, useEffect, useRef } from "react";
import {
  TrendingUp,
  TrendingDown,
  ArrowRight,
  AlertTriangle,
  Zap,
  ChevronDown,
  Brain,
  Newspaper,
  BarChart2,
  AlertOctagon,
  Lightbulb,
  Activity,
  ChevronRight,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import type { CompanyPulseSummary, AceInsight } from "@/types";
import type { DigestResult, InsightType } from "@/app/api/digest/generate/route";

// ─── Icon + colour config per insight type ────────────────────────────────────

const INSIGHT_CONFIG: Record<
  InsightType,
  { icon: React.ElementType; color: string; bg: string }
> = {
  positive: { icon: TrendingUp,    color: "#34d399", bg: "rgba(52,211,153,0.10)"  },
  neutral:  { icon: ArrowRight,    color: "#38bdf8", bg: "rgba(56,189,248,0.10)"  },
  alert:    { icon: AlertTriangle, color: "#fb923c", bg: "rgba(251,146,60,0.10)"  },
  record:   { icon: Zap,           color: "#f5a623", bg: "rgba(245,166,35,0.10)"  },
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function DigestSkeleton() {
  return (
    <div className="px-5 pb-5 space-y-4">
      <div className="space-y-2 pt-1">
        <div className="h-5 w-4/5 rounded skeleton-shimmer" />
        <div className="h-5 w-3/5 rounded skeleton-shimmer" />
      </div>
      <div className="h-px bg-[rgba(255,255,255,0.05)]" />
      <div className="space-y-2.5">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="h-6 w-6 rounded-lg skeleton-shimmer shrink-0" />
            <div className="h-3.5 rounded skeleton-shimmer flex-1" />
          </div>
        ))}
      </div>
      <div className="h-px bg-[rgba(255,255,255,0.05)]" />
      <div className="rounded-lg h-16 skeleton-shimmer" />
    </div>
  );
}

// ─── Prediction direction icon ────────────────────────────────────────────────

function DirectionIcon({ direction }: { direction: "up" | "down" | "stable" }) {
  if (direction === "up")     return <TrendingUp   className="w-3 h-3 text-[#fb923c]" />;
  if (direction === "down")   return <TrendingDown className="w-3 h-3 text-[#34d399]" />;
  return <ArrowRight className="w-3 h-3 text-[rgba(232,237,248,0.4)]" />;
}

function directionColor(direction: "up" | "down" | "stable"): string {
  if (direction === "up")   return "#fb923c";
  if (direction === "down") return "#34d399";
  return "rgba(232,237,248,0.5)";
}

// ─── Brief (text) content ─────────────────────────────────────────────────────

function DigestContent({ digest }: { digest: DigestResult }) {
  const [showRecs, setShowRecs] = useState(false);

  const hasPredictions     = (digest.predictions?.length ?? 0) > 0;
  const hasAnomalies       = (digest.anomalies?.length ?? 0) > 0;
  const hasRecommendations = (digest.recommendations?.length ?? 0) > 0;

  return (
    <div className="px-5 pb-5 space-y-4 animate-fade-up">
      {/* Headline */}
      <p className="font-display font-bold text-[1.1rem] leading-snug text-white pt-1">
        {digest.headline}
      </p>

      <div className="h-px bg-[rgba(255,255,255,0.06)]" />

      {/* Insights */}
      <div className="space-y-1.5 stagger">
        {digest.insights.map((insight, i) => {
          const cfg  = INSIGHT_CONFIG[insight.type];
          const Icon = cfg.icon;
          return (
            <div
              key={i}
              className="flex items-start gap-3 animate-fade-up rounded-lg px-2.5 py-2"
              style={{ background: cfg.bg }}
            >
              <span
                className="mt-0.5 rounded p-1 shrink-0"
                style={{ background: `${cfg.color}18` }}
              >
                <Icon className="h-3 w-3" style={{ color: cfg.color }} />
              </span>
              <span className="text-[13px] font-body text-[rgba(232,237,248,0.82)] leading-snug">
                {insight.text}
              </span>
            </div>
          );
        })}
      </div>

      {/* ── Anomaly alerts ─────────────────────────────────────────────────── */}
      {hasAnomalies && (
        <>
          <div className="h-px bg-[rgba(255,255,255,0.06)]" />
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <AlertOctagon className="w-3 h-3 text-[#fb923c]" />
              <p className="text-[9px] font-data font-bold uppercase tracking-[0.18em] text-[rgba(251,146,60,0.6)]">
                Anomalies Detected
              </p>
            </div>
            <div className="space-y-1.5">
              {digest.anomalies!.map((anomaly, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2.5 rounded-lg px-2.5 py-2"
                  style={{
                    background: anomaly.severity === "critical"
                      ? "rgba(239,68,68,0.07)"
                      : "rgba(251,146,60,0.07)",
                    border: `1px solid ${anomaly.severity === "critical" ? "rgba(239,68,68,0.2)" : "rgba(251,146,60,0.2)"}`,
                  }}
                >
                  <AlertTriangle
                    className="w-3 h-3 mt-0.5 shrink-0"
                    style={{
                      color: anomaly.severity === "critical" ? "#ef4444" : "#fb923c",
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <span
                      className="text-[9px] font-data font-bold uppercase tracking-[0.14em] block mb-0.5"
                      style={{
                        color: anomaly.severity === "critical"
                          ? "rgba(239,68,68,0.7)"
                          : "rgba(251,146,60,0.6)",
                      }}
                    >
                      {anomaly.severity} · {anomaly.metric.replace(/_/g, " ")}
                    </span>
                    <span className="text-[12px] font-body text-[rgba(232,237,248,0.75)] leading-snug">
                      {anomaly.text}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ── Trend predictions ──────────────────────────────────────────────── */}
      {hasPredictions && (
        <>
          <div className="h-px bg-[rgba(255,255,255,0.06)]" />
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Activity className="w-3 h-3 text-[#38bdf8]" />
              <p className="text-[9px] font-data font-bold uppercase tracking-[0.18em] text-[rgba(56,189,248,0.6)]">
                Next-Week Predictions
              </p>
            </div>
            <div className="space-y-1.5">
              {digest.predictions!.map((pred, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2.5 rounded-lg px-2.5 py-2"
                  style={{
                    background: "rgba(56,189,248,0.04)",
                    border: "1px solid rgba(56,189,248,0.1)",
                  }}
                >
                  <DirectionIcon direction={pred.direction} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 mb-0.5">
                      <span
                        className="text-[11px] font-data font-bold tabular-nums"
                        style={{ color: directionColor(pred.direction) }}
                      >
                        {pred.magnitude}
                      </span>
                      <span className="text-[10px] text-[rgba(232,237,248,0.4)] font-data">
                        {pred.metric.replace(/_/g, " ")}
                      </span>
                      <span className="ml-auto text-[9px] font-data text-[rgba(232,237,248,0.25)] tabular-nums">
                        {Math.round(pred.confidence * 100)}% conf
                      </span>
                    </div>
                    <p className="text-[11px] font-body text-[rgba(232,237,248,0.55)] leading-snug italic">
                      {pred.reasoning}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <div className="h-px bg-[rgba(255,255,255,0.06)]" />

      {/* ── Stat of the day ────────────────────────────────────────────────── */}
      <div
        className="rounded-lg p-3.5 flex items-center gap-4"
        style={{
          background: "rgba(245,166,35,0.05)",
          border: "1px solid rgba(245,166,35,0.18)",
        }}
      >
        <div className="shrink-0">
          <p className="text-[9px] font-data font-bold uppercase tracking-[0.18em] text-[rgba(245,166,35,0.55)] mb-0.5">
            Stat of the Day
          </p>
          <p className="text-[10px] font-data text-[rgba(232,237,248,0.4)] leading-tight">
            {digest.statOfDay.label}
          </p>
        </div>
        <div className="w-px self-stretch bg-[rgba(245,166,35,0.15)]" />
        <div className="flex-1 min-w-0">
          <p className="text-2xl font-display font-bold text-[#f5a623] tabular-nums leading-none">
            {digest.statOfDay.value}
          </p>
          {digest.statOfDay.context && (
            <p className="text-[11px] font-body text-[rgba(232,237,248,0.38)] mt-1 leading-snug">
              {digest.statOfDay.context}
            </p>
          )}
        </div>
      </div>

      {/* ── Recommended actions ────────────────────────────────────────────── */}
      {hasRecommendations && (
        <>
          <button
            onClick={() => setShowRecs((v) => !v)}
            className="w-full flex items-center gap-2 text-left group"
          >
            <Lightbulb className="w-3 h-3 text-[rgba(167,139,250,0.6)] shrink-0" />
            <p className="text-[9px] font-data font-bold uppercase tracking-[0.18em] text-[rgba(167,139,250,0.5)] flex-1">
              Recommended Actions
            </p>
            <span className="text-[9px] font-data text-[rgba(232,237,248,0.25)] group-hover:text-[rgba(232,237,248,0.5)] transition-colors">
              {showRecs ? "hide" : `show ${digest.recommendations!.length}`}
            </span>
            <ChevronRight
              className={`w-3 h-3 text-[rgba(167,139,250,0.4)] transition-transform duration-200 ${showRecs ? "rotate-90" : ""}`}
            />
          </button>

          {showRecs && (
            <div className="space-y-1.5">
              {digest.recommendations!.map((rec, i) => {
                const priorityColor =
                  rec.priority === "high"
                    ? "#ef4444"
                    : rec.priority === "medium"
                    ? "#f5a623"
                    : "rgba(232,237,248,0.35)";

                return (
                  <div
                    key={i}
                    className="flex items-start gap-2.5 rounded-lg px-2.5 py-2"
                    style={{
                      background: "rgba(167,139,250,0.04)",
                      border: "1px solid rgba(167,139,250,0.12)",
                    }}
                  >
                    <span
                      className="text-[8.5px] font-data font-bold uppercase tracking-[0.12em] shrink-0 mt-0.5 px-1.5 py-0.5 rounded"
                      style={{
                        color: priorityColor,
                        background: `${priorityColor}18`,
                        border: `1px solid ${priorityColor}30`,
                      }}
                    >
                      {rec.priority}
                    </span>
                    <p className="text-[12px] font-body text-[rgba(232,237,248,0.72)] leading-snug">
                      {rec.text}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Chart tooltip ─────────────────────────────────────────────────────────────

interface TooltipPayloadItem {
  value: number;
  unit?: string;
  color?: string;
  fill?: string;
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-[rgba(255,255,255,0.1)] bg-[#1a1d23] px-3 py-2 shadow-xl pointer-events-none">
      <p className="text-[10px] font-data text-[rgba(232,237,248,0.45)] mb-1">{label}</p>
      {payload.map((p, i) => (
        <p
          key={i}
          className="text-[12px] font-display font-bold tabular-nums"
          style={{ color: p.color ?? p.fill ?? "#f5a623" }}
        >
          {p.value.toLocaleString()}
          {p.unit ? <span className="font-body font-normal text-[10px] ml-0.5">{p.unit}</span> : null}
        </p>
      ))}
    </div>
  );
}

// ─── Chart view ───────────────────────────────────────────────────────────────

function DigestChartView({ summary }: { summary: CompanyPulseSummary }) {
  const fleets = summary.fleets;

  const shortName = (name: string) =>
    name.replace(/\s+(Region|Fleet|Group|Division)$/i, "").slice(0, 11);

  const axisStyle = {
    fontSize: 9,
    fill: "rgba(232,237,248,0.38)",
    fontFamily: "inherit",
  };

  const distData = fleets.map((f) => ({
    name:  shortName(f.group.name),
    km:    Math.round(f.totalDistanceKm),
    color: f.group.color ?? "#f5a623",
  }));

  const tripData = fleets.map((f) => ({
    name:  shortName(f.group.name),
    trips: f.totalTrips,
    color: f.group.color ?? "#f5a623",
  }));

  const idleData = fleets.map((f) => ({
    name:  shortName(f.group.name),
    idle:  parseFloat(f.avgIdlePct.toFixed(1)),
    color: f.avgIdlePct > 20 ? "#fb923c" : f.avgIdlePct > 12 ? "#f5a623" : "#34d399",
  }));

  const barHeight  = 22;
  const chartHeight = fleets.length * barHeight + 16;

  return (
    <div className="px-4 pb-5 pt-1 space-y-4 animate-fade-up">
      {/* Distance per fleet */}
      <div>
        <p className="text-[9px] font-data font-bold uppercase tracking-[0.18em] text-[rgba(232,237,248,0.3)] mb-2">
          Distance this week (km)
        </p>
        <ResponsiveContainer width="100%" height={chartHeight}>
          <BarChart
            data={distData}
            layout="vertical"
            margin={{ top: 0, right: 10, bottom: 0, left: 56 }}
          >
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="name"
              tick={axisStyle}
              width={56}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              content={<ChartTooltip />}
              cursor={{ fill: "rgba(255,255,255,0.03)" }}
            />
            <Bar dataKey="km" radius={[0, 3, 3, 0]} maxBarSize={13} unit=" km">
              {distData.map((d, i) => (
                <Cell key={i} fill={d.color} fillOpacity={0.85} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="h-px bg-[rgba(255,255,255,0.05)]" />

      {/* Trips + Idle side by side */}
      <div className="grid grid-cols-2 gap-x-5">
        <div>
          <p className="text-[9px] font-data font-bold uppercase tracking-[0.18em] text-[rgba(232,237,248,0.3)] mb-2">
            Trips
          </p>
          <ResponsiveContainer width="100%" height={chartHeight}>
            <BarChart
              data={tripData}
              layout="vertical"
              margin={{ top: 0, right: 6, bottom: 0, left: 44 }}
            >
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="name"
                tick={axisStyle}
                width={44}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                content={<ChartTooltip />}
                cursor={{ fill: "rgba(255,255,255,0.03)" }}
              />
              <Bar dataKey="trips" radius={[0, 3, 3, 0]} maxBarSize={13}>
                {tripData.map((d, i) => (
                  <Cell key={i} fill={d.color} fillOpacity={0.7} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Idle % donut */}
        <div>
          <p className="text-[9px] font-data font-bold uppercase tracking-[0.18em] text-[rgba(232,237,248,0.3)] mb-1">
            Idle %
          </p>
          <ResponsiveContainer width="100%" height={100}>
            <PieChart>
              <Pie
                data={idleData}
                cx="50%"
                cy="50%"
                innerRadius={28}
                outerRadius={44}
                paddingAngle={2}
                dataKey="idle"
                startAngle={90}
                endAngle={-270}
              >
                {idleData.map((d, i) => (
                  <Cell key={i} fill={d.color} fillOpacity={0.88} stroke="none" />
                ))}
              </Pie>
              <Tooltip content={<ChartTooltip />} cursor={false} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1 mt-1">
            {idleData.map((d, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <div className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: d.color }} />
                <span className="text-[9px] font-data text-[rgba(232,237,248,0.38)] truncate flex-1 min-w-0">
                  {d.name}
                </span>
                <span className="text-[9px] font-data font-bold tabular-nums" style={{ color: d.color }}>
                  {d.idle}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="h-px bg-[rgba(255,255,255,0.05)]" />

      {/* Totals footer */}
      <div className="grid grid-cols-4 gap-2">
        {[
          {
            label: "Total km",
            value:
              summary.totals.distanceKm >= 1000
                ? `${(summary.totals.distanceKm / 1000).toFixed(1)}k`
                : summary.totals.distanceKm.toLocaleString(),
            color: "#f5a623",
          },
          {
            label: "Trips",
            value: summary.totals.trips.toLocaleString(),
            color: "rgba(232,237,248,0.85)",
          },
          {
            label: "Active",
            value: `${summary.totals.activeVehicles}/${summary.totals.vehicles}`,
            color: "rgba(232,237,248,0.85)",
          },
          {
            label: "Avg idle",
            value: `${summary.totals.avgIdlePct.toFixed(1)}%`,
            color:
              summary.totals.avgIdlePct > 20
                ? "#fb923c"
                : summary.totals.avgIdlePct > 12
                ? "#f5a623"
                : "#34d399",
          },
        ].map((stat, i) => (
          <div
            key={i}
            className="rounded-lg px-2.5 py-2 text-center"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <p className="text-[8px] font-data uppercase tracking-[0.14em] text-[rgba(232,237,248,0.3)] mb-0.5">
              {stat.label}
            </p>
            <p
              className="text-sm font-display font-bold tabular-nums leading-none"
              style={{ color: stat.color }}
            >
              {stat.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

type DigestView = "brief" | "charts";

interface Props {
  summary: CompanyPulseSummary | null;
  aceInsight: AceInsight | null;
}

export default function FleetDailyDigest({ summary, aceInsight }: Props) {
  const [digest, setDigest]       = useState<DigestResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen]       = useState(true);
  const [digestView, setDigestView] = useState<DigestView>("brief");
  const hasFetched = useRef(false);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    month:   "short",
    day:     "numeric",
    year:    "numeric",
  });

  useEffect(() => {
    if (!summary || hasFetched.current) return;
    hasFetched.current = true;

    async function loadDigest() {
      setIsLoading(true);
      try {
        const res = await fetch("/api/digest/generate", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            totals:     summary!.totals,
            fleetNames: summary!.fleets.map((f) => f.group.name),
            aceRows:    aceInsight?.rows ?? [],
          }),
        });
        const data = (await res.json()) as { ok: boolean; data?: DigestResult };
        if (data.ok && data.data) setDigest(data.data);
      } catch {
        // Silent fail
      } finally {
        setIsLoading(false);
      }
    }

    loadDigest();
  }, [summary]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isLoading && !digest && !summary) return null;

  const showContent  = isLoading || digest;
  const canShowCharts = !!summary;

  // Anomaly/prediction counts for badge
  const anomalyCount = digest?.anomalies?.length ?? 0;
  const predCount    = digest?.predictions?.length ?? 0;

  const maxHeight = isOpen
    ? digestView === "charts"
      ? "900px"
      : "1000px"
    : "0px";

  return (
    <div
      className="atlas-card rounded-xl overflow-hidden animate-fade-up"
      style={{ borderLeft: "2px solid rgba(245,166,35,0.5)" }}
    >
      {/* Header bar */}
      <button
        onClick={() => setIsOpen((o) => !o)}
        className="w-full px-4 py-3 flex items-center gap-2.5 hover:bg-[rgba(255,255,255,0.02)] transition-colors"
      >
        {/* Blinking pulse dot */}
        <span className="relative flex h-2 w-2 shrink-0">
          {isLoading && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#f5a623] opacity-60" />
          )}
          <span
            className={`relative inline-flex rounded-full h-2 w-2 transition-colors ${
              isLoading ? "bg-[rgba(245,166,35,0.45)]" : "bg-[#f5a623]"
            }`}
          />
        </span>

        <Newspaper className="h-3 w-3 text-[#f5a623] shrink-0" />

        <span className="text-[10px] font-data font-bold uppercase tracking-[0.2em] text-[#f5a623]">
          Fleet Daily Brief
        </span>

        <span className="w-px h-3 bg-[rgba(255,255,255,0.1)] shrink-0" />

        <span className="text-[10px] font-data text-[rgba(232,237,248,0.32)]">
          {today}
        </span>

        {isLoading && (
          <>
            <span className="w-px h-3 bg-[rgba(255,255,255,0.1)] shrink-0" />
            <span className="text-[10px] font-body text-[rgba(232,237,248,0.28)] italic">
              Analysing fleet data…
            </span>
          </>
        )}

        {digest?.fromLLM && !isLoading && (
          <>
            <span className="w-px h-3 bg-[rgba(255,255,255,0.1)] shrink-0" />
            <span className="flex items-center gap-1 text-[10px] font-body text-[rgba(232,237,248,0.3)]">
              <Brain className="h-2.5 w-2.5 text-[#f5a623]" />
              AI Analyst
            </span>
          </>
        )}

        {/* Anomaly count badge */}
        {anomalyCount > 0 && !isLoading && (
          <span
            className="flex items-center gap-1 text-[9px] font-data font-bold px-1.5 py-0.5 rounded"
            style={{
              color: "rgba(251,146,60,0.9)",
              background: "rgba(251,146,60,0.1)",
              border: "1px solid rgba(251,146,60,0.25)",
            }}
          >
            <AlertTriangle className="w-2.5 h-2.5" />
            {anomalyCount} anomal{anomalyCount === 1 ? "y" : "ies"}
          </span>
        )}

        {/* Prediction count badge */}
        {predCount > 0 && !isLoading && (
          <span
            className="flex items-center gap-1 text-[9px] font-data font-bold px-1.5 py-0.5 rounded"
            style={{
              color: "rgba(56,189,248,0.85)",
              background: "rgba(56,189,248,0.08)",
              border: "1px solid rgba(56,189,248,0.2)",
            }}
          >
            <Activity className="w-2.5 h-2.5" />
            {predCount} prediction{predCount === 1 ? "" : "s"}
          </span>
        )}

        {/* View toggle */}
        {canShowCharts && (
          <span
            className="ml-auto flex rounded-md border border-[rgba(255,255,255,0.08)] overflow-hidden bg-[rgba(255,255,255,0.03)] shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                setDigestView("brief");
                if (!isOpen) setIsOpen(true);
              }}
              title="Text brief"
              className={`h-6 w-6 flex items-center justify-center transition-all ${
                digestView === "brief"
                  ? "bg-[rgba(245,166,35,0.18)] text-[#f5a623]"
                  : "text-[rgba(232,237,248,0.35)] hover:text-[rgba(232,237,248,0.65)]"
              }`}
            >
              <Newspaper className="h-3 w-3" />
            </button>
            <span className="w-px bg-[rgba(255,255,255,0.08)]" />
            <button
              onClick={(e) => {
                e.stopPropagation();
                setDigestView("charts");
                if (!isOpen) setIsOpen(true);
              }}
              title="Chart view"
              className={`h-6 w-6 flex items-center justify-center transition-all ${
                digestView === "charts"
                  ? "bg-[rgba(245,166,35,0.18)] text-[#f5a623]"
                  : "text-[rgba(232,237,248,0.35)] hover:text-[rgba(232,237,248,0.65)]"
              }`}
            >
              <BarChart2 className="h-3 w-3" />
            </button>
          </span>
        )}

        <ChevronDown
          className={`h-3.5 w-3.5 ${canShowCharts ? "" : "ml-auto"} text-[rgba(232,237,248,0.28)] transition-transform duration-200 ${
            isOpen ? "" : "-rotate-90"
          }`}
        />
      </button>

      {/* Collapsible content */}
      <div
        className="overflow-hidden transition-[max-height] duration-300 ease-in-out"
        style={{ maxHeight }}
      >
        {digestView === "charts" && canShowCharts ? (
          <DigestChartView summary={summary} />
        ) : showContent ? (
          isLoading ? (
            <DigestSkeleton />
          ) : digest ? (
            <DigestContent digest={digest} />
          ) : null
        ) : null}
      </div>
    </div>
  );
}

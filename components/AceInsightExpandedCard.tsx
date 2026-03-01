"use client";

/**
 * AceInsightExpandedCard
 *
 * Maximised view of a Fleet Intelligence column. Detects the insight type from
 * the columns present in the AceInsight response and renders type-specific
 * enriched analytics: derived KPIs, enhanced charts, full data tables, and
 * contextual narrative — all computed client-side from the existing row data.
 *
 * Insight types handled:
 *   top-vehicles   — device_name, total_distance_km, trip_count
 *   idle-by-day    — day_of_week, avg_idle_pct, avg_idle_minutes
 *   common-stops   — location_name, visit_count, avg_dwell_minutes
 *   trip-duration  — metric, value
 */

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Cell,
  ReferenceLine,
  CartesianGrid,
} from "recharts";
import {
  Brain,
  Radio,
  Loader2,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Clock,
  MapPin,
  Truck,
  Activity,
  Route,
  Gauge,
  Zap,
} from "lucide-react";
import type { AceInsight } from "@/types";
import { cn } from "@/lib/utils";

// ─── Type detection ───────────────────────────────────────────────────────────

type InsightType = "top-vehicles" | "idle-by-day" | "common-stops" | "trip-duration" | "unknown";

function detectType(insight: AceInsight): InsightType {
  const cols = insight.columns;
  if (cols.includes("device_name") && cols.includes("total_distance_km")) return "top-vehicles";
  if (cols.includes("day_of_week") && cols.includes("avg_idle_pct")) return "idle-by-day";
  if (cols.includes("location_name") && cols.includes("visit_count")) return "common-stops";
  if (cols.includes("metric") && cols.includes("value")) return "trip-duration";
  return "unknown";
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function KpiTile({
  label,
  value,
  sub,
  accent,
  icon: Icon,
  trend,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
  icon?: React.ElementType;
  trend?: "up" | "down" | "neutral";
}) {
  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : null;
  const trendColor =
    trend === "up" ? "text-[#34d399]" : trend === "down" ? "text-[#f87171]" : "text-[rgba(232,237,248,0.4)]";

  return (
    <div className="flex-1 min-w-0 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.07)] px-4 py-3">
      <div className="flex items-center gap-1.5 mb-1">
        {Icon && <Icon className="h-3 w-3 shrink-0" style={{ color: accent ?? "rgba(232,237,248,0.35)" }} />}
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] font-body truncate" style={{ color: accent ?? "rgba(232,237,248,0.35)" }}>
          {label}
        </p>
      </div>
      <div className="flex items-baseline gap-2">
        <p className="text-[22px] font-display font-extrabold text-white leading-none tracking-tight">
          {value}
        </p>
        {TrendIcon && <TrendIcon className={cn("h-3.5 w-3.5 shrink-0", trendColor)} />}
      </div>
      {sub && <p className="text-[10px] text-[rgba(232,237,248,0.4)] font-body mt-1 truncate">{sub}</p>}
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

function ReasoningBlock({ reasoning }: { reasoning: string }) {
  return (
    <div className="rounded-xl bg-[rgba(245,166,35,0.05)] border border-[rgba(245,166,35,0.14)] p-4">
      <div className="flex items-center gap-2 mb-2">
        <Brain className="h-3.5 w-3.5 text-[#f5a623] shrink-0" />
        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#f5a623] font-body">
          Ace Analysis
        </span>
      </div>
      <p className="text-[12.5px] text-[rgba(232,237,248,0.65)] font-body leading-relaxed">{reasoning}</p>
    </div>
  );
}

const CHART_COLORS = ["#f5a623", "#fb923c", "#38bdf8", "#34d399", "#a78bfa", "#f87171", "#fbbf24", "#60a5fa", "#4ade80", "#e879f9"];

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

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

// ─── Top Vehicles expanded ────────────────────────────────────────────────────

function TopVehiclesExpanded({ insight }: { insight: AceInsight }) {
  const rows = insight.rows as Array<{ device_name: string; total_distance_km: number; trip_count: number }>;

  const totalDistance = rows.reduce((s, r) => s + (Number(r.total_distance_km) || 0), 0);
  const totalTrips    = rows.reduce((s, r) => s + (Number(r.trip_count)        || 0), 0);
  const avgKmPerTrip  = totalTrips > 0 ? totalDistance / totalTrips : 0;
  const topShare      = totalDistance > 0 ? ((rows[0]?.total_distance_km ?? 0) / totalDistance) * 100 : 0;
  const top3Share     = totalDistance > 0
    ? (rows.slice(0, 3).reduce((s, r) => s + (Number(r.total_distance_km) || 0), 0) / totalDistance) * 100
    : 0;

  const enriched = rows.map((r, i) => ({
    ...r,
    kmPerTrip: r.trip_count > 0 ? Number((r.total_distance_km / r.trip_count).toFixed(1)) : 0,
    sharePct: totalDistance > 0 ? Number(((r.total_distance_km / totalDistance) * 100).toFixed(1)) : 0,
    shortName: String(r.device_name).split(" — ")[0],
  }));

  return (
    <div className="space-y-5">
      {/* KPI strip */}
      <div className="flex gap-3">
        <KpiTile label="Fleet Distance" value={`${totalDistance.toLocaleString()} km`} sub="last 14 days total" accent="#f5a623" icon={Route} />
        <KpiTile label="Total Trips" value={totalTrips.toLocaleString()} sub="all vehicles combined" accent="#38bdf8" icon={Truck} />
        <KpiTile label="Avg km / Trip" value={`${avgKmPerTrip.toFixed(1)} km`} sub="fleet average" accent="#34d399" icon={Gauge} />
        <KpiTile label="Top 3 Share" value={`${top3Share.toFixed(0)}%`} sub="of fleet distance" accent="#a78bfa" icon={Activity} />
      </div>

      {/* Chart: full 10-vehicle distance breakdown */}
      <div>
        <SectionLabel>Fleet Distance Distribution — All Vehicles</SectionLabel>
        <div className="h-[160px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={enriched} margin={{ top: 4, right: 0, bottom: 0, left: -16 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="shortName"
                tick={{ fontSize: 9, fill: "rgba(232,237,248,0.35)", fontFamily: "JetBrains Mono" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 9, fill: "rgba(232,237,248,0.35)", fontFamily: "JetBrains Mono" }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                content={<ChartTooltip formatter={(v) => [`${v.toLocaleString()} km`, "Distance"]} />}
                cursor={{ fill: "rgba(255,255,255,0.04)" }}
              />
              <Bar dataKey="total_distance_km" radius={[3, 3, 0, 0]} maxBarSize={32}>
                {enriched.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} opacity={i < 3 ? 0.9 : 0.55} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Full enriched table */}
      <div>
        <SectionLabel>Vehicle Performance — Full Ranking</SectionLabel>
        <div className="rounded-xl overflow-hidden border border-[rgba(255,255,255,0.08)]">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-[rgba(255,255,255,0.04)]">
                {["#", "Vehicle", "Distance", "Trips", "km / Trip", "Fleet Share"].map((h) => (
                  <th key={h} className="px-3 py-2 text-left font-bold text-[rgba(232,237,248,0.35)] uppercase tracking-wider text-[9px] font-body">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(255,255,255,0.05)]">
              {enriched.map((r, i) => (
                <tr key={i} className={cn("hover:bg-[rgba(255,255,255,0.03)] transition-colors", i === 0 && "bg-[rgba(245,166,35,0.04)]")}>
                  <td className="px-3 py-2 font-data tabular-nums text-[rgba(232,237,248,0.4)]">{i + 1}</td>
                  <td className="px-3 py-2 font-body font-medium text-white">{r.device_name}</td>
                  <td className="px-3 py-2 font-data tabular-nums text-[rgba(232,237,248,0.75)]">{r.total_distance_km.toLocaleString()} km</td>
                  <td className="px-3 py-2 font-data tabular-nums text-[rgba(232,237,248,0.55)]">{r.trip_count}</td>
                  <td className="px-3 py-2 font-data tabular-nums text-[rgba(232,237,248,0.55)]">{r.kmPerTrip} km</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1 bg-[rgba(255,255,255,0.06)] rounded-full overflow-hidden" style={{ maxWidth: 60 }}>
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${r.sharePct}%`, background: CHART_COLORS[i % CHART_COLORS.length], opacity: 0.8 }}
                        />
                      </div>
                      <span className="text-[10px] font-data text-[rgba(232,237,248,0.5)]">{r.sharePct}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[10px] text-[rgba(232,237,248,0.3)] font-body mt-2">
          Top vehicle accounts for {topShare.toFixed(1)}% of fleet distance · Top 3 account for {top3Share.toFixed(0)}%
        </p>
      </div>

      {insight.reasoning && <ReasoningBlock reasoning={insight.reasoning} />}
    </div>
  );
}

// ─── Idle by Day expanded ─────────────────────────────────────────────────────

const IDLE_BENCHMARK_PCT = 15;

function IdleByDayExpanded({ insight }: { insight: AceInsight }) {
  const rows = insight.rows as Array<{ day_of_week: string; avg_idle_pct: number; avg_idle_minutes: number }>;

  const idlePcts    = rows.map((r) => Number(r.avg_idle_pct) || 0);
  const idleMins    = rows.map((r) => Number(r.avg_idle_minutes) || 0);
  const fleetAvg    = idlePcts.reduce((s, v) => s + v, 0) / (idlePcts.length || 1);
  const weeklyMins  = idleMins.reduce((s, v) => s + v, 0);
  const worstDay    = rows.reduce((a, b) => (Number(b.avg_idle_pct) > Number(a.avg_idle_pct) ? b : a), rows[0]);
  const bestDay     = rows.reduce((a, b) => (Number(b.avg_idle_pct) < Number(a.avg_idle_pct) ? b : a), rows[0]);

  const weekdays    = rows.filter((r) => !["Saturday", "Sunday"].includes(r.day_of_week));
  const weekends    = rows.filter((r) => ["Saturday", "Sunday"].includes(r.day_of_week));
  const weekdayAvg  = weekdays.length ? weekdays.reduce((s, r) => s + Number(r.avg_idle_pct), 0) / weekdays.length : 0;
  const weekendAvg  = weekends.length ? weekends.reduce((s, r) => s + Number(r.avg_idle_pct), 0) / weekends.length : 0;

  // Wasted fuel estimate: avg 0.7 L/hr per idling vehicle, fleet assumed 10 vehicles
  const VEHICLES_ESTIMATE = 10;
  const weeklyWastedL = ((weeklyMins / 60) * 0.7 * VEHICLES_ESTIMATE).toFixed(0);

  const chartData = rows.map((r) => ({
    day: String(r.day_of_week).slice(0, 3),
    idle_pct: Number(r.avg_idle_pct),
    idle_min: Number(r.avg_idle_minutes),
    delta: Number((Number(r.avg_idle_pct) - IDLE_BENCHMARK_PCT).toFixed(1)),
  }));

  return (
    <div className="space-y-5">
      {/* KPI strip */}
      <div className="flex gap-3">
        <KpiTile label="Worst Day" value={worstDay?.day_of_week ?? "—"} sub={`${worstDay?.avg_idle_pct ?? 0}% idle avg`} accent="#f87171" icon={AlertTriangle} trend="down" />
        <KpiTile label="Best Day" value={bestDay?.day_of_week ?? "—"} sub={`${bestDay?.avg_idle_pct ?? 0}% idle avg`} accent="#34d399" icon={Zap} trend="up" />
        <KpiTile label="Fleet Avg Idle" value={`${fleetAvg.toFixed(1)}%`} sub={`benchmark: ${IDLE_BENCHMARK_PCT}%`} accent="#f5a623" icon={Gauge} />
        <KpiTile label="Est. Fuel Waste" value={`~${weeklyWastedL} L`} sub="per week (fleet)" accent="#a78bfa" icon={Activity} />
      </div>

      {/* Chart: idle % with benchmark line */}
      <div>
        <SectionLabel>Daily Idle % vs {IDLE_BENCHMARK_PCT}% Benchmark</SectionLabel>
        <div className="h-[150px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 0, bottom: 0, left: -16 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 9, fill: "rgba(232,237,248,0.35)", fontFamily: "JetBrains Mono" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 9, fill: "rgba(232,237,248,0.35)", fontFamily: "JetBrains Mono" }}
                tickLine={false}
                axisLine={false}
                domain={[0, "dataMax + 5"]}
              />
              <Tooltip
                content={<ChartTooltip formatter={(v, name) => name === "idle_pct" ? [`${v}%`, "Avg Idle"] : [`${v} min`, "Avg Idle Min"]} />}
                cursor={{ fill: "rgba(255,255,255,0.04)" }}
              />
              <ReferenceLine
                y={IDLE_BENCHMARK_PCT}
                stroke="rgba(248,113,113,0.55)"
                strokeDasharray="5 4"
                label={{ value: `${IDLE_BENCHMARK_PCT}% target`, position: "right", fontSize: 8, fill: "rgba(248,113,113,0.6)", fontFamily: "JetBrains Mono" }}
              />
              <Bar dataKey="idle_pct" radius={[3, 3, 0, 0]} maxBarSize={36}>
                {chartData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.idle_pct > IDLE_BENCHMARK_PCT ? "#f87171" : "#34d399"}
                    opacity={0.8}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Weekday vs weekend split */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-[rgba(248,113,113,0.05)] border border-[rgba(248,113,113,0.15)] p-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[rgba(248,113,113,0.65)] font-body mb-1">Weekday Avg</p>
          <p className="text-2xl font-display font-extrabold text-white">{weekdayAvg.toFixed(1)}%</p>
          <p className="text-[10px] text-[rgba(232,237,248,0.4)] font-body mt-0.5">Mon – Fri · {weekdays.length} days</p>
        </div>
        <div className="rounded-xl bg-[rgba(52,211,153,0.05)] border border-[rgba(52,211,153,0.15)] p-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[rgba(52,211,153,0.65)] font-body mb-1">Weekend Avg</p>
          <p className="text-2xl font-display font-extrabold text-white">{weekendAvg.toFixed(1)}%</p>
          <p className="text-[10px] text-[rgba(232,237,248,0.4)] font-body mt-0.5">Sat – Sun · {weekends.length} days</p>
        </div>
      </div>

      {/* Full table with delta vs target */}
      <div>
        <SectionLabel>Day-by-Day Breakdown vs Target</SectionLabel>
        <div className="rounded-xl overflow-hidden border border-[rgba(255,255,255,0.08)]">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-[rgba(255,255,255,0.04)]">
                {["Day", "Avg Idle %", "Avg Idle Min", "vs Target"].map((h) => (
                  <th key={h} className="px-3 py-2 text-left font-bold text-[rgba(232,237,248,0.35)] uppercase tracking-wider text-[9px] font-body">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(255,255,255,0.05)]">
              {chartData.map((r, i) => (
                <tr key={i} className="hover:bg-[rgba(255,255,255,0.03)] transition-colors">
                  <td className="px-3 py-2 font-body font-medium text-white">{rows[i]?.day_of_week}</td>
                  <td className="px-3 py-2 font-data tabular-nums text-[rgba(232,237,248,0.75)]">{r.idle_pct}%</td>
                  <td className="px-3 py-2 font-data tabular-nums text-[rgba(232,237,248,0.55)]">{r.idle_min} min</td>
                  <td className="px-3 py-2">
                    <span className={cn(
                      "text-[10px] font-bold font-data px-1.5 py-0.5 rounded",
                      r.delta > 0
                        ? "text-[#f87171] bg-[rgba(248,113,113,0.1)]"
                        : "text-[#34d399] bg-[rgba(52,211,153,0.1)]"
                    )}>
                      {r.delta > 0 ? `+${r.delta}%` : `${r.delta}%`}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {insight.reasoning && <ReasoningBlock reasoning={insight.reasoning} />}
    </div>
  );
}

// ─── Common Stops expanded ────────────────────────────────────────────────────

const DWELL_THRESHOLDS = { fast: 30, moderate: 60 }; // minutes

function dwellLabel(min: number): { label: string; color: string; bg: string } {
  if (min <= DWELL_THRESHOLDS.fast) return { label: "Efficient", color: "text-[#34d399]", bg: "bg-[rgba(52,211,153,0.1)]" };
  if (min <= DWELL_THRESHOLDS.moderate) return { label: "Moderate", color: "text-[#f5a623]", bg: "bg-[rgba(245,166,35,0.1)]" };
  return { label: "Bottleneck", color: "text-[#f87171]", bg: "bg-[rgba(248,113,113,0.1)]" };
}

function CommonStopsExpanded({ insight }: { insight: AceInsight }) {
  const rows = insight.rows as Array<{ location_name: string; visit_count: number; avg_dwell_minutes: number }>;

  const totalVisits  = rows.reduce((s, r) => s + (Number(r.visit_count) || 0), 0);
  const avgDwell     = rows.length ? rows.reduce((s, r) => s + (Number(r.avg_dwell_minutes) || 0), 0) / rows.length : 0;
  const topVisit     = rows[0];
  const topShare     = totalVisits > 0 ? ((topVisit?.visit_count ?? 0) / totalVisits) * 100 : 0;
  const bottleneck   = rows.reduce((a, b) => (Number(b.avg_dwell_minutes) > Number(a.avg_dwell_minutes) ? b : a), rows[0]);

  const chartData = rows.map((r) => ({
    name: String(r.location_name).split(" ").slice(0, 2).join(" "),
    visits: Number(r.visit_count),
    dwell: Number(r.avg_dwell_minutes),
  }));

  return (
    <div className="space-y-5">
      {/* KPI strip */}
      <div className="flex gap-3">
        <KpiTile label="Total Visits" value={totalVisits.toLocaleString()} sub="across top 5 stops" accent="#38bdf8" icon={MapPin} />
        <KpiTile label="Top Stop Share" value={`${topShare.toFixed(0)}%`} sub={String(topVisit?.location_name ?? "—").split(" ").slice(0, 2).join(" ")} accent="#f5a623" icon={Activity} />
        <KpiTile label="Avg Dwell" value={`${avgDwell.toFixed(0)} min`} sub="fleet avg at top stops" accent="#34d399" icon={Clock} />
        <KpiTile label="Bottleneck" value={`${bottleneck?.avg_dwell_minutes ?? 0} min`} sub={String(bottleneck?.location_name ?? "—").split(" ").slice(0, 2).join(" ")} accent="#f87171" icon={AlertTriangle} trend="down" />
      </div>

      {/* Visit count chart */}
      <div>
        <SectionLabel>Visit Volume by Stop Location</SectionLabel>
        <div className="h-[140px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 4, right: 0, bottom: 0, left: -16 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 9, fill: "rgba(232,237,248,0.35)", fontFamily: "JetBrains Mono" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 9, fill: "rgba(232,237,248,0.35)", fontFamily: "JetBrains Mono" }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                content={<ChartTooltip formatter={(v) => [v, "Visits"]} />}
                cursor={{ fill: "rgba(255,255,255,0.04)" }}
              />
              <Bar dataKey="visits" radius={[3, 3, 0, 0]} maxBarSize={48}>
                {chartData.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} opacity={0.85} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Full table with dwell efficiency */}
      <div>
        <SectionLabel>Stop Locations — Visit & Dwell Analysis</SectionLabel>
        <div className="rounded-xl overflow-hidden border border-[rgba(255,255,255,0.08)]">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-[rgba(255,255,255,0.04)]">
                {["Location", "Visits", "Share", "Avg Dwell", "Efficiency"].map((h) => (
                  <th key={h} className="px-3 py-2 text-left font-bold text-[rgba(232,237,248,0.35)] uppercase tracking-wider text-[9px] font-body">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(255,255,255,0.05)]">
              {rows.map((r, i) => {
                const share = totalVisits > 0 ? ((r.visit_count / totalVisits) * 100).toFixed(1) : "0";
                const eff = dwellLabel(Number(r.avg_dwell_minutes));
                return (
                  <tr key={i} className={cn("hover:bg-[rgba(255,255,255,0.03)] transition-colors", i === 0 && "bg-[rgba(56,189,248,0.04)]")}>
                    <td className="px-3 py-2 font-body font-medium text-white">{r.location_name}</td>
                    <td className="px-3 py-2 font-data tabular-nums text-[rgba(232,237,248,0.75)]">{Number(r.visit_count).toLocaleString()}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        <div className="w-10 h-1 bg-[rgba(255,255,255,0.06)] rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-[#38bdf8]" style={{ width: `${share}%`, opacity: 0.75 }} />
                        </div>
                        <span className="text-[10px] font-data text-[rgba(232,237,248,0.45)]">{share}%</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 font-data tabular-nums text-[rgba(232,237,248,0.55)]">{r.avg_dwell_minutes} min</td>
                    <td className="px-3 py-2">
                      <span className={cn("text-[9px] font-bold font-body px-1.5 py-0.5 rounded", eff.color, eff.bg)}>
                        {eff.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-[10px] text-[rgba(232,237,248,0.3)] font-body mt-2">
          Top stop ({topVisit?.location_name ?? "—"}) accounts for {topShare.toFixed(1)}% of all stop events in top 5 locations
        </p>
      </div>

      {/* Dwell time breakdown */}
      <div>
        <SectionLabel>Dwell Time Breakdown</SectionLabel>
        <div className="h-[120px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 4, right: 0, bottom: 0, left: -16 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 9, fill: "rgba(232,237,248,0.35)", fontFamily: "JetBrains Mono" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 9, fill: "rgba(232,237,248,0.35)", fontFamily: "JetBrains Mono" }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                content={<ChartTooltip formatter={(v) => [`${v} min`, "Avg Dwell"]} />}
                cursor={{ fill: "rgba(255,255,255,0.04)" }}
              />
              <ReferenceLine
                y={DWELL_THRESHOLDS.fast}
                stroke="rgba(52,211,153,0.45)"
                strokeDasharray="4 3"
                label={{ value: "Efficient ≤30 min", position: "right", fontSize: 8, fill: "rgba(52,211,153,0.55)", fontFamily: "JetBrains Mono" }}
              />
              <ReferenceLine
                y={DWELL_THRESHOLDS.moderate}
                stroke="rgba(248,113,113,0.45)"
                strokeDasharray="4 3"
                label={{ value: "Bottleneck >60 min", position: "right", fontSize: 8, fill: "rgba(248,113,113,0.55)", fontFamily: "JetBrains Mono" }}
              />
              <Bar dataKey="dwell" radius={[3, 3, 0, 0]} maxBarSize={48}>
                {chartData.map((entry, i) => {
                  const eff = dwellLabel(entry.dwell);
                  return (
                    <Cell
                      key={i}
                      fill={
                        entry.dwell <= DWELL_THRESHOLDS.fast
                          ? "#34d399"
                          : entry.dwell <= DWELL_THRESHOLDS.moderate
                          ? "#f5a623"
                          : "#f87171"
                      }
                      opacity={0.8}
                    />
                  );
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {insight.reasoning && <ReasoningBlock reasoning={insight.reasoning} />}
    </div>
  );
}

// ─── Trip Duration expanded ───────────────────────────────────────────────────

function TripDurationExpanded({ insight }: { insight: AceInsight }) {
  const rows = insight.rows as Array<{ metric: string; value: number }>;

  // Extract key metrics by name-matching
  function val(search: string): number {
    const row = rows.find((r) => String(r.metric).toLowerCase().includes(search.toLowerCase()));
    return row ? Number(row.value) : 0;
  }

  const avgMin     = val("avg") || val("average");
  const medianMin  = val("median");
  const longestMin = val("longest");
  const shortestMin = val("shortest");
  const totalTrips = val("total") || val("count");

  // Derived metrics
  const WORKING_DAYS  = 28; // approximate month
  const fleetHours    = totalTrips > 0 && avgMin > 0 ? ((totalTrips * avgMin) / 60).toFixed(0) : "—";
  const tripsPerDay   = totalTrips > 0 ? (totalTrips / WORKING_DAYS).toFixed(1) : "—";
  const skewPct       = medianMin > 0 ? (((avgMin - medianMin) / medianMin) * 100).toFixed(1) : "—";
  const meanMedianGap = avgMin > 0 && medianMin > 0 ? (avgMin - medianMin).toFixed(0) : "—";

  // Duration distribution bar: min → median → avg → max as spectrum
  const spectrumData = [
    { label: "Shortest", value: shortestMin, color: "#34d399" },
    { label: "Median", value: medianMin, color: "#38bdf8" },
    { label: "Average", value: avgMin, color: "#f5a623" },
    { label: "Longest", value: longestMin, color: "#f87171" },
  ].filter((d) => d.value > 0);

  // Format minutes as Xh Ym
  function fmtMin(m: number): string {
    if (m <= 0) return "—";
    const h = Math.floor(m / 60);
    const rem = m % 60;
    return h > 0 ? `${h}h ${rem}m` : `${m}m`;
  }

  return (
    <div className="space-y-5">
      {/* KPI strip */}
      <div className="flex gap-3">
        <KpiTile label="Avg Duration" value={fmtMin(avgMin)} sub={`${avgMin} min raw`} accent="#f5a623" icon={Clock} />
        <KpiTile label="Total Trips" value={totalTrips.toLocaleString()} sub={`~${tripsPerDay}/day avg`} accent="#38bdf8" icon={Truck} />
        <KpiTile label="Fleet Hours" value={`${fleetHours}h`} sub="on road this month" accent="#34d399" icon={Route} />
        <KpiTile label="Mean/Median Gap" value={`+${meanMedianGap}m`} sub={`${skewPct}% skew from outliers`} accent="#a78bfa" icon={Activity} />
      </div>

      {/* Duration spectrum chart */}
      <div>
        <SectionLabel>Trip Duration Spectrum</SectionLabel>
        <div className="h-[130px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={spectrumData} margin={{ top: 4, right: 0, bottom: 0, left: -16 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 9, fill: "rgba(232,237,248,0.35)", fontFamily: "JetBrains Mono" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 9, fill: "rgba(232,237,248,0.35)", fontFamily: "JetBrains Mono" }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                content={<ChartTooltip formatter={(v) => [fmtMin(v), "Duration"]} />}
                cursor={{ fill: "rgba(255,255,255,0.04)" }}
              />
              <Bar dataKey="value" radius={[3, 3, 0, 0]} maxBarSize={56}>
                {spectrumData.map((d, i) => (
                  <Cell key={i} fill={d.color} opacity={0.85} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Mean vs Median analysis card */}
      <div className="rounded-xl bg-[rgba(167,139,250,0.05)] border border-[rgba(167,139,250,0.15)] p-4">
        <div className="flex items-center gap-2 mb-3">
          <Activity className="h-3.5 w-3.5 text-[#a78bfa]" />
          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#a78bfa] font-body">Skew Analysis</span>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-[10px] text-[rgba(232,237,248,0.4)] font-body mb-0.5">Average</p>
            <p className="text-lg font-display font-bold text-white">{fmtMin(avgMin)}</p>
          </div>
          <div>
            <p className="text-[10px] text-[rgba(232,237,248,0.4)] font-body mb-0.5">Median</p>
            <p className="text-lg font-display font-bold text-white">{fmtMin(medianMin)}</p>
          </div>
          <div>
            <p className="text-[10px] text-[rgba(232,237,248,0.4)] font-body mb-0.5">Gap</p>
            <p className="text-lg font-display font-bold text-[#a78bfa]">+{meanMedianGap}m</p>
          </div>
        </div>
        <p className="text-[11.5px] text-[rgba(232,237,248,0.55)] font-body mt-3 leading-relaxed">
          The {skewPct}% right-skew between mean and median indicates a subset of long-haul runs pulling the average upward. Eliminating or routing the top 5–10% longest trips could reduce average duration by an estimated 10–15%.
        </p>
      </div>

      {/* Full raw stats table */}
      <div>
        <SectionLabel>All Duration Statistics</SectionLabel>
        <div className="rounded-xl overflow-hidden border border-[rgba(255,255,255,0.08)]">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-[rgba(255,255,255,0.04)]">
                {["Metric", "Value", "Formatted"].map((h) => (
                  <th key={h} className="px-3 py-2 text-left font-bold text-[rgba(232,237,248,0.35)] uppercase tracking-wider text-[9px] font-body">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(255,255,255,0.05)]">
              {rows.map((r, i) => {
                const isMin = String(r.metric).toLowerCase().includes("min");
                return (
                  <tr key={i} className="hover:bg-[rgba(255,255,255,0.03)] transition-colors">
                    <td className="px-3 py-2 font-body font-medium text-white">{r.metric}</td>
                    <td className="px-3 py-2 font-data tabular-nums text-[rgba(232,237,248,0.75)]">{Number(r.value).toLocaleString()}</td>
                    <td className="px-3 py-2 font-data tabular-nums text-[rgba(232,237,248,0.45)]">
                      {isMin ? fmtMin(Number(r.value)) : Number(r.value).toLocaleString()}
                    </td>
                  </tr>
                );
              })}
              {/* Derived rows */}
              <tr className="bg-[rgba(52,211,153,0.03)] hover:bg-[rgba(255,255,255,0.03)] transition-colors">
                <td className="px-3 py-2 font-body font-medium text-[#34d399]">Fleet hours on road</td>
                <td className="px-3 py-2 font-data tabular-nums text-[rgba(232,237,248,0.75)]">{fleetHours}</td>
                <td className="px-3 py-2 font-data tabular-nums text-[rgba(232,237,248,0.45)]">{fleetHours}h total</td>
              </tr>
              <tr className="bg-[rgba(56,189,248,0.03)] hover:bg-[rgba(255,255,255,0.03)] transition-colors">
                <td className="px-3 py-2 font-body font-medium text-[#38bdf8]">Trips per working day</td>
                <td className="px-3 py-2 font-data tabular-nums text-[rgba(232,237,248,0.75)]">{tripsPerDay}</td>
                <td className="px-3 py-2 font-data tabular-nums text-[rgba(232,237,248,0.45)]">avg / day</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {insight.reasoning && <ReasoningBlock reasoning={insight.reasoning} />}
    </div>
  );
}

// ─── Unknown / fallback expanded ──────────────────────────────────────────────

function UnknownExpanded({ insight }: { insight: AceInsight }) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl overflow-hidden border border-[rgba(255,255,255,0.08)]">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-[rgba(255,255,255,0.04)]">
              {insight.columns.map((col) => (
                <th key={col} className="px-3 py-2 text-left font-bold text-[rgba(232,237,248,0.35)] uppercase tracking-wider text-[9px] font-body">
                  {col.replace(/_/g, " ")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[rgba(255,255,255,0.05)]">
            {insight.rows.map((row, i) => (
              <tr key={i} className="hover:bg-[rgba(255,255,255,0.03)] transition-colors">
                {insight.columns.map((col, j) => (
                  <td key={col} className={`px-3 py-2 ${j === 0 ? "text-white font-body font-medium" : "text-[rgba(232,237,248,0.55)] font-data tabular-nums"}`}>
                    {typeof row[col] === "number" ? Number(row[col]).toLocaleString() : String(row[col])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {insight.reasoning && <ReasoningBlock reasoning={insight.reasoning} />}
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

interface AceInsightExpandedCardProps {
  insight: AceInsight;
}

export default function AceInsightExpandedCard({ insight }: AceInsightExpandedCardProps) {
  const type = detectType(insight);

  const typeConfig: Record<InsightType, { label: string; color: string }> = {
    "top-vehicles":  { label: "Top Vehicles by Distance",   color: "#f5a623" },
    "idle-by-day":   { label: "Idle Time by Day of Week",   color: "#f87171" },
    "common-stops":  { label: "Most Common Stop Locations", color: "#38bdf8" },
    "trip-duration": { label: "Trip Duration Statistics",   color: "#a78bfa" },
    "unknown":       { label: "Fleet Insight",              color: "#34d399" },
  };

  const config = typeConfig[type];

  return (
    <div className="atlas-card rounded-xl p-5">
      {/* Card header */}
      <div className="flex items-start justify-between gap-4 mb-5 pb-4 border-b border-[rgba(255,255,255,0.07)]">
        <div className="flex items-start gap-3 min-w-0">
          <div className="shrink-0 rounded-xl p-2" style={{ background: `${config.color}18` }}>
            <Brain className="h-4.5 w-4.5" style={{ color: config.color, width: 18, height: 18 }} />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] font-body mb-0.5" style={{ color: config.color }}>{config.label}</p>
            <p className="text-sm font-semibold text-white font-body leading-snug">{insight.question}</p>
          </div>
        </div>
        <span className={`shrink-0 flex items-center gap-1 text-[10px] font-bold rounded-full px-2.5 py-1 font-body ${
          insight.fromCache
            ? "text-[rgba(232,237,248,0.45)] bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)]"
            : "text-[#34d399] bg-[rgba(52,211,153,0.08)] border border-[rgba(52,211,153,0.2)]"
        }`}>
          {insight.fromCache ? <Loader2 className="h-2.5 w-2.5" /> : <Radio className="h-2.5 w-2.5" />}
          {insight.fromCache ? "Cached" : "Live"}
        </span>
      </div>

      {/* Type-specific expanded content */}
      {type === "top-vehicles"  && <TopVehiclesExpanded  insight={insight} />}
      {type === "idle-by-day"   && <IdleByDayExpanded    insight={insight} />}
      {type === "common-stops"  && <CommonStopsExpanded  insight={insight} />}
      {type === "trip-duration" && <TripDurationExpanded insight={insight} />}
      {type === "unknown"       && <UnknownExpanded      insight={insight} />}
    </div>
  );
}

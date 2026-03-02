"use client";

import { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  ChevronLeft, Truck, Brain, RefreshCw,
  Award, TrendingUp, TrendingDown, RotateCcw, AlertTriangle, Zap, BarChart2,
  Maximize2, ArrowLeft, Minimize2, Clock, Activity, Radio, Loader2, Navigation,
} from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, ReferenceLine } from "recharts";
import type { FleetPulseDetail, AceInsight, VehicleActivity, CompanyPulseSummary, ApiResponse } from "@/types";
import type { FleetTrendPoint } from "@/app/api/analytics/trends/route";
import VehicleActivityTable, { VehicleActivityTableSkeleton } from "@/components/VehicleActivityTable";
import RoutePatternCard, { RoutePatternCardSkeleton } from "@/components/RoutePatternCard";
import StopHotspotCard, { StopHotspotCardSkeleton } from "@/components/StopHotspotCard";
import VehicleOutliersCard, { VehicleOutliersCardSkeleton } from "@/components/VehicleOutliersCard";
import AceInsightExpandedCard from "@/components/AceInsightExpandedCard";
import FleetMapSlider from "@/components/FleetMapSlider";

const FleetRegionalMap = dynamic(
  () => import("@/components/FleetRegionalMap"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full rounded-xl border border-[rgba(255,255,255,0.07)] bg-[#101318] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="relative w-8 h-8">
            <div className="absolute inset-0 rounded-full border-2 border-[rgba(245,166,35,0.2)]" />
            <div className="absolute inset-0 rounded-full border-2 border-t-[#f5a623] border-transparent animate-spin" />
          </div>
          <p className="text-sm text-[rgba(232,237,248,0.4)] font-body">Loading map…</p>
        </div>
      </div>
    ),
  }
);


function FleetViewContent() {
  const params  = useParams();
  const router  = useRouter();
  const groupId = String(params.groupId ?? "");

  const [detail, setDetail]                 = useState<FleetPulseDetail | null>(null);
  const [detailLoading, setDetailLoading]   = useState(true);
  const [summary, setSummary]               = useState<CompanyPulseSummary | null>(null);
  const [outlierInsight, setOutlierInsight] = useState<AceInsight | null>(null);
  const [outlierLoading, setOutlierLoading] = useState(true);
  const [routeInsight, setRouteInsight]     = useState<AceInsight | null>(null);
  const [routeLoading, setRouteLoading]     = useState(true);
  const [hotspotInsight, setHotspotInsight] = useState<AceInsight | null>(null);
  const [hotspotLoading, setHotspotLoading] = useState(true);
  // Fleet-wide Ace insight cards (previously in single-vehicle view)
  const [topVehiclesInsight, setTopVehiclesInsight]     = useState<AceInsight | null>(null);
  const [topVehiclesLoading, setTopVehiclesLoading]     = useState(true);
  const [idleByDayInsight, setIdleByDayInsight]         = useState<AceInsight | null>(null);
  const [idleByDayLoading, setIdleByDayLoading]         = useState(true);
  const [commonStopsInsight, setCommonStopsInsight]     = useState<AceInsight | null>(null);
  const [commonStopsLoading, setCommonStopsLoading]     = useState(true);
  const [tripDurationInsight, setTripDurationInsight]   = useState<AceInsight | null>(null);
  const [tripDurationLoading, setTripDurationLoading]   = useState(true);
  // Expanded card state (null = all cards; string = expanded card id)
  const [expandedIntelCard, setExpandedIntelCard]       = useState<string | null>(null);
  const [trends, setTrends]                             = useState<FleetTrendPoint[]>([]);
  const [trendsLoading, setTrendsLoading]               = useState(false);

  useEffect(() => {
    if (!groupId) return;
    async function loadDetail() {
      setDetailLoading(true);
      try {
        const res  = await fetch(`/api/pulse/fleet/${groupId}`);
        const data = (await res.json()) as ApiResponse<FleetPulseDetail>;
        if (data.ok) setDetail(data.data); else throw new Error(data.error);
      } catch {
        try {
          const res = await fetch(`/fallback/pulse-fleet-${groupId}.json`);
          if (res.ok) { setDetail((await res.json()) as FleetPulseDetail); }
          else {
            const res2 = await fetch("/fallback/pulse-fleet-all.json");
            const data = (await res2.json()) as FleetPulseDetail;
            setDetail({ ...data, group: { ...data.group, id: groupId } });
          }
        } catch { setDetail(null); }
      } finally { setDetailLoading(false); }
    }
    loadDetail();
  }, [groupId]);

  useEffect(() => {
    fetch("/api/pulse/summary").then((r) => r.json())
      .then((data: ApiResponse<CompanyPulseSummary>) => { if (data.ok) setSummary(data.data); })
      .catch(() => {});
  }, []);

  const groupName = detail?.group.name;
  const loadAceQuery = useCallback(
    async (queryKey: string, fallbackFile: string, setter: (v: AceInsight | null) => void, loadingSetter: (v: boolean) => void) => {
      loadingSetter(true);
      try {
        const res  = await fetch("/api/ace/query", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ queryKey, groupName, groupId }),
        });
        const data = (await res.json()) as ApiResponse<AceInsight>;
        setter(data.ok ? data.data : null);
      } catch {
        try {
          const res = await fetch(`/fallback/${fallbackFile}`);
          setter(res.ok ? ((await res.json()) as AceInsight) : null);
        } catch { setter(null); }
      } finally { loadingSetter(false); }
    },
    [groupName]
  );

  useEffect(() => {
    if (!groupName) return;
    loadAceQuery("fleet-vehicle-outliers",  `ace-fleet-vehicle-outliers-${groupId}.json`,  setOutlierInsight, setOutlierLoading);
    loadAceQuery("fleet-route-patterns",    `ace-fleet-route-patterns-${groupId}.json`,    setRouteInsight,   setRouteLoading);
    loadAceQuery("fleet-stop-hotspots",     `ace-fleet-stop-hotspots-${groupId}.json`,     setHotspotInsight, setHotspotLoading);
    // Fleet-wide analytics cards
    loadAceQuery("top-vehicles",   "ace-top-vehicles.json",   setTopVehiclesInsight,  setTopVehiclesLoading);
    loadAceQuery("idle-by-day",    "ace-idle-by-day.json",    setIdleByDayInsight,    setIdleByDayLoading);
    loadAceQuery("common-stops",   "ace-common-stops.json",   setCommonStopsInsight,  setCommonStopsLoading);
    loadAceQuery("trip-duration",  "ace-trip-duration.json",  setTripDurationInsight, setTripDurationLoading);
  }, [groupName, loadAceQuery]);

  useEffect(() => {
    if (!groupId) return;
    setTrendsLoading(true);
    fetch(`/api/analytics/trends?groupId=${groupId}&days=30`)
      .then((r) => r.json())
      .then((d: { ok: boolean; data?: FleetTrendPoint[] }) => {
        if (d.ok && d.data) setTrends(d.data);
      })
      .catch(() => {})
      .finally(() => setTrendsLoading(false));
  }, [groupId]);

  function handleSelectVehicle(vehicleId: string, vehicleName: string) {
    const groupName = detail?.group.name ?? "";
    const params = new URLSearchParams({ deviceId: vehicleId, deviceName: vehicleName, groupId });
    if (groupName) params.set("groupName", groupName);
    router.push(`/dashboard?${params.toString()}`);
  }
  function handleOutlierClick(vehicleName: string) {
    if (!detail) return;
    const match = detail.vehicles.find((v) => v.vehicle.name === vehicleName);
    if (match) handleSelectVehicle(match.vehicle.id, match.vehicle.name);
  }

  const activeCount   = detail?.vehicles.filter((v) => v.status === "active").length  ?? 0;
  const idleCount     = detail?.vehicles.filter((v) => v.status === "idle").length    ?? 0;
  const offlineCount  = detail?.vehicles.filter((v) => v.status === "offline").length ?? 0;
  const totalVehicles = detail?.vehicles.length ?? 0;
  const anyAceLoading = outlierLoading || routeLoading || hotspotLoading || topVehiclesLoading || idleByDayLoading || commonStopsLoading || tripDurationLoading;

  // Collect the 4 analytics insights for expand/collapse
  const analyticsInsights: Array<{ id: string; insight: AceInsight | null; loading: boolean }> = [
    { id: "top-vehicles",  insight: topVehiclesInsight,  loading: topVehiclesLoading  },
    { id: "idle-by-day",   insight: idleByDayInsight,    loading: idleByDayLoading    },
    { id: "common-stops",  insight: commonStopsInsight,  loading: commonStopsLoading  },
    { id: "trip-duration", insight: tripDurationInsight, loading: tripDurationLoading },
  ];

  const mapVehicles: VehicleActivity[] = detail?.vehicles ?? [];
  const mapGroups = detail ? [detail.group] : [];

  const sortedFleets     = summary ? [...summary.fleets].sort((a, b) => b.totalDistanceKm - a.totalDistanceKm) : null;
  const fleetRank        = sortedFleets ? sortedFleets.findIndex((f) => f.group.id === groupId) + 1 : null;
  const fleetCount       = sortedFleets?.length ?? 0;
  const thisFleetSummary = summary?.fleets.find((f) => f.group.id === groupId);
  const companyAvgActivePct = summary && summary.totals.vehicles > 0 ? (summary.totals.activeVehicles / summary.totals.vehicles) * 100 : null;
  const thisFleetActivePct  = totalVehicles > 0 ? (activeCount / totalVehicles) * 100 : null;
  const companyAvgIdlePct   = summary?.totals.avgIdlePct ?? null;
  const thisFleetIdlePct    = thisFleetSummary?.avgIdlePct ?? null;
  const idleDelta           = thisFleetIdlePct != null && companyAvgIdlePct != null ? thisFleetIdlePct - companyAvgIdlePct : null;
  const isHighIdle          = idleDelta != null && idleDelta > 2;

  const mapHotspots = hotspotInsight?.rows
    .filter((r) => Number(r["lat"] ?? 0) !== 0 && Number(r["lon"] ?? 0) !== 0)
    .map((r) => ({ lat: Number(r["lat"]), lon: Number(r["lon"]), name: String(r["location_name"] ?? "Stop"), visits: Number(r["visit_count"] ?? 0) })) ?? [];

  // Derive route lines: connect hotspots in order of visit frequency to visualise corridors
  const mapRouteLines = useMemo(() => {
    if (mapHotspots.length < 2) return [];
    const sorted = [...mapHotspots].sort((a, b) => (b.visits ?? 0) - (a.visits ?? 0));
    return sorted.slice(0, 6).slice(0, -1).map((h, i) => ({
      from: [h.lat, h.lon] as [number, number],
      to: [sorted[i + 1].lat, sorted[i + 1].lon] as [number, number],
      label: `${h.name} → ${sorted[i + 1].name}`,
    }));
  }, [mapHotspots]);

  // ── Stats strip: compact KPI row + benchmark chips ──────────────────────
  const statsContent = (!detailLoading && detail) ? (
    <div className="space-y-2.5">
      {/* KPI row */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-[#34d399]" />
          <span className="text-sm font-display font-bold text-white tabular-nums">{activeCount}</span>
          <span className="text-sm text-[rgba(232,237,248,0.45)] font-body">active</span>
        </div>
        <div className="w-px h-3 bg-[rgba(255,255,255,0.1)]" />
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-[#f5a623]" />
          <span className="text-sm font-display font-bold text-white tabular-nums">{idleCount}</span>
          <span className="text-sm text-[rgba(232,237,248,0.45)] font-body">idle</span>
        </div>
        <div className="w-px h-3 bg-[rgba(255,255,255,0.1)]" />
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-[rgba(232,237,248,0.2)]" />
          <span className="text-sm font-display font-bold text-[rgba(232,237,248,0.5)] tabular-nums">{offlineCount}</span>
          <span className="text-sm text-[rgba(232,237,248,0.35)] font-body">offline</span>
        </div>
        <span className="ml-auto text-sm text-[rgba(232,237,248,0.3)] font-body">{totalVehicles} total</span>
      </div>

      {/* Benchmark chips */}
      {summary && (
        <div className="flex flex-wrap gap-1.5">
          {fleetRank != null && fleetRank > 0 && (
            <span className="inline-flex items-center gap-1 bg-[rgba(245,166,35,0.08)] border border-[rgba(245,166,35,0.18)] rounded-md px-2 py-0.5">
              <Award className="h-2.5 w-2.5 text-[#f5a623]" />
              <span className="text-sm font-display font-bold text-[#f5a623]">#{fleetRank}</span>
              <span className="text-sm text-[rgba(232,237,248,0.4)] font-body">of {fleetCount} by distance</span>
            </span>
          )}
          {thisFleetActivePct != null && companyAvgActivePct != null && (
            <span className="inline-flex items-center gap-1 bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-md px-2 py-0.5">
              {thisFleetActivePct >= companyAvgActivePct
                ? <TrendingUp   className="h-2.5 w-2.5 text-[#34d399]" />
                : <TrendingDown className="h-2.5 w-2.5 text-[rgba(232,237,248,0.35)]" />}
              <span className="text-sm font-body" style={{ color: thisFleetActivePct >= companyAvgActivePct ? "#34d399" : "rgba(232,237,248,0.5)" }}>
                {Math.round(thisFleetActivePct)}% active
              </span>
              <span className="text-sm text-[rgba(232,237,248,0.35)] font-body">vs {Math.round(companyAvgActivePct)}% avg</span>
            </span>
          )}
          {thisFleetIdlePct != null && companyAvgIdlePct != null && (
            <span className="inline-flex items-center gap-1 bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-md px-2 py-0.5">
              {isHighIdle
                ? <AlertTriangle className="h-2.5 w-2.5 text-[#f5a623]" />
                : <RotateCcw     className="h-2.5 w-2.5 text-[rgba(232,237,248,0.35)]" />}
              <span className="text-sm font-body" style={{ color: isHighIdle ? "#f5a623" : "rgba(232,237,248,0.6)" }}>
                {thisFleetIdlePct.toFixed(1)}% idle
              </span>
              {idleDelta != null && Math.abs(idleDelta) >= 0.5 && (
                <span className="text-sm font-semibold font-body" style={{ color: isHighIdle ? "#f5a623" : "#34d399" }}>
                  ({idleDelta > 0 ? "+" : ""}{idleDelta.toFixed(1)}pp)
                </span>
              )}
            </span>
          )}
        </div>
      )}
    </div>
  ) : null;

  // ── Activity tab content ──────────────────────────────────────────────────
  const activityContent = (
    <div>
      <p className="text-sm text-[rgba(232,237,248,0.4)] font-body mb-3">
        Click a vehicle to explore its trip history
      </p>
      {detailLoading ? (
        <VehicleActivityTableSkeleton />
      ) : detail ? (
        <VehicleActivityTable vehicles={detail.vehicles} onSelectVehicle={handleSelectVehicle} />
      ) : (
        <div className="atlas-card rounded-xl p-8 text-center">
          <p className="text-sm text-[rgba(232,237,248,0.4)] font-body">Failed to load vehicle data</p>
          <button onClick={() => router.refresh()} className="mt-3 text-sm btn-ghost h-7 px-3 rounded-lg inline-flex items-center gap-1.5">
            <RefreshCw className="h-3 w-3" /> Retry
          </button>
        </div>
      )}
    </div>
  );

  // ── Intelligence tab content ──────────────────────────────────────────────
  // Helper: Live/Cached badge (matches VehicleOutliersCard / RoutePatternCard pattern)
  function LiveBadge({ insight }: { insight: AceInsight }) {
    return (
      <span className={`shrink-0 flex items-center gap-1 text-xs font-bold rounded-full px-2 py-0.5 font-body ${
        insight.fromCache
          ? "text-[rgba(232,237,248,0.45)] bg-[rgba(255,255,255,0.06)]"
          : "text-[#34d399] bg-[rgba(52,211,153,0.08)] border border-[rgba(52,211,153,0.2)]"
      }`}>
        {insight.fromCache ? <Loader2 className="h-2.5 w-2.5" /> : <Radio className="h-2.5 w-2.5" />}
        {insight.fromCache ? "Cached" : "Live"}
      </span>
    );
  }

  // Helper: Maximize overlay button (matches dashboard pattern)
  function ExpandBtn({ insightId, accentBorder, accentText, accentHover }: {
    insightId: string; accentBorder: string; accentText: string; accentHover: string;
  }) {
    return (
      <button
        onClick={() => setExpandedIntelCard(insightId)}
        className="absolute top-2 right-9 z-20 flex items-center justify-center w-6 h-6 rounded-md bg-[rgba(13,17,23,0.85)] opacity-0 group-hover/intel:opacity-100 hover:!opacity-100 transition-all duration-150 backdrop-blur-sm"
        style={{ border: `1px solid ${accentBorder}`, color: accentText }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = accentHover; (e.currentTarget as HTMLButtonElement).style.borderColor = accentHover; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = accentText; (e.currentTarget as HTMLButtonElement).style.borderColor = accentBorder; }}
        title="Expand analytics"
      >
        <Maximize2 className="h-3 w-3" />
      </button>
    );
  }

  const intelligenceContent = (
    <div className="space-y-3">
      {/* Header row */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-bold text-[#f5a623] bg-[rgba(245,166,35,0.1)] border border-[rgba(245,166,35,0.2)] rounded-full px-2 py-0.5 font-body">
          Ace API
        </span>
        {anyAceLoading && (
          <span className="text-sm text-[rgba(232,237,248,0.4)] flex items-center gap-1 font-body">
            <RefreshCw className="h-2.5 w-2.5 animate-spin" /> Querying…
          </span>
        )}
        {expandedIntelCard !== null && (
          <button
            onClick={() => setExpandedIntelCard(null)}
            className="ml-auto flex items-center gap-1.5 h-6 px-2.5 rounded-md text-sm font-semibold font-body text-[rgba(232,237,248,0.55)] hover:text-white bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.09)] border border-[rgba(255,255,255,0.08)] transition-all"
          >
            <ArrowLeft className="h-2.5 w-2.5" />
            Back
          </button>
        )}
      </div>

      {/* ── Expanded single-card view ─────────────────────────────────────── */}
      {expandedIntelCard !== null && (() => {
        const entry = analyticsInsights.find((a) => a.insight?.id === expandedIntelCard);
        if (!entry?.insight) return null;
        return (
          <div style={{ animation: "intel-expand 220ms cubic-bezier(0.22, 1, 0.36, 1) both" }}>
            <AceInsightExpandedCard insight={entry.insight} />
            <div className="flex justify-center mt-4">
              <button
                onClick={() => setExpandedIntelCard(null)}
                className="inline-flex items-center gap-1.5 h-7 px-4 rounded-full text-sm font-semibold font-body text-[rgba(232,237,248,0.4)] hover:text-white bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.07)] hover:border-[rgba(255,255,255,0.13)] transition-all"
              >
                <Minimize2 className="h-3 w-3" />
                Back to overview
              </button>
            </div>
          </div>
        );
      })()}

      {/* ── Full intelligence overview ────────────────────────────────────── */}
      {expandedIntelCard === null && (
        <>
          {/* ═══ FLEET PERFORMANCE GROUP ═══════════════════════════════════ */}
          {outlierLoading ? <VehicleOutliersCardSkeleton /> : (
            <VehicleOutliersCard insight={outlierInsight} loading={false} onSelectVehicle={handleOutlierClick} />
          )}

          {/* Distance Breakdown — thematically extends VehicleOutliersCard */}
          {topVehiclesLoading ? (
            <div className="atlas-card rounded-xl h-[130px] animate-pulse" />
          ) : topVehiclesInsight && topVehiclesInsight.rows.length > 0 && (() => {
            const rows = topVehiclesInsight.rows.slice(0, 6);
            const maxDist = Math.max(...rows.map((r) => Number(r["total_distance_km"] ?? 0)));
            return (
              <div className="atlas-card rounded-xl p-4 relative group/intel">
                <div className="flex items-center gap-2 mb-3">
                  <div className="rounded-xl bg-[rgba(56,189,248,0.1)] p-1.5 shrink-0">
                    <Navigation className="h-3.5 w-3.5 text-[#38bdf8]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[13px] font-display font-bold text-white">Distance Breakdown</h3>
                    <p className="text-sm text-[rgba(232,237,248,0.4)] font-body">Top vehicles by km — last 14 days</p>
                  </div>
                  <LiveBadge insight={topVehiclesInsight} />
                  <ExpandBtn insightId={topVehiclesInsight.id} accentBorder="rgba(56,189,248,0.2)" accentText="rgba(56,189,248,0.55)" accentHover="#38bdf8" />
                </div>
                <div className="space-y-2">
                  {rows.map((row, i) => {
                    const name  = String(row["device_name"] ?? "—").replace(" — ", " ·");
                    const dist  = Number(row["total_distance_km"] ?? 0);
                    const trips = Number(row["trip_count"] ?? 0);
                    const pct   = maxDist > 0 ? (dist / maxDist) * 100 : 0;
                    return (
                      <div key={i}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1.5 min-w-0 flex-1">
                            <span className="text-sm font-data text-[rgba(232,237,248,0.3)] w-4 shrink-0">{i + 1}</span>
                            <span className="text-sm font-body text-white truncate">{name}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-sm font-data font-bold tabular-nums text-[#38bdf8]">{Math.round(dist).toLocaleString()} km</span>
                            <span className="text-sm font-data text-[rgba(232,237,248,0.35)] tabular-nums">{trips}×</span>
                          </div>
                        </div>
                        <div className="ml-5 h-1 rounded-full bg-[rgba(255,255,255,0.06)] overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: i === 0 ? "#38bdf8" : `rgba(56,189,248,${0.55 - i * 0.08})` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
                {topVehiclesInsight.reasoning && (
                  <p className="mt-3 pt-3 border-t border-[rgba(255,255,255,0.07)] text-sm text-[rgba(232,237,248,0.45)] font-body leading-relaxed">
                    <span className="font-bold text-[#f5a623]">Ace: </span>{topVehiclesInsight.reasoning}
                  </p>
                )}
              </div>
            );
          })()}

          {/* Idle by Day — extends "Most Idle" in VehicleOutliersCard */}
          {idleByDayLoading ? (
            <div className="atlas-card rounded-xl h-[120px] animate-pulse" />
          ) : idleByDayInsight && idleByDayInsight.rows.length > 0 && (() => {
            const chartData = idleByDayInsight.rows.map((r) => ({
              day: String(r["day_of_week"] ?? "").slice(0, 3),
              pct: Number(r["avg_idle_pct"] ?? 0),
            }));
            const maxPct = Math.max(...chartData.map((d) => d.pct));
            return (
              <div className="atlas-card rounded-xl p-4 relative group/intel">
                <div className="flex items-center gap-2 mb-3">
                  <div className="rounded-xl bg-[rgba(245,166,35,0.1)] p-1.5 shrink-0">
                    <RotateCcw className="h-3.5 w-3.5 text-[#f5a623]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[13px] font-display font-bold text-white">Idle by Day</h3>
                    <p className="text-sm text-[rgba(232,237,248,0.4)] font-body">Avg idle % · last 30 days</p>
                  </div>
                  <LiveBadge insight={idleByDayInsight} />
                  <ExpandBtn insightId={idleByDayInsight.id} accentBorder="rgba(245,166,35,0.2)" accentText="rgba(245,166,35,0.55)" accentHover="#f5a623" />
                </div>
                <ResponsiveContainer width="100%" height={76}>
                  <BarChart data={chartData} barSize={20} margin={{ top: 0, right: 0, left: -26, bottom: 0 }}>
                    <XAxis dataKey="day" tick={{ fill: "rgba(232,237,248,0.3)", fontSize: 9, fontFamily: "var(--font-jetbrains-mono)" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "rgba(232,237,248,0.3)", fontSize: 9, fontFamily: "var(--font-jetbrains-mono)" }} axisLine={false} tickLine={false} />
                    <ReferenceLine y={15} stroke="rgba(245,166,35,0.3)" strokeDasharray="3 3" />
                    <Tooltip
                      contentStyle={{ background: "#101318", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, fontSize: 10, fontFamily: "var(--font-dm-sans)", color: "rgba(232,237,248,0.9)" }}
                      formatter={(v: number) => [`${v.toFixed(1)}%`, "Avg idle"]}
                      labelStyle={{ color: "rgba(232,237,248,0.5)" }}
                    />
                    <Bar dataKey="pct" radius={[2, 2, 0, 0]}>
                      {chartData.map((d, i) => (
                        <Cell key={i} fill={d.pct === maxPct ? "#f5a623" : d.pct > 20 ? "rgba(245,166,35,0.6)" : "rgba(245,166,35,0.3)"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                {idleByDayInsight.reasoning && (
                  <p className="mt-2 pt-2 border-t border-[rgba(255,255,255,0.07)] text-sm text-[rgba(232,237,248,0.45)] font-body leading-relaxed">
                    <span className="font-bold text-[#f5a623]">Ace: </span>{idleByDayInsight.reasoning}
                  </p>
                )}
              </div>
            );
          })()}

          {/* ═══ ROUTE INTELLIGENCE GROUP ═══════════════════════════════════ */}
          {routeLoading ? <RoutePatternCardSkeleton /> : (
            <RoutePatternCard insight={routeInsight} loading={false} />
          )}

          {/* Trip Duration Stats — complements RoutePatternCard's timing data */}
          {tripDurationLoading ? (
            <div className="atlas-card rounded-xl h-[110px] animate-pulse" />
          ) : tripDurationInsight && tripDurationInsight.rows.length > 0 && (() => {
            const stats: Record<string, number> = {};
            for (const row of tripDurationInsight.rows) {
              stats[String(row["metric"] ?? "").toLowerCase()] = Number(row["value"] ?? 0);
            }
            const avgMin     = stats["average trip duration in minutes"] ?? stats["avg_duration_minutes"] ?? 0;
            const medMin     = stats["median trip duration in minutes"]  ?? stats["median_duration_minutes"] ?? 0;
            const longestMin = stats["longest trip in minutes"]          ?? stats["longest_trip_minutes"] ?? 0;
            const tripCount  = stats["total trip count"]                 ?? stats["total_trips"] ?? 0;
            const fmtMin = (m: number) => m >= 60 ? `${(m / 60).toFixed(1)}h` : `${Math.round(m)}m`;
            const kpis = [
              { label: "Avg duration", value: fmtMin(avgMin),     color: "#a78bfa" },
              { label: "Median",       value: fmtMin(medMin),     color: "#a78bfa" },
              { label: "Longest",      value: fmtMin(longestMin), color: "#fb923c" },
              { label: "Total trips",  value: tripCount > 0 ? Math.round(tripCount).toString() : "—", color: "#34d399" },
            ];
            return (
              <div className="atlas-card rounded-xl p-4 relative group/intel">
                <div className="flex items-center gap-2 mb-3">
                  <div className="rounded-xl bg-[rgba(167,139,250,0.1)] p-1.5 shrink-0">
                    <Activity className="h-3.5 w-3.5 text-[#a78bfa]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[13px] font-display font-bold text-white">Trip Duration Stats</h3>
                    <p className="text-sm text-[rgba(232,237,248,0.4)] font-body">Fleet duration benchmarks this month</p>
                  </div>
                  <LiveBadge insight={tripDurationInsight} />
                  <ExpandBtn insightId={tripDurationInsight.id} accentBorder="rgba(167,139,250,0.2)" accentText="rgba(167,139,250,0.55)" accentHover="#a78bfa" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {kpis.map(({ label, value, color }) => (
                    <div key={label} className="rounded-lg bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.07)] px-3 py-2">
                      <p className="text-xs font-bold uppercase tracking-[0.12em] font-body text-[rgba(232,237,248,0.3)] mb-0.5">{label}</p>
                      <p className="text-[16px] font-bold font-data leading-none" style={{ color }}>{value || "—"}</p>
                    </div>
                  ))}
                </div>
                {tripDurationInsight.reasoning && (
                  <p className="mt-3 pt-3 border-t border-[rgba(255,255,255,0.07)] text-sm text-[rgba(232,237,248,0.45)] font-body leading-relaxed">
                    <span className="font-bold text-[#f5a623]">Ace: </span>{tripDurationInsight.reasoning}
                  </p>
                )}
              </div>
            );
          })()}

          {/* ═══ LOCATION INTELLIGENCE GROUP ════════════════════════════════ */}
          {hotspotLoading ? <StopHotspotCardSkeleton /> : (
            <StopHotspotCard insight={hotspotInsight} loading={false} />
          )}

          {/* Stop Dwell Analysis — sorted by dwell time, complements hotspot visit counts */}
          {commonStopsLoading ? (
            <div className="atlas-card rounded-xl h-[130px] animate-pulse" />
          ) : commonStopsInsight && commonStopsInsight.rows.length > 0 && (() => {
            const rows = [...commonStopsInsight.rows]
              .sort((a, b) => Number(b["avg_dwell_minutes"] ?? 0) - Number(a["avg_dwell_minutes"] ?? 0))
              .slice(0, 5);
            const maxDwell = Math.max(...rows.map((r) => Number(r["avg_dwell_minutes"] ?? 0)));
            return (
              <div className="atlas-card rounded-xl p-4 relative group/intel">
                <div className="flex items-center gap-2 mb-3">
                  <div className="rounded-xl bg-[rgba(52,211,153,0.1)] p-1.5 shrink-0">
                    <Clock className="h-3.5 w-3.5 text-[#34d399]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[13px] font-display font-bold text-white">Stop Dwell Times</h3>
                    <p className="text-sm text-[rgba(232,237,248,0.4)] font-body">Locations ranked by avg dwell · 30 days</p>
                  </div>
                  <LiveBadge insight={commonStopsInsight} />
                  <ExpandBtn insightId={commonStopsInsight.id} accentBorder="rgba(52,211,153,0.2)" accentText="rgba(52,211,153,0.55)" accentHover="#34d399" />
                </div>
                <div className="space-y-2.5">
                  {rows.map((row, i) => {
                    const name   = String(row["location_name"] ?? "Unknown");
                    const dwell  = Number(row["avg_dwell_minutes"] ?? 0);
                    const visits = Number(row["visit_count"] ?? 0);
                    const pct    = maxDwell > 0 ? (dwell / maxDwell) * 100 : 0;
                    return (
                      <div key={i}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1.5 min-w-0 flex-1">
                            <span className="text-sm font-data text-[rgba(232,237,248,0.3)] w-4 shrink-0">{i + 1}</span>
                            <span className="text-sm font-body text-white truncate">{name}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-sm font-data font-bold tabular-nums text-[#34d399]">{Math.round(dwell)}m</span>
                            <span className="text-sm font-data text-[rgba(232,237,248,0.35)] tabular-nums">{visits}×</span>
                          </div>
                        </div>
                        <div className="ml-5 h-1 rounded-full bg-[rgba(255,255,255,0.06)] overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: i === 0 ? "#34d399" : `rgba(52,211,153,${0.6 - i * 0.08})` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
                {commonStopsInsight.reasoning && (
                  <p className="mt-3 pt-3 border-t border-[rgba(255,255,255,0.07)] text-sm text-[rgba(232,237,248,0.45)] font-body leading-relaxed">
                    <span className="font-bold text-[#f5a623]">Ace: </span>{commonStopsInsight.reasoning}
                  </p>
                )}
              </div>
            );
          })()}
        </>
      )}
    </div>
  );

  // ── Trends tab content ────────────────────────────────────────────────────
  const trendsContent = (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm font-bold text-[#38bdf8] bg-[rgba(56,189,248,0.08)] border border-[rgba(56,189,248,0.2)] rounded-full px-2 py-0.5 font-body">
          BigQuery
        </span>
        <span className="text-sm text-[rgba(232,237,248,0.35)] font-body">30-day history</span>
        {trendsLoading && <RefreshCw className="h-2.5 w-2.5 animate-spin text-[#38bdf8]" />}
      </div>

      {trendsLoading ? (
        <div className="atlas-card rounded-xl h-[160px] animate-pulse" />
      ) : trends.length === 0 ? (
        <div className="atlas-card rounded-xl p-6 flex flex-col items-center justify-center gap-2 text-center min-h-[120px]">
          <BarChart2 className="h-6 w-6 text-[rgba(56,189,248,0.3)]" />
          <p className="text-sm text-[rgba(232,237,248,0.4)] font-body max-w-xs">
            No historical snapshots yet. Fleet trends appear here once BigQuery analytics data starts accumulating.
          </p>
        </div>
      ) : (
        <div className="atlas-card rounded-xl p-4">
          <p className="text-sm text-[rgba(232,237,248,0.4)] font-body mb-3">
            Daily km driven · last {trends.length} data points
          </p>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={trends.map((t) => ({
              date: t.date.slice(5),
              km: Number((t.metrics as Record<string, unknown>).totalDistanceKm ?? 0),
            }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis
                dataKey="date"
                tick={{ fill: "rgba(232,237,248,0.35)", fontSize: 12, fontFamily: "var(--font-jetbrains-mono)" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fill: "rgba(232,237,248,0.35)", fontSize: 12, fontFamily: "var(--font-jetbrains-mono)" }}
                tickLine={false}
                axisLine={false}
                width={36}
              />
              <Tooltip
                contentStyle={{
                  background: "#101318",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "8px",
                  fontSize: 12,
                  fontFamily: "var(--font-dm-sans)",
                  color: "rgba(232,237,248,0.9)",
                }}
                formatter={(v: number) => [`${v.toLocaleString()} km`, "Distance"]}
                labelStyle={{ color: "rgba(232,237,248,0.5)" }}
              />
              <Line
                type="monotone"
                dataKey="km"
                stroke="#38bdf8"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: "#38bdf8", strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );

  return (
    <div className="h-screen bg-[#09090e] flex flex-col overflow-hidden">
      <div className="pointer-events-none fixed inset-0 z-0 atlas-grid-bg opacity-40" />

      {/* Header */}
      <header className="relative z-10 border-b border-[rgba(255,255,255,0.07)] bg-[rgba(9,9,14,0.92)] backdrop-blur-sm shrink-0">
        <div className="max-w-none px-6 h-14 flex items-center gap-3">
          <button onClick={() => router.push("/")} className="flex items-center gap-2 group shrink-0">
            <div className="w-7 h-7 rounded-lg bg-[#f5a623] flex items-center justify-center shadow-[0_2px_8px_rgba(245,166,35,0.3)] group-hover:shadow-[0_2px_12px_rgba(245,166,35,0.5)] transition-shadow">
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                <path d="M2 7 C2 4 4 2 7 2 S12 4 12 7 L7 12 L2 7Z" fill="#09090e" />
              </svg>
            </div>
            <span className="font-display font-bold text-white text-sm hidden sm:block">FleetHappens</span>
          </button>

          <div className="w-px h-4 bg-[rgba(255,255,255,0.1)]" />

          <button onClick={() => router.push("/pulse")} className="flex items-center gap-1.5 text-[rgba(232,237,248,0.45)] hover:text-white transition-colors text-sm font-body">
            <ChevronLeft className="h-3.5 w-3.5" />
            <Zap className="h-3 w-3" />
            <span className="hidden sm:inline">Fleet Pulse</span>
          </button>
          <span className="text-[rgba(255,255,255,0.2)] text-sm">/</span>
          <div className="flex items-center gap-2 min-w-0">
            <Truck className="h-3.5 w-3.5 text-[#38bdf8] shrink-0" />
            <span className="font-display font-bold text-sm text-white truncate">
              {detailLoading ? "Loading…" : (detail?.group.name ?? groupId)}
            </span>
            {!detailLoading && detail && (
              <span className="text-sm font-data text-[rgba(232,237,248,0.4)] bg-[rgba(255,255,255,0.05)] px-2 py-0.5 rounded-full shrink-0">
                {totalVehicles}v
              </span>
            )}
          </div>

          <div className="ml-auto flex items-center gap-2 shrink-0">
            {anyAceLoading && (
              <span className="flex items-center gap-1.5 text-sm text-[rgba(232,237,248,0.4)] font-body">
                <RefreshCw className="h-2.5 w-2.5 animate-spin text-[#f5a623]" />
                Ace loading…
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Full-height split view */}
      <div className="relative z-10 flex-1 min-h-0">
        <FleetMapSlider
          mapContent={
            <FleetRegionalMap
              vehicles={mapVehicles}
              groups={mapGroups}
              hotspots={mapHotspots}
              routeLines={mapRouteLines}
              onVehicleClick={(vehicleId) => {
                const v = detail?.vehicles.find((v) => v.vehicle.id === vehicleId);
                if (v) handleSelectVehicle(v.vehicle.id, v.vehicle.name);
              }}
            />
          }
          statsContent={statsContent}
          activityContent={activityContent}
          intelligenceContent={intelligenceContent}
          trendsContent={trendsContent}
        />
      </div>
    </div>
  );
}

export default function FleetViewPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen bg-[#09090e] flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="relative w-10 h-10">
              <div className="absolute inset-0 rounded-full border-2 border-[rgba(245,166,35,0.2)]" />
              <div className="absolute inset-0 rounded-full border-2 border-t-[#f5a623] border-transparent animate-spin" />
            </div>
            <p className="text-sm text-[rgba(232,237,248,0.4)] font-body">Loading fleet view…</p>
          </div>
        </div>
      }
    >
      <FleetViewContent />
    </Suspense>
  );
}

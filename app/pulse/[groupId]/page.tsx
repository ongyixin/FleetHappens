"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  ChevronLeft, Truck, Brain, RefreshCw, MapPin, Activity,
  Award, TrendingUp, TrendingDown, RotateCcw, AlertTriangle, Zap,
} from "lucide-react";
import type { FleetPulseDetail, AceInsight, VehicleActivity, CompanyPulseSummary, ApiResponse } from "@/types";
import VehicleActivityTable, { VehicleActivityTableSkeleton } from "@/components/VehicleActivityTable";
import RoutePatternCard, { RoutePatternCardSkeleton } from "@/components/RoutePatternCard";
import StopHotspotCard, { StopHotspotCardSkeleton } from "@/components/StopHotspotCard";
import VehicleOutliersCard, { VehicleOutliersCardSkeleton } from "@/components/VehicleOutliersCard";

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
          <p className="text-[11px] text-[rgba(232,237,248,0.4)] font-body">Loading map…</p>
        </div>
      </div>
    ),
  }
);

function StatBadge({ icon: Icon, value, label, color, bg }: {
  icon: React.ElementType; value: number | string; label: string;
  color: string; bg: string;
}) {
  return (
    <div className="flex-1 atlas-card rounded-xl px-4 py-3.5 flex items-center gap-3 animate-fade-up">
      <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: bg }}>
        <Icon className="h-4 w-4" style={{ color }} />
      </div>
      <div>
        <p className="text-2xl font-display font-bold text-white leading-none">{value}</p>
        <p className="text-[11px] text-[rgba(232,237,248,0.45)] mt-0.5 font-body">{label}</p>
      </div>
    </div>
  );
}

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
          body: JSON.stringify({ queryKey, groupName }),
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
    loadAceQuery("fleet-vehicle-outliers",  "ace-fleet-vehicle-outliers.json",  setOutlierInsight, setOutlierLoading);
    loadAceQuery("fleet-route-patterns",    "ace-fleet-route-patterns.json",    setRouteInsight,   setRouteLoading);
    loadAceQuery("fleet-stop-hotspots",     "ace-fleet-stop-hotspots.json",     setHotspotInsight, setHotspotLoading);
  }, [groupName, loadAceQuery]);

  function handleSelectVehicle(vehicleId: string, vehicleName: string) {
    router.push(`/dashboard?deviceId=${vehicleId}&deviceName=${encodeURIComponent(vehicleName)}&groupId=${groupId}`);
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
  const anyAceLoading = outlierLoading || routeLoading || hotspotLoading;

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

  return (
    <div className="min-h-screen bg-[#09090e]">
      <div className="pointer-events-none fixed inset-0 z-0 atlas-grid-bg opacity-40" />

      {/* Header */}
      <header className="relative z-10 border-b border-[rgba(255,255,255,0.07)] bg-[rgba(9,9,14,0.92)] backdrop-blur-sm sticky top-0">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center gap-3">
          <button onClick={() => router.push("/")} className="flex items-center gap-2 group shrink-0">
            <div className="w-7 h-7 rounded-lg bg-[#f5a623] flex items-center justify-center shadow-[0_2px_8px_rgba(245,166,35,0.3)] group-hover:shadow-[0_2px_12px_rgba(245,166,35,0.5)] transition-shadow">
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                <path d="M2 7 C2 4 4 2 7 2 S12 4 12 7 L7 12 L2 7Z" fill="#09090e" />
              </svg>
            </div>
            <span className="font-display font-bold text-white text-sm hidden sm:block">FleetHappens</span>
          </button>

          <div className="w-px h-4 bg-[rgba(255,255,255,0.1)]" />

          <button onClick={() => router.push("/pulse")} className="flex items-center gap-1.5 text-[rgba(232,237,248,0.45)] hover:text-white transition-colors text-xs font-body">
            <ChevronLeft className="h-3.5 w-3.5" />
            <Zap className="h-3 w-3" />
            <span className="hidden sm:inline">Fleet Pulse</span>
          </button>
          <span className="text-[rgba(255,255,255,0.2)] text-xs">/</span>
          <div className="flex items-center gap-2 min-w-0">
            <Truck className="h-3.5 w-3.5 text-[#38bdf8] shrink-0" />
            <span className="font-display font-bold text-sm text-white truncate">
              {detailLoading ? "Loading…" : (detail?.group.name ?? groupId)}
            </span>
            {!detailLoading && detail && (
              <span className="text-[10px] font-data text-[rgba(232,237,248,0.4)] bg-[rgba(255,255,255,0.05)] px-2 py-0.5 rounded-full shrink-0">
                {totalVehicles}v
              </span>
            )}
          </div>

          <div className="ml-auto flex items-center gap-2 shrink-0">
            {anyAceLoading && (
              <span className="flex items-center gap-1.5 text-[11px] text-[rgba(232,237,248,0.4)] font-body">
                <RefreshCw className="h-2.5 w-2.5 animate-spin text-[#f5a623]" />
                Ace loading…
              </span>
            )}
          </div>
        </div>
      </header>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-6 space-y-5">
        {/* Fleet KPI stat row */}
        {!detailLoading && detail && (
          <div className="flex gap-3 flex-wrap sm:flex-nowrap">
            <StatBadge icon={Activity}  value={activeCount}  label="Active"  color="#34d399" bg="rgba(52,211,153,0.1)" />
            <StatBadge icon={RefreshCw} value={idleCount}    label="Idle"    color="#f5a623" bg="rgba(245,166,35,0.1)" />
            <StatBadge icon={Truck}     value={offlineCount} label="Offline" color="rgba(232,237,248,0.4)" bg="rgba(255,255,255,0.05)" />
          </div>
        )}

        {/* Benchmark context strip */}
        {!detailLoading && detail && summary && (
          <div className="flex gap-2 flex-wrap animate-fade-in">
            {fleetRank != null && fleetRank > 0 && (
              <div className="flex items-center gap-2 atlas-card rounded-lg px-3 py-2">
                <Award className="h-3.5 w-3.5 text-[#f5a623] shrink-0" />
                <span className="text-xs font-display font-bold text-white tabular-nums">#{fleetRank}</span>
                <span className="text-xs text-[rgba(232,237,248,0.4)] font-body">of {fleetCount} fleets by distance</span>
              </div>
            )}
            {thisFleetActivePct != null && companyAvgActivePct != null && (
              <div className="flex items-center gap-2 atlas-card rounded-lg px-3 py-2">
                {thisFleetActivePct >= companyAvgActivePct
                  ? <TrendingUp className="h-3.5 w-3.5 text-[#34d399] shrink-0" />
                  : <TrendingDown className="h-3.5 w-3.5 text-[rgba(232,237,248,0.4)] shrink-0" />}
                <span className="text-xs font-display font-bold" style={{ color: thisFleetActivePct >= companyAvgActivePct ? "#34d399" : "rgba(232,237,248,0.5)" }}>
                  {Math.round(thisFleetActivePct)}% active
                </span>
                <span className="text-xs text-[rgba(232,237,248,0.4)] font-body">· co. avg {Math.round(companyAvgActivePct)}%</span>
              </div>
            )}
            {thisFleetIdlePct != null && companyAvgIdlePct != null && (
              <div className="flex items-center gap-2 atlas-card rounded-lg px-3 py-2">
                {isHighIdle
                  ? <AlertTriangle className="h-3.5 w-3.5 text-[#f5a623] shrink-0" />
                  : <RotateCcw className="h-3.5 w-3.5 text-[rgba(232,237,248,0.4)] shrink-0" />}
                <span className="text-xs font-display font-bold" style={{ color: isHighIdle ? "#f5a623" : "rgba(232,237,248,0.7)" }}>
                  {thisFleetIdlePct.toFixed(1)}% idle
                </span>
                <span className="text-xs text-[rgba(232,237,248,0.4)] font-body">
                  · co. avg {companyAvgIdlePct.toFixed(1)}%
                  {idleDelta != null && Math.abs(idleDelta) >= 0.5 && (
                    <span className="ml-1 font-semibold" style={{ color: isHighIdle ? "#f5a623" : "#34d399" }}>
                      ({idleDelta > 0 ? "+" : ""}{idleDelta.toFixed(1)}pp)
                    </span>
                  )}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Main grid */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-5">
          <div className="space-y-5">
            {/* Vehicle activity */}
            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <Truck className="h-4 w-4 text-[#38bdf8]" />
                <h2 className="font-display font-bold text-base text-white">Vehicle Activity</h2>
                <p className="text-xs text-[rgba(232,237,248,0.4)] font-body">Click a vehicle to explore its trips</p>
              </div>
              {detailLoading ? (
                <VehicleActivityTableSkeleton />
              ) : detail ? (
                <VehicleActivityTable vehicles={detail.vehicles} onSelectVehicle={handleSelectVehicle} />
              ) : (
                <div className="atlas-card rounded-xl p-8 text-center">
                  <p className="text-sm text-[rgba(232,237,248,0.4)] font-body">Failed to load vehicle data</p>
                  <button onClick={() => router.refresh()} className="mt-3 text-xs btn-ghost h-7 px-3 rounded-lg inline-flex items-center gap-1.5">
                    <RefreshCw className="h-3 w-3" /> Retry
                  </button>
                </div>
              )}
            </div>

            {/* Ace intelligence cards */}
            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <Brain className="h-4 w-4 text-[#f5a623]" />
                <h2 className="font-display font-bold text-base text-white">Fleet Intelligence</h2>
                <span className="text-[10px] font-bold text-[#f5a623] bg-[rgba(245,166,35,0.1)] border border-[rgba(245,166,35,0.2)] rounded-full px-2 py-0.5 font-body">
                  Ace API
                </span>
                {anyAceLoading && (
                  <span className="text-[11px] text-[rgba(232,237,248,0.4)] flex items-center gap-1 font-body">
                    <RefreshCw className="h-2.5 w-2.5 animate-spin" />Querying…
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {outlierLoading ? <VehicleOutliersCardSkeleton /> : (
                  <VehicleOutliersCard insight={outlierInsight} loading={false} onSelectVehicle={handleOutlierClick} />
                )}
                {routeLoading ? <RoutePatternCardSkeleton /> : (
                  <RoutePatternCard insight={routeInsight} loading={false} />
                )}
                {hotspotLoading ? <StopHotspotCardSkeleton /> : (
                  <StopHotspotCard insight={hotspotInsight} loading={false} />
                )}
              </div>
            </div>
          </div>

          {/* Map */}
          <div className="xl:h-[600px] h-80">
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="h-4 w-4 text-[#f5a623]" />
              <h2 className="font-display font-bold text-base text-white">Vehicle Positions</h2>
              <p className="text-xs text-[rgba(232,237,248,0.4)] font-body">Last known</p>
            </div>
            <div className="h-[calc(100%-32px)] rounded-xl overflow-hidden border border-[rgba(255,255,255,0.08)]">
              <FleetRegionalMap
                vehicles={mapVehicles}
                groups={mapGroups}
                hotspots={mapHotspots}
                onVehicleClick={(vehicleId) => {
                  const v = detail?.vehicles.find((v) => v.vehicle.id === vehicleId);
                  if (v) handleSelectVehicle(v.vehicle.id, v.vehicle.name);
                }}
              />
            </div>
          </div>
        </div>
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

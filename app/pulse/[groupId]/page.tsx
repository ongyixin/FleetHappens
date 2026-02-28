"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  Route,
  Zap,
  ChevronLeft,
  Truck,
  Brain,
  RefreshCw,
  MapPin,
  Activity,
  Award,
  TrendingUp,
  TrendingDown,
  RotateCcw,
  AlertTriangle,
} from "lucide-react";
import type {
  FleetPulseDetail,
  AceInsight,
  VehicleActivity,
  CompanyPulseSummary,
  ApiResponse,
} from "@/types";
import VehicleActivityTable, {
  VehicleActivityTableSkeleton,
} from "@/components/VehicleActivityTable";
import RoutePatternCard, {
  RoutePatternCardSkeleton,
} from "@/components/RoutePatternCard";
import StopHotspotCard, {
  StopHotspotCardSkeleton,
} from "@/components/StopHotspotCard";
import VehicleOutliersCard, {
  VehicleOutliersCardSkeleton,
} from "@/components/VehicleOutliersCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

// Map component (no SSR)
const FleetRegionalMap = dynamic(
  () => import("@/components/FleetRegionalMap"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full rounded-xl border border-border bg-muted/30 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="h-6 w-6 rounded-full border-2 border-fleet-blue border-t-transparent animate-spin" />
          <p className="text-xs text-muted-foreground">Loading map…</p>
        </div>
      </div>
    ),
  }
);

function FleetViewContent() {
  const params = useParams();
  const router = useRouter();
  const groupId = String(params.groupId ?? "");

  // Fleet detail state
  const [detail, setDetail] = useState<FleetPulseDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(true);

  // Company summary for benchmarking
  const [summary, setSummary] = useState<CompanyPulseSummary | null>(null);

  // Ace analytics state
  const [outlierInsight, setOutlierInsight] = useState<AceInsight | null>(null);
  const [outlierLoading, setOutlierLoading] = useState(true);

  const [routeInsight, setRouteInsight] = useState<AceInsight | null>(null);
  const [routeLoading, setRouteLoading] = useState(true);

  const [hotspotInsight, setHotspotInsight] = useState<AceInsight | null>(null);
  const [hotspotLoading, setHotspotLoading] = useState(true);

  // ── Load fleet detail ───────────────────────────────────────────────────────

  useEffect(() => {
    if (!groupId) return;

    async function loadDetail() {
      setDetailLoading(true);
      try {
        const res = await fetch(`/api/pulse/fleet/${groupId}`);
        const data = (await res.json()) as ApiResponse<FleetPulseDetail>;
        if (data.ok) {
          setDetail(data.data);
        } else {
          throw new Error(data.error);
        }
      } catch {
        try {
          const res = await fetch(`/fallback/pulse-fleet-${groupId}.json`);
          if (res.ok) {
            const data = (await res.json()) as FleetPulseDetail;
            setDetail(data);
          } else {
            // Fall back to generic "all" fleet fallback
            const res2 = await fetch("/fallback/pulse-fleet-all.json");
            const data = (await res2.json()) as FleetPulseDetail;
            setDetail({ ...data, group: { ...data.group, id: groupId } });
          }
        } catch {
          setDetail(null);
        }
      } finally {
        setDetailLoading(false);
      }
    }
    loadDetail();
  }, [groupId]);

  // ── Load company summary for benchmarking ─────────────────────────────────

  useEffect(() => {
    fetch("/api/pulse/summary")
      .then((r) => r.json())
      .then((data: ApiResponse<CompanyPulseSummary>) => {
        if (data.ok) setSummary(data.data);
      })
      .catch(() => {});
  }, []);

  // ── Load Ace analytics (parallel, non-blocking) ────────────────────────────

  const groupName = detail?.group.name;

  const loadAceQuery = useCallback(
    async (
      queryKey: string,
      fallbackFile: string,
      setter: (v: AceInsight | null) => void,
      loadingSetter: (v: boolean) => void
    ) => {
      loadingSetter(true);
      try {
        const res = await fetch("/api/ace/query", {
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
        } catch {
          setter(null);
        }
      } finally {
        loadingSetter(false);
      }
    },
    [groupName]
  );

  useEffect(() => {
    if (!groupName) return;

    loadAceQuery(
      "fleet-vehicle-outliers",
      "ace-fleet-vehicle-outliers.json",
      setOutlierInsight,
      setOutlierLoading
    );
    loadAceQuery(
      "fleet-route-patterns",
      "ace-fleet-route-patterns.json",
      setRouteInsight,
      setRouteLoading
    );
    loadAceQuery(
      "fleet-stop-hotspots",
      "ace-fleet-stop-hotspots.json",
      setHotspotInsight,
      setHotspotLoading
    );
  }, [groupName, loadAceQuery]);

  // ── Navigation helpers ────────────────────────────────────────────────────

  function handleSelectVehicle(vehicleId: string, vehicleName: string) {
    router.push(
      `/dashboard?deviceId=${vehicleId}&deviceName=${encodeURIComponent(vehicleName)}&groupId=${groupId}`
    );
  }

  // For outlier card — look up vehicle ID by name
  function handleOutlierClick(vehicleName: string) {
    if (!detail) return;
    const match = detail.vehicles.find(
      (v) => v.vehicle.name === vehicleName
    );
    if (match) {
      handleSelectVehicle(match.vehicle.id, match.vehicle.name);
    }
  }

  // Stats derived from detail
  const activeCount = detail?.vehicles.filter((v) => v.status === "active").length ?? 0;
  const idleCount = detail?.vehicles.filter((v) => v.status === "idle").length ?? 0;
  const offlineCount = detail?.vehicles.filter((v) => v.status === "offline").length ?? 0;
  const totalVehicles = detail?.vehicles.length ?? 0;
  const anyAceLoading = outlierLoading || routeLoading || hotspotLoading;

  const mapVehicles: VehicleActivity[] = detail?.vehicles ?? [];
  const mapGroups = detail ? [detail.group] : [];

  // ── Company benchmarks ──────────────────────────────────────────────────────

  const sortedFleets = summary
    ? [...summary.fleets].sort((a, b) => b.totalDistanceKm - a.totalDistanceKm)
    : null;
  const fleetRank = sortedFleets
    ? sortedFleets.findIndex((f) => f.group.id === groupId) + 1
    : null;
  const fleetCount = sortedFleets?.length ?? 0;

  const thisFleetSummary = summary?.fleets.find((f) => f.group.id === groupId);
  const companyAvgActivePct =
    summary && summary.totals.vehicles > 0
      ? (summary.totals.activeVehicles / summary.totals.vehicles) * 100
      : null;
  const thisFleetActivePct =
    totalVehicles > 0 ? (activeCount / totalVehicles) * 100 : null;
  const companyAvgIdlePct = summary?.totals.avgIdlePct ?? null;
  const thisFleetIdlePct = thisFleetSummary?.avgIdlePct ?? null;
  const idleDelta =
    thisFleetIdlePct != null && companyAvgIdlePct != null
      ? thisFleetIdlePct - companyAvgIdlePct
      : null;
  const isHighIdle = idleDelta != null && idleDelta > 2;

  // ── Hotspot map pins (extracted from Ace insight) ──────────────────────────

  const mapHotspots = hotspotInsight?.rows
    .filter((r) => Number(r["lat"] ?? 0) !== 0 && Number(r["lon"] ?? 0) !== 0)
    .map((r) => ({
      lat: Number(r["lat"]),
      lon: Number(r["lon"]),
      name: String(r["location_name"] ?? "Stop"),
      visits: Number(r["visit_count"] ?? 0),
    })) ?? [];

  return (
    <div className="min-h-screen bg-background">
      {/* Top nav */}
      <header className="bg-white border-b border-border sticky top-0 z-20 shadow-[0_1px_0_hsl(30,8%,90%)]">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center gap-3">
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-2 shrink-0 group"
          >
            <div className="w-7 h-7 rounded-lg bg-fleet-navy flex items-center justify-center shadow-sm group-hover:bg-fleet-navy/90 transition-colors">
              <Route className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="font-bold text-fleet-navy tracking-tight text-sm hidden sm:block">
              FleetHappens
            </span>
          </button>

          <Separator orientation="vertical" className="h-5 mx-0.5" />

          {/* Breadcrumb */}
          <button
            onClick={() => router.push("/pulse")}
            className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors text-sm"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            <Zap className="h-3 w-3" />
            <span className="hidden sm:inline">Fleet Pulse</span>
          </button>
          <span className="text-muted-foreground text-sm">/</span>
          <div className="flex items-center gap-2 min-w-0">
            <Truck className="h-3.5 w-3.5 text-fleet-blue shrink-0" />
            <span className="font-semibold text-sm text-foreground truncate">
              {detailLoading ? "Loading…" : (detail?.group.name ?? groupId)}
            </span>
            {!detailLoading && detail && (
              <Badge variant="secondary" className="text-xs shrink-0">
                {totalVehicles} vehicles
              </Badge>
            )}
          </div>

          {/* Right side */}
          <div className="ml-auto flex items-center gap-2 shrink-0">
            {anyAceLoading && (
              <Badge variant="secondary" className="text-xs gap-1">
                <RefreshCw className="h-2.5 w-2.5 animate-spin" />
                Ace loading…
              </Badge>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Fleet KPI mini-strip */}
        {!detailLoading && detail && (
          <div className="flex gap-3 flex-wrap sm:flex-nowrap">
            {[
              {
                label: "Active",
                value: activeCount,
                color: "#059669",
                bg: "rgb(236 253 245)",
                icon: Activity,
              },
              {
                label: "Idle",
                value: idleCount,
                color: "#f59e0b",
                bg: "rgb(255 251 235)",
                icon: RefreshCw,
              },
              {
                label: "Offline",
                value: offlineCount,
                color: "#9ca3af",
                bg: "rgb(249 250 251)",
                icon: Truck,
              },
            ].map(({ label, value, color, bg, icon: Icon }) => (
              <div
                key={label}
                className="flex-1 bg-white border border-border rounded-xl px-4 py-3 flex items-center gap-3 shadow-[0_1px_3px_rgba(14,36,64,0.04)]"
              >
                <div
                  className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: bg }}
                >
                  <Icon className="h-3.5 w-3.5" style={{ color }} />
                </div>
                <div>
                  <p className="text-xl font-bold text-fleet-navy tabular-nums leading-none">
                    {value}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Company benchmark context strip */}
        {!detailLoading && detail && summary && (
          <div className="flex gap-2 flex-wrap">
            {/* Fleet rank */}
            {fleetRank != null && fleetRank > 0 && (
              <div className="flex items-center gap-1.5 bg-white border border-border rounded-lg px-3 py-2 text-xs shadow-[0_1px_3px_rgba(14,36,64,0.04)]">
                <Award className="h-3.5 w-3.5 text-fleet-amber shrink-0" />
                <span className="font-semibold text-foreground tabular-nums">
                  #{fleetRank}
                </span>
                <span className="text-muted-foreground">
                  of {fleetCount} fleets by distance
                </span>
              </div>
            )}

            {/* Active % vs company avg */}
            {thisFleetActivePct != null && companyAvgActivePct != null && (
              <div className="flex items-center gap-1.5 bg-white border border-border rounded-lg px-3 py-2 text-xs shadow-[0_1px_3px_rgba(14,36,64,0.04)]">
                {thisFleetActivePct >= companyAvgActivePct ? (
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                )}
                <span
                  className="font-semibold tabular-nums"
                  style={{
                    color:
                      thisFleetActivePct >= companyAvgActivePct
                        ? "#059669"
                        : "#9ca3af",
                  }}
                >
                  {Math.round(thisFleetActivePct)}% active
                </span>
                <span className="text-muted-foreground">
                  · co. avg {Math.round(companyAvgActivePct)}%
                </span>
              </div>
            )}

            {/* Idle % vs company avg */}
            {thisFleetIdlePct != null && companyAvgIdlePct != null && (
              <div className="flex items-center gap-1.5 bg-white border border-border rounded-lg px-3 py-2 text-xs shadow-[0_1px_3px_rgba(14,36,64,0.04)]">
                {isHighIdle ? (
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                ) : (
                  <RotateCcw className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                )}
                <span
                  className="font-semibold tabular-nums"
                  style={{ color: isHighIdle ? "#d97706" : "#374151" }}
                >
                  {thisFleetIdlePct.toFixed(1)}% idle
                </span>
                <span className="text-muted-foreground">
                  · co. avg {companyAvgIdlePct.toFixed(1)}%
                  {idleDelta != null && Math.abs(idleDelta) >= 0.5 && (
                    <span
                      className="ml-1 font-medium"
                      style={{ color: isHighIdle ? "#d97706" : "#059669" }}
                    >
                      ({idleDelta > 0 ? "+" : ""}
                      {idleDelta.toFixed(1)}pp)
                    </span>
                  )}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Main content: left panel (table + Ace cards) + right panel (map) */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6">
          {/* Left: vehicle activity + Ace cards */}
          <div className="space-y-6">
            {/* Vehicle activity table */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Truck className="h-4 w-4 text-fleet-navy" />
                <h2 className="text-sm font-bold text-fleet-navy">
                  Vehicle Activity
                </h2>
                <p className="text-xs text-muted-foreground">
                  Click a vehicle to explore its trips
                </p>
              </div>
              {detailLoading ? (
                <VehicleActivityTableSkeleton />
              ) : detail ? (
                <VehicleActivityTable
                  vehicles={detail.vehicles}
                  onSelectVehicle={handleSelectVehicle}
                />
              ) : (
                <div className="bg-white border border-border rounded-xl p-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    Failed to load vehicle data
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2"
                    onClick={() => router.refresh()}
                  >
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                    Retry
                  </Button>
                </div>
              )}
            </div>

            {/* Ace cards row */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Brain className="h-4 w-4 text-fleet-amber" />
                <h2 className="text-sm font-bold text-fleet-navy">
                  Fleet Intelligence
                </h2>
                <Badge variant="amber" className="text-xs">Ace API</Badge>
                {anyAceLoading && (
                  <Badge variant="secondary" className="text-xs gap-1">
                    <RefreshCw className="h-2.5 w-2.5 animate-spin" />
                    Querying…
                  </Badge>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {outlierLoading ? (
                  <VehicleOutliersCardSkeleton />
                ) : (
                  <VehicleOutliersCard
                    insight={outlierInsight}
                    loading={false}
                    onSelectVehicle={handleOutlierClick}
                  />
                )}
                {routeLoading ? (
                  <RoutePatternCardSkeleton />
                ) : (
                  <RoutePatternCard
                    insight={routeInsight}
                    loading={false}
                  />
                )}
                {hotspotLoading ? (
                  <StopHotspotCardSkeleton />
                ) : (
                  <StopHotspotCard
                    insight={hotspotInsight}
                    loading={false}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Right: fleet map */}
          <div className="xl:h-[600px] h-80">
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="h-4 w-4 text-fleet-navy" />
              <h2 className="text-sm font-bold text-fleet-navy">
                Vehicle Positions
              </h2>
              <p className="text-xs text-muted-foreground">Last known</p>
            </div>
            <div className="h-[calc(100%-32px)]">
              <FleetRegionalMap
                vehicles={mapVehicles}
                groups={mapGroups}
                hotspots={mapHotspots}
                onVehicleClick={(vehicleId) => {
                  const v = detail?.vehicles.find(
                    (v) => v.vehicle.id === vehicleId
                  );
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
        <div className="h-screen flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 rounded-full border-2 border-fleet-blue border-t-transparent animate-spin" />
            <p className="text-sm text-muted-foreground">
              Loading fleet view…
            </p>
          </div>
        </div>
      }
    >
      <FleetViewContent />
    </Suspense>
  );
}

"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { LayoutGrid, List, RefreshCw, Brain, Zap } from "lucide-react";
import type { CompanyPulseSummary, AceInsight, VehicleActivity, FleetGroup, ApiResponse } from "@/types";
import FleetPulseSummaryStrip, { FleetPulseSummaryStripSkeleton } from "@/components/FleetPulseSummaryStrip";
import FleetCard, { FleetCardSkeleton, mergeAceDistanceData } from "@/components/FleetCard";
import FleetRankedTable, { FleetRankedTableSkeleton } from "@/components/FleetRankedTable";

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

type ViewMode = "cards" | "table";

function PulsePageContent() {
  const router = useRouter();

  const [summary, setSummary]         = useState<CompanyPulseSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [aceInsight, setAceInsight]   = useState<AceInsight | null>(null);
  const [aceLoading, setAceLoading]   = useState(true);
  const [mapVehicles, setMapVehicles] = useState<VehicleActivity[]>([]);
  const [mapGroups, setMapGroups]     = useState<FleetGroup[]>([]);
  const [viewMode, setViewMode]       = useState<ViewMode>("cards");

  useEffect(() => {
    async function load() {
      setSummaryLoading(true);
      try {
        const res  = await fetch("/api/pulse/summary");
        const data = (await res.json()) as ApiResponse<CompanyPulseSummary>;
        if (data.ok) { setSummary(data.data); setMapGroups(data.data.fleets.map((f) => f.group)); }
        else throw new Error(data.error);
      } catch {
        try {
          const res  = await fetch("/fallback/pulse-summary.json");
          const data = (await res.json()) as CompanyPulseSummary;
          setSummary(data);
          setMapGroups(data.fleets.map((f) => f.group));
        } catch { setSummary(null); }
      } finally { setSummaryLoading(false); }
    }
    load();
  }, []);

  useEffect(() => {
    async function loadAce() {
      setAceLoading(true);
      try {
        const res  = await fetch("/api/ace/query", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ queryKey: "fleet-distance-by-group" }),
        });
        const data = (await res.json()) as ApiResponse<AceInsight>;
        if (data.ok) setAceInsight(data.data);
      } catch {
        try {
          const res  = await fetch("/fallback/ace-fleet-distance-by-group.json");
          const data = (await res.json()) as AceInsight;
          setAceInsight(data);
        } catch { setAceInsight(null); }
      } finally { setAceLoading(false); }
    }
    loadAce();
  }, []);

  useEffect(() => {
    if (!summary) return;
    async function loadMapVehicles() {
      try {
        const res  = await fetch(`/api/pulse/fleet/all`);
        const data = (await res.json()) as ApiResponse<{ vehicles: VehicleActivity[] }>;
        if (data.ok) setMapVehicles(data.data.vehicles);
      } catch {
        try {
          const res  = await fetch("/fallback/pulse-fleet-all.json");
          const data = (await res.json()) as { vehicles: VehicleActivity[] };
          setMapVehicles(data.vehicles ?? []);
        } catch { setMapVehicles([]); }
      }
    }
    loadMapVehicles();
  }, [summary]);

  const aceRowById = summary && aceInsight ? mergeAceDistanceData(summary.fleets, aceInsight) : new Map();

  return (
    <div className="min-h-screen bg-[#09090e]">
      {/* Background texture */}
      <div className="pointer-events-none fixed inset-0 z-0 atlas-grid-bg opacity-40" />

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-10 border-b border-[rgba(255,255,255,0.07)] bg-[rgba(9,9,14,0.92)] backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center gap-3">
          {/* Brand */}
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-2 group shrink-0"
          >
            <div className="w-7 h-7 rounded-lg bg-[#f5a623] flex items-center justify-center shadow-[0_2px_8px_rgba(245,166,35,0.3)] group-hover:shadow-[0_2px_12px_rgba(245,166,35,0.5)] transition-shadow">
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                <path d="M2 7 C2 4 4 2 7 2 S12 4 12 7 L7 12 L2 7Z" fill="#09090e" />
              </svg>
            </div>
            <span className="font-display font-bold text-white text-sm hidden sm:block">FleetHappens</span>
          </button>

          <div className="w-px h-4 bg-[rgba(255,255,255,0.1)]" />

          <div className="flex items-center gap-2">
            <Zap className="h-3.5 w-3.5 text-[#f5a623]" />
            <span className="font-display font-bold text-white text-sm">Fleet Pulse</span>
            <span className="text-[10px] font-bold text-[rgba(232,237,248,0.45)] bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)] rounded-full px-2 py-0.5 font-body">
              Company View
            </span>
          </div>

          <div className="ml-auto flex items-center gap-3 shrink-0">
            {aceLoading && (
              <span className="hidden sm:flex items-center gap-1.5 text-[11px] text-[rgba(232,237,248,0.4)] font-body">
                <Brain className="h-3 w-3 text-[#f5a623] animate-pulse" />
                Ace loading…
              </span>
            )}
            {/* View toggle */}
            <div className="flex rounded-lg border border-[rgba(255,255,255,0.08)] overflow-hidden bg-[rgba(255,255,255,0.03)]">
              <button
                onClick={() => setViewMode("cards")}
                className={`h-8 w-8 flex items-center justify-center transition-all ${
                  viewMode === "cards"
                    ? "bg-[rgba(245,166,35,0.15)] text-[#f5a623]"
                    : "text-[rgba(232,237,248,0.4)] hover:text-[rgba(232,237,248,0.7)]"
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </button>
              <div className="w-px bg-[rgba(255,255,255,0.08)]" />
              <button
                onClick={() => setViewMode("table")}
                className={`h-8 w-8 flex items-center justify-center transition-all ${
                  viewMode === "table"
                    ? "bg-[rgba(245,166,35,0.15)] text-[#f5a623]"
                    : "text-[rgba(232,237,248,0.4)] hover:text-[rgba(232,237,248,0.7)]"
                }`}
              >
                <List className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* KPI strip */}
        {summaryLoading ? (
          <FleetPulseSummaryStripSkeleton />
        ) : summary ? (
          <FleetPulseSummaryStrip summary={summary} aceInsight={aceInsight} />
        ) : null}

        {/* Section header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display font-bold text-lg text-white">
              {viewMode === "cards" ? "Fleet Overview" : "Fleet Rankings"}
            </h2>
            <p className="text-xs text-[rgba(232,237,248,0.4)] mt-0.5 font-body">
              Click any fleet to drill into vehicle activity
            </p>
          </div>
          {aceLoading && (
            <span className="flex items-center gap-1.5 text-xs text-[rgba(232,237,248,0.4)] font-body">
              <RefreshCw className="h-3 w-3 text-[#f5a623] animate-spin" />
              Loading Ace metrics…
            </span>
          )}
        </div>

        {/* Main grid: fleet list + map */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-5">
          <div>
            {summaryLoading ? (
              viewMode === "cards" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {Array.from({ length: 4 }).map((_, i) => <FleetCardSkeleton key={i} />)}
                </div>
              ) : (
                <FleetRankedTableSkeleton />
              )
            ) : summary ? (
              viewMode === "cards" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 stagger">
                  {summary.fleets.map((fleet) => (
                    <FleetCard
                      key={fleet.group.id}
                      summary={fleet}
                      aceRow={aceRowById.get(fleet.group.id) ?? null}
                      onClick={() => router.push(`/pulse/${fleet.group.id}`)}
                    />
                  ))}
                </div>
              ) : (
                <FleetRankedTable
                  fleets={summary.fleets}
                  aceRowById={aceRowById}
                  onSelectFleet={(id) => router.push(`/pulse/${id}`)}
                />
              )
            ) : (
              <div className="py-20 text-center">
                <p className="text-sm text-[rgba(232,237,248,0.4)] font-body">
                  No fleet data available. Check your Geotab credentials.
                </p>
              </div>
            )}
          </div>

          {/* Regional map */}
          <div className="xl:h-[480px] h-80">
            <FleetRegionalMap
              vehicles={mapVehicles}
              groups={mapGroups}
              onVehicleClick={(vehicleId) => {
                if (summary) router.push(`/dashboard?deviceId=${vehicleId}`);
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PulsePage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen bg-[#09090e] flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="relative w-10 h-10">
              <div className="absolute inset-0 rounded-full border-2 border-[rgba(245,166,35,0.2)]" />
              <div className="absolute inset-0 rounded-full border-2 border-t-[#f5a623] border-transparent animate-spin" />
            </div>
            <p className="text-sm text-[rgba(232,237,248,0.4)] font-body">Loading Fleet Pulse…</p>
          </div>
        </div>
      }
    >
      <PulsePageContent />
    </Suspense>
  );
}

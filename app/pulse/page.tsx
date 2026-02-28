"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  Route,
  LayoutGrid,
  List,
  RefreshCw,
  Brain,
  Zap,
} from "lucide-react";
import type {
  CompanyPulseSummary,
  AceInsight,
  VehicleActivity,
  FleetGroup,
  ApiResponse,
} from "@/types";
import FleetPulseSummaryStrip, {
  FleetPulseSummaryStripSkeleton,
} from "@/components/FleetPulseSummaryStrip";
import FleetCard, {
  FleetCardSkeleton,
  mergeAceDistanceData,
} from "@/components/FleetCard";
import FleetRankedTable, {
  FleetRankedTableSkeleton,
} from "@/components/FleetRankedTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

// Leaflet map must be client-only
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

type ViewMode = "cards" | "table";

function PulsePageContent() {
  const router = useRouter();

  const [summary, setSummary] = useState<CompanyPulseSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);

  const [aceInsight, setAceInsight] = useState<AceInsight | null>(null);
  const [aceLoading, setAceLoading] = useState(true);

  // All vehicle positions for the regional map (fetched from all fleet details)
  const [mapVehicles, setMapVehicles] = useState<VehicleActivity[]>([]);
  const [mapGroups, setMapGroups] = useState<FleetGroup[]>([]);

  const [viewMode, setViewMode] = useState<ViewMode>("cards");

  // ── Load summary ──────────────────────────────────────────────────────────

  useEffect(() => {
    async function load() {
      setSummaryLoading(true);
      try {
        const res = await fetch("/api/pulse/summary");
        const data = (await res.json()) as ApiResponse<CompanyPulseSummary>;
        if (data.ok) {
          setSummary(data.data);
          setMapGroups(data.data.fleets.map((f) => f.group));
        } else {
          throw new Error(data.error);
        }
      } catch {
        // Try file fallback
        try {
          const res = await fetch("/fallback/pulse-summary.json");
          const data = (await res.json()) as CompanyPulseSummary;
          setSummary(data);
          setMapGroups(data.fleets.map((f) => f.group));
        } catch {
          setSummary(null);
        }
      } finally {
        setSummaryLoading(false);
      }
    }
    load();
  }, []);

  // ── Load Ace fleet distance data ─────────────────────────────────────────

  useEffect(() => {
    async function loadAce() {
      setAceLoading(true);
      try {
        const res = await fetch("/api/ace/query", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ queryKey: "fleet-distance-by-group" }),
        });
        const data = (await res.json()) as ApiResponse<AceInsight>;
        if (data.ok) setAceInsight(data.data);
      } catch {
        try {
          const res = await fetch("/fallback/ace-fleet-distance-by-group.json");
          const data = (await res.json()) as AceInsight;
          setAceInsight(data);
        } catch {
          setAceInsight(null);
        }
      } finally {
        setAceLoading(false);
      }
    }
    loadAce();
  }, []);

  // ── Load vehicle positions for the map (first fleet detail) ─────────────

  useEffect(() => {
    if (!summary) return;
    // Fetch status-enriched vehicles from the first fleet as a quick map seed
    // In a production app you'd fetch all fleets' positions
    async function loadMapVehicles() {
      try {
        const res = await fetch(`/api/pulse/fleet/all`);
        const data = (await res.json()) as ApiResponse<{ vehicles: VehicleActivity[] }>;
        if (data.ok) {
          setMapVehicles(data.data.vehicles);
        }
      } catch {
        try {
          const res = await fetch("/fallback/pulse-fleet-all.json");
          const data = (await res.json()) as { vehicles: VehicleActivity[] };
          setMapVehicles(data.vehicles ?? []);
        } catch {
          setMapVehicles([]);
        }
      }
    }
    loadMapVehicles();
  }, [summary]);

  // ── Derived state ─────────────────────────────────────────────────────────

  const aceRowById =
    summary && aceInsight
      ? mergeAceDistanceData(summary.fleets, aceInsight)
      : new Map();

  // ── Render ────────────────────────────────────────────────────────────────

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

          <div className="flex items-center gap-2">
            <Zap className="h-3.5 w-3.5 text-fleet-blue" />
            <span className="font-semibold text-sm text-foreground">
              Fleet Pulse
            </span>
            <Badge variant="secondary" className="text-xs">
              Company View
            </Badge>
          </div>

          <div className="ml-auto flex items-center gap-2 shrink-0">
            {aceLoading && (
              <Badge variant="secondary" className="text-xs gap-1">
                <RefreshCw className="h-2.5 w-2.5 animate-spin" />
                Ace querying…
              </Badge>
            )}
            <div className="flex rounded-lg border border-border overflow-hidden">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode("cards")}
                className={`rounded-none h-8 px-3 ${viewMode === "cards" ? "bg-muted" : ""}`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode("table")}
                className={`rounded-none h-8 px-3 border-l border-border ${viewMode === "table" ? "bg-muted" : ""}`}
              >
                <List className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Summary KPI strip */}
        {summaryLoading ? (
          <FleetPulseSummaryStripSkeleton />
        ) : summary ? (
          <FleetPulseSummaryStrip
            summary={summary}
            aceInsight={aceInsight}
          />
        ) : null}

        {/* Section header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-fleet-navy">
              {viewMode === "cards" ? "Fleet Overview" : "Fleet Rankings"}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Click any fleet to drill into vehicle activity
            </p>
          </div>
          {aceLoading && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Brain className="h-3 w-3 text-fleet-amber animate-pulse" />
              Loading Ace metrics…
            </div>
          )}
        </div>

        {/* Main content: fleet list + map */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6">
          {/* Fleet cards or ranked table */}
          <div>
            {summaryLoading ? (
              viewMode === "cards" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <FleetCardSkeleton key={i} />
                  ))}
                </div>
              ) : (
                <FleetRankedTableSkeleton />
              )
            ) : summary ? (
              viewMode === "cards" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <div className="py-16 text-center">
                <p className="text-sm text-muted-foreground">
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
                // Find which fleet this vehicle belongs to and navigate
                if (summary) {
                  router.push(`/dashboard?deviceId=${vehicleId}`);
                }
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
        <div className="h-screen flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 rounded-full border-2 border-fleet-blue border-t-transparent animate-spin" />
            <p className="text-sm text-muted-foreground">Loading Fleet Pulse…</p>
          </div>
        </div>
      }
    >
      <PulsePageContent />
    </Suspense>
  );
}

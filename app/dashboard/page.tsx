"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Truck, BookOpen, Brain, RefreshCw, Route, Circle, ChevronLeft, Zap } from "lucide-react";
import type {
  TripSummary,
  BreadcrumbPoint,
  StopContext,
  AceInsight,
  LatLon,
  ApiResponse,
  VehicleCard,
} from "@/types";
import TripList from "@/components/TripList";
import TripStatsCard from "@/components/TripStatsCard";
import AceInsightCard, { AceInsightCardSkeleton } from "@/components/AceInsightCard";
import StopContextPanel from "@/components/StopContextPanel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

// Dynamic import for map (no SSR — Leaflet requires window)
const TripMap = dynamic(() => import("@/components/TripMap"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full rounded-xl border border-border bg-muted/30 flex items-center justify-center">
      <div className="flex flex-col items-center gap-2">
        <div className="h-7 w-7 rounded-full border-2 border-fleet-blue border-t-transparent animate-spin" />
        <p className="text-xs text-muted-foreground">Loading map…</p>
      </div>
    </div>
  ),
});

function DashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const deviceId = searchParams.get("deviceId") ?? "";
  const deviceName = searchParams.get("deviceName") ?? "Vehicle";
  const groupId = searchParams.get("groupId") ?? "";

  // Trip state
  const [trips, setTrips] = useState<TripSummary[]>([]);
  const [tripsLoading, setTripsLoading] = useState(true);
  const [selectedTrip, setSelectedTrip] = useState<TripSummary | null>(null);
  const [dateRangeDays, setDateRangeDays] = useState<number>(7);

  // Breadcrumb state
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbPoint[]>([]);
  const [breadcrumbsLoading, setBreadcrumbsLoading] = useState(false);

  // Stop context state
  const [selectedStop, setSelectedStop] = useState<LatLon | null>(null);
  const [stopContext, setStopContext] = useState<StopContext | null>(null);
  const [stopContextLoading, setStopContextLoading] = useState(false);
  const [storyStops, setStoryStops] = useState<StopContext[]>([]);

  // Ace insights
  const [aceInsights, setAceInsights] = useState<AceInsight[]>([]);
  const [aceLoading, setAceLoading] = useState(true);

  // Fetch trips
  useEffect(() => {
    if (!deviceId) return;

    async function fetchTrips() {
      setTripsLoading(true);
      try {
        const res = await fetch(`/api/geotab/trips?deviceId=${deviceId}`);
        const data = (await res.json()) as ApiResponse<TripSummary[]> & { dateRangeDays?: number };
        if (data.ok) {
          setTrips(data.data);
          if (data.dateRangeDays) setDateRangeDays(data.dateRangeDays);
        } else {
          throw new Error(data.error);
        }
      } catch {
        try {
          const res = await fetch("/fallback/trips.json");
          const data = await res.json();
          // trips.json is a bare array; older shape had a { trips: [] } wrapper
          const raw: TripSummary[] = Array.isArray(data) ? data : (data.trips ?? []);
          // Stamp with the current deviceId so TripList and breadcrumb fetches work
          setTrips(raw.map((t) => ({ ...t, deviceId, deviceName })));
        } catch {
          setTrips([]);
        }
      } finally {
        setTripsLoading(false);
      }
    }

    fetchTrips();
  }, [deviceId]);

  // Fetch breadcrumbs when trip selected
  useEffect(() => {
    if (!selectedTrip) {
      setBreadcrumbs([]);
      return;
    }

    async function fetchBreadcrumbs() {
      if (!selectedTrip) return;
      setBreadcrumbsLoading(true);
      try {
        const res = await fetch(
          `/api/geotab/logs?deviceId=${selectedTrip.deviceId}&from=${selectedTrip.start}&to=${selectedTrip.stop}`
        );
        const data = (await res.json()) as ApiResponse<BreadcrumbPoint[]>;
        if (data.ok) {
          setBreadcrumbs(data.data);
        } else {
          throw new Error(data.error);
        }
      } catch {
        try {
          const res = await fetch("/fallback/logs.json");
          const data = await res.json();
          // Normalise fallback records to BreadcrumbPoint shape
          setBreadcrumbs(
            (data.records as Array<{
              latitude: number;
              longitude: number;
              speed: number;
              dateTime: string;
            }>).map((r) => ({
              dateTime: r.dateTime,
              lat: r.latitude,
              lon: r.longitude,
              speedKmh: r.speed,
            }))
          );
        } catch {
          setBreadcrumbs([]);
        }
      } finally {
        setBreadcrumbsLoading(false);
      }
    }

    fetchBreadcrumbs();
  }, [selectedTrip]);

  // Fetch Ace insights (once on mount)
  useEffect(() => {
    async function fetchAce() {
      setAceLoading(true);
      try {
        const res = await fetch("/api/ace/insights");
        const data = (await res.json()) as ApiResponse<AceInsight[]>;
        if (data.ok) {
          setAceInsights(data.data);
        } else {
          throw new Error(data.error);
        }
      } catch {
        try {
          const res = await fetch("/fallback/ace-insights.json");
          const data = await res.json();
          setAceInsights(data.insights ?? []);
        } catch {
          setAceInsights([]);
        }
      } finally {
        setAceLoading(false);
      }
    }

    fetchAce();
  }, []);

  // Handle stop click from TripMap
  const handleStopClick = useCallback(
    async (coords: LatLon) => {
      setSelectedStop(coords);
      setStopContextLoading(true);
      setStopContext(null);

      let phase1: StopContext | null = null;

      // Phase 1: geocode + amenities + LLM briefing (fast, ~3-5s)
      try {
        const res = await fetch("/api/context/briefing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tripId: selectedTrip?.id ?? "",
            lat: coords.lat,
            lon: coords.lon,
          }),
        });
        const json = await res.json();
        // API returns { data: StopContext } on success, { error } on failure
        if (json.data) {
          phase1 = json.data as StopContext;
          setStopContext(phase1);
        } else {
          throw new Error(json.error ?? "Briefing failed");
        }
      } catch {
        try {
          const res = await fetch("/fallback/stop-context.json");
          const data = await res.json();
          const ctx = (data.contexts as StopContext[])[0];
          if (ctx) {
            phase1 = { ...ctx, fromCache: true, coordinates: coords };
            setStopContext(phase1);
          }
        } catch {
          setStopContext(null);
        }
      } finally {
        setStopContextLoading(false);
      }

      // Phase 2: Ace fleet visit enrichment (slow, 30-90s) — fire and update
      if (phase1 && !phase1.fromCache) {
        try {
          const res = await fetch("/api/context/enrich", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ context: phase1 }),
          });
          const json = await res.json();
          if (json.data) {
            setStopContext(json.data as StopContext);
          }
        } catch {
          // Phase 2 failure is non-fatal — Phase 1 result stays displayed
        }
      }
    },
    [selectedTrip]
  );

  function handleClosePanel() {
    setSelectedStop(null);
    setStopContext(null);
  }

  function handleUseInStory(ctx: StopContext) {
    setStoryStops((prev) => {
      const exists = prev.some((s) => s.id === ctx.id);
      if (exists) return prev.filter((s) => s.id !== ctx.id);
      return [...prev, ctx];
    });
  }

  function handleCreateStory() {
    if (!selectedTrip) return;
    // Persist storyStops to sessionStorage so the story page can read them
    try {
      sessionStorage.setItem(
        `storyStops:${selectedTrip.id}`,
        JSON.stringify(storyStops)
      );
      sessionStorage.setItem(
        `trip:${selectedTrip.id}`,
        JSON.stringify(selectedTrip)
      );
    } catch {
      // sessionStorage unavailable — story page will generate without enriched stops
    }
    router.push(
      `/story/${selectedTrip.id}?deviceId=${deviceId}&deviceName=${encodeURIComponent(deviceName)}`
    );
  }

  const isPanelOpen = selectedStop !== null;

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      {/* Top nav */}
      <header className="bg-white border-b border-border h-14 flex items-center px-5 gap-3 shrink-0 z-20 shadow-[0_1px_0_hsl(30,8%,90%)]">
        {/* Brand mark — links home */}
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

        {/* Back to Fleet Pulse breadcrumb (shown when coming from a fleet view) */}
        {groupId && (
          <>
            <button
              onClick={() => router.push(`/pulse/${groupId}`)}
              className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors text-sm"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <Zap className="h-3 w-3" />
              <span className="hidden sm:inline">Fleet</span>
            </button>
            <span className="text-muted-foreground text-sm">/</span>
          </>
        )}

        {/* Active vehicle */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="rounded-md bg-fleet-blue/10 p-1.5 shrink-0">
            <Truck className="h-3.5 w-3.5 text-fleet-blue" />
          </div>
          <span className="font-semibold text-sm text-foreground truncate">{deviceName}</span>
          {!tripsLoading && trips.length > 0 && (
            <Badge variant="secondary" className="text-xs shrink-0">
              {trips.length} trip{trips.length !== 1 ? "s" : ""} · last {dateRangeDays === 365 ? "year" : `${dateRangeDays}d`}
            </Badge>
          )}
        </div>

        {/* Right side */}
        <div className="ml-auto flex items-center gap-2 shrink-0">
          {storyStops.length > 0 && (
            <Badge variant="teal" className="text-xs gap-1 hidden sm:inline-flex">
              <Circle className="h-2 w-2 fill-fleet-teal" />
              {storyStops.length} stop{storyStops.length > 1 ? "s" : ""} flagged
            </Badge>
          )}
          <Button
            size="sm"
            variant="fleet"
            onClick={handleCreateStory}
            disabled={!selectedTrip}
            className="gap-1.5 shadow-sm"
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Create Trip Story</span>
            <span className="sm:hidden">Story</span>
          </Button>
        </div>
      </header>

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel: trip list */}
        <aside className="w-[320px] shrink-0 flex flex-col bg-white border-r border-border overflow-hidden">
          <div className="px-4 py-3 border-b border-border shrink-0 bg-white">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recent Trips</h2>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          <ScrollArea className="flex-1">
            <TripList
              trips={trips}
              selectedTripId={selectedTrip?.id ?? null}
              onSelect={(trip) => {
                setSelectedTrip(trip);
                setSelectedStop(null);
                setStopContext(null);
              }}
              loading={tripsLoading}
            />
          </ScrollArea>

          {selectedTrip && (
            <div className="shrink-0 border-t border-border p-3">
              <TripStatsCard trip={selectedTrip} />
            </div>
          )}
        </aside>

        {/* Right: map + Ace */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Map */}
          <div className="flex-1 p-3 min-h-0">
            <TripMap
              trip={selectedTrip}
              breadcrumbs={breadcrumbs}
              selectedStop={selectedStop}
              onStopClick={handleStopClick}
            />
          </div>

          {/* Ace insight strip */}
          <div className="shrink-0 border-t border-border bg-white">
            <div className="px-4 pt-3 pb-2 flex items-center gap-2">
              <div className="rounded-md bg-fleet-amber/10 p-1.5">
                <Brain className="h-3.5 w-3.5 text-fleet-amber" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">Fleet Insights</h3>
              <Badge variant="amber" className="text-xs">Ace API</Badge>
              {aceLoading && (
                <Badge variant="secondary" className="text-xs gap-1">
                  <RefreshCw className="h-2.5 w-2.5 animate-spin" />
                  Querying…
                </Badge>
              )}
            </div>
            <div className="px-4 pb-4 flex gap-3 overflow-x-auto">
              {aceLoading
                ? Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="w-72 shrink-0">
                      <AceInsightCardSkeleton />
                    </div>
                  ))
                : aceInsights.slice(0, 4).map((insight) => (
                    <div key={insight.id} className="w-72 shrink-0">
                      <AceInsightCard insight={insight} />
                    </div>
                  ))}
            </div>
          </div>
        </main>
      </div>

      {/* Stop context slide-in panel */}
      {isPanelOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/20 z-40 backdrop-blur-[1px]"
            onClick={handleClosePanel}
          />
          <StopContextPanel
            context={stopContext}
            loading={stopContextLoading}
            onClose={handleClosePanel}
            coordinates={selectedStop}
            useInStory={stopContext ? storyStops.some((s) => s.id === stopContext.id) : false}
            onUseInStory={handleUseInStory}
          />
        </>
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 rounded-full border-2 border-fleet-blue border-t-transparent animate-spin" />
            <p className="text-sm text-muted-foreground">Loading dashboard…</p>
          </div>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}

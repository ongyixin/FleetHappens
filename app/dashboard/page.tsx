"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Truck, BookOpen, Brain, RefreshCw, ChevronLeft, Zap, Circle } from "lucide-react";
import type {
  TripSummary,
  BreadcrumbPoint,
  StopContext,
  AceInsight,
  LatLon,
  ApiResponse,
} from "@/types";
import TripList from "@/components/TripList";
import TripStatsCard from "@/components/TripStatsCard";
import AceInsightCard, { AceInsightCardSkeleton } from "@/components/AceInsightCard";
import StopContextPanel from "@/components/StopContextPanel";
import { cn } from "@/lib/utils";

const TripMap = dynamic(() => import("@/components/TripMap"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full rounded-xl border border-[rgba(255,255,255,0.07)] bg-[#101318] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="relative w-8 h-8">
          <div className="absolute inset-0 rounded-full border-2 border-[rgba(245,166,35,0.2)]" />
          <div className="absolute inset-0 rounded-full border-2 border-t-[#f5a623] border-transparent animate-spin" />
        </div>
        <p className="text-[11px] text-[rgba(232,237,248,0.4)] font-body">Loading map…</p>
      </div>
    </div>
  ),
});

function DashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const deviceId   = searchParams.get("deviceId")   ?? "";
  const deviceName = searchParams.get("deviceName") ?? "Vehicle";
  const groupId    = searchParams.get("groupId")    ?? "";

  const [trips, setTrips]                 = useState<TripSummary[]>([]);
  const [tripsLoading, setTripsLoading]   = useState(true);
  const [selectedTrip, setSelectedTrip]   = useState<TripSummary | null>(null);
  const [dateRangeDays, setDateRangeDays] = useState<number>(7);

  const [breadcrumbs, setBreadcrumbs]               = useState<BreadcrumbPoint[]>([]);
  const [breadcrumbsLoading, setBreadcrumbsLoading] = useState(false);

  const [selectedStop, setSelectedStop]           = useState<LatLon | null>(null);
  const [stopContext, setStopContext]             = useState<StopContext | null>(null);
  const [stopContextLoading, setStopContextLoading] = useState(false);
  const [storyStops, setStoryStops]               = useState<StopContext[]>([]);

  const [aceInsights, setAceInsights] = useState<AceInsight[]>([]);
  const [aceLoading, setAceLoading]   = useState(true);

  useEffect(() => {
    if (!deviceId) return;
    async function fetchTrips() {
      setTripsLoading(true);
      try {
        const res  = await fetch(`/api/geotab/trips?deviceId=${deviceId}`);
        const data = (await res.json()) as ApiResponse<TripSummary[]> & { dateRangeDays?: number };
        if (data.ok) {
          setTrips(data.data);
          if (data.dateRangeDays) setDateRangeDays(data.dateRangeDays);
        } else throw new Error(data.error);
      } catch {
        try {
          const res  = await fetch("/fallback/trips.json");
          const data = await res.json();
          const raw: TripSummary[] = Array.isArray(data) ? data : (data.trips ?? []);
          setTrips(raw.map((t) => ({ ...t, deviceId, deviceName })));
        } catch { setTrips([]); }
      } finally { setTripsLoading(false); }
    }
    fetchTrips();
  }, [deviceId]);

  useEffect(() => {
    if (!selectedTrip) { setBreadcrumbs([]); return; }
    async function fetchBreadcrumbs() {
      if (!selectedTrip) return;
      setBreadcrumbsLoading(true);
      try {
        const res  = await fetch(`/api/geotab/logs?deviceId=${selectedTrip.deviceId}&from=${selectedTrip.start}&to=${selectedTrip.stop}`);
        const data = (await res.json()) as ApiResponse<BreadcrumbPoint[]>;
        if (data.ok) setBreadcrumbs(data.data); else throw new Error(data.error);
      } catch {
        try {
          const res  = await fetch("/fallback/logs.json");
          const data = await res.json();
          setBreadcrumbs((data.records as Array<{ latitude: number; longitude: number; speed: number; dateTime: string }>).map((r) => ({
            dateTime: r.dateTime, lat: r.latitude, lon: r.longitude, speedKmh: r.speed,
          })));
        } catch { setBreadcrumbs([]); }
      } finally { setBreadcrumbsLoading(false); }
    }
    fetchBreadcrumbs();
  }, [selectedTrip]);

  useEffect(() => {
    async function fetchAce() {
      setAceLoading(true);
      try {
        const res  = await fetch("/api/ace/insights");
        const data = (await res.json()) as ApiResponse<AceInsight[]>;
        if (data.ok) setAceInsights(data.data); else throw new Error(data.error);
      } catch {
        try {
          const res  = await fetch("/fallback/ace-insights.json");
          const data = await res.json();
          setAceInsights(data.insights ?? []);
        } catch { setAceInsights([]); }
      } finally { setAceLoading(false); }
    }
    fetchAce();
  }, []);

  const handleStopClick = useCallback(async (coords: LatLon) => {
    setSelectedStop(coords);
    setStopContextLoading(true);
    setStopContext(null);
    let phase1: StopContext | null = null;
    try {
      const res  = await fetch("/api/context/briefing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tripId: selectedTrip?.id ?? "", lat: coords.lat, lon: coords.lon }),
      });
      const json = await res.json();
      if (json.data) { phase1 = json.data as StopContext; setStopContext(phase1); }
      else throw new Error(json.error ?? "Briefing failed");
    } catch {
      try {
        const res  = await fetch("/fallback/stop-context.json");
        const data = await res.json();
        const ctx  = (data.contexts as StopContext[])[0];
        if (ctx) { phase1 = { ...ctx, fromCache: true, coordinates: coords }; setStopContext(phase1); }
      } catch { setStopContext(null); }
    } finally { setStopContextLoading(false); }

    if (phase1 && !phase1.fromCache) {
      try {
        const res  = await fetch("/api/context/enrich", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ context: phase1 }),
        });
        const json = await res.json();
        if (json.data) setStopContext(json.data as StopContext);
      } catch { /* non-fatal */ }
    }
  }, [selectedTrip]);

  function handleClosePanel() { setSelectedStop(null); setStopContext(null); }

  function handleUseInStory(ctx: StopContext) {
    setStoryStops((prev) => {
      const exists = prev.some((s) => s.id === ctx.id);
      return exists ? prev.filter((s) => s.id !== ctx.id) : [...prev, ctx];
    });
  }

  function handleCreateStory() {
    if (!selectedTrip) return;
    try {
      sessionStorage.setItem(`storyStops:${selectedTrip.id}`, JSON.stringify(storyStops));
      sessionStorage.setItem(`trip:${selectedTrip.id}`, JSON.stringify(selectedTrip));
    } catch { /* unavailable */ }
    router.push(`/story/${selectedTrip.id}?deviceId=${deviceId}&deviceName=${encodeURIComponent(deviceName)}`);
  }

  const isPanelOpen = selectedStop !== null;

  return (
    <div className="flex flex-col h-screen bg-[#09090e] overflow-hidden">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="shrink-0 z-20 border-b border-[rgba(255,255,255,0.07)] bg-[rgba(9,9,14,0.92)] backdrop-blur-sm">
        <div className="h-14 flex items-center px-5 gap-3">
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

          {/* Back to Fleet Pulse */}
          {groupId && (
            <>
              <button
                onClick={() => router.push(`/pulse/${groupId}`)}
                className="flex items-center gap-1.5 text-[rgba(232,237,248,0.45)] hover:text-white transition-colors text-xs font-body"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                <Zap className="h-3 w-3" />
                <span className="hidden sm:inline">Fleet</span>
              </button>
              <span className="text-[rgba(255,255,255,0.2)] text-xs">/</span>
            </>
          )}

          {/* Vehicle name */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="rounded-lg bg-[rgba(56,189,248,0.1)] p-1.5 shrink-0">
              <Truck className="h-3.5 w-3.5 text-[#38bdf8]" />
            </div>
            <span className="font-semibold text-sm text-white font-body truncate">{deviceName}</span>
            {!tripsLoading && trips.length > 0 && (
              <span className="text-[11px] font-data text-[rgba(232,237,248,0.4)] bg-[rgba(255,255,255,0.05)] px-2 py-0.5 rounded-full shrink-0">
                {trips.length}t · {dateRangeDays === 365 ? "1yr" : `${dateRangeDays}d`}
              </span>
            )}
          </div>

          {/* Right actions */}
          <div className="ml-auto flex items-center gap-3 shrink-0">
            {storyStops.length > 0 && (
              <span className="hidden sm:flex items-center gap-1.5 text-[11px] text-[#34d399] font-body bg-[rgba(52,211,153,0.08)] border border-[rgba(52,211,153,0.2)] rounded-full px-3 py-1">
                <Circle className="h-1.5 w-1.5 fill-[#34d399]" />
                {storyStops.length} stop{storyStops.length > 1 ? "s" : ""} flagged
              </span>
            )}
            <button
              onClick={handleCreateStory}
              disabled={!selectedTrip}
              className={cn(
                "inline-flex items-center gap-1.5 h-8 px-4 rounded-lg text-xs font-display font-bold transition-all",
                selectedTrip
                  ? "btn-amber"
                  : "bg-[rgba(255,255,255,0.05)] text-[rgba(232,237,248,0.3)] cursor-not-allowed border border-[rgba(255,255,255,0.06)]"
              )}
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Create Trip Story</span>
              <span className="sm:hidden">Story</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Main layout ────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: trip list */}
        <aside className="w-[300px] shrink-0 flex flex-col bg-[#101318] border-r border-[rgba(255,255,255,0.07)] overflow-hidden">
          <div className="px-4 py-3 border-b border-[rgba(255,255,255,0.06)] shrink-0">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[rgba(232,237,248,0.35)] font-body">
                Recent Trips
              </p>
              <button className="p-1 rounded-md text-[rgba(232,237,248,0.3)] hover:text-[rgba(232,237,248,0.7)] hover:bg-[rgba(255,255,255,0.05)] transition-all">
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            <TripList
              trips={trips}
              selectedTripId={selectedTrip?.id ?? null}
              onSelect={(trip) => { setSelectedTrip(trip); setSelectedStop(null); setStopContext(null); }}
              loading={tripsLoading}
            />
          </div>

          {selectedTrip && (
            <div className="shrink-0 border-t border-[rgba(255,255,255,0.06)] p-3">
              <TripStatsCard trip={selectedTrip} />
            </div>
          )}
        </aside>

        {/* Right: map + Ace */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Map */}
          <div className="flex-1 p-2.5 min-h-0">
            <div className="h-full w-full rounded-xl overflow-hidden border border-[rgba(255,255,255,0.08)]">
              <TripMap
                trip={selectedTrip}
                breadcrumbs={breadcrumbs}
                selectedStop={selectedStop}
                onStopClick={handleStopClick}
              />
            </div>
          </div>

          {/* Ace insight strip */}
          <div className="shrink-0 border-t border-[rgba(255,255,255,0.07)] bg-[#101318]">
            <div className="px-4 pt-3 pb-2 flex items-center gap-2.5">
              <div className="rounded-lg bg-[rgba(245,166,35,0.1)] p-1.5">
                <Brain className="h-3.5 w-3.5 text-[#f5a623]" />
              </div>
              <span className="text-xs font-display font-bold text-white">Fleet Intelligence</span>
              <span className="text-[10px] font-bold text-[#f5a623] bg-[rgba(245,166,35,0.1)] border border-[rgba(245,166,35,0.2)] rounded-full px-2 py-0.5 font-body">
                Ace API
              </span>
              {aceLoading && (
                <span className="text-[10px] text-[rgba(232,237,248,0.4)] flex items-center gap-1 font-body">
                  <RefreshCw className="h-2.5 w-2.5 animate-spin" />
                  Querying…
                </span>
              )}
            </div>
            <div className="px-4 pb-3 flex gap-3 overflow-x-auto">
              {aceLoading
                ? Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="w-72 shrink-0"><AceInsightCardSkeleton /></div>
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

      {/* Stop context panel */}
      {isPanelOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40 backdrop-blur-[2px]"
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
        <div className="h-screen bg-[#09090e] flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="relative w-10 h-10">
              <div className="absolute inset-0 rounded-full border-2 border-[rgba(245,166,35,0.2)]" />
              <div className="absolute inset-0 rounded-full border-2 border-t-[#f5a623] border-transparent animate-spin" />
            </div>
            <p className="text-sm text-[rgba(232,237,248,0.4)] font-body">Loading dashboard…</p>
          </div>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}

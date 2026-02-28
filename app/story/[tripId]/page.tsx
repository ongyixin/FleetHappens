"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft, Sparkles, MapPin } from "lucide-react";
import type { ComicStory, ComicTone, TripSummary, StopContext, ApiResponse } from "@/types";
import ComicStoryRenderer from "@/components/ComicStoryRenderer";
import { format } from "date-fns";

// ─── Geocode helpers ──────────────────────────────────────────────────────────

interface GeocodeData {
  placeName?: string;
  neighborhood?: string;
  city?: string;
}

/** Reverse-geocode a lat/lon via the server-side route. Never throws. */
async function geocodeName(lat: number, lon: number): Promise<GeocodeData> {
  try {
    const res = await fetch(`/api/geocode?lat=${lat}&lon=${lon}`);
    if (!res.ok) return {};
    const json = await res.json();
    return (json.data as GeocodeData) ?? {};
  } catch {
    return {};
  }
}

/**
 * Build a human-readable location label from geocode data.
 * Priority: "Neighbourhood, City" → "City" → "Place Name" → fallback
 */
function buildLocationLabel(geo: GeocodeData, fallback: string): string {
  if (geo.neighborhood && geo.city) return `${geo.neighborhood}, ${geo.city}`;
  if (geo.city) return geo.city;
  if (geo.neighborhood) return geo.neighborhood;
  if (geo.placeName) return geo.placeName;
  return fallback;
}

/** Resolve start + end location names for a trip in parallel. */
async function resolveLocationNames(
  trip: TripSummary
): Promise<{ startName: string; endName: string }> {
  const [startGeo, endGeo] = await Promise.all([
    geocodeName(trip.startPoint.lat, trip.startPoint.lon),
    geocodeName(trip.endPoint.lat, trip.endPoint.lon),
  ]);
  return {
    startName: buildLocationLabel(startGeo, "Departure"),
    endName: buildLocationLabel(endGeo, "Destination"),
  };
}

export default function StoryPage() {
  const params       = useParams();
  const searchParams = useSearchParams();
  const router       = useRouter();

  const tripId     = params.tripId as string;
  const deviceId   = searchParams.get("deviceId")   ?? "";
  const deviceName = searchParams.get("deviceName") ?? "Vehicle";

  const [trip, setTrip]           = useState<TripSummary | null>(null);
  const [story, setStory]         = useState<ComicStory | null>(null);
  const [loading, setLoading]     = useState(true);
  const [generating, setGenerating] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [tone, setTone]           = useState<ComicTone>("playful");
  const [startName, setStartName] = useState<string>("Departure");
  const [endName, setEndName]     = useState<string>("Destination");

  useEffect(() => {
    async function fetchTrip() {
      setLoading(true);
      try {
        const cached = sessionStorage.getItem(`trip:${tripId}`);
        if (cached) { setTrip(JSON.parse(cached) as TripSummary); setLoading(false); return; }
      } catch { /* unavailable */ }
      try {
        const res  = await fetch(`/api/geotab/trips?deviceId=${deviceId}`);
        if (!res.ok) throw new Error("API error");
        const json = (await res.json()) as ApiResponse<TripSummary[]>;
        if (!json.ok) throw new Error(json.error);
        setTrip(json.data.find((t) => t.id === tripId) ?? null);
      } catch {
        try {
          const res  = await fetch("/fallback/trips.json");
          const data = await res.json();
          const trips = data.trips as TripSummary[];
          setTrip(trips.find((t) => t.id === tripId) ?? trips[0] ?? null);
        } catch { setTrip(null); }
      } finally { setLoading(false); }
    }
    fetchTrip();
  }, [tripId, deviceId]);

  useEffect(() => {
    if (!loading && trip) generateStory(tone);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, trip]);

  const enrichStoryImages = useCallback(async (currentStory: ComicStory) => {
    setEnriching(true);
    try {
      const res  = await fetch("/api/story/enrich-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ panels: currentStory.panels }),
      });
      if (!res.ok) return;
      const json = await res.json();
      if (json.ok && Array.isArray(json.panels)) {
        setStory((prev) => prev ? { ...prev, panels: json.panels } : prev);
      }
    } catch { /* keep story as-is */ }
    finally { setEnriching(false); }
  }, []);

  const generateStory = useCallback(async (selectedTone: ComicTone) => {
    if (!trip) return;
    setGenerating(true);
    setEnriching(false);

    let stopContexts: StopContext[] = [];
    try {
      const raw = sessionStorage.getItem(`storyStops:${trip.id}`);
      if (raw) stopContexts = JSON.parse(raw) as StopContext[];
    } catch { /* unavailable */ }

    // Resolve real place names for start/end before generating — runs in
    // parallel with no UI blocking. Falls back to "Departure"/"Destination".
    const { startName: resolvedStart, endName: resolvedEnd } =
      await resolveLocationNames(trip);
    setStartName(resolvedStart);
    setEndName(resolvedEnd);

    let generatedStory: ComicStory | null = null;
    try {
      const res = await fetch("/api/story/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trip,
          tone: selectedTone,
          startLocationName: resolvedStart,
          endLocationName: resolvedEnd,
          stopContexts,
        }),
      });
      if (!res.ok) throw new Error("API error");
      const json = await res.json();
      if (json.data) generatedStory = json.data as ComicStory;
      else throw new Error(json.error ?? "Story generation failed");
    } catch {
      try {
        const res = await fetch("/fallback/comic-story.json");
        const data = await res.json();
        const fallback = data.story ?? data;
        generatedStory = { ...(fallback as ComicStory), tone: selectedTone, tripId: trip.id };
      } catch { generatedStory = null; }
    } finally { setGenerating(false); }

    if (generatedStory) {
      setStory(generatedStory);
      enrichStoryImages(generatedStory);
    }
  }, [trip, enrichStoryImages]);

  function handleToneChange(t: ComicTone) { setTone(t); }
  function handleRegenerate(t: ComicTone) { generateStory(t); }

  return (
    <div className="min-h-screen bg-[#09090e] overflow-x-hidden">
      {/* Atmospheric background */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0 atlas-grid-bg opacity-30" />
        <div className="absolute top-0 left-0 right-0 h-[500px] bg-[radial-gradient(ellipse_at_top_center,rgba(251,146,60,0.06)_0%,transparent_60%)]" />
        <div className="absolute bottom-0 left-1/4 w-[600px] h-[400px] bg-[radial-gradient(ellipse,rgba(245,166,35,0.04)_0%,transparent_60%)]" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-[rgba(255,255,255,0.06)] bg-[rgba(9,9,14,0.85)] backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center gap-3">
          <button onClick={() => router.push("/")} className="flex items-center gap-2 group shrink-0">
            <div className="w-7 h-7 rounded-lg bg-[rgba(255,255,255,0.07)] flex items-center justify-center group-hover:bg-[rgba(255,255,255,0.12)] transition-colors">
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                <path d="M2 7 C2 4 4 2 7 2 S12 4 12 7 L7 12 L2 7Z" fill="rgba(232,237,248,0.7)" />
              </svg>
            </div>
            <span className="font-display font-bold text-[rgba(232,237,248,0.6)] text-sm hidden sm:block group-hover:text-white transition-colors">
              FleetHappens
            </span>
          </button>

          <span className="text-[rgba(255,255,255,0.15)] text-sm">/</span>

          <button
            onClick={() => router.push(`/dashboard?deviceId=${deviceId}&deviceName=${encodeURIComponent(trip?.deviceName ?? deviceName)}`)}
            className="flex items-center gap-1.5 text-[rgba(232,237,248,0.45)] hover:text-white transition-colors text-xs font-body"
          >
            <ArrowLeft className="h-3 w-3" />
            {trip?.deviceName ?? deviceName}
          </button>

          <div className="ml-auto flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-[11px] text-[rgba(232,237,248,0.28)] font-body">
              <Sparkles className="h-3 w-3 text-[#fb923c]/60" />
              AI-generated · real Geotab data
            </div>
          </div>
        </div>
      </header>

      {/* Page hero */}
      <div className="relative z-10 max-w-5xl mx-auto px-6 pt-14 pb-6">
        {/* Story label */}
        <div className="flex items-center gap-4 mb-8">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent to-[rgba(255,255,255,0.08)]" />
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-1 h-1 rounded-full bg-[#fb923c]" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[rgba(232,237,248,0.3)] font-body">
              Trip Story
            </span>
            <div className="w-1 h-1 rounded-full bg-[#fb923c]" />
          </div>
          <div className="h-px flex-1 bg-gradient-to-l from-transparent to-[rgba(255,255,255,0.08)]" />
        </div>

        {/* Headline */}
        <div className="mb-3 animate-fade-up">
          <h1 className="font-display font-extrabold text-white leading-[0.94] tracking-[-0.03em]">
            <span className="block text-[clamp(2.5rem,6vw,4.5rem)]">Every trip</span>
            <span className="block text-[clamp(2.5rem,6vw,4.5rem)] text-[#fb923c]">has a story.</span>
          </h1>
        </div>

        {trip && (
          <div className="flex items-center gap-3 text-sm text-[rgba(232,237,248,0.42)] font-body animate-fade-in mb-10" style={{ animationDelay: "120ms" }}>
            <MapPin className="h-3.5 w-3.5 text-[#fb923c]/60 shrink-0" />
            <span className="font-semibold text-[rgba(232,237,248,0.6)]">{startName}</span>
            <span className="text-[rgba(255,255,255,0.25)]">→</span>
            <span className="font-semibold text-[rgba(232,237,248,0.6)]">{endName}</span>
            <span className="text-[rgba(255,255,255,0.15)]">·</span>
            <span className="font-data">{format(new Date(trip.start), "MMM d, yyyy")}</span>
            <span className="text-[rgba(255,255,255,0.15)]">·</span>
            <span className="font-data">{trip.distanceKm} km</span>
          </div>
        )}

        <ComicStoryRenderer
          story={story}
          trip={trip}
          loading={loading}
          generating={generating}
          enriching={enriching}
          tone={tone}
          onToneChange={handleToneChange}
          onRegenerate={handleRegenerate}
        />
      </div>
    </div>
  );
}

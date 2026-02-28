"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft, Route, Sparkles } from "lucide-react";
import type { ComicStory, ComicTone, TripSummary, StopContext, ApiResponse } from "@/types";
import ComicStoryRenderer from "@/components/ComicStoryRenderer";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

export default function StoryPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const tripId = params.tripId as string;
  const deviceId = searchParams.get("deviceId") ?? "";
  const deviceName = searchParams.get("deviceName") ?? "Vehicle";

  const [trip, setTrip] = useState<TripSummary | null>(null);
  const [story, setStory] = useState<ComicStory | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [tone, setTone] = useState<ComicTone>("playful");

  // Load trip data — prefer sessionStorage cache
  useEffect(() => {
    async function fetchTrip() {
      setLoading(true);

      try {
        const cached = sessionStorage.getItem(`trip:${tripId}`);
        if (cached) {
          setTrip(JSON.parse(cached) as TripSummary);
          setLoading(false);
          return;
        }
      } catch {
        // sessionStorage unavailable
      }

      try {
        const res = await fetch(`/api/geotab/trips?deviceId=${deviceId}`);
        if (!res.ok) throw new Error("API error");
        const json = (await res.json()) as ApiResponse<TripSummary[]>;
        if (!json.ok) throw new Error(json.error);
        const found = json.data.find((t) => t.id === tripId);
        setTrip(found ?? null);
      } catch {
        try {
          const res = await fetch("/fallback/trips.json");
          const data = await res.json();
          const trips = data.trips as TripSummary[];
          const found = trips.find((t) => t.id === tripId);
          setTrip(found ?? trips[0] ?? null);
        } catch {
          setTrip(null);
        }
      } finally {
        setLoading(false);
      }
    }

    fetchTrip();
  }, [tripId, deviceId]);

  // Auto-generate on load
  useEffect(() => {
    if (!loading && trip) {
      generateStory(tone);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, trip]);

  /**
   * Second-pass enrichment: fetch place photos for the panels that were just
   * generated. Runs after story text is already visible — never blocks the UI.
   */
  const enrichStoryImages = useCallback(async (currentStory: ComicStory) => {
    setEnriching(true);
    try {
      const res = await fetch("/api/story/enrich-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ panels: currentStory.panels }),
      });
      if (!res.ok) return; // Keep story as-is on error
      const json = await res.json();
      if (json.ok && Array.isArray(json.panels)) {
        setStory((prev) =>
          prev ? { ...prev, panels: json.panels } : prev
        );
      }
    } catch {
      // Enrichment failed — story text is still intact, images just won't show
    } finally {
      setEnriching(false);
    }
  }, []);

  const generateStory = useCallback(async (selectedTone: ComicTone) => {
    if (!trip) return;
    setGenerating(true);
    // Clear any previous enriched images when regenerating
    setEnriching(false);

    let stopContexts: StopContext[] = [];
    try {
      const raw = sessionStorage.getItem(`storyStops:${trip.id}`);
      if (raw) stopContexts = JSON.parse(raw) as StopContext[];
    } catch {
      // sessionStorage unavailable
    }

    let generatedStory: ComicStory | null = null;

    try {
      const res = await fetch("/api/story/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trip,
          tone: selectedTone,
          startLocationName: trip.deviceName ?? "Departure",
          endLocationName: "Destination",
          stopContexts,
        }),
      });
      if (!res.ok) throw new Error("API error");
      const json = await res.json();
      if (json.data) {
        generatedStory = json.data as ComicStory;
      } else {
        throw new Error(json.error ?? "Story generation failed");
      }
    } catch {
      try {
        const res = await fetch("/fallback/comic-story.json");
        const data = await res.json();
        const fallbackStory = data.story ?? data;
        generatedStory = {
          ...(fallbackStory as ComicStory),
          tone: selectedTone,
          tripId: trip.id,
        };
      } catch {
        generatedStory = null;
      }
    } finally {
      setGenerating(false);
    }

    if (generatedStory) {
      setStory(generatedStory);
      // Non-blocking: enrich panels with place photos after text is visible
      enrichStoryImages(generatedStory);
    }
  }, [trip, enrichStoryImages]);

  function handleToneChange(t: ComicTone) {
    setTone(t);
  }

  function handleRegenerate(t: ComicTone) {
    generateStory(t);
  }

  return (
    <div className="min-h-screen bg-[#0a1628]">
      {/* Nav */}
      <header className="sticky top-0 z-20 bg-[#0a1628]/80 backdrop-blur-md border-b border-white/8">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center gap-3">
          {/* Brand */}
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-2 group shrink-0"
          >
            <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center group-hover:bg-white/15 transition-colors">
              <Route className="h-3.5 w-3.5 text-white/70" />
            </div>
            <span className="font-bold text-white/70 tracking-tight text-sm hidden sm:block group-hover:text-white/90 transition-colors">
              FleetHappens
            </span>
          </button>

          <span className="text-white/20 text-sm">/</span>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/dashboard?deviceId=${deviceId}&deviceName=${encodeURIComponent(trip?.deviceName ?? deviceName)}`)}
            className="gap-1.5 text-white/50 hover:text-white hover:bg-white/10 text-xs"
          >
            <ArrowLeft className="h-3 w-3" />
            {trip?.deviceName ?? deviceName}
          </Button>

          <div className="ml-auto flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-[11px] text-white/30">
              <Sparkles className="h-3 w-3 text-fleet-orange/60" />
              AI-generated · real Geotab data
            </div>
          </div>
        </div>
      </header>

      {/* Page hero */}
      <div className="max-w-5xl mx-auto px-6 pt-10 pb-4">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/30">
              Trip Story
            </span>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          </div>

          <h1 className="text-4xl font-extrabold text-white leading-tight tracking-tight">
            Every trip has a story.
            <br />
            <span className="text-fleet-orange">Here&apos;s yours.</span>
          </h1>

          {trip && (
            <p className="text-white/40 text-sm mt-3">
              {trip.deviceName} · {format(new Date(trip.start), "MMMM d, yyyy")} · {trip.distanceKm} km
            </p>
          )}
        </div>

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

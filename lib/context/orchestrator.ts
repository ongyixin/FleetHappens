/**
 * Stop context orchestrator.
 *
 * Two-phase model:
 *
 * Phase 1 — immediate (fast path, ~2–5 s):
 *   reverseGeocode + getNearbyAmenities run in parallel
 *   → generateAreaBriefing (LLM, ~1–2 s)
 *   → return StopContext (no Ace data yet)
 *
 * Phase 2 — enrichment (slow path, 30–90 s):
 *   getFleetVisitSummaryForArea via Ace
 *   → merge fleetVisitCount + fleetVisitSummary into existing StopContext
 *
 * Callers should show the Phase 1 result immediately and trigger Phase 2
 * via the /api/context/enrich endpoint in the background.
 */

import { reverseGeocode } from "./geocode";
import { getNearbyAmenities } from "./amenities";
import { generateAreaBriefing } from "./briefing";
import { getFleetVisitSummaryForArea } from "./fleet";
import type { NearbyAmenity, StopContext } from "@/types";

// ─── Input types ─────────────────────────────────────────────────────────────

export interface BuildStopContextInput {
  tripId: string;
  lat: number;
  lon: number;
  tone?: "guidebook" | "playful" | "cinematic";
}

// ─── ID generation ────────────────────────────────────────────────────────────

function makeId(tripId: string, lat: number, lon: number): string {
  // Stable, URL-safe ID tied to trip + coordinates (4dp ≈ 11m precision)
  const safe = (n: number) =>
    n.toFixed(4).replace(".", "d").replace("-", "n");
  return `stop_${tripId}_${safe(lat)}_${safe(lon)}`;
}

// ─── Phase 1: immediate ───────────────────────────────────────────────────────

/**
 * Build a StopContext from geocoding + amenities + LLM briefing.
 * Each step is independently guarded — partial results are returned safely
 * if any dependency fails (e.g., no API key, rate limit, network error).
 */
export async function buildStopContext(
  input: BuildStopContextInput
): Promise<StopContext> {
  const { tripId, lat, lon, tone } = input;

  // Geocode + amenities in parallel — neither blocks the other
  const [geocodeResult, amenitiesResult] = await Promise.allSettled([
    reverseGeocode(lat, lon),
    getNearbyAmenities(lat, lon),
  ]);

  const place = geocodeResult.status === "fulfilled" ? geocodeResult.value : null;
  const nearbyAmenities: NearbyAmenity[] =
    amenitiesResult.status === "fulfilled" ? amenitiesResult.value : [];

  const placeName =
    place?.placeName ?? `Location (${lat.toFixed(4)}, ${lon.toFixed(4)})`;
  const neighborhood = place?.neighborhood;

  // LLM briefing — grounded in the place data we just fetched
  let areaBriefing = "";
  try {
    areaBriefing = await generateAreaBriefing({
      placeName,
      neighborhood,
      city: place?.city,
      formattedAddress: place?.formattedAddress,
      nearbyAmenities,
      coordinates: { lat, lon },
      tone,
    });
  } catch {
    // Graceful degradation — compose a minimal briefing without the LLM
    const loc = neighborhood ? `${placeName} in the ${neighborhood} area` : placeName;
    areaBriefing = `${loc} is a stop along your route.`;
  }

  return {
    id: makeId(tripId, lat, lon),
    tripId,
    coordinates: { lat, lon },
    placeName,
    neighborhood,
    city: place?.city,
    areaBriefing,
    nearbyAmenities,
    generatedAt: new Date().toISOString(),
  };
}

// ─── Phase 2: Ace enrichment ──────────────────────────────────────────────────

/**
 * Enrich an existing StopContext with fleet visit history from Ace.
 * Returns the original context unchanged if Ace is unavailable or errors.
 * Always safe to call — Ace failure is non-fatal.
 */
export async function enrichWithFleetData(context: StopContext): Promise<StopContext> {
  try {
    const { visitCount, summary } = await getFleetVisitSummaryForArea(
      context.coordinates.lat,
      context.coordinates.lon,
      context.placeName
    );
    return {
      ...context,
      fleetVisitCount: visitCount,
      fleetVisitSummary: summary,
    };
  } catch {
    return context;
  }
}

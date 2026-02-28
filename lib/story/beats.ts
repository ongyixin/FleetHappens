/**
 * Derives the 4 core story beats from structured trip data.
 * Pure data processing — no LLM or external API calls.
 *
 * Owner: Comic Story Agent
 * Dependencies: types/index.ts
 */

import type {
  TripSummary,
  StopContext,
  BreadcrumbPoint,
  StopPoint,
  SceneType,
} from "@/types";

// ─── Beat shape ──────────────────────────────────────────────────────────────

export interface StoryBeat {
  panelNumber: 1 | 2 | 3 | 4;
  sceneType: SceneType;
  coordinates: { lat: number; lon: number };
  locationNameHint: string;
  timeLabel: string;
  distanceLabel?: string;
  speedLabel?: string;
  dwellLabel?: string;
  /** Present only for Panel 3 when the user explored the stop. */
  enrichedContext?: StopContext;
}

// ─── Public input shape ───────────────────────────────────────────────────────

export interface BeatInput {
  trip: TripSummary;
  /** Reverse-geocoded name for the departure location. */
  startLocationName: string;
  /** Reverse-geocoded name for the destination. */
  endLocationName: string;
  /** Context briefings the user generated on the dashboard. */
  stopContexts?: StopContext[];
  /** GPS breadcrumbs (decimated is fine). */
  breadcrumbs?: BreadcrumbPoint[];
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function haversineKm(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number }
): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

function lerp(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number },
  t: number
): { lat: number; lon: number } {
  return { lat: a.lat + (b.lat - a.lat) * t, lon: a.lon + (b.lon - a.lon) * t };
}

function parseDurationMs(hhmmss: string): number {
  const [h, m, s] = hhmmss.split(":").map(Number);
  if (!Number.isFinite(h)) return 0;
  return ((h ?? 0) * 3600 + (m ?? 0) * 60 + (s ?? 0)) * 1000;
}

function addMs(iso: string, ms: number): string {
  return new Date(new Date(iso).getTime() + ms).toISOString();
}

function fmtTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return iso;
  }
}

function fmtDuration(hhmmss: string): string {
  const [h, m] = hhmmss.split(":").map(Number);
  if (!Number.isFinite(h)) return hhmmss;
  if ((h ?? 0) > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

/** Find the breadcrumb index at the center of the fastest sliding window. */
function findPeakSpeedBreadcrumb(
  crumbs: BreadcrumbPoint[]
): { coord: { lat: number; lon: number }; avgSpeed: number; dateTime: string } | null {
  if (crumbs.length < 10) return null;
  const win = Math.max(10, Math.floor(crumbs.length * 0.1));
  let best = 0;
  let bestAvg = 0;
  for (let i = 0; i + win <= crumbs.length; i++) {
    const avg =
      crumbs.slice(i, i + win).reduce((s, p) => s + p.speedKmh, 0) / win;
    if (avg > bestAvg) {
      bestAvg = avg;
      best = i + Math.floor(win / 2);
    }
  }
  const crumb = crumbs[best];
  return {
    coord: { lat: crumb.lat, lon: crumb.lon },
    avgSpeed: Math.round(bestAvg),
    dateTime: crumb.dateTime,
  };
}

/** Find the stop with the longest dwell time, preferring context-enriched stops. */
function pickHighlightStop(
  stopPoints: StopPoint[],
  contexts: StopContext[]
): { stop: StopPoint; context?: StopContext } {
  // Find context-enriched stop (match within 500 m)
  type Candidate = { stop: StopPoint; context?: StopContext; dwell: number };
  const candidates: Candidate[] = stopPoints.map((s) => {
    const ctx = contexts.find(
      (c) => haversineKm(s, c.coordinates) < 0.5
    );
    return { stop: s, context: ctx, dwell: s.dwellSeconds ?? 0 };
  });

  // Rule: prefer enriched stops if their dwell is >= 50% of the longest dwell.
  const maxDwell = Math.max(...candidates.map((c) => c.dwell));
  const enriched = candidates.find(
    (c) => c.context && c.dwell >= maxDwell * 0.5
  );
  if (enriched) return { stop: enriched.stop, context: enriched.context };

  // Fallback: pick longest dwell regardless of enrichment.
  const best = candidates.reduce((a, b) => (b.dwell > a.dwell ? b : a));
  return { stop: best.stop, context: best.context };
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Derives the canonical 4-panel story beats from structured trip data.
 * Order: opening → journey → highlight → arrival.
 */
export function deriveStoryBeats(input: BeatInput): StoryBeat[] {
  const {
    trip,
    startLocationName,
    endLocationName,
    stopContexts = [],
    breadcrumbs = [],
  } = input;

  const distKm = ((trip.distanceKm ?? trip.distanceMeters / 1000)).toFixed(1);
  const durationMs = parseDurationMs(trip.drivingDuration);

  // ── Panel 1: Opening ─────────────────────────────────────────────────────
  const beat1: StoryBeat = {
    panelNumber: 1,
    sceneType: "opening",
    coordinates: trip.startPoint,
    locationNameHint: startLocationName,
    timeLabel: fmtTime(trip.start),
    distanceLabel: `${distKm} km trip`,
    speedLabel: `max ${trip.maxSpeedKmh} km/h`,
  };

  // ── Panel 2: Journey — fastest segment or midpoint ───────────────────────
  const peak = findPeakSpeedBreadcrumb(breadcrumbs);
  const journeyCoord =
    peak?.coord ?? lerp(trip.startPoint, trip.endPoint, 0.45);
  const journeyTime = peak?.dateTime ?? addMs(trip.start, durationMs * 0.45);
  const journeySpeed = peak?.avgSpeed ?? trip.averageSpeedKmh;
  const halfKm = (trip.distanceMeters / 2000).toFixed(1);

  const beat2: StoryBeat = {
    panelNumber: 2,
    sceneType: "journey",
    coordinates: journeyCoord,
    locationNameHint: "en route",
    timeLabel: fmtTime(journeyTime),
    distanceLabel: `~${halfKm} km in`,
    speedLabel: `${journeySpeed} km/h`,
  };

  // ── Panel 3: Highlight — notable stop ────────────────────────────────────
  let beat3: StoryBeat;
  if (trip.stopPoints && trip.stopPoints.length > 0) {
    const { stop, context } = pickHighlightStop(trip.stopPoints, stopContexts);
    const dwellMins = stop.dwellSeconds
      ? `${Math.round(stop.dwellSeconds / 60)} min stop`
      : undefined;
    const stopTime = addMs(trip.start, durationMs * 0.65);
    beat3 = {
      panelNumber: 3,
      sceneType: "highlight",
      coordinates: stop,
      locationNameHint: context?.placeName ?? "notable stop",
      timeLabel: fmtTime(stopTime),
      dwellLabel: dwellMins,
      enrichedContext: context,
    };
  } else {
    // No explicit stops — synthesise at 65% of route; check for nearby context.
    const synthCoord = lerp(trip.startPoint, trip.endPoint, 0.65);
    const nearby = stopContexts.find(
      (c) => haversineKm(synthCoord, c.coordinates) < 5
    );
    beat3 = {
      panelNumber: 3,
      sceneType: "highlight",
      coordinates: synthCoord,
      locationNameHint: nearby?.placeName ?? "midpoint",
      timeLabel: fmtTime(addMs(trip.start, durationMs * 0.65)),
      enrichedContext: nearby,
    };
  }

  // ── Panel 4: Arrival ──────────────────────────────────────────────────────
  const beat4: StoryBeat = {
    panelNumber: 4,
    sceneType: "arrival",
    coordinates: trip.endPoint,
    locationNameHint: endLocationName,
    timeLabel: fmtTime(trip.stop),
    distanceLabel: `${distKm} km`,
    speedLabel: `avg ${trip.averageSpeedKmh} km/h · ${fmtDuration(trip.drivingDuration)}`,
  };

  return [beat1, beat2, beat3, beat4];
}

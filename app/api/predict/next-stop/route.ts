/**
 * GET /api/predict/next-stop
 *
 * Predicts the most likely next stop(s) for a vehicle based on its current
 * position and historical Ace route patterns. Pre-loads the context briefing
 * for the #1 prediction so it is ready the moment the vehicle arrives.
 *
 * Query params:
 *   deviceId   — Geotab device ID (used for cache keying)
 *   lat        — Current latitude (vehicle's last known position)
 *   lon        — Current longitude
 *
 * Response: ApiResponse<NextStopPredictionResult>
 */

import { NextRequest, NextResponse } from "next/server";
import { runInsightQuery } from "@/lib/ace/client";
import { QUERY_KEYS } from "@/lib/ace/queries";
import type {
  ApiResponse,
  NextStopPredictionResult,
  StopPrediction,
  StopContext,
  LatLon,
} from "@/types";

export const dynamic = "force-dynamic";

// Briefing fetch has a 12s timeout — it's best-effort; we never block the
// prediction response waiting indefinitely.
const BRIEFING_TIMEOUT_MS = 12_000;

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = req.nextUrl;
  const deviceId = searchParams.get("deviceId") ?? "";
  const latStr = searchParams.get("lat");
  const lonStr = searchParams.get("lon");

  if (!latStr || !lonStr) {
    return NextResponse.json(
      { ok: false, error: "lat and lon query params are required" } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  const lat = parseFloat(latStr);
  const lon = parseFloat(lonStr);

  if (isNaN(lat) || isNaN(lon)) {
    return NextResponse.json(
      { ok: false, error: "lat and lon must be valid numbers" } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  try {
    // ── 1. Query Ace for common destinations from this origin ──────────────
    const aceInsight = await runInsightQuery(QUERY_KEYS.VEHICLE_NEXT_STOP, {
      coordinates: { lat, lon },
      radiusKm: 2.0,
      daysBack: 30,
    });

    // ── 2. Parse rows into StopPrediction objects ─────────────────────────
    const rows = aceInsight.rows as Array<Record<string, string | number>>;
    const totalVisits = rows.reduce(
      (sum, r) => sum + (Number(r.visit_count) || 0),
      0
    );
    const currentHour = new Date().getUTCHours();

    const rawPredictions: StopPrediction[] = rows
      .slice(0, 5)
      .map((row, i) => {
        const visitCount = Number(row.visit_count) || 0;
        const typicalArrivalHour =
          row.avg_arrival_hour !== undefined
            ? Number(row.avg_arrival_hour)
            : undefined;

        // Base confidence from visit frequency
        let confidence = totalVisits > 0 ? visitCount / totalVisits : 0;

        // +10% boost if this destination matches the current time-of-day window
        if (
          typicalArrivalHour !== undefined &&
          Math.abs(typicalArrivalHour - currentHour) <= 2
        ) {
          confidence = Math.min(0.97, confidence * 1.1);
        }

        const destLat =
          row.dest_lat !== undefined ? Number(row.dest_lat) : undefined;
        const destLon =
          row.dest_lon !== undefined ? Number(row.dest_lon) : undefined;

        return {
          rank: i + 1,
          locationName: String(row.destination_name ?? row.location_name ?? `Destination ${i + 1}`),
          confidence,
          visitCount,
          avgDwellMinutes:
            row.avg_dwell_minutes !== undefined
              ? Number(row.avg_dwell_minutes)
              : undefined,
          typicalArrivalHour,
          coordinates:
            destLat !== undefined && destLon !== undefined && !isNaN(destLat) && !isNaN(destLon)
              ? { lat: destLat, lon: destLon }
              : undefined,
        };
      })
      .sort((a, b) => b.confidence - a.confidence)
      .map((p, i) => ({ ...p, rank: i + 1 }));

    // ── 3. Pre-load briefing for the top prediction (best-effort) ─────────
    const top = rawPredictions[0];
    let preloadedBriefing: StopContext | null = null;

    if (top?.coordinates) {
      preloadedBriefing = await fetchBriefingWithTimeout(
        top.coordinates,
        deviceId
      );
    }

    // Attach pre-loaded briefing to rank-1 prediction
    const predictions: StopPrediction[] = rawPredictions.map((p) =>
      p.rank === 1 ? { ...p, preloadedBriefing } : p
    );

    const result: NextStopPredictionResult = {
      deviceId,
      fromCoordinates: { lat, lon },
      predictions,
      basedOnTrips: totalVisits,
      queriedAt: aceInsight.queriedAt,
      fromCache: aceInsight.fromCache,
    };

    return NextResponse.json({ ok: true, data: result } satisfies ApiResponse<NextStopPredictionResult>);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[predict/next-stop] error:", message);

    // Return fallback data so the UI always has something to render
    try {
      const fallback = await loadFallback(lat, lon, deviceId);
      return NextResponse.json({
        ok: true,
        data: fallback,
      } satisfies ApiResponse<NextStopPredictionResult>);
    } catch {
      return NextResponse.json(
        { ok: false, error: message } satisfies ApiResponse<never>,
        { status: 500 }
      );
    }
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function fetchBriefingWithTimeout(
  coords: LatLon,
  tripId: string
): Promise<StopContext | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), BRIEFING_TIMEOUT_MS);

  try {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const res = await fetch(`${base}/api/context/briefing`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tripId: tripId || "predict",
        lat: coords.lat,
        lon: coords.lon,
        tone: "guidebook",
      }),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: StopContext };
    return json.data ?? null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function loadFallback(
  lat: number,
  lon: number,
  deviceId: string
): Promise<NextStopPredictionResult> {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const res = await fetch(`${base}/fallback/ace-vehicle-next-stop.json`);
  if (!res.ok) throw new Error("Fallback file not found");
  const data = (await res.json()) as {
    rows: Array<Record<string, string | number>>;
  };

  const rows = data.rows ?? [];
  const totalVisits = rows.reduce((s, r) => s + (Number(r.visit_count) || 0), 0);

  const predictions: StopPrediction[] = rows.slice(0, 5).map((row, i) => {
    const visitCount = Number(row.visit_count) || 0;
    const destLat = row.dest_lat !== undefined ? Number(row.dest_lat) : undefined;
    const destLon = row.dest_lon !== undefined ? Number(row.dest_lon) : undefined;
    return {
      rank: i + 1,
      locationName: String(row.destination_name ?? `Destination ${i + 1}`),
      confidence: totalVisits > 0 ? visitCount / totalVisits : 0,
      visitCount,
      avgDwellMinutes: row.avg_dwell_minutes !== undefined ? Number(row.avg_dwell_minutes) : undefined,
      typicalArrivalHour: row.avg_arrival_hour !== undefined ? Number(row.avg_arrival_hour) : undefined,
      coordinates:
        destLat !== undefined && destLon !== undefined && !isNaN(destLat) && !isNaN(destLon)
          ? { lat: destLat, lon: destLon }
          : undefined,
    };
  });

  return {
    deviceId,
    fromCoordinates: { lat, lon },
    predictions,
    basedOnTrips: totalVisits,
    queriedAt: new Date().toISOString(),
    fromCache: true,
  };
}

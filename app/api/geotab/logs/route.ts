/**
 * GET /api/geotab/logs?deviceId=X&fromDate=ISO&toDate=ISO
 * Returns GPS breadcrumbs (BreadcrumbPoint[]) for a device + time range.
 * Decimates to ≤500 points for map performance.
 *
 * Owner: Geotab Integration Agent
 */

import { NextRequest, NextResponse } from "next/server";
import { getLogRecords } from "@/lib/geotab/client";
import { getSessionFromRequest } from "@/lib/geotab/session";
import { normalizeLogRecord, decimateBreadcrumbs } from "@/lib/geotab/normalize";
import { withFallback, loadFileFallback } from "@/lib/cache/fallback";
import type { ApiResponse, BreadcrumbPoint, GeotabLogRecord, TripSummary } from "@/types";

// ─── Demo helpers ─────────────────────────────────────────────────────────────

/**
 * Generate synthetic breadcrumb points between a trip's start and end.
 * Used in demo mode when no raw log file exists for the device.
 * Adds a sinusoidal perpendicular offset so the line looks like a road
 * rather than a straight ruler stroke.
 */
function synthesizeBreadcrumbs(trip: TripSummary, count = 25): BreadcrumbPoint[] {
  const { startPoint, endPoint, start, stop, averageSpeedKmh } = trip;
  const startMs = new Date(start).getTime();
  const durationMs = new Date(stop).getTime() - startMs;

  const latDiff = endPoint.lat - startPoint.lat;
  const lonDiff = endPoint.lon - startPoint.lon;
  const dist = Math.sqrt(latDiff ** 2 + lonDiff ** 2);
  const heading = ((Math.atan2(lonDiff, latDiff) * 180) / Math.PI + 360) % 360;

  return Array.from({ length: count }, (_, i) => {
    const t = i / (count - 1);
    // Perpendicular jitter: one smooth arc so it looks like a curved road
    const jitter = dist > 0 ? Math.sin(t * Math.PI) * 0.0015 : 0;
    const perpLat = dist > 0 ? (-lonDiff / dist) * jitter : 0;
    const perpLon = dist > 0 ? (latDiff  / dist) * jitter : 0;

    return {
      dateTime: new Date(startMs + t * durationMs).toISOString(),
      lat: startPoint.lat + latDiff * t + perpLat,
      lon: startPoint.lon + lonDiff * t + perpLon,
      speedKmh: i === 0 || i === count - 1 ? 0 : (averageSpeedKmh ?? 50),
      heading: Math.round(heading),
    };
  });
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = req.nextUrl;
  const deviceId = searchParams.get("deviceId");
  const fromDate = searchParams.get("fromDate");
  const toDate = searchParams.get("toDate");

  if (!deviceId || !fromDate || !toDate) {
    return NextResponse.json(
      { ok: false, error: "deviceId, fromDate, and toDate are required" } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  const userCreds = getSessionFromRequest(req);

  // ── Demo mode: skip all live Geotab calls ────────────────────────────────
  // Device IDs like n1, s1, e1, w1 are synthetic and don't exist in any real
  // Geotab account.  Serve from a static log file if one exists, otherwise
  // synthesize breadcrumbs from the per-device trips fallback file.
  if (!userCreds && process.env.PULSE_DEMO_GROUPS === "true") {
    // 1. Try a pre-authored raw log file (GeotabLogRecord[] format)
    const logsFallback = loadFileFallback<GeotabLogRecord[]>(`logs-${deviceId}.json`);
    if (logsFallback && logsFallback.length > 0) {
      const breadcrumbs = decimateBreadcrumbs(logsFallback.map(normalizeLogRecord), 500);
      return NextResponse.json({
        ok: true,
        data: breadcrumbs,
        fromCache: true,
      } satisfies ApiResponse<BreadcrumbPoint[]>);
    }

    // 2. Synthesize breadcrumbs from the trips fallback file
    const trips = loadFileFallback<TripSummary[]>(`trips-${deviceId}.json`);
    if (trips && trips.length > 0) {
      // Find the trip that covers the requested window; fall back to first trip
      const matchingTrip =
        trips.find((t) => t.start <= toDate && t.stop >= fromDate) ?? trips[0];
      const breadcrumbs = synthesizeBreadcrumbs(matchingTrip);
      return NextResponse.json({
        ok: true,
        data: breadcrumbs,
        fromCache: true,
      } satisfies ApiResponse<BreadcrumbPoint[]>);
    }

    // 3. Nothing available — return empty breadcrumbs (better than a 500)
    return NextResponse.json({
      ok: true,
      data: [] as BreadcrumbPoint[],
      fromCache: true,
    } satisfies ApiResponse<BreadcrumbPoint[]>);
  }

  try {
    // Per-user: bypass file fallback — return live data or an error
    if (userCreds) {
      const rawLogs = await getLogRecords(deviceId, fromDate, toDate, userCreds);
      const breadcrumbs = decimateBreadcrumbs(rawLogs.map(normalizeLogRecord), 500);
      return NextResponse.json({
        ok: true,
        data: breadcrumbs,
        fromCache: false,
      } satisfies ApiResponse<BreadcrumbPoint[]>);
    }

    const { data: rawLogs, fromCache } = await withFallback(
      () => getLogRecords(deviceId, fromDate, toDate),
      `logs-${deviceId}.json`
    );

    const breadcrumbs = decimateBreadcrumbs(
      rawLogs.map(normalizeLogRecord),
      500
    );

    return NextResponse.json({
      ok: true,
      data: breadcrumbs,
      fromCache,
    } satisfies ApiResponse<BreadcrumbPoint[]>);
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Failed to load logs",
      } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }
}

/**
 * GET /api/geotab/trips?deviceId=X&fromDate=ISO&toDate=ISO
 * Returns TripSummary[] for a vehicle within a date range.
 * Defaults to last 7 days when dates are not provided.
 *
 * When explicit dates are NOT provided, the handler auto-expands the lookback
 * window if the Geotab API returns 0 trips — trying 7 → 30 → 90 → 365 days.
 * This ensures demo databases with older data are never stranded on an empty
 * trip list.  The actual window used is returned as `dateRangeDays`.
 *
 * Owner: Geotab Integration Agent
 */

import path from "path";
import fs from "fs";
import { NextRequest, NextResponse } from "next/server";
import { getDevices, getTrips } from "@/lib/geotab/client";
import { normalizeTrip } from "@/lib/geotab/normalize";
import type { ApiResponse, TripSummary, GeotabDevice, GeotabTrip } from "@/types";

const LOOKBACK_WINDOWS_DAYS = [7, 30, 90, 365];

/**
 * Load a trips fallback file from public/fallback/ and return TripSummary[].
 *
 * Two file formats are supported:
 *   - Raw GeotabTrip format (trips-<deviceId>.json) — has `device.id` and `startPoint.x/y`
 *   - Normalized TripSummary format (trips.json)    — has `deviceId` and `startPoint.lat/lon`
 *
 * Returns null if the file doesn't exist.
 */
function loadTripsFallback(filename: string, deviceId: string, deviceName: string): TripSummary[] | null {
  try {
    const filePath = path.join(process.cwd(), "public", "fallback", filename);
    const raw = JSON.parse(fs.readFileSync(filePath, "utf8")) as unknown[];
    if (!Array.isArray(raw) || raw.length === 0) return null;

    // Detect format by checking for the raw Geotab `device` property
    const first = raw[0] as Record<string, unknown>;
    if (first.device && typeof first.device === "object") {
      // Raw GeotabTrip format — normalize each record
      return (raw as GeotabTrip[]).map((t) => normalizeTrip(t, deviceName));
    }
    // Already-normalized TripSummary format
    return raw as TripSummary[];
  } catch {
    return null;
  }
}

/**
 * If all trips are older than 180 days (stale fallback data), shift every
 * timestamp so the most recent trip ends "yesterday at noon".  This keeps
 * the demo looking current regardless of when the fallback JSON was written.
 */
function rebaseIfStale(trips: TripSummary[]): TripSummary[] {
  if (trips.length === 0) return trips;

  const mostRecentStop = Math.max(...trips.map((t) => new Date(t.stop).getTime()));
  const ageMs = Date.now() - mostRecentStop;
  const eightyDaysMs = 180 * 24 * 60 * 60 * 1000;

  if (ageMs < eightyDaysMs) return trips; // data is fresh enough

  // Shift so most recent trip ends yesterday at noon
  const yesterdayNoon = new Date();
  yesterdayNoon.setDate(yesterdayNoon.getDate() - 1);
  yesterdayNoon.setHours(12, 0, 0, 0);
  const shiftMs = yesterdayNoon.getTime() - mostRecentStop;

  return trips.map((t) => ({
    ...t,
    start: new Date(new Date(t.start).getTime() + shiftMs).toISOString(),
    stop: new Date(new Date(t.stop).getTime() + shiftMs).toISOString(),
  }));
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = req.nextUrl;
  const deviceId = searchParams.get("deviceId");
  if (!deviceId) {
    return NextResponse.json(
      { ok: false, error: "deviceId is required" } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  const explicitFromDate = searchParams.get("fromDate");
  const toDate = searchParams.get("toDate") ?? new Date().toISOString();

  // Demo mode: skip all live calls — serve file fallback immediately.
  if (process.env.PULSE_DEMO_GROUPS === "true") {
    const fallbackRaw =
      loadTripsFallback(`trips-${deviceId}.json`, deviceId, deviceId) ??
      loadTripsFallback("trips.json", deviceId, deviceId) ??
      [];
    const fallbackTrips = rebaseIfStale(fallbackRaw);
    return NextResponse.json({
      ok: true,
      data: fallbackTrips,
      fromCache: true,
      dateRangeDays: 365,
    } satisfies ApiResponse<TripSummary[]>);
  }

  // Resolve device name for normalisation (non-blocking live lookup)
  let deviceName = deviceId;
  try {
    const devices: GeotabDevice[] = await getDevices();
    const found = devices.find((d) => d.id === deviceId);
    if (found) deviceName = found.name;
  } catch {
    // non-blocking — use deviceId as name if lookup fails
  }

  let lastError: unknown;

  // When caller supplies explicit dates, use them directly (no auto-expansion)
  if (explicitFromDate) {
    try {
      const rawTrips = await getTrips(deviceId, explicitFromDate, toDate);
      const trips = rawTrips.map((t) => normalizeTrip(t, deviceName));
      return NextResponse.json({
        ok: true,
        data: trips,
        fromCache: false,
        dateRangeDays: null,
      } satisfies ApiResponse<TripSummary[]>);
    } catch (err) {
      lastError = err;
      // Fall through to file fallback at the bottom
    }
  }

  // Auto-expanding lookback: call the live API directly (no cache wrapper) so an
  // empty result from the 7-day window does not block the 30/90/365-day attempts.
  // The memory cache in withFallback would return the cached empty array on every
  // subsequent iteration if we used the same cache key — bypassing it here is intentional.
  for (const days of explicitFromDate ? [] : LOOKBACK_WINDOWS_DAYS) {
    const fromDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    try {
      const rawTrips = await getTrips(deviceId, fromDate, toDate);
      const trips = rawTrips.map((t) => normalizeTrip(t, deviceName));

      // Keep expanding if this window returned nothing (unless it's the last window)
      if (trips.length === 0 && days !== LOOKBACK_WINDOWS_DAYS[LOOKBACK_WINDOWS_DAYS.length - 1]) {
        continue;
      }

      return NextResponse.json({
        ok: true,
        data: trips,
        fromCache: false,
        dateRangeDays: days,
      } satisfies ApiResponse<TripSummary[]>);
    } catch (err) {
      lastError = err;
      break;
    }
  }

  // All live API attempts failed — load the static file fallback directly.
  // Try a per-device file first, then fall back to the generic trips.json.
  const fallbackRaw =
    loadTripsFallback(`trips-${deviceId}.json`, deviceId, deviceName) ??
    loadTripsFallback("trips.json", deviceId, deviceName) ??
    [];

  // Stamp each fallback trip with the current deviceId/name so TripMap,
  // breadcrumb fetches, and story generation all use consistent identifiers.
  const fallbackNormalized = fallbackRaw.map((t) => ({ ...t, deviceId, deviceName }));
  const fallbackTrips = rebaseIfStale(fallbackNormalized);

  return NextResponse.json({
    ok: true,
    data: fallbackTrips,
    fromCache: true,
    dateRangeDays: 365,
  } satisfies ApiResponse<TripSummary[]>);
}

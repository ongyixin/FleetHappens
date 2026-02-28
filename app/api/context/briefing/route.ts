/**
 * POST /api/context/briefing
 *
 * Phase 1 stop context endpoint — returns immediately with:
 *   • place name + neighborhood (reverse geocode)
 *   • nearby amenities (Places API)
 *   • area briefing (LLM, grounded in place data)
 *
 * Fleet visit history (Ace, slow) is NOT included here.
 * Trigger /api/context/enrich after displaying this result.
 *
 * Request body:
 *   { tripId: string, lat: number, lon: number, tone?: string }
 *
 * Response:
 *   { data: StopContext }  — or fallback JSON if all live calls fail
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { buildStopContext } from "@/lib/context/orchestrator";
import type { StopContext } from "@/types";

// ─── Request schema ────────────────────────────────────────────────────────

const BodySchema = z.object({
  tripId: z.string().min(1, "tripId is required"),
  lat: z.number({ required_error: "lat is required" }),
  lon: z.number({ required_error: "lon is required" }),
  tone: z.enum(["guidebook", "playful", "cinematic"]).optional(),
});

// ─── Fallback loader ───────────────────────────────────────────────────────

async function findFallback(
  lat: number,
  lon: number,
  tripId: string
): Promise<StopContext | null> {
  try {
    // Dynamic import so the JSON is read at request time, not module init
    const { default: stops } = (await import(
      "@/public/fallback/context/stops.json"
    )) as { default: StopContext[] };

    // Find the closest demo stop within 10 km
    let closest: StopContext | null = null;
    let minDist = Infinity;

    for (const stop of stops) {
      const dLat = stop.coordinates.lat - lat;
      const dLon = stop.coordinates.lon - lon;
      const dist = Math.sqrt(dLat * dLat + dLon * dLon) * 111_320;
      if (dist < minDist) {
        minDist = dist;
        closest = stop;
      }
    }

    if (!closest || minDist > 10_000) return null;

    return { ...closest, tripId, fromCache: true };
  } catch {
    return null;
  }
}

// ─── Handler ───────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // Parse + validate body
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { tripId, lat, lon, tone } = parsed.data;

  // ── Phase 1: geocode + amenities + LLM briefing ──
  try {
    const context = await buildStopContext({ tripId, lat, lon, tone });
    return NextResponse.json({ data: context });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Briefing generation failed";
    console.error("[/api/context/briefing] Phase 1 failed:", message);

    // Try fallback JSON before returning an error
    const fallback = await findFallback(lat, lon, tripId);
    if (fallback) {
      return NextResponse.json({ data: fallback });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

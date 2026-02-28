/**
 * POST /api/context/enrich
 *
 * Phase 2 enrichment endpoint — adds Ace fleet visit history to an
 * existing StopContext.  Call this after displaying the Phase 1 result.
 *
 * Ace is slow (30–90 s); the response time reflects that.
 * Returns the enriched StopContext, or the original if Ace fails.
 *
 * Request body:
 *   { context: StopContext }
 *
 * Response:
 *   { data: StopContext }  — with fleetVisitCount + fleetVisitSummary populated
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { enrichWithFleetData } from "@/lib/context/orchestrator";

// ─── Request schema ────────────────────────────────────────────────────────
// Validate the fields we actually need — extra fields pass through untouched.

const ContextSchema = z.object({
  id: z.string(),
  tripId: z.string(),
  coordinates: z.object({
    lat: z.number(),
    lon: z.number(),
  }),
  placeName: z.string(),
  neighborhood: z.string().optional(),
  areaBriefing: z.string(),
  nearbyAmenities: z.array(
    z.object({
      name: z.string(),
      category: z.enum(["fuel", "food", "rest", "parking", "other"]),
      distanceMeters: z.number(),
    })
  ),
  generatedAt: z.string(),
  fleetVisitCount: z.number().optional(),
  fleetVisitSummary: z.string().optional(),
  fromCache: z.boolean().optional(),
});

const BodySchema = z.object({
  context: ContextSchema,
});

// ─── Handler ───────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
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

  // enrichWithFleetData never throws — Ace failures return the original context
  const enriched = await enrichWithFleetData(parsed.data.context);
  return NextResponse.json({ data: enriched });
}

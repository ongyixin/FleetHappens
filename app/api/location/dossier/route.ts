/**
 * app/api/location/dossier/route.ts
 *
 * Living Location Dossier API — the persistence layer for fleet location memory.
 *
 * GET  /api/location/dossier?lat=X&lon=Y
 *   Returns the stored dossier for the nearest geohash cell, or 404 if none.
 *   Side-effect: increments accessCount in the background (non-blocking).
 *
 * POST /api/location/dossier
 *   Body: { stopContext: StopContext }  — create/update from a stop context
 *         { dossier: LocationDossier }  — upsert a dossier directly
 *   Merges with any existing row so firstSeenAt and accessCount are preserved.
 */

import { NextRequest, NextResponse } from "next/server";
import { latLonToGeohash } from "@/lib/location/geohash";
import { bqGetLocationDossier, bqUpsertLocationDossier } from "@/lib/bigquery/client";
import type { LocationDossier, StopContext } from "@/types";

export const runtime = "nodejs";

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lat = parseFloat(searchParams.get("lat") ?? "");
  const lon = parseFloat(searchParams.get("lon") ?? "");

  if (isNaN(lat) || isNaN(lon)) {
    return NextResponse.json(
      { ok: false, error: "lat and lon query params are required" },
      { status: 400 }
    );
  }

  const geohash = latLonToGeohash(lat, lon);
  const dossier = await bqGetLocationDossier(geohash);

  if (!dossier) {
    return NextResponse.json(
      { ok: false, error: "No dossier found for this location" },
      { status: 404 }
    );
  }

  const now = new Date().toISOString();
  const updated: LocationDossier = {
    ...dossier,
    accessCount: (dossier.accessCount ?? 0) + 1,
    lastSeenAt: now,
    updatedAt: now,
  };

  // Increment access count asynchronously — non-blocking, never delays the response
  bqUpsertLocationDossier(updated).catch(() => {});

  return NextResponse.json({ ok: true, data: updated });
}

// ─── POST ─────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  let dossier: LocationDossier;

  if (body.stopContext) {
    const ctx = body.stopContext as StopContext;
    const geohash = latLonToGeohash(ctx.coordinates.lat, ctx.coordinates.lon);

    // Preserve history from any existing dossier at this cell
    const existing = await bqGetLocationDossier(geohash);
    const now = new Date().toISOString();

    dossier = {
      geohash,
      lat: ctx.coordinates.lat,
      lon: ctx.coordinates.lon,
      placeName: ctx.placeName,
      neighborhood: ctx.neighborhood,
      city: ctx.city,
      areaBriefing: ctx.areaBriefing,
      nearbyAmenities: ctx.nearbyAmenities,
      fleetVisitCount: ctx.fleetVisitCount,
      fleetVisitSummary: ctx.fleetVisitSummary,
      accessCount: (existing?.accessCount ?? 0) + 1,
      firstSeenAt: existing?.firstSeenAt ?? now,
      lastSeenAt: now,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
  } else if (body.dossier) {
    dossier = body.dossier as LocationDossier;
    dossier.updatedAt = new Date().toISOString();
  } else {
    return NextResponse.json(
      { ok: false, error: "Body must include stopContext or dossier" },
      { status: 400 }
    );
  }

  await bqUpsertLocationDossier(dossier);
  return NextResponse.json({ ok: true, data: dossier });
}

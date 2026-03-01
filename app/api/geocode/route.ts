/**
 * GET /api/geocode?lat=37.7749&lon=-122.4194
 *
 * Reverse geocodes a coordinate pair.
 * Returns a GeocodeResult (placeName, neighborhood, city, formattedAddress, source).
 */

import { NextRequest, NextResponse } from "next/server";
import { reverseGeocode } from "@/lib/context/geocode";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lat = parseFloat(searchParams.get("lat") ?? "");
  const lon = parseFloat(searchParams.get("lon") ?? "");

  if (isNaN(lat) || isNaN(lon)) {
    return NextResponse.json(
      { error: "lat and lon query params are required and must be numbers" },
      { status: 400 }
    );
  }

  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return NextResponse.json(
      { error: "lat must be −90..90, lon must be −180..180" },
      { status: 400 }
    );
  }

  try {
    const result = await reverseGeocode(lat, lon);
    return NextResponse.json({ data: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Geocode failed";
    console.error("[/api/geocode]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

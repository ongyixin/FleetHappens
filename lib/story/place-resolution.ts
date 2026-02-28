/**
 * Resolves the closest notable Google Place (with a photo) near a coordinate.
 *
 * Uses Google Places Nearby Search — same API key as lib/maps/places.ts.
 * Results are cached in-memory for the lifetime of the server process, which
 * is sufficient for a hackathon demo without a persistent cache layer.
 *
 * Owner: Story Image Enrichment
 */

import type { LatLon } from "@/types";

export interface PlaceResolution {
  placeId: string;
  photoReference: string;
  name: string;
  htmlAttributions?: string[];
}

// Module-level LRU-style cache — keyed on ~110 m rounded coordinates.
const _cache = new Map<string, PlaceResolution | null>();

function cacheKey(coords: LatLon): string {
  return `${coords.lat.toFixed(3)},${coords.lon.toFixed(3)}`;
}

/**
 * Returns a place ID + photo reference near `coords`, or `null` when:
 *  - no Google API key is configured,
 *  - the location hint signals a generic road segment, or
 *  - no nearby place with a photo is found.
 *
 * `nameHint` is used as a keyword to bias the search toward known landmarks.
 */
export async function resolvePlace(
  coords: LatLon,
  nameHint?: string
): Promise<PlaceResolution | null> {
  const key = cacheKey(coords);
  if (_cache.has(key)) return _cache.get(key)!;

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    _cache.set(key, null);
    return null;
  }

  // Skip generic "on the road" / unnamed location hints — not worth trying.
  const genericHints = new Set(["en route", "midpoint", "notable stop", ""]);
  if (!nameHint || genericHints.has(nameHint.toLowerCase())) {
    _cache.set(key, null);
    return null;
  }

  try {
    const url = new URL(
      "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
    );
    url.searchParams.set("location", `${coords.lat},${coords.lon}`);
    url.searchParams.set("radius", "500");
    url.searchParams.set("type", "point_of_interest");
    url.searchParams.set("keyword", nameHint);
    url.searchParams.set("key", apiKey);

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`Places Nearby Search ${res.status}`);

    const data: {
      status: string;
      results?: Array<{
        place_id: string;
        name: string;
        photos?: Array<{
          photo_reference: string;
          html_attributions?: string[];
        }>;
      }>;
    } = await res.json();

    if (data.status === "REQUEST_DENIED" || data.status === "INVALID_REQUEST") {
      console.warn("[place-resolution] API error status:", data.status);
      _cache.set(key, null);
      return null;
    }

    // Pick the first result that has at least one photo reference.
    const candidate = (data.results ?? []).find(
      (r) => Array.isArray(r.photos) && r.photos.length > 0
    );

    if (!candidate?.photos?.length) {
      _cache.set(key, null);
      return null;
    }

    const photo = candidate.photos[0];
    const resolution: PlaceResolution = {
      placeId: candidate.place_id,
      photoReference: photo.photo_reference,
      name: candidate.name,
      htmlAttributions: photo.html_attributions,
    };

    _cache.set(key, resolution);
    return resolution;
  } catch (err) {
    console.warn("[place-resolution] request failed:", err);
    _cache.set(key, null);
    return null;
  }
}

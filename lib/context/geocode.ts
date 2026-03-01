/**
 * Reverse geocoding helper.
 *
 * Provider priority (first key found in env wins):
 *   1. Google Maps Geocoding API  (GOOGLE_MAPS_API_KEY)
 *   2. Mapbox Geocoding API       (MAPBOX_ACCESS_TOKEN)
 *   3. OpenStreetMap Nominatim    (free, no key required — demo/fallback)
 */

import type { GeocodeResult } from "@/types";

// ─── In-process coordinate cache ────────────────────────────────────────────
// Key: "${lat.toFixed(3)}_${lon.toFixed(3)}" (~110 m grid cell).
// Geocoding results are stable; 24-hour TTL is conservative.

const GEOCODE_TTL_MS = 24 * 60 * 60 * 1000;

interface GeocodeEntry {
  result: GeocodeResult;
  cachedAt: number;
}

const geocodeCache = new Map<string, GeocodeEntry>();

function cacheKey(lat: number, lon: number): string {
  return `${lat.toFixed(3)}_${lon.toFixed(3)}`;
}

// ─── Public entry point ─────────────────────────────────────────────────────

export async function reverseGeocode(lat: number, lon: number): Promise<GeocodeResult> {
  const key = cacheKey(lat, lon);
  const cached = geocodeCache.get(key);
  if (cached && Date.now() - cached.cachedAt < GEOCODE_TTL_MS) {
    return cached.result;
  }

  let result: GeocodeResult;
  if (process.env.GOOGLE_MAPS_API_KEY) {
    result = await reverseGeocodeGoogle(lat, lon);
  } else if (process.env.MAPBOX_ACCESS_TOKEN) {
    result = await reverseGeocodeMapbox(lat, lon);
  } else {
    result = await reverseGeocodeNominatim(lat, lon);
  }

  geocodeCache.set(key, { result, cachedAt: Date.now() });
  return result;
}

// ─── Google Maps ─────────────────────────────────────────────────────────────

async function reverseGeocodeGoogle(lat: number, lon: number): Promise<GeocodeResult> {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lon}&key=${process.env.GOOGLE_MAPS_API_KEY}`;
  const res = await fetch(url);
  const json = await res.json();

  if (json.status !== "OK" || !json.results?.length) {
    throw new Error(`Google Geocode error: ${json.status}`);
  }

  type Component = { long_name: string; short_name: string; types: string[] };
  const best = json.results[0];
  const components = best.address_components as Component[];
  const get = (type: string) =>
    components.find((c) => c.types.includes(type))?.long_name;

  return {
    placeName:
      get("establishment") ??
      get("point_of_interest") ??
      get("neighborhood") ??
      get("sublocality") ??
      get("locality") ??
      best.formatted_address,
    neighborhood: get("neighborhood") ?? get("sublocality_level_1"),
    city: get("locality") ?? get("administrative_area_level_2"),
    country: get("country"),
    formattedAddress: best.formatted_address as string,
    source: "google",
  };
}

// ─── Mapbox ──────────────────────────────────────────────────────────────────

async function reverseGeocodeMapbox(lat: number, lon: number): Promise<GeocodeResult> {
  const url =
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${lon},${lat}.json` +
    `?types=poi,neighborhood,locality,place&limit=5&access_token=${process.env.MAPBOX_ACCESS_TOKEN}`;
  const res = await fetch(url);
  const json = await res.json();

  type Feature = { place_type: string[]; text: string; place_name: string };
  const features: Feature[] = json.features ?? [];
  if (!features.length) throw new Error("Mapbox geocode: no results");

  const byType = (type: string) => features.find((f) => f.place_type.includes(type));

  const poi = byType("poi");
  const neighborhood = byType("neighborhood");
  const place = byType("place");

  return {
    placeName: poi?.text ?? neighborhood?.text ?? features[0].place_name,
    neighborhood: neighborhood?.text,
    city: place?.text,
    formattedAddress: features[0].place_name,
    source: "mapbox",
  };
}

// ─── Nominatim (OSM) ─────────────────────────────────────────────────────────

async function reverseGeocodeNominatim(lat: number, lon: number): Promise<GeocodeResult> {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1`;
  const res = await fetch(url, {
    headers: { "User-Agent": "FleetHappens/1.0 (hackathon-demo)" },
  });
  const json = await res.json();

  type NominatimAddress = Record<string, string>;
  const addr: NominatimAddress = json.address ?? {};

  const placeName =
    addr.amenity ??
    addr.shop ??
    addr.tourism ??
    addr.building ??
    addr.neighbourhood ??
    addr.suburb ??
    addr.city_district ??
    addr.city ??
    addr.town ??
    addr.village ??
    (json.display_name as string | undefined)?.split(",")[0] ??
    "Unknown location";

  return {
    placeName,
    neighborhood: addr.neighbourhood ?? addr.suburb ?? addr.city_district,
    city: addr.city ?? addr.town ?? addr.village,
    country: addr.country,
    formattedAddress: json.display_name as string | undefined,
    source: "nominatim",
  };
}

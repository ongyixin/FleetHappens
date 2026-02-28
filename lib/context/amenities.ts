/**
 * Nearby amenities lookup (fuel, food, parking, rest stops).
 *
 * Provider priority (first key found in env wins):
 *   1. Google Places API   (GOOGLE_MAPS_API_KEY)
 *   2. Mapbox POI Search   (MAPBOX_ACCESS_TOKEN)
 *   3. Overpass / OSM      (free, no key required)
 *
 * Returns up to 8 amenities sorted by distance.
 */

import type { NearbyAmenity } from "@/types";

const RADIUS_M = 800;
const MAX_RESULTS = 8;

// ─── Haversine-based distance in metres ─────────────────────────────────────
function distMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6_371_000;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

// ─── Public entry point ─────────────────────────────────────────────────────

export async function getNearbyAmenities(
  lat: number,
  lon: number
): Promise<NearbyAmenity[]> {
  if (process.env.GOOGLE_MAPS_API_KEY) {
    return getNearbyGoogle(lat, lon);
  }
  if (process.env.MAPBOX_ACCESS_TOKEN) {
    return getNearbyMapbox(lat, lon);
  }
  return getNearbyOverpass(lat, lon);
}

// ─── Google Places Nearby Search ────────────────────────────────────────────

const GOOGLE_TYPES: Array<{ type: string; category: NearbyAmenity["category"] }> = [
  { type: "gas_station", category: "fuel" },
  { type: "restaurant", category: "food" },
  { type: "cafe", category: "food" },
  { type: "parking", category: "parking" },
];

async function getNearbyGoogle(lat: number, lon: number): Promise<NearbyAmenity[]> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY!;
  const results: NearbyAmenity[] = [];

  for (const { type, category } of GOOGLE_TYPES) {
    const url =
      `https://maps.googleapis.com/maps/api/place/nearbysearch/json` +
      `?location=${lat},${lon}&radius=${RADIUS_M}&type=${type}&key=${apiKey}`;
    try {
      const res = await fetch(url);
      const json = await res.json();
      for (const p of (json.results ?? []).slice(0, 3)) {
        const d = distMeters(lat, lon, p.geometry.location.lat, p.geometry.location.lng);
        if (d <= RADIUS_M * 1.5) {
          results.push({ name: p.name as string, category, distanceMeters: d });
        }
      }
    } catch {
      // non-fatal: skip this category
    }
  }

  return results.sort((a, b) => a.distanceMeters - b.distanceMeters).slice(0, MAX_RESULTS);
}

// ─── Mapbox POI Search ───────────────────────────────────────────────────────

const MAPBOX_CATS: Array<{ query: string; category: NearbyAmenity["category"] }> = [
  { query: "gas station", category: "fuel" },
  { query: "restaurant", category: "food" },
  { query: "cafe", category: "food" },
  { query: "parking", category: "parking" },
];

async function getNearbyMapbox(lat: number, lon: number): Promise<NearbyAmenity[]> {
  const token = process.env.MAPBOX_ACCESS_TOKEN!;
  const results: NearbyAmenity[] = [];

  for (const { query, category } of MAPBOX_CATS) {
    const url =
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json` +
      `?proximity=${lon},${lat}&types=poi&limit=3&access_token=${token}`;
    try {
      const res = await fetch(url);
      const json = await res.json();
      type Feature = { center: [number, number]; text: string };
      for (const f of (json.features ?? []) as Feature[]) {
        const [fLon, fLat] = f.center;
        const d = distMeters(lat, lon, fLat, fLon);
        if (d <= RADIUS_M * 2) {
          results.push({ name: f.text, category, distanceMeters: d });
        }
      }
    } catch {
      // non-fatal
    }
  }

  return results.sort((a, b) => a.distanceMeters - b.distanceMeters).slice(0, MAX_RESULTS);
}

// ─── Overpass / OSM (free fallback) ─────────────────────────────────────────

const AMENITY_CATEGORY: Record<string, NearbyAmenity["category"]> = {
  fuel: "fuel",
  restaurant: "food",
  cafe: "food",
  fast_food: "food",
  food_court: "food",
  parking: "parking",
  rest_area: "rest",
  toilets: "rest",
};

async function getNearbyOverpass(lat: number, lon: number): Promise<NearbyAmenity[]> {
  const amenityList = Object.keys(AMENITY_CATEGORY).map((a) => `"${a}"`).join("|");
  const query = [
    `[out:json][timeout:8];`,
    `(`,
    `  node["amenity"~${amenityList}](around:${RADIUS_M},${lat},${lon});`,
    `);`,
    `out body 20;`,
  ].join("\n");

  const res = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `data=${encodeURIComponent(query)}`,
  });
  const json = await res.json();

  type OsmElement = { tags: Record<string, string>; lat: number; lon: number };
  const elements: OsmElement[] = json.elements ?? [];

  return elements
    .map((el) => ({
      name: el.tags.name ?? el.tags["name:en"] ?? el.tags.amenity,
      category: AMENITY_CATEGORY[el.tags.amenity] ?? ("other" as const),
      distanceMeters: distMeters(lat, lon, el.lat, el.lon),
    }))
    .sort((a, b) => a.distanceMeters - b.distanceMeters)
    .slice(0, MAX_RESULTS);
}

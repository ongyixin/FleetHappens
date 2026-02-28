/**
 * Nearby amenities search around a stop coordinate.
 * Tries Google Places first; falls back to Overpass (OSM) if no API key.
 *
 * Owner: Context Briefing Agent
 */

import type { LatLon, Amenity, AmenityCategory } from "@/types";

const CATEGORY_TYPES: Record<AmenityCategory, string[]> = {
  fuel: ["gas_station"],
  food: ["restaurant", "cafe", "fast_food", "food"],
  rest: ["rest_area", "lodging", "park"],
  parking: ["parking"],
  other: ["convenience_store", "supermarket"],
};

async function fetchGooglePlaces(
  coords: LatLon,
  radiusMeters = 1500
): Promise<Amenity[] | null> {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return null;

  const allTypes = Object.values(CATEGORY_TYPES).flat().join("|");
  const url = new URL("https://maps.googleapis.com/maps/api/place/nearbysearch/json");
  url.searchParams.set("location", `${coords.lat},${coords.lon}`);
  url.searchParams.set("radius", String(radiusMeters));
  url.searchParams.set("type", "point_of_interest");
  url.searchParams.set("key", key);

  const res = await fetch(url.toString());
  if (!res.ok) return null;
  const data = await res.json();
  if (data.status !== "OK") return null;

  return (data.results ?? []).slice(0, 8).map((p: Record<string, unknown>) => {
    const types = (p.types as string[]) ?? [];
    let category: AmenityCategory = "other";
    for (const [cat, keywords] of Object.entries(CATEGORY_TYPES)) {
      if (keywords.some((k) => types.includes(k))) {
        category = cat as AmenityCategory;
        break;
      }
    }
    const loc = (p.geometry as Record<string, Record<string, number>>)?.location;
    const distLat = coords.lat - (loc?.lat ?? coords.lat);
    const distLon = coords.lon - (loc?.lng ?? coords.lon);
    const distMeters = Math.round(Math.sqrt(distLat ** 2 + distLon ** 2) * 111000);
    return {
      name: p.name as string,
      category,
      distanceMeters: distMeters,
      address: p.vicinity as string | undefined,
    } satisfies Amenity;
  });
}

// OSM Overpass fallback — free, rate-limited
async function fetchOverpassAmenities(
  coords: LatLon,
  radiusMeters = 1500
): Promise<Amenity[]> {
  const query = `
    [out:json][timeout:10];
    (
      node["amenity"~"fuel|restaurant|cafe|fast_food|parking"](around:${radiusMeters},${coords.lat},${coords.lon});
    );
    out body 8;
  `;
  const res = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    body: `data=${encodeURIComponent(query)}`,
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  if (!res.ok) return [];
  const data = await res.json();

  return (data.elements ?? []).slice(0, 8).map((el: Record<string, unknown>) => {
    const tags = (el.tags ?? {}) as Record<string, string>;
    const amenity = tags.amenity ?? "other";
    const categoryMap: Record<string, AmenityCategory> = {
      fuel: "fuel",
      restaurant: "food",
      cafe: "food",
      fast_food: "food",
      parking: "parking",
    };
    const elLat = el.lat as number;
    const elLon = el.lon as number;
    const distLat = coords.lat - elLat;
    const distLon = coords.lon - elLon;
    const distMeters = Math.round(Math.sqrt(distLat ** 2 + distLon ** 2) * 111000);
    return {
      name: tags.name ?? amenity,
      category: categoryMap[amenity] ?? "other",
      distanceMeters: distMeters,
    } satisfies Amenity;
  });
}

export async function getNearbyAmenities(
  coords: LatLon,
  radiusMeters = 1500
): Promise<Amenity[]> {
  const google = await fetchGooglePlaces(coords, radiusMeters);
  if (google && google.length > 0) return google;
  return fetchOverpassAmenities(coords, radiusMeters);
}

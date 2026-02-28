/**
 * Reverse geocoding: coordinates → human-readable place name.
 * Tries Google Maps first; falls back to Nominatim (OSM) if no API key.
 *
 * Owner: Context Briefing Agent
 */

import type { LatLon } from "@/types";

export interface GeocodeResult {
  placeName: string;
  neighborhood?: string;
  city?: string;
  country?: string;
  formattedAddress: string;
}

async function geocodeGoogle(coords: LatLon): Promise<GeocodeResult | null> {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return null;

  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("latlng", `${coords.lat},${coords.lon}`);
  url.searchParams.set("key", key);

  const res = await fetch(url.toString());
  if (!res.ok) return null;
  const data = await res.json();
  if (data.status !== "OK" || !data.results?.length) return null;

  const result = data.results[0];
  const components: Record<string, string> = {};
  for (const c of result.address_components ?? []) {
    for (const type of c.types) {
      components[type] = c.long_name;
    }
  }

  return {
    placeName:
      components["point_of_interest"] ??
      components["establishment"] ??
      components["route"] ??
      components["neighborhood"] ??
      result.formatted_address.split(",")[0],
    neighborhood: components["neighborhood"] ?? components["sublocality"],
    city: components["locality"] ?? components["administrative_area_level_2"],
    country: components["country"],
    formattedAddress: result.formatted_address,
  };
}

async function geocodeNominatim(coords: LatLon): Promise<GeocodeResult> {
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("lat", String(coords.lat));
  url.searchParams.set("lon", String(coords.lon));
  url.searchParams.set("format", "json");

  const res = await fetch(url.toString(), {
    headers: { "User-Agent": "RouteMuse/1.0 hackathon-app" },
  });
  if (!res.ok) throw new Error("Nominatim geocode failed");
  const data = await res.json();

  const addr = data.address ?? {};
  const placeName =
    addr.amenity ?? addr.building ?? addr.road ?? addr.neighbourhood ?? data.display_name.split(",")[0];

  return {
    placeName,
    neighborhood: addr.neighbourhood ?? addr.suburb,
    city: addr.city ?? addr.town ?? addr.village,
    country: addr.country,
    formattedAddress: data.display_name,
  };
}

export async function reverseGeocode(coords: LatLon): Promise<GeocodeResult> {
  const google = await geocodeGoogle(coords);
  if (google) return google;
  return geocodeNominatim(coords);
}

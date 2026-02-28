/**
 * lib/location/geohash.ts
 *
 * Simple coordinate quantization for location dossier keying.
 *
 * Rounds lat/lon to 3 decimal places, producing ~110m × 80m cells at
 * mid-latitudes — fine enough to distinguish nearby stops, coarse enough
 * to group repeat fleet visits to "the same place."
 *
 * Not a true geohash encoding; a plain string key is sufficient here since
 * we only need equality lookups, not spatial range queries.
 */

/**
 * Convert a lat/lon pair to a stable string key.
 * Two coordinates within ~110m of each other will share the same key.
 */
export function latLonToGeohash(lat: number, lon: number): string {
  return `${lat.toFixed(3)}_${lon.toFixed(3)}`;
}

/**
 * Recover the approximate center coordinates from a geohash key.
 * Inverse of latLonToGeohash.
 */
export function geohashCenter(geohash: string): { lat: number; lon: number } {
  const parts = geohash.split("_");
  return {
    lat: parseFloat(parts[0] ?? "0"),
    lon: parseFloat(parts[1] ?? "0"),
  };
}

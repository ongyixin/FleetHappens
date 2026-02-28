/**
 * Resolves a public photo URL from a Google Places photo_reference.
 *
 * The Google Places Photo API returns a 302 redirect to a CDN URL on
 * lh3.googleusercontent.com. By following the redirect we extract the
 * final CDN URL — no API key is embedded in the URL we return to clients.
 *
 * Owner: Story Image Enrichment
 */

import type { StoryPanelImage } from "@/types";

// Module-level cache keyed on photo_reference — these are stable for a given
// place and don't change between requests in a demo session.
const _photoCache = new Map<string, string | null>();

/**
 * Follows the Google Places Photo redirect and returns the public CDN URL.
 * Returns `null` if the API key is missing, the reference is invalid, or the
 * fetch fails for any reason.
 */
export async function resolvePhotoUrl(
  photoReference: string,
  maxWidth = 800
): Promise<string | null> {
  if (_photoCache.has(photoReference)) return _photoCache.get(photoReference)!;

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    _photoCache.set(photoReference, null);
    return null;
  }

  const apiUrl =
    `https://maps.googleapis.com/maps/api/place/photo` +
    `?maxwidth=${maxWidth}` +
    `&photo_reference=${encodeURIComponent(photoReference)}` +
    `&key=${apiKey}`;

  try {
    // fetch() follows 3xx redirects by default; res.url is the final URL.
    const res = await fetch(apiUrl);
    if (!res.ok) {
      _photoCache.set(photoReference, null);
      return null;
    }
    // The final URL is the public CDN URL — no API key in the path.
    const cdnUrl = res.url;
    _photoCache.set(photoReference, cdnUrl);
    return cdnUrl;
  } catch {
    _photoCache.set(photoReference, null);
    return null;
  }
}

// ─── Payload builders ─────────────────────────────────────────────────────────

/** Strip HTML tags from a raw Google attribution string. */
function stripHtml(raw: string): string {
  return raw.replace(/<[^>]+>/g, "");
}

/**
 * Builds a `StoryPanelImage` payload for a successfully fetched place photo.
 * Strips HTML from attribution so it is safe to render as plain text.
 */
export function buildPlacePhotoImage(
  imageUrl: string,
  placeName?: string,
  htmlAttributions?: string[]
): StoryPanelImage {
  const attribution = htmlAttributions?.[0]
    ? stripHtml(htmlAttributions[0])
    : undefined;

  return {
    kind: "place-photo",
    imageUrl,
    attribution,
    source: "live",
    placeName,
  };
}

/**
 * Builds a `StoryPanelImage` map payload (rendered without an external image).
 * Used when place-photo lookup fails for enrichable panels.
 */
export function buildMapImage(): StoryPanelImage {
  return { kind: "map", source: "generated" };
}

/**
 * Builds a `StoryPanelImage` fallback payload for panels that should not
 * attempt photo lookup at all (e.g. journey panels).
 */
export function buildFallbackImage(label?: string): StoryPanelImage {
  return { kind: "fallback", label, source: "fallback" };
}

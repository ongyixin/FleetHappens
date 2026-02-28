/**
 * Panel image enrichment pipeline.
 *
 * Maps over an array of ComicPanels and attaches:
 *   1. `image`      — a single hero photo (or map card) per panel
 *   2. `areaPhotos` — a gallery of up to 5 place photos for the toggle view
 *
 * Both fields are populated in one pass per panel so we only hit the
 * Places API once per coordinate.
 *
 * Enrichment rules:
 *   "highlight", "opening", "arrival" → eligible for hero `image`
 *   "journey"                         → always gets a map visual for `image`
 *   ALL scene types                   → eligible for `areaPhotos`
 *
 * Falls back gracefully on every error — the story is never broken.
 *
 * Owner: Story Image Enrichment
 */

import type { ComicPanel } from "@/types";
import { resolvePlace, resolveNearbyPhotos } from "./place-resolution";
import {
  resolvePhotoUrl,
  resolveGalleryPhotos,
  buildPlacePhotoImage,
  buildMapImage,
} from "./place-photo";

/** Scene types eligible for the single hero photo. */
const PHOTO_ELIGIBLE = new Set<string>(["opening", "highlight", "arrival"]);

/** Per-panel timeout — increased to 8 s to allow parallel multi-photo fetches. */
const PANEL_TIMEOUT_MS = 8_000;

// ─── Single-panel enrichment ──────────────────────────────────────────────────

async function enrichSinglePanel(panel: ComicPanel): Promise<ComicPanel> {
  const needsImage      = !panel.image;
  const needsAreaPhotos = !(panel.areaPhotos?.length);

  // Nothing to do for this panel.
  if (!needsImage && !needsAreaPhotos) return panel;

  let enriched: ComicPanel = { ...panel };

  // Resolve the closest notable place (shared by both `image` and `areaPhotos`).
  let resolution = null;
  try {
    resolution = await resolvePlace(panel.mapAnchor, panel.locationName);
  } catch { /* keep null — both image and areaPhotos will fall back */ }

  // ── Populate areaPhotos (all scene types) ────────────────────────────────
  // Uses a keyword-free broad search so neighbourhood-level names like
  // "Mission District" also yield gallery photos, not just specific POI names.
  if (needsAreaPhotos) {
    try {
      const nearbyRefs = await resolveNearbyPhotos(panel.mapAnchor);
      if (nearbyRefs.length > 0) {
        const photos = await resolveGalleryPhotos(nearbyRefs);
        if (photos.length > 0) {
          enriched = { ...enriched, areaPhotos: photos };
        }
      }
    } catch { /* keep without areaPhotos */ }
  }

  // ── Populate hero image (eligible scene types only) ──────────────────────
  if (needsImage) {
    if (!PHOTO_ELIGIBLE.has(panel.sceneType)) {
      // Journey panels always use the map visual.
      enriched = { ...enriched, image: buildMapImage() };
    } else if (resolution) {
      try {
        const photoUrl = await resolvePhotoUrl(resolution.photoReference);
        enriched = {
          ...enriched,
          image: photoUrl
            ? buildPlacePhotoImage(
                photoUrl,
                resolution.name,
                resolution.htmlAttributions
              )
            : buildMapImage(),
        };
      } catch {
        enriched = { ...enriched, image: buildMapImage() };
      }
    } else {
      enriched = { ...enriched, image: buildMapImage() };
    }
  }

  return enriched;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Enriches all panels in parallel with a per-panel timeout guard.
 * Returns panels in original order. Any panel that fails or times out keeps
 * its original state so the story remains intact.
 */
export async function enrichPanelImages(
  panels: ComicPanel[]
): Promise<ComicPanel[]> {
  // Sort by enrichment priority for internal scheduling, but preserve index.
  const ORDER: Record<string, number> = {
    highlight: 0,
    arrival: 1,
    opening: 2,
    journey: 3,
  };

  const indexed = panels.map((p, i) => ({ panel: p, originalIndex: i }));
  indexed.sort(
    (a, b) =>
      (ORDER[a.panel.sceneType] ?? 9) - (ORDER[b.panel.sceneType] ?? 9)
  );

  const settled = await Promise.allSettled(
    indexed.map(({ panel }) =>
      Promise.race([
        enrichSinglePanel(panel),
        new Promise<ComicPanel>((resolve) =>
          setTimeout(() => resolve(panel), PANEL_TIMEOUT_MS)
        ),
      ])
    )
  );

  // Re-order to original positions.
  const results: ComicPanel[] = new Array(panels.length);
  settled.forEach((result, i) => {
    const { originalIndex, panel } = indexed[i];
    results[originalIndex] =
      result.status === "fulfilled" ? result.value : panel;
  });

  return results;
}

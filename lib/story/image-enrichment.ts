/**
 * Panel image enrichment pipeline.
 *
 * Maps over an array of ComicPanels and attempts to attach a real place photo
 * to each enrichable panel. Falls back to a "map" visual or "fallback" badge
 * when photo lookup fails — the story is never broken by image issues.
 *
 * Enrichment priority by scene type:
 *   "highlight"  → highest priority (most likely to have a notable place)
 *   "opening"    → try photo for the departure location
 *   "arrival"    → try photo for the destination
 *   "journey"    → always skip photo; assign map visual
 *
 * Owner: Story Image Enrichment
 */

import type { ComicPanel } from "@/types";
import { resolvePlace } from "./place-resolution";
import {
  resolvePhotoUrl,
  buildPlacePhotoImage,
  buildMapImage,
} from "./place-photo";

/** Scene types eligible for photo lookup. */
const PHOTO_ELIGIBLE = new Set<string>(["opening", "highlight", "arrival"]);

/** Per-panel timeout so a slow Places API call can't stall the UI. */
const PANEL_TIMEOUT_MS = 5_000;

// ─── Single-panel enrichment ──────────────────────────────────────────────────

async function enrichSinglePanel(panel: ComicPanel): Promise<ComicPanel> {
  // Panel already has an image (e.g. from a previous enrichment pass).
  if (panel.image) return panel;

  // Journey panels: always use the map visual — no photo attempts.
  if (!PHOTO_ELIGIBLE.has(panel.sceneType)) {
    return { ...panel, image: buildMapImage() };
  }

  try {
    const resolution = await resolvePlace(
      panel.mapAnchor,
      panel.locationName
    );

    if (!resolution) {
      // No suitable place found — use map visual.
      return { ...panel, image: buildMapImage() };
    }

    const photoUrl = await resolvePhotoUrl(resolution.photoReference);

    if (!photoUrl) {
      return { ...panel, image: buildMapImage() };
    }

    return {
      ...panel,
      image: buildPlacePhotoImage(
        photoUrl,
        resolution.name,
        resolution.htmlAttributions
      ),
    };
  } catch {
    return { ...panel, image: buildMapImage() };
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Enriches all panels in parallel with a per-panel timeout guard.
 * Returns panels in original order. Any panel that fails or times out keeps
 * its original state (no `image` field) so the story remains intact.
 *
 * Processing order hint: highlight panel first, so the most important
 * panel gets its photo resolved even if later panels time out.
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

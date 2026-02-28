/**
 * POST /api/story/export-pdf
 *
 * Accepts { story: ComicStory, trip: TripSummary | null } and returns a
 * binary PDF for download.
 *
 * Image fetching strategy:
 *  - Static map: Google Static Maps API centred on panel.mapAnchor with a
 *    red marker. Falls back to placeholder if API key is absent or fetch fails.
 *  - Place photo: panel.image.imageUrl (kind === "place-photo"), else first
 *    panel.areaPhotos[0].url. Falls back to placeholder if unavailable.
 *  - All 8 image fetches (4 maps + 4 photos) run in parallel with a 5-second
 *    AbortController timeout each.
 *
 * Owner: Story Export
 */

import { NextResponse } from "next/server";
import type { ComicStory, ComicPanel, TripSummary } from "@/types";
import { buildStoryPdf, type PanelImages } from "@/lib/story/pdf-builder";

// ─── Image helpers ─────────────────────────────────────────────────────────────

const IMAGE_TIMEOUT_MS = 5000;

/** Fetches a URL and returns { base64, mime } or null on any error. */
async function fetchImage(
  url: string,
): Promise<{ base64: string; mime: "PNG" | "JPEG" } | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), IMAGE_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return null;

    const contentType = res.headers.get("content-type") ?? "";
    const mime: "PNG" | "JPEG" = contentType.includes("png") ? "PNG" : "JPEG";

    const buf = Buffer.from(await res.arrayBuffer());
    return { base64: buf.toString("base64"), mime };
  } catch {
    clearTimeout(timer);
    return null;
  }
}

/** Builds the Google Static Maps URL for a panel anchor. */
function staticMapUrl(lat: number, lon: number): string | null {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return null;
  const center = `${lat},${lon}`;
  const marker = `color:0xf5a623|${lat},${lon}`;
  return (
    `https://maps.googleapis.com/maps/api/staticmap` +
    `?center=${encodeURIComponent(center)}` +
    `&zoom=15&size=560x320&scale=2` +
    `&maptype=roadmap` +
    `&markers=${encodeURIComponent(marker)}` +
    `&style=feature:poi|visibility:off` +
    `&style=feature:transit|visibility:off` +
    `&key=${key}`
  );
}

/** Picks the best available photo URL for a panel. */
function photoUrl(panel: ComicPanel): string | null {
  if (panel.image?.kind === "place-photo" && panel.image.imageUrl) {
    return panel.image.imageUrl;
  }
  if (panel.areaPhotos && panel.areaPhotos.length > 0) {
    return panel.areaPhotos[0].url;
  }
  return null;
}

/** Resolves map + photo images for all 4 panels concurrently. */
async function resolveAllImages(panels: ComicPanel[]): Promise<PanelImages[]> {
  const fetches = panels.map(async (panel): Promise<PanelImages> => {
    const mapSrc   = staticMapUrl(panel.mapAnchor.lat, panel.mapAnchor.lon);
    const photoSrc = photoUrl(panel);

    const [mapResult, photoResult] = await Promise.all([
      mapSrc   ? fetchImage(mapSrc)   : Promise.resolve(null),
      photoSrc ? fetchImage(photoSrc) : Promise.resolve(null),
    ]);

    return {
      mapBase64:   mapResult?.base64   ?? null,
      mapMime:     mapResult?.mime     ?? "PNG",
      photoBase64: photoResult?.base64 ?? null,
      photoMime:   photoResult?.mime   ?? "JPEG",
    };
  });

  return Promise.all(fetches);
}

// ─── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  let story: ComicStory;
  let trip: TripSummary | null;

  try {
    const body = await req.json();
    story = body.story as ComicStory;
    trip  = (body.trip as TripSummary | null) ?? null;

    if (!story || !Array.isArray(story.panels) || story.panels.length !== 4) {
      return NextResponse.json({ ok: false, error: "Invalid story payload" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ ok: false, error: "Malformed JSON body" }, { status: 400 });
  }

  // Fetch all images in parallel (8 requests, each with 5s timeout)
  const panelImages = await resolveAllImages(story.panels);

  // Build the PDF
  const pdfBuffer = buildStoryPdf(story, trip, panelImages);

  const dateStr   = trip
    ? new Date(trip.start).toISOString().slice(0, 10)
    : new Date(story.createdAt).toISOString().slice(0, 10);
  const safeName  = story.title
    .replace(/[^a-z0-9]+/gi, "-")
    .toLowerCase()
    .slice(0, 40);
  const filename  = `fleethappens-story-${safeName}-${dateStr}.pdf`;

  return new Response(pdfBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(pdfBuffer.byteLength),
      "Cache-Control": "no-store",
    },
  });
}

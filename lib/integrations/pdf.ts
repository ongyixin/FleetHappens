/**
 * Server-side PDF generator for the share integration.
 *
 * Reuses the existing PDF generation API routes by calling them internally,
 * so all image-fetching and PDF-building logic remains in one place.
 */

import type { PdfContext } from "@/types/integrations";

/**
 * Generates a PDF for the given context by calling the existing PDF routes.
 * Returns the raw PDF buffer and a suggested filename.
 *
 * Throws if the internal fetch fails or the route returns an error.
 */
export async function generateSharePdf(
  context: PdfContext,
  appUrl: string,
): Promise<{ buffer: Buffer; filename: string }> {
  if (context.type === "story") {
    const { story, trip } = context;

    const res = await fetch(`${appUrl}/api/story/export-pdf`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ story, trip }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) {
      const msg = await res.text().catch(() => `HTTP ${res.status}`);
      throw new Error(`Story PDF generation failed: ${msg}`);
    }

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const dateStr  = trip
      ? new Date(trip.start).toISOString().slice(0, 10)
      : new Date(story.createdAt).toISOString().slice(0, 10);
    const safeName = story.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase().slice(0, 40);
    const filename = `fleethappens-story-${safeName}-${dateStr}.pdf`;

    return { buffer, filename };
  }

  // type === "report"
  const { payload } = context;

  const res = await fetch(`${appUrl}/api/report/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => `HTTP ${res.status}`);
    throw new Error(`Report PDF generation failed: ${msg}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const slug     = payload.metadata.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48);
  const dateStr  = new Date(payload.metadata.generatedAt).toISOString().slice(0, 10);
  const filename = `fleethappens-report-${slug}-${dateStr}.pdf`;

  return { buffer, filename };
}

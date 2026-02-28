/**
 * GET /api/story/library
 *
 * Returns paginated comic stories from the BigQuery trip_stories table for
 * the Fleet Storybook gallery. Supports tone filtering and limit/offset pagination.
 * Falls back to bundled demo data when BigQuery is not configured.
 *
 * Query params:
 *   limit  — max stories to return (default 24, max 100)
 *   offset — pagination offset (default 0)
 *   tone   — filter by tone: "guidebook" | "playful" | "cinematic"
 */

import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";
import { bqListStories, isBigQueryEnabled, type StorySummary } from "@/lib/bigquery/client";

function getDemoStories(): StorySummary[] {
  try {
    const raw = readFileSync(join(process.cwd(), "public/fallback/storybook.json"), "utf-8");
    return JSON.parse(raw) as StorySummary[];
  } catch {
    return [];
  }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const limit  = Math.min(Number(searchParams.get("limit")  ?? "24"), 100);
  const offset = Number(searchParams.get("offset") ?? "0");
  const tone   = searchParams.get("tone") ?? undefined;

  const useDemoData =
    !isBigQueryEnabled() ||
    process.env.STORYBOOK_DEMO_DATA === "true";

  if (useDemoData) {
    let stories = getDemoStories();
    if (tone) stories = stories.filter((s) => s.tone === tone);
    const total = stories.length;
    const page  = stories.slice(offset, offset + limit);
    return NextResponse.json({
      ok: true,
      data: { stories: page, total, bigqueryEnabled: false },
    });
  }

  try {
    const result = await bqListStories({ limit, offset, tone });
    return NextResponse.json({
      ok: true,
      data: { ...result, bigqueryEnabled: true },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Library fetch failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

/**
 * POST /api/ace/query
 * Sends a question to Geotab Ace and returns AceInsight.
 * Slow (30-90s) — always show loading state; never block UI.
 *
 * Body: AceQueryRequest
 *
 * Owner: Ace Analytics Agent
 */

import { NextRequest, NextResponse } from "next/server";
import { queryAce } from "@/lib/ace/client";
import { buildAceQuestion, getFallbackFile } from "@/lib/ace/queries";
import { withFallback, loadFileFallback } from "@/lib/cache/fallback";
import { bqGetAceCache, bqSetAceCache, isBigQueryEnabled } from "@/lib/bigquery/client";
import type { ApiResponse, AceInsight, AceQueryRequest } from "@/types";

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: AceQueryRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  const question = body.question ?? (body.queryKey
    ? buildAceQuestion(body.queryKey, {
        coordinates: body.coordinates,
        radiusKm: body.radiusKm,
        daysBack: body.daysBack,
        groupName: body.groupName,
      })
    : null);

  if (!question) {
    return NextResponse.json(
      { ok: false, error: "Provide either queryKey or question" } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  const fallbackKey = body.queryKey ?? "custom";
  const groupSlug = body.groupName
    ? body.groupName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
    : null;
  const cacheKey = groupSlug
    ? `ace-${fallbackKey}-${groupSlug}.json`
    : `ace-${fallbackKey}.json`;

  // Demo mode: serve file fallback immediately — no live Ace call.
  // Try the group-specific file first (e.g. ace-fleet-vehicle-outliers-north-region.json),
  // then the canonical fallback for this query key (e.g. ace-fleet-vehicle-outliers.json),
  // then a bare ace-<key>.json as a last resort.
  if (process.env.PULSE_DEMO_GROUPS === "true") {
    const canonicalFile = getFallbackFile(fallbackKey);
    const data =
      (groupSlug ? loadFileFallback<AceInsight>(cacheKey) : null) ??
      loadFileFallback<AceInsight>(canonicalFile) ??
      loadFileFallback<AceInsight>(`ace-${fallbackKey}.json`);

    if (data) {
      return NextResponse.json({
        ok: true,
        data: { ...data, fromCache: true },
        fromCache: true,
      } satisfies ApiResponse<AceInsight>);
    }
    return NextResponse.json(
      { ok: false, error: `[demo] No fallback data available for query "${fallbackKey}"` } satisfies ApiResponse<never>,
      { status: 404 }
    );
  }

  // Check BigQuery cache before attempting the slow Ace call
  if (isBigQueryEnabled()) {
    const bqCached = await bqGetAceCache<AceInsight>(cacheKey);
    if (bqCached) {
      return NextResponse.json({
        ok: true,
        data: { ...bqCached, fromCache: true },
        fromCache: true,
      } satisfies ApiResponse<AceInsight>);
    }
  }

  try {
    const { data, fromCache } = await withFallback(
      () => queryAce(question),
      cacheKey
    );

    // Write-through to BigQuery when we get a fresh live result
    if (!fromCache && isBigQueryEnabled()) {
      bqSetAceCache(cacheKey, data, 30).catch(() => {
        // Non-fatal — in-memory cache already holds the result
      });
    }

    return NextResponse.json({
      ok: true,
      data: { ...data, fromCache },
      fromCache,
    } satisfies ApiResponse<AceInsight>);
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Ace query failed",
      } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }
}

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
import { buildAceQuestion } from "@/lib/ace/queries";
import { withFallback } from "@/lib/cache/fallback";
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

  try {
    const { data, fromCache } = await withFallback(
      () => queryAce(question),
      cacheKey
    );

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

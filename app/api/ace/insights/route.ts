/**
 * GET /api/ace/insights
 * Returns pre-defined fleet insight AceInsight[] for the dashboard.
 * Results are cached; first call may be slow (30-90s per Ace query).
 */

import { NextResponse } from "next/server";
import { runInsightQuery } from "@/lib/ace/client";
import { QUERY_KEYS } from "@/lib/ace/queries";
import { withFallback } from "@/lib/cache/fallback";
import type { ApiResponse, AceInsight } from "@/types";

export const dynamic = "force-dynamic";

const DASHBOARD_QUERIES = [
  QUERY_KEYS.TOP_VEHICLES,
  QUERY_KEYS.IDLE_BY_DAY,
  QUERY_KEYS.COMMON_STOPS,
  QUERY_KEYS.TRIP_DURATION,
] as const;

export async function GET(): Promise<NextResponse> {
  try {
    // Run queries sequentially to respect Ace rate limits.
    // withFallback inside runInsightQuery handles caching + fallback files.
    const insights: AceInsight[] = [];

    for (const key of DASHBOARD_QUERIES) {
      try {
        const insight = await runInsightQuery(key);
        insights.push(insight);
      } catch {
        // One query failing shouldn't block the others
      }
    }

    if (insights.length === 0) {
      throw new Error("All Ace queries failed");
    }

    return NextResponse.json({
      ok: true,
      data: insights,
    } satisfies ApiResponse<AceInsight[]>);
  } catch (err) {
    // Fall back to static file — caller handles the fallback path too
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Ace insights unavailable",
      } satisfies ApiResponse<never>,
      { status: 503 }
    );
  }
}

/**
 * GET /api/analytics/trends?groupId=<id>&days=<n>
 *
 * Returns historical fleet KPI snapshots from BigQuery for the Fleet Trends
 * chart on the Pulse page. Rows are ordered oldest → newest.
 *
 * Query params:
 *   groupId — fleet group ID (required)
 *   days    — how many calendar days back to fetch (default: 30, max: 90)
 *
 * Response:
 *   { ok: true, data: FleetTrendPoint[] }
 *   { ok: false, error: string }           — when BigQuery is not configured
 */

import { NextRequest, NextResponse } from "next/server";
import { bqGetFleetTrends, isBigQueryEnabled } from "@/lib/bigquery/client";

export interface FleetTrendPoint {
  date: string;
  metrics: Record<string, unknown>;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = req.nextUrl;

  const groupId = searchParams.get("groupId");
  if (!groupId) {
    return NextResponse.json(
      { ok: false, error: "groupId query param is required" },
      { status: 400 }
    );
  }

  const daysRaw = parseInt(searchParams.get("days") ?? "30", 10);
  const days = Math.min(Math.max(daysRaw, 1), 90);

  if (!isBigQueryEnabled()) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "BigQuery analytics are not configured. Set GOOGLE_CLOUD_PROJECT and BIGQUERY_DATASET to enable fleet trend history.",
      },
      { status: 503 }
    );
  }

  try {
    const rows = await bqGetFleetTrends(groupId, days);
    return NextResponse.json({ ok: true, data: rows });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Failed to load fleet trends",
      },
      { status: 500 }
    );
  }
}

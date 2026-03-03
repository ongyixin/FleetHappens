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
 *
 * Demo mode: when PULSE_DEMO_GROUPS=true, serves pre-built per-region mock
 * data from public/fallback/trends-<groupId>.json instead of querying BigQuery.
 */

import { NextRequest, NextResponse } from "next/server";
import { bqGetFleetTrends, isBigQueryEnabled } from "@/lib/bigquery/client";
import { readFileSync } from "fs";
import { join } from "path";

export interface FleetTrendPoint {
  date: string;
  metrics: Record<string, unknown>;
}

function loadDemoTrends(groupId: string, days: number): FleetTrendPoint[] | null {
  // Try region-specific file first, then a generic all-regions fallback.
  const candidates = [
    `trends-${groupId}.json`,
    "trends-all.json",
  ];
  for (const filename of candidates) {
    try {
      const filePath = join(process.cwd(), "public", "fallback", filename);
      const raw = readFileSync(filePath, "utf-8");
      const all = JSON.parse(raw) as FleetTrendPoint[];
      // Return the most-recent `days` entries.
      return all.slice(-days);
    } catch {
      // try next candidate
    }
  }
  return null;
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

  // Demo mode: bypass BigQuery entirely.
  if (process.env.PULSE_DEMO_GROUPS === "true") {
    const demoData = loadDemoTrends(groupId, days);
    if (demoData) {
      return NextResponse.json({ ok: true, data: demoData, demo: true });
    }
    return NextResponse.json(
      { ok: false, error: `No demo trends file found for group "${groupId}"` },
      { status: 404 }
    );
  }

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

/**
 * GET /api/geotab/logs?deviceId=X&fromDate=ISO&toDate=ISO
 * Returns GPS breadcrumbs (BreadcrumbPoint[]) for a device + time range.
 * Decimates to ≤500 points for map performance.
 *
 * Owner: Geotab Integration Agent
 */

import { NextRequest, NextResponse } from "next/server";
import { getLogRecords } from "@/lib/geotab/client";
import { normalizeLogRecord, decimateBreadcrumbs } from "@/lib/geotab/normalize";
import { withFallback } from "@/lib/cache/fallback";
import type { ApiResponse, BreadcrumbPoint } from "@/types";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = req.nextUrl;
  const deviceId = searchParams.get("deviceId");
  const fromDate = searchParams.get("fromDate");
  const toDate = searchParams.get("toDate");

  if (!deviceId || !fromDate || !toDate) {
    return NextResponse.json(
      { ok: false, error: "deviceId, fromDate, and toDate are required" } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  try {
    const { data: rawLogs, fromCache } = await withFallback(
      () => getLogRecords(deviceId, fromDate, toDate),
      `logs-${deviceId}.json`
    );

    const breadcrumbs = decimateBreadcrumbs(
      rawLogs.map(normalizeLogRecord),
      500
    );

    return NextResponse.json({
      ok: true,
      data: breadcrumbs,
      fromCache,
    } satisfies ApiResponse<BreadcrumbPoint[]>);
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Failed to load logs",
      } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }
}

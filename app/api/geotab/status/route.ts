/**
 * GET /api/geotab/status?deviceId=X
 * Returns live position for a specific device (or all devices if no deviceId).
 *
 * Owner: Geotab Integration Agent
 */

import { NextRequest, NextResponse } from "next/server";
import { getDeviceStatus } from "@/lib/geotab/client";
import { normalizeDeviceStatus } from "@/lib/geotab/normalize";
import { withFallback } from "@/lib/cache/fallback";
import type { ApiResponse } from "@/types";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = req.nextUrl;
  const deviceId = searchParams.get("deviceId");

  try {
    const { data: statuses, fromCache } = await withFallback(
      () => getDeviceStatus(deviceId ? [deviceId] : undefined),
      "status.json"
    );

    const data = statuses.map(normalizeDeviceStatus);

    return NextResponse.json({ ok: true, data, fromCache } satisfies ApiResponse<typeof data>);
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Status fetch failed" } satisfies ApiResponse<never>,
      { status: 500 }
    );
  }
}

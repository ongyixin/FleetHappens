/**
 * GET /api/geotab/devices
 * Returns fleet vehicle list as VehicleCard[].
 *
 * Owner: Geotab Integration Agent
 */

import { NextRequest, NextResponse } from "next/server";
import { getDevices } from "@/lib/geotab/client";
import { getSessionFromRequest } from "@/lib/geotab/session";
import { normalizeDevice } from "@/lib/geotab/normalize";
import { withFallback } from "@/lib/cache/fallback";
import type { ApiResponse, VehicleCard } from "@/types";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const userCreds = getSessionFromRequest(req);

  try {
    // For user-authenticated requests, call the live API directly so they always
    // see their own data — skip the file-based fallback which has demo data.
    if (userCreds) {
      const devices = await getDevices(userCreds);
      const vehicles: VehicleCard[] = devices.map(normalizeDevice);
      return NextResponse.json({ ok: true, data: vehicles } satisfies ApiResponse<VehicleCard[]>);
    }

    const { data: devices, fromCache } = await withFallback(
      () => getDevices(),
      "devices.json"
    );

    const vehicles: VehicleCard[] = devices.map(normalizeDevice);

    const response: ApiResponse<VehicleCard[]> = {
      ok: true,
      data: vehicles,
      fromCache,
    };
    return NextResponse.json(response);
  } catch (err) {
    const response: ApiResponse<never> = {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to load devices",
    };
    return NextResponse.json(response, { status: 500 });
  }
}

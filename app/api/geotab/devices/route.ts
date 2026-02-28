/**
 * GET /api/geotab/devices
 * Returns fleet vehicle list as VehicleCard[].
 *
 * Owner: Geotab Integration Agent
 */

import { NextResponse } from "next/server";
import { getDevices } from "@/lib/geotab/client";
import { normalizeDevice } from "@/lib/geotab/normalize";
import { withFallback } from "@/lib/cache/fallback";
import type { ApiResponse, VehicleCard } from "@/types";

export async function GET(): Promise<NextResponse> {
  try {
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

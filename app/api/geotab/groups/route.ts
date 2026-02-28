/**
 * GET /api/geotab/groups
 *
 * Returns fleet groups as FleetGroup[].
 * Filters Geotab system groups (CompanyGroup, VehicleGroup, etc.) and
 * returns only user-created groups that have at least one device.
 *
 * If no user groups exist (common in demo databases), falls back to
 * treating CompanyGroup as a single "All Vehicles" fleet.
 */

import { NextResponse } from "next/server";
import { getGroups, getDevices } from "@/lib/geotab/client";
import { normalizeGroup } from "@/lib/geotab/normalize";
import { withFallback } from "@/lib/cache/fallback";
import type { ApiResponse, FleetGroup, GeotabGroup } from "@/types";

// Geotab built-in system group IDs — not useful as "fleet" groups
const SYSTEM_GROUP_IDS = new Set([
  "GroupEverythingId",
  "GroupCompanyId",
  "GroupVehicleId",
  "GroupAssetId",
  "GroupDriverId",
  "GroupUserEverythingId",
  "GroupOrganizationId",
  "GroupNothingId",
  "GroupSecurityId",
  "GroupDefectId",
  "GroupTrailerGroupId",
  "GroupWorkTimeId",
]);

export async function GET(): Promise<NextResponse> {
  try {
    const fleetGroups = await withFallback(
      async (): Promise<FleetGroup[]> => {
        const [rawGroups, rawDevices] = await Promise.all([
          getGroups(),
          getDevices(),
        ]);

        // Count devices per group
        const deviceCountByGroup = new Map<string, number>();
        for (const device of rawDevices) {
          for (const g of device.groups ?? []) {
            deviceCountByGroup.set(
              g.id,
              (deviceCountByGroup.get(g.id) ?? 0) + 1
            );
          }
        }

        // User-created groups that contain at least one device
        const userGroups: GeotabGroup[] = rawGroups.filter(
          (g) =>
            !SYSTEM_GROUP_IDS.has(g.id) &&
            (deviceCountByGroup.get(g.id) ?? 0) > 0
        );

        if (userGroups.length > 0) {
          return userGroups.map((g) =>
            normalizeGroup(g, deviceCountByGroup.get(g.id) ?? 0)
          );
        }

        // Fallback: treat CompanyGroup as a single fleet
        const companyGroup = rawGroups.find(
          (g) => g.id === "GroupCompanyId"
        );
        if (companyGroup) {
          return [normalizeGroup(companyGroup, rawDevices.length)];
        }

        // Ultimate fallback: synthetic group from all devices
        return [
          {
            id: "all",
            name: "All Vehicles",
            vehicleCount: rawDevices.length,
          },
        ];
      },
      "groups.json"
    );

    const response: ApiResponse<FleetGroup[]> = {
      ok: true,
      data: fleetGroups.data,
      fromCache: fleetGroups.fromCache,
    };
    return NextResponse.json(response);
  } catch (err) {
    const response: ApiResponse<never> = {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to load groups",
    };
    return NextResponse.json(response, { status: 500 });
  }
}

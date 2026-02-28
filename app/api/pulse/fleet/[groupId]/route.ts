/**
 * GET /api/pulse/fleet/[groupId]
 *
 * Returns FleetPulseDetail for a specific fleet group.
 * Includes per-vehicle activity state (from DeviceStatusInfo) plus
 * outlier highlights derived from the most recent trips.
 *
 * Ace-powered cards (route patterns, stop hotspots, outliers by distance)
 * are loaded asynchronously by the client via POST /api/ace/query.
 */

import { NextRequest, NextResponse } from "next/server";
import { getGroups, getDevices, getDeviceStatus } from "@/lib/geotab/client";
import { normalizeGroup, normalizeDeviceStatus } from "@/lib/geotab/normalize";
import { withFallback, loadFileFallback } from "@/lib/cache/fallback";
import type {
  ApiResponse,
  CompanyPulseSummary,
  FleetPulseDetail,
  VehicleActivity,
  VehicleStatus,
  GeotabGroup,
} from "@/types";

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

const ACTIVE_THRESHOLD_MS = 24 * 60 * 60 * 1000;
const IDLE_SPEED_THRESHOLD = 2; // km/h — below this is considered idle/stopped

function deriveStatus(speedKmh: number, lastSeenMs: number): VehicleStatus {
  const msSinceLastSeen = Date.now() - lastSeenMs;
  if (msSinceLastSeen > ACTIVE_THRESHOLD_MS) return "offline";
  return speedKmh > IDLE_SPEED_THRESHOLD ? "active" : "idle";
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { groupId: string } }
): Promise<NextResponse> {
  const { groupId } = params;

  try {
    // When PULSE_DEMO_GROUPS=true, skip the live call and serve fallback data.
    // Try a group-specific file first (pulse-fleet-g-north.json etc.), then
    // fall back to pulse-fleet-all.json with the group info patched from the
    // summary fallback so the correct name/colour is shown.
    if (process.env.PULSE_DEMO_GROUPS === "true") {
      const groupSpecific = loadFileFallback<FleetPulseDetail>(
        `pulse-fleet-${groupId}.json`
      );
      if (groupSpecific) {
        return NextResponse.json<ApiResponse<FleetPulseDetail>>({
          ok: true,
          data: groupSpecific,
          fromCache: true,
        });
      }

      const allFallback = loadFileFallback<FleetPulseDetail>("pulse-fleet-all.json");
      if (allFallback) {
        const summary = loadFileFallback<CompanyPulseSummary>("pulse-summary.json");
        const groupInfo = summary?.fleets.find((f) => f.group.id === groupId)?.group;
        const data: FleetPulseDetail = {
          ...allFallback,
          group: groupInfo ?? {
            id: groupId,
            name: groupId,
            vehicleCount: allFallback.vehicles.length,
          },
        };
        return NextResponse.json<ApiResponse<FleetPulseDetail>>({
          ok: true,
          data,
          fromCache: true,
        });
      }

      return NextResponse.json<ApiResponse<never>>(
        { ok: false, error: `No demo data available for group "${groupId}"` },
        { status: 404 }
      );
    }

    const detail = await withFallback(
      async (): Promise<FleetPulseDetail> => {
        const [rawGroups, rawDevices, rawStatuses] = await Promise.all([
          getGroups(),
          getDevices(),
          getDeviceStatus(),
        ]);

        const statusByDeviceId = new Map(
          rawStatuses.map((s) => [s.device.id, normalizeDeviceStatus(s)])
        );

        // Locate the target group
        let targetGroup: GeotabGroup | undefined = rawGroups.find(
          (g) => g.id === groupId
        );

        // Handle synthetic "all" group
        if (!targetGroup && groupId === "all") {
          targetGroup = { id: "all", name: "All Vehicles" };
        }

        if (!targetGroup) {
          throw new Error(`Group "${groupId}" not found`);
        }

        // Devices that belong to this group (or all devices for synthetic group)
        const groupDevices =
          groupId === "all"
            ? rawDevices
            : rawDevices.filter((d) =>
                (d.groups ?? []).some((g) => g.id === groupId)
              );

        // Build VehicleActivity list
        const vehicles: VehicleActivity[] = groupDevices.map((device) => {
          const status = statusByDeviceId.get(device.id);
          const lastSeenMs = status
            ? new Date(status.dateTime).getTime()
            : 0;
          const vehicleStatus = status
            ? deriveStatus(status.speedKmh, lastSeenMs)
            : "offline";

          return {
            vehicle: {
              id: device.id,
              name: device.name,
              deviceType: device.deviceType,
              lastCommunication: device.activeTo,
              currentPosition: status?.position,
            },
            status: vehicleStatus,
            lastPosition: status?.position,
          };
        });

        // Sort: active first, then idle, then offline; alphabetical within each group
        const statusOrder: Record<VehicleStatus, number> = {
          active: 0,
          idle: 1,
          offline: 2,
        };
        vehicles.sort(
          (a, b) =>
            statusOrder[a.status] - statusOrder[b.status] ||
            a.vehicle.name.localeCompare(b.vehicle.name)
        );

        // Determine vehicleCount for the group normalizer
        const vehicleCount =
          groupId === "all"
            ? rawDevices.length
            : rawDevices.filter((d) =>
                (d.groups ?? []).some((g) => g.id === groupId)
              ).length;

        return {
          group: normalizeGroup(targetGroup, vehicleCount),
          vehicles,
          outliers: {}, // Ace-powered outliers are loaded separately client-side
        };
      },
      `pulse-fleet-${groupId}.json`
    );

    const response: ApiResponse<FleetPulseDetail> = {
      ok: true,
      data: detail.data,
      fromCache: detail.fromCache,
    };
    return NextResponse.json(response);
  } catch (err) {
    const response: ApiResponse<never> = {
      ok: false,
      error:
        err instanceof Error
          ? err.message
          : `Failed to load fleet detail for group "${groupId}"`,
    };
    return NextResponse.json(response, { status: 500 });
  }
}

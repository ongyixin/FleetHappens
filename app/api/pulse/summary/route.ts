/**
 * GET /api/pulse/summary
 *
 * Returns CompanyPulseSummary for the portfolio/company view.
 *
 * Two-phase loading:
 *   Phase 1 (fast): Groups + devices + device status → vehicle counts and active state
 *   Phase 2 (async, via Ace): Distance and trip totals per group — merged by the client
 *
 * This route returns Phase 1 data immediately. Fleet KPIs from Ace are fetched
 * client-side via POST /api/ace/query with queryKey "fleet-distance-by-group".
 */

import { NextResponse } from "next/server";
import { getGroups, getDevices, getDeviceStatus } from "@/lib/geotab/client";
import { normalizeGroup, normalizeDeviceStatus } from "@/lib/geotab/normalize";
import { withFallback, loadFileFallback } from "@/lib/cache/fallback";
import type {
  ApiResponse,
  CompanyPulseSummary,
  FleetSummary,
  GeotabGroup,
} from "@/types";

// System groups excluded from fleet grouping (same list as groups route)
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

// A vehicle is considered "active" if its last communication was within 24h
const ACTIVE_THRESHOLD_MS = 24 * 60 * 60 * 1000;

export async function GET(): Promise<NextResponse> {
  try {
    // When PULSE_DEMO_GROUPS=true, skip the live call entirely and serve the
    // fallback JSON so the UI shows the regional sub-group demo layout.
    if (process.env.PULSE_DEMO_GROUPS === "true") {
      const demo = loadFileFallback<CompanyPulseSummary>("pulse-summary.json");
      if (demo) {
        const response: ApiResponse<CompanyPulseSummary> = {
          ok: true,
          data: demo,
          fromCache: true,
        };
        return NextResponse.json(response);
      }
    }

    const summary = await withFallback(
      async (): Promise<CompanyPulseSummary> => {
        const [rawGroups, rawDevices, rawStatuses] = await Promise.all([
          getGroups(),
          getDevices(),
          getDeviceStatus(),
        ]);

        // Build lookup maps
        const statusByDeviceId = new Map(
          rawStatuses.map((s) => [s.device.id, normalizeDeviceStatus(s)])
        );
        const now = Date.now();

        // Count devices per group and active vehicles per group
        const deviceCountByGroup = new Map<string, number>();
        const activeCountByGroup = new Map<string, number>();

        for (const device of rawDevices) {
          const status = statusByDeviceId.get(device.id);
          const isActive =
            status &&
            now - new Date(status.dateTime).getTime() < ACTIVE_THRESHOLD_MS;

          for (const g of device.groups ?? []) {
            deviceCountByGroup.set(g.id, (deviceCountByGroup.get(g.id) ?? 0) + 1);
            if (isActive) {
              activeCountByGroup.set(
                g.id,
                (activeCountByGroup.get(g.id) ?? 0) + 1
              );
            }
          }
        }

        // Resolve fleet groups
        let userGroups: GeotabGroup[] = rawGroups.filter(
          (g) =>
            !SYSTEM_GROUP_IDS.has(g.id) &&
            (deviceCountByGroup.get(g.id) ?? 0) > 0
        );

        if (userGroups.length === 0) {
          const companyGroup = rawGroups.find(
            (g) => g.id === "GroupCompanyId"
          );
          if (companyGroup) {
            userGroups = [companyGroup];
            deviceCountByGroup.set("GroupCompanyId", rawDevices.length);
            const activeTotal = rawDevices.filter((d) => {
              const s = statusByDeviceId.get(d.id);
              return (
                s && now - new Date(s.dateTime).getTime() < ACTIVE_THRESHOLD_MS
              );
            }).length;
            activeCountByGroup.set("GroupCompanyId", activeTotal);
          } else {
            // Synthetic single fleet
            userGroups = [{ id: "all", name: "All Vehicles" }];
            deviceCountByGroup.set("all", rawDevices.length);
          }
        }

        const fleets: FleetSummary[] = userGroups.map((g) => {
          const total = deviceCountByGroup.get(g.id) ?? 0;
          const active = activeCountByGroup.get(g.id) ?? 0;
          return {
            group: normalizeGroup(g, total),
            totalDistanceKm: 0,   // filled by Ace client-side
            totalTrips: 0,         // filled by Ace client-side
            activeVehicles: active,
            totalVehicles: total,
            avgIdlePct: 0,         // filled by Ace client-side
            periodDays: 7,
          };
        });

        const totals = {
          vehicles: rawDevices.length,
          activeVehicles: fleets.reduce((s, f) => s + f.activeVehicles, 0),
          distanceKm: 0,
          trips: 0,
          avgIdlePct: 0,
        };

        return { fleets, totals };
      },
      "pulse-summary.json"
    );

    const response: ApiResponse<CompanyPulseSummary> = {
      ok: true,
      data: summary.data,
      fromCache: summary.fromCache,
    };
    return NextResponse.json(response);
  } catch (err) {
    const response: ApiResponse<never> = {
      ok: false,
      error:
        err instanceof Error ? err.message : "Failed to load pulse summary",
    };
    return NextResponse.json(response, { status: 500 });
  }
}

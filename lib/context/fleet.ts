/**
 * Fleet visit history for a location area, powered by Geotab Ace.
 *
 * Queries Ace for the number of trips that ended within ~1 km of the
 * given coordinates in the last 90 days.  Returns a visit count and
 * a human-readable summary string for display in the StopContextPanel.
 *
 * Ace is slow (30–90 s) — only call this from the Phase 2 enrichment
 * path, never in the fast Phase 1 response.
 */

import { queryAce } from "@/lib/ace/client";
import { buildAceQuestion, QUERY_KEYS } from "@/lib/ace/queries";

export interface FleetVisitResult {
  visitCount: number;
  summary: string;
}

const DEFAULT_RADIUS_KM = 1.0;
const DEFAULT_DAYS_BACK = 90;

export async function getFleetVisitSummaryForArea(
  lat: number,
  lon: number,
  _placeName: string,
  radiusKm = DEFAULT_RADIUS_KM,
  daysBack = DEFAULT_DAYS_BACK
): Promise<FleetVisitResult> {
  const question = buildAceQuestion(QUERY_KEYS.STOP_VISIT, {
    coordinates: { lat, lon },
    radiusKm,
    daysBack,
  });

  const result = await queryAce(question);
  return parseFleetVisitResult(result.previewArray ?? [], result.columns ?? []);
}

function parseFleetVisitResult(
  previewArray: Record<string, unknown>[],
  columns: string[]
): FleetVisitResult {
  const row = previewArray[0] ?? {};

  // Ace column names are unpredictable — try known names, then positional fallback
  const byPosition = (pos: number): unknown =>
    columns[pos] ? row[columns[pos]] : undefined;

  const visitCount =
    Number(row.trip_count ?? row.count ?? row.TripCount ?? byPosition(0) ?? 0) || 0;

  // STOP_VISIT template returns most_common_day_of_week as 4th column
  const rawDay = String(
    row.most_common_day_of_week ?? row.CommonDay ?? byPosition(3) ?? ""
  ).trim();

  const summary = buildSummary(visitCount, rawDay);
  return { visitCount, summary };
}

function buildSummary(visitCount: number, dayOfWeek: string): string {
  if (visitCount === 0) {
    return "No recorded fleet visits to this area in the last 90 days.";
  }
  if (visitCount === 1) {
    return "1 fleet visit to this area in the last 90 days.";
  }

  let s = `${visitCount} fleet visits in the last 90 days`;
  if (dayOfWeek) s += `, mostly on ${dayOfWeek}s`;
  return `${s}.`;
}

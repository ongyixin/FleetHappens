/**
 * lib/ace/queries.ts
 *
 * Query template library for Geotab Ace.
 *
 * Design principles:
 *   - Prompt builders are pure functions, isolated from execution.
 *   - Column names are explicit so position-based access stays stable.
 *   - Every question is bounded ("top N", fixed date ranges) so results
 *     always fit in the 10-row preview_array.
 *   - runInsightQuery / runStopVisitQuery are the two high-level entry points
 *     for other modules to use.
 */

// ─── Query keys ───────────────────────────────────────────────────────────────

export const QUERY_KEYS = {
  TOP_VEHICLES: "top-vehicles",
  IDLE_BY_DAY: "idle-by-day",
  COMMON_STOPS: "common-stops",
  TRIP_DURATION: "trip-duration",
  STOP_VISIT: "stop-visit",
  // Fleet Pulse queries
  FLEET_DISTANCE_BY_GROUP: "fleet-distance-by-group",
  FLEET_VEHICLE_OUTLIERS: "fleet-vehicle-outliers",
  FLEET_STOP_HOTSPOTS: "fleet-stop-hotspots",
  FLEET_ROUTE_PATTERNS: "fleet-route-patterns",
} as const;

export type QueryKey = (typeof QUERY_KEYS)[keyof typeof QUERY_KEYS];

// ─── Template options ─────────────────────────────────────────────────────────

export interface StopVisitOptions {
  coordinates: { lat: number; lon: number };
  radiusKm?: number;
  daysBack?: number;
}

export interface QueryBuildOptions {
  coordinates?: { lat: number; lon: number };
  radiusKm?: number;
  daysBack?: number;
  /** Fleet group name — required for fleet-scoped Pulse queries. */
  groupName?: string;
}

// ─── Predefined query metadata ────────────────────────────────────────────────

export interface QueryTemplate {
  key: QueryKey;
  label: string;
  description: string;
  fallbackFile: string;
  buildQuestion: (opts?: QueryBuildOptions) => string;
}

export const QUERY_TEMPLATES: QueryTemplate[] = [
  {
    key: QUERY_KEYS.TOP_VEHICLES,
    label: "Top Vehicles by Distance",
    description: "Top 10 vehicles by total distance in the last 14 days",
    fallbackFile: "ace-top-vehicles.json",
    buildQuestion: () =>
      "What are the top 10 vehicles by total distance in the last 14 days? " +
      "Return columns: device_name, total_distance_km, trip_count. " +
      "Sort by total_distance_km descending. Use UTC timezone.",
  },
  {
    key: QUERY_KEYS.IDLE_BY_DAY,
    label: "Idle Time by Day",
    description: "Average idle time percentage for each day of the week",
    fallbackFile: "ace-idle-by-day.json",
    buildQuestion: () =>
      "What is the average idle time percentage for each day of the week over the last 30 days? " +
      "Return columns: day_of_week, avg_idle_pct, avg_idle_minutes. " +
      "Order by day of week (Monday first). Use UTC timezone.",
  },
  {
    key: QUERY_KEYS.COMMON_STOPS,
    label: "Most Common Stop Locations",
    description: "Top 5 most frequent trip end locations in the last 30 days",
    fallbackFile: "ace-common-stops.json",
    buildQuestion: () =>
      "What are the top 5 most common trip end locations in the last 30 days? " +
      "Return columns: location_name, visit_count, avg_dwell_minutes. " +
      "Sort by visit_count descending. Use UTC timezone.",
  },
  {
    key: QUERY_KEYS.TRIP_DURATION,
    label: "Average Trip Duration",
    description: "Fleet trip duration statistics for this month",
    fallbackFile: "ace-trip-duration.json",
    buildQuestion: () =>
      "What are the fleet trip duration statistics for this month? " +
      "Return columns: metric, value. " +
      "Include: average trip duration in minutes, median trip duration in minutes, " +
      "longest trip in minutes, shortest trip in minutes, total trip count. " +
      "Use UTC timezone.",
  },
  {
    key: QUERY_KEYS.STOP_VISIT,
    label: "Fleet Visit Frequency",
    description: "How often the fleet visits a specific location",
    fallbackFile: "ace-stop-visit.json",
    buildQuestion: (opts?: QueryBuildOptions) => {
      if (!opts?.coordinates) {
        throw new Error("stop-visit query requires coordinates");
      }
      const { lat, lon } = opts.coordinates;
      const radius = opts?.radiusKm ?? 1.0;
      const days = opts?.daysBack ?? 90;
      return (
        `How many trips ended within ${radius} km of latitude ${lat.toFixed(4)}, ` +
        `longitude ${lon.toFixed(4)} in the last ${days} days? ` +
        "Return columns: trip_count, first_visit_date, last_visit_date, most_common_day_of_week. " +
        "Use UTC timezone."
      );
    },
  },
  // ─── Fleet Pulse queries ─────────────────────────────────────────────────────
  {
    key: QUERY_KEYS.FLEET_DISTANCE_BY_GROUP,
    label: "Distance by Fleet Group",
    description: "Total distance and trip count per fleet group in the last 7 days",
    fallbackFile: "ace-fleet-distance-by-group.json",
    buildQuestion: () =>
      "What is the total distance in km and trip count per group in the last 7 days? " +
      "Return columns: group_name, total_distance_km, trip_count, vehicle_count. " +
      "Sort by total_distance_km descending. Use UTC timezone.",
  },
  {
    key: QUERY_KEYS.FLEET_VEHICLE_OUTLIERS,
    label: "Vehicle Outliers in Fleet",
    description: "Top 5 vehicles by distance and idle time in a fleet group",
    fallbackFile: "ace-fleet-vehicle-outliers.json",
    buildQuestion: (opts?: QueryBuildOptions) => {
      const group = opts?.groupName ?? "all vehicles";
      const days = opts?.daysBack ?? 7;
      return (
        `What are the top 5 vehicles by total distance in ${group} in the last ${days} days? ` +
        "Return columns: device_name, total_distance_km, trip_count, avg_idle_pct. " +
        "Sort by total_distance_km descending. Use UTC timezone."
      );
    },
  },
  {
    key: QUERY_KEYS.FLEET_STOP_HOTSPOTS,
    label: "Stop Hotspots in Fleet",
    description: "Most visited stop locations for a fleet group",
    fallbackFile: "ace-fleet-stop-hotspots.json",
    buildQuestion: (opts?: QueryBuildOptions) => {
      const group = opts?.groupName ?? "all vehicles";
      const days = opts?.daysBack ?? 30;
      return (
        `What are the top 10 most visited stop locations by vehicles in ${group} in the last ${days} days? ` +
        "Return columns: location_name, visit_count, avg_dwell_minutes, lat, lon. " +
        "Sort by visit_count descending. Use UTC timezone."
      );
    },
  },
  {
    key: QUERY_KEYS.FLEET_ROUTE_PATTERNS,
    label: "Route Patterns in Fleet",
    description: "Most common origin-destination pairs for a fleet group",
    fallbackFile: "ace-fleet-route-patterns.json",
    buildQuestion: (opts?: QueryBuildOptions) => {
      const group = opts?.groupName ?? "all vehicles";
      const days = opts?.daysBack ?? 14;
      return (
        `What are the top 5 most common origin-destination pairs for vehicles in ${group} in the last ${days} days? ` +
        "Return columns: origin, destination, trip_count, avg_distance_km, avg_duration_minutes. " +
        "Sort by trip_count descending. Use UTC timezone."
      );
    },
  },
];

// ─── Public builders ──────────────────────────────────────────────────────────

/**
 * Build a natural-language question string for a given query key.
 * Throws if the key is unknown or required options are missing.
 */
export function buildAceQuestion(
  queryKey: string,
  opts?: QueryBuildOptions
): string {
  const template = QUERY_TEMPLATES.find((t) => t.key === queryKey);
  if (!template) {
    throw new Error(
      `Unknown Ace query key: "${queryKey}". Valid keys: ${Object.values(QUERY_KEYS).join(", ")}`
    );
  }
  return template.buildQuestion(opts);
}

/**
 * Return the fallback filename for a given query key.
 */
export function getFallbackFile(queryKey: string): string {
  const template = QUERY_TEMPLATES.find((t) => t.key === queryKey);
  return template?.fallbackFile ?? "ace-custom.json";
}

/**
 * All predefined queries as an array of { key, label, description }.
 * Useful for rendering dashboard cards.
 */
export function listQueries(): Pick<
  QueryTemplate,
  "key" | "label" | "description"
>[] {
  return QUERY_TEMPLATES.map(({ key, label, description }) => ({
    key,
    label,
    description,
  }));
}

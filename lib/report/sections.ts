/**
 * Report section registry.
 *
 * Returns the set of available ReportSection objects for each page surface,
 * populated with the live data currently loaded on that page.
 */

import type {
  ReportSection,
  CompanyPulseSummary,
  AceInsight,
  FleetPulseDetail,
  TripSummary,
  LocationDossier,
} from "@/types";
import type { FleetTrendPoint } from "@/app/api/analytics/trends/route";

// ─── Company Pulse (/pulse) ──────────────────────────────────────────────────

export interface CompanyPulsePageData {
  summary: CompanyPulseSummary | null;
  aceInsight: AceInsight | null;
}

export function getCompanyPulseSections(data: CompanyPulsePageData): ReportSection[] {
  const sections: ReportSection[] = [];

  if (data.summary) {
    sections.push({
      id: "kpi-strip",
      type: "kpi-strip",
      label: "Fleet Headline Metrics",
      description: "Total vehicles, active vehicles, distance today, and trip count",
      enabled: true,
      data: {
        totalVehicles: data.summary.totals.vehicles,
        activeVehicles: data.summary.totals.activeVehicles,
        totalDistanceKm: data.summary.totals.distanceKm,
        totalTrips: data.summary.totals.trips,
        avgIdlePct: data.summary.totals.avgIdlePct,
        date: new Date().toLocaleDateString("en-CA"),
      },
    });

    sections.push({
      id: "fleet-cards",
      type: "fleet-cards",
      label: "Fleet Group Summary",
      description: "One card per fleet group showing vehicle count, distance, and trips",
      enabled: true,
      data: data.summary.fleets,
    });
  }

  if (data.aceInsight) {
    sections.push({
      id: "ace-distance-by-group",
      type: "ace-insight",
      label: "Ace Insight: Distance by Group",
      description: "AI-generated analysis of distance distribution across fleet groups",
      enabled: true,
      data: data.aceInsight,
    });
  }

  return sections;
}

// ─── Fleet Pulse (/pulse/[groupId]) ─────────────────────────────────────────

export interface FleetPulsePageData {
  detail: FleetPulseDetail | null;
  groupName: string;
  outlierInsight: AceInsight | null;
  routeInsight: AceInsight | null;
  hotspotInsight: AceInsight | null;
  topVehiclesInsight: AceInsight | null;
  idleByDayInsight: AceInsight | null;
  commonStopsInsight: AceInsight | null;
  tripDurationInsight: AceInsight | null;
  trends: FleetTrendPoint[];
}

export function getFleetPulseSections(data: FleetPulsePageData): ReportSection[] {
  const sections: ReportSection[] = [];

  if (data.detail) {
    const activeVehicles = data.detail.vehicles.filter((v) => v.status === "active").length;
    const totalDistanceKm = data.detail.vehicles.reduce((sum, v) => sum + (v.distanceTodayKm ?? 0), 0);
    const totalTrips = data.detail.vehicles.reduce((sum, v) => sum + (v.tripCountToday ?? 0), 0);

    sections.push({
      id: "kpi-strip",
      type: "kpi-strip",
      label: "Fleet KPI Strip",
      description: `Key metrics for ${data.groupName}: vehicles, distance, trips, status`,
      enabled: true,
      data: {
        groupName: data.detail.group.name,
        totalVehicles: data.detail.vehicles.length,
        activeVehicles,
        totalDistanceKm: totalDistanceKm.toFixed(1),
        totalTrips,
      },
    });

    sections.push({
      id: "vehicle-table",
      type: "vehicle-table",
      label: "Vehicle Activity Table",
      description: "Per-vehicle breakdown: name, status, distance today, trips today",
      enabled: true,
      // Flatten VehicleActivity into a plain shape for the PDF renderer
      data: data.detail.vehicles.map((v) => ({
        name: v.vehicle.name,
        isActive: v.status === "active",
        distanceKm: v.distanceTodayKm ?? 0,
        trips: v.tripCountToday ?? 0,
      })),
    });
  }

  if (data.trends.length > 0) {
    sections.push({
      id: "trend-chart",
      type: "trend-chart",
      label: "Distance Trend",
      description: "Daily distance trend for this fleet group over the past period",
      enabled: true,
      data: data.trends,
    });
  }

  const aceMap: Array<[AceInsight | null, string, string, string]> = [
    [data.outlierInsight,     "ace-outliers",      "Ace Insight: Vehicle Outliers",      "Vehicles with unusual activity patterns"],
    [data.routeInsight,       "ace-routes",        "Ace Insight: Route Patterns",        "Common corridors and route behaviour"],
    [data.hotspotInsight,     "ace-hotspots",      "Ace Insight: Stop Hotspots",         "Frequently visited locations and dwell times"],
    [data.topVehiclesInsight, "ace-top-vehicles",  "Ace Insight: Top Vehicles",          "Highest-mileage vehicles this period"],
    [data.idleByDayInsight,   "ace-idle-by-day",   "Ace Insight: Idle Time by Day",      "Idle time distribution across weekdays"],
    [data.commonStopsInsight, "ace-common-stops",  "Ace Insight: Common Stops",          "Most visited stops and average dwell"],
    [data.tripDurationInsight,"ace-trip-duration", "Ace Insight: Trip Duration Profile", "Breakdown of trip durations for this fleet"],
  ];

  for (const [insight, id, label, description] of aceMap) {
    if (insight) {
      sections.push({ id, type: "ace-insight", label, description, enabled: true, data: insight });
    }
  }

  return sections;
}

// ─── Dashboard (/dashboard) ──────────────────────────────────────────────────

export interface DashboardPageData {
  deviceName: string;
  trips: TripSummary[];
  selectedTrip: TripSummary | null;
  dossier: LocationDossier | null;
}

export function getDashboardSections(data: DashboardPageData): ReportSection[] {
  const sections: ReportSection[] = [];

  if (data.selectedTrip) {
    sections.push({
      id: "trip-stats",
      type: "trip-stats",
      label: "Selected Trip Stats",
      description: `Distance, duration, speed, and idle time for the selected trip`,
      enabled: true,
      data: data.selectedTrip,
    });
  }

  if (data.trips.length > 0) {
    sections.push({
      id: "trip-list",
      type: "trip-list",
      label: "Recent Trips",
      description: `${data.trips.length} most recent trips for ${data.deviceName}`,
      enabled: true,
      data: data.trips.slice(0, 20),
    });
  }

  if (data.dossier) {
    sections.push({
      id: "location-dossier",
      type: "location-dossier",
      label: "Location Dossier",
      description: `Area briefing for ${data.dossier.placeName ?? "selected location"}`,
      enabled: true,
      data: data.dossier,
    });
  }

  return sections;
}

// ─── Story (/story/[tripId]) ─────────────────────────────────────────────────

export interface StoryPageData {
  trip: TripSummary | null;
  deviceName: string;
}

export function getStorySections(data: StoryPageData): ReportSection[] {
  const sections: ReportSection[] = [];

  if (data.trip) {
    sections.push({
      id: "trip-stats",
      type: "trip-stats",
      label: "Trip Overview",
      description: `Distance, duration, speed profile for ${data.deviceName}`,
      enabled: true,
      data: data.trip,
    });

    sections.push({
      id: "narrative",
      type: "narrative",
      label: "Trip Narrative",
      description: "AI-generated story narrative for this trip",
      enabled: true,
      data: {
        title: `Trip Debrief — ${data.deviceName}`,
        text: `Trip recorded on ${new Date(data.trip.start).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}. Distance: ${(data.trip.distanceMeters / 1000).toFixed(1)} km. Duration: ${data.trip.drivingDuration}.`,
      },
    });
  }

  return sections;
}

/**
 * lib/vehicle/analytics.ts
 *
 * Pure, client-safe functions that derive vehicle-specific intelligence
 * from an array of TripSummary records — no API calls, no side effects.
 *
 * All functions accept TripSummary[] and return typed result objects
 * ready to be consumed by the four vehicle intelligence card components.
 */

import type { TripSummary } from "@/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Parse "HH:MM:SS" → total minutes */
function durationToMinutes(hhmmss: string): number {
  const parts = hhmmss.split(":").map(Number);
  if (parts.length === 3) return (parts[0] ?? 0) * 60 + (parts[1] ?? 0) + (parts[2] ?? 0) / 60;
  if (parts.length === 2) return (parts[0] ?? 0) * 60 + (parts[1] ?? 0);
  return 0;
}

/** Haversine distance in km between two lat/lon points */
function haversineKm(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** z-score: how many std-devs from the mean */
function zScore(value: number, mean: number, stdDev: number): number {
  if (stdDev < 0.001) return 0;
  return (value - mean) / stdDev;
}

function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function stdDev(arr: number[], mu?: number): number {
  if (arr.length < 2) return 0;
  const m = mu ?? mean(arr);
  const variance = arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length;
  return Math.sqrt(variance);
}

/** Cluster an array of (lat,lon) points within radiusKm — returns cluster centroids */
function clusterPoints(
  points: Array<{ lat: number; lon: number; label?: string }>,
  radiusKm = 1.5
): Array<{ lat: number; lon: number; count: number; labels: string[] }> {
  const clusters: Array<{ lat: number; lon: number; count: number; labels: string[]; sumLat: number; sumLon: number }> = [];

  for (const pt of points) {
    let found = false;
    for (const cluster of clusters) {
      if (haversineKm(pt.lat, pt.lon, cluster.lat, cluster.lon) <= radiusKm) {
        cluster.count++;
        cluster.sumLat += pt.lat;
        cluster.sumLon += pt.lon;
        cluster.lat = cluster.sumLat / cluster.count;
        cluster.lon = cluster.sumLon / cluster.count;
        if (pt.label) cluster.labels.push(pt.label);
        found = true;
        break;
      }
    }
    if (!found) {
      clusters.push({
        lat: pt.lat, lon: pt.lon, count: 1,
        sumLat: pt.lat, sumLon: pt.lon,
        labels: pt.label ? [pt.label] : [],
      });
    }
  }

  return clusters.map(({ lat, lon, count, labels }) => ({ lat, lon, count, labels }));
}

// ─── Trip Profile ─────────────────────────────────────────────────────────────

export interface TripProfileResult {
  totalTrips: number;
  totalDistanceKm: number;
  avgDistanceKm: number;
  medianDistanceKm: number;
  totalDrivingMinutes: number;
  avgDrivingMinutes: number;
  totalIdlingMinutes: number;
  avgIdleRatioPct: number;
  /** Last 10 trips for mini bar chart: { label, km, idleMin } */
  recentTrips: Array<{ label: string; km: number; drivingMin: number; idleMin: number; date: string }>;
  /** Distance by day-of-week for expanded view */
  byDayOfWeek: Array<{ day: string; avgKm: number; tripCount: number }>;
  /** Daily totals for trend line */
  dailyDistance: Array<{ date: string; km: number; trips: number }>;
}

export function computeTripProfile(trips: TripSummary[]): TripProfileResult {
  if (trips.length === 0) {
    return {
      totalTrips: 0, totalDistanceKm: 0, avgDistanceKm: 0, medianDistanceKm: 0,
      totalDrivingMinutes: 0, avgDrivingMinutes: 0, totalIdlingMinutes: 0,
      avgIdleRatioPct: 0, recentTrips: [], byDayOfWeek: [], dailyDistance: [],
    };
  }

  const distances = trips.map((t) => (t.distanceKm ?? t.distanceMeters / 1000));
  const drivingMins = trips.map((t) => durationToMinutes(t.drivingDuration));
  const idlingMins  = trips.map((t) => durationToMinutes(t.idlingDuration));

  const totalDistanceKm = distances.reduce((s, v) => s + v, 0);
  const totalDrivingMinutes = drivingMins.reduce((s, v) => s + v, 0);
  const totalIdlingMinutes  = idlingMins.reduce((s, v) => s + v, 0);

  const sorted = [...distances].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const medianDistanceKm = sorted.length % 2 === 0
    ? ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2
    : (sorted[mid] ?? 0);

  const idleRatios = trips.map((t, i) => {
    const total = (drivingMins[i] ?? 0) + (idlingMins[i] ?? 0);
    return total > 0 ? ((idlingMins[i] ?? 0) / total) * 100 : 0;
  });

  // Recent trips (up to 10, most recent first)
  const recent = [...trips].sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime()).slice(0, 10);
  const recentTrips = recent.map((t, i) => ({
    label: `T${i + 1}`,
    km: Math.round((t.distanceKm ?? t.distanceMeters / 1000) * 10) / 10,
    drivingMin: Math.round(durationToMinutes(t.drivingDuration)),
    idleMin: Math.round(durationToMinutes(t.idlingDuration)),
    date: t.start.slice(0, 10),
  }));

  // By day of week
  const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const byDay: Record<number, { sumKm: number; count: number }> = {};
  for (const t of trips) {
    const dow = new Date(t.start).getDay();
    const km = t.distanceKm ?? t.distanceMeters / 1000;
    if (!byDay[dow]) byDay[dow] = { sumKm: 0, count: 0 };
    byDay[dow]!.sumKm += km;
    byDay[dow]!.count++;
  }
  const byDayOfWeek = DAY_NAMES.map((day, i) => ({
    day,
    avgKm: byDay[i] ? Math.round((byDay[i]!.sumKm / byDay[i]!.count) * 10) / 10 : 0,
    tripCount: byDay[i]?.count ?? 0,
  }));

  // Daily totals
  const dailyMap: Record<string, { km: number; trips: number }> = {};
  for (const t of trips) {
    const date = t.start.slice(0, 10);
    const km = t.distanceKm ?? t.distanceMeters / 1000;
    if (!dailyMap[date]) dailyMap[date] = { km: 0, trips: 0 };
    dailyMap[date]!.km += km;
    dailyMap[date]!.trips++;
  }
  const dailyDistance = Object.entries(dailyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date: date.slice(5), km: Math.round(v.km * 10) / 10, trips: v.trips }));

  return {
    totalTrips: trips.length,
    totalDistanceKm: Math.round(totalDistanceKm * 10) / 10,
    avgDistanceKm: Math.round((totalDistanceKm / trips.length) * 10) / 10,
    medianDistanceKm: Math.round(medianDistanceKm * 10) / 10,
    totalDrivingMinutes: Math.round(totalDrivingMinutes),
    avgDrivingMinutes: Math.round(totalDrivingMinutes / trips.length),
    totalIdlingMinutes: Math.round(totalIdlingMinutes),
    avgIdleRatioPct: Math.round(mean(idleRatios) * 10) / 10,
    recentTrips,
    byDayOfWeek,
    dailyDistance,
  };
}

// ─── Route Fingerprint ────────────────────────────────────────────────────────

export interface ODPair {
  originLabel: string;
  destinationLabel: string;
  originLat: number;
  originLon: number;
  destLat: number;
  destLon: number;
  tripCount: number;
  avgDistanceKm: number;
  avgDrivingMinutes: number;
  shareOfTrips: number; // 0–1
}

export interface RouteFingerprintResult {
  topPairs: ODPair[];
  uniqueOrigins: number;
  uniqueDestinations: number;
  coveragePct: number; // how much of trips are explained by topPairs
  /** Destination clusters for expanded view */
  destinationClusters: Array<{ lat: number; lon: number; count: number; labels: string[] }>;
  originClusters: Array<{ lat: number; lon: number; count: number; labels: string[] }>;
}

export function computeRouteFingerprint(trips: TripSummary[]): RouteFingerprintResult {
  if (trips.length === 0) {
    return {
      topPairs: [], uniqueOrigins: 0, uniqueDestinations: 0,
      coveragePct: 0, destinationClusters: [], originClusters: [],
    };
  }

  // Cluster origins and destinations separately
  const originPoints = trips.map((t) => ({ lat: t.startPoint.lat, lon: t.startPoint.lon }));
  const destPoints   = trips.map((t) => ({ lat: t.endPoint.lat,   lon: t.endPoint.lon   }));

  const originClusters = clusterPoints(originPoints);
  const destClusters   = clusterPoints(destPoints);

  // Assign each trip an origin cluster ID and dest cluster ID
  function findClusterIdx(
    clusters: Array<{ lat: number; lon: number }>,
    lat: number, lon: number
  ): number {
    let best = 0;
    let bestDist = Infinity;
    clusters.forEach((c, i) => {
      const d = haversineKm(lat, lon, c.lat, c.lon);
      if (d < bestDist) { bestDist = d; best = i; }
    });
    return best;
  }

  // Build OD pair map
  const pairMap: Record<string, {
    oIdx: number; dIdx: number;
    sumDist: number; sumMin: number; count: number;
  }> = {};

  for (const t of trips) {
    const oIdx = findClusterIdx(originClusters, t.startPoint.lat, t.startPoint.lon);
    const dIdx = findClusterIdx(destClusters,   t.endPoint.lat,   t.endPoint.lon);
    const key = `${oIdx}-${dIdx}`;
    const km = t.distanceKm ?? t.distanceMeters / 1000;
    const min = durationToMinutes(t.drivingDuration);
    if (!pairMap[key]) pairMap[key] = { oIdx, dIdx, sumDist: 0, sumMin: 0, count: 0 };
    pairMap[key]!.sumDist += km;
    pairMap[key]!.sumMin  += min;
    pairMap[key]!.count++;
  }

  const topPairsRaw = Object.values(pairMap).sort((a, b) => b.count - a.count).slice(0, 5);

  const topPairs: ODPair[] = topPairsRaw.map((p) => {
    const oc = originClusters[p.oIdx]!;
    const dc = destClusters[p.dIdx]!;
    // Generate a human-readable label from lat/lon
    const originLabel = `Origin ${p.oIdx + 1}`;
    const destLabel   = `Dest ${p.dIdx + 1}`;
    return {
      originLabel,
      destinationLabel: destLabel,
      originLat: oc.lat,
      originLon: oc.lon,
      destLat: dc.lat,
      destLon: dc.lon,
      tripCount: p.count,
      avgDistanceKm: Math.round((p.sumDist / p.count) * 10) / 10,
      avgDrivingMinutes: Math.round(p.sumMin / p.count),
      shareOfTrips: p.count / trips.length,
    };
  });

  const coveredTrips = topPairs.reduce((s, p) => s + p.tripCount, 0);

  return {
    topPairs,
    uniqueOrigins: originClusters.length,
    uniqueDestinations: destClusters.length,
    coveragePct: Math.round((coveredTrips / trips.length) * 100),
    destinationClusters: destClusters,
    originClusters,
  };
}

// ─── Driving Behavior ─────────────────────────────────────────────────────────

export interface DrivingBehaviorResult {
  avgSpeedKmh: number;
  maxSpeedKmh: number;
  /** Percentage of total time spent idling */
  fleetIdleRatioPct: number;
  /** Trips exceeding this speed threshold */
  highSpeedTripCount: number;
  highSpeedThreshold: number;
  /** Hourly departure distribution (0–23) */
  departureByHour: Array<{ hour: number; label: string; count: number }>;
  /** Per-trip behavior for expanded sparklines */
  perTrip: Array<{
    idx: number;
    date: string;
    avgSpeed: number;
    maxSpeed: number;
    idlePct: number;
    km: number;
  }>;
  /** Speed distribution buckets */
  speedBuckets: Array<{ range: string; count: number }>;
}

export function computeDrivingBehavior(trips: TripSummary[]): DrivingBehaviorResult {
  if (trips.length === 0) {
    return {
      avgSpeedKmh: 0, maxSpeedKmh: 0, fleetIdleRatioPct: 0,
      highSpeedTripCount: 0, highSpeedThreshold: 100,
      departureByHour: [], perTrip: [], speedBuckets: [],
    };
  }

  const avgSpeeds = trips.map((t) => t.averageSpeedKmh);
  const maxSpeeds = trips.map((t) => t.maxSpeedKmh);
  const drivingMins = trips.map((t) => durationToMinutes(t.drivingDuration));
  const idlingMins  = trips.map((t) => durationToMinutes(t.idlingDuration));

  const totalDriving = drivingMins.reduce((s, v) => s + v, 0);
  const totalIdling  = idlingMins.reduce((s, v) => s + v, 0);
  const totalTime    = totalDriving + totalIdling;

  const HIGH_SPEED = 100; // km/h

  // Departure by hour
  const hourCounts: Record<number, number> = {};
  for (const t of trips) {
    const h = new Date(t.start).getUTCHours();
    hourCounts[h] = (hourCounts[h] ?? 0) + 1;
  }
  const departureByHour = Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    label: h === 0 ? "12a" : h < 12 ? `${h}a` : h === 12 ? "12p" : `${h - 12}p`,
    count: hourCounts[h] ?? 0,
  }));

  // Per-trip
  const perTrip = [...trips]
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
    .map((t, i) => {
      const dMin = durationToMinutes(t.drivingDuration);
      const iMin = durationToMinutes(t.idlingDuration);
      const total = dMin + iMin;
      return {
        idx: i + 1,
        date: t.start.slice(5, 10),
        avgSpeed: t.averageSpeedKmh,
        maxSpeed: t.maxSpeedKmh,
        idlePct: total > 0 ? Math.round((iMin / total) * 100) : 0,
        km: Math.round((t.distanceKm ?? t.distanceMeters / 1000) * 10) / 10,
      };
    });

  // Speed distribution
  const BUCKETS = [
    { range: "0–30",   min: 0,   max: 30   },
    { range: "30–60",  min: 30,  max: 60   },
    { range: "60–80",  min: 60,  max: 80   },
    { range: "80–100", min: 80,  max: 100  },
    { range: "100+",   min: 100, max: Infinity },
  ];
  const speedBuckets = BUCKETS.map((b) => ({
    range: b.range,
    count: avgSpeeds.filter((s) => s >= b.min && s < b.max).length,
  }));

  return {
    avgSpeedKmh: Math.round(mean(avgSpeeds) * 10) / 10,
    maxSpeedKmh: Math.round(Math.max(...maxSpeeds) * 10) / 10,
    fleetIdleRatioPct: totalTime > 0 ? Math.round((totalIdling / totalTime) * 1000) / 10 : 0,
    highSpeedTripCount: maxSpeeds.filter((s) => s > HIGH_SPEED).length,
    highSpeedThreshold: HIGH_SPEED,
    departureByHour,
    perTrip,
    speedBuckets,
  };
}

// ─── Trip Anomalies ───────────────────────────────────────────────────────────

export type AnomalyReason =
  | "unusually_long"
  | "unusually_short"
  | "high_idle"
  | "high_speed"
  | "late_departure"
  | "early_departure"
  | "low_speed";

export interface TripAnomaly {
  tripId: string;
  deviceName: string;
  date: string;
  startTime: string;
  km: number;
  drivingMin: number;
  idlePct: number;
  avgSpeedKmh: number;
  reasons: AnomalyReason[];
  /** Human readable summary */
  summary: string;
  severity: "low" | "medium" | "high";
  /** z-scores for expanded view */
  zScores: { distance: number; idle: number; speed: number; duration: number };
}

export interface TripAnomalyResult {
  anomalies: TripAnomaly[];
  totalFlagged: number;
  normalTripCount: number;
  /** For sparkline — z-score per trip */
  deviations: Array<{ idx: number; date: string; z: number; km: number }>;
}

export function detectTripAnomalies(trips: TripSummary[]): TripAnomalyResult {
  if (trips.length < 3) {
    return { anomalies: [], totalFlagged: 0, normalTripCount: trips.length, deviations: [] };
  }

  const distances    = trips.map((t) => t.distanceKm ?? t.distanceMeters / 1000);
  const drivingMins  = trips.map((t) => durationToMinutes(t.drivingDuration));
  const idlingMins   = trips.map((t) => durationToMinutes(t.idlingDuration));
  const avgSpeeds    = trips.map((t) => t.averageSpeedKmh);

  const idleRatios = trips.map((_, i) => {
    const total = (drivingMins[i] ?? 0) + (idlingMins[i] ?? 0);
    return total > 0 ? (idlingMins[i] ?? 0) / total : 0;
  });

  const meanDist = mean(distances);
  const sdDist   = stdDev(distances, meanDist);
  const meanMin  = mean(drivingMins);
  const sdMin    = stdDev(drivingMins, meanMin);
  const meanIdle = mean(idleRatios);
  const sdIdle   = stdDev(idleRatios, meanIdle);
  const meanSpeed = mean(avgSpeeds);
  const sdSpeed   = stdDev(avgSpeeds, meanSpeed);

  // Departure hour stats
  const hours   = trips.map((t) => new Date(t.start).getUTCHours());
  const meanHour = mean(hours);
  const sdHour   = stdDev(hours, meanHour);

  const anomalies: TripAnomaly[] = [];

  trips.forEach((t, i) => {
    const km   = distances[i] ?? 0;
    const dMin = drivingMins[i] ?? 0;
    const iRat = idleRatios[i] ?? 0;
    const spd  = avgSpeeds[i] ?? 0;
    const hour = hours[i] ?? 0;

    const zDist  = zScore(km,   meanDist,  sdDist);
    const zDur   = zScore(dMin, meanMin,   sdMin);
    const zIdle  = zScore(iRat, meanIdle,  sdIdle);
    const zSpd   = zScore(spd,  meanSpeed, sdSpeed);
    const zHour  = zScore(hour, meanHour,  sdHour);

    const THRESHOLD = 2.0;
    const reasons: AnomalyReason[] = [];

    if (zDist >  THRESHOLD) reasons.push("unusually_long");
    if (zDist < -THRESHOLD) reasons.push("unusually_short");
    if (zIdle >  THRESHOLD) reasons.push("high_idle");
    if (zSpd  >  THRESHOLD) reasons.push("high_speed");
    if (zSpd  < -THRESHOLD) reasons.push("low_speed");
    if (zHour >  THRESHOLD) reasons.push("late_departure");
    if (zHour < -THRESHOLD) reasons.push("early_departure");

    if (reasons.length === 0) return;

    const maxZ = Math.max(Math.abs(zDist), Math.abs(zIdle), Math.abs(zSpd), Math.abs(zHour), Math.abs(zDur));
    const severity: TripAnomaly["severity"] = maxZ > 3.5 ? "high" : maxZ > 2.5 ? "medium" : "low";

    const REASON_LABELS: Record<AnomalyReason, string> = {
      unusually_long:   "unusually long trip",
      unusually_short:  "unusually short trip",
      high_idle:        "high idle time",
      high_speed:       "high speed recorded",
      late_departure:   "late departure",
      early_departure:  "early departure",
      low_speed:        "low average speed",
    };
    const summary = reasons.map((r) => REASON_LABELS[r]).join(" · ");

    const total = dMin + (idlingMins[i] ?? 0);
    anomalies.push({
      tripId: t.id,
      deviceName: t.deviceName,
      date: t.start.slice(0, 10),
      startTime: t.start.slice(11, 16),
      km: Math.round(km * 10) / 10,
      drivingMin: Math.round(dMin),
      idlePct: Math.round(iRat * 100),
      avgSpeedKmh: Math.round(spd * 10) / 10,
      reasons,
      summary,
      severity,
      zScores: {
        distance: Math.round(zDist * 10) / 10,
        idle:     Math.round(zIdle * 10) / 10,
        speed:    Math.round(zSpd  * 10) / 10,
        duration: Math.round(zDur  * 10) / 10,
      },
    });
  });

  // Sort by severity then date
  const severityOrder = { high: 0, medium: 1, low: 2 };
  anomalies.sort((a, b) => {
    const sd = severityOrder[a.severity] - severityOrder[b.severity];
    if (sd !== 0) return sd;
    return b.date.localeCompare(a.date);
  });

  // Deviations sparkline — composite z-score per trip
  const sorted = [...trips].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  const deviations = sorted.map((t, i) => {
    const idx = trips.indexOf(t);
    const z = Math.abs(zScore(distances[idx] ?? 0, meanDist, sdDist));
    return {
      idx: i + 1,
      date: t.start.slice(5, 10),
      z: Math.round(z * 10) / 10,
      km: Math.round((distances[idx] ?? 0) * 10) / 10,
    };
  });

  return {
    anomalies: anomalies.slice(0, 10),
    totalFlagged: anomalies.length,
    normalTripCount: trips.length - anomalies.length,
    deviations,
  };
}

/**
 * lib/geotab/normalize.ts
 *
 * Converts raw Geotab API shapes into the clean UI types used across the app.
 * Geotab coordinate convention: x = longitude, y = latitude.
 */

import type {
  GeotabDevice,
  GeotabGroup,
  GeotabTrip,
  GeotabLogRecord,
  GeotabDeviceStatusInfo,
  VehicleCard,
  FleetGroup,
  TripSummary,
  BreadcrumbPoint,
  DeviceStatusInfo,
} from "@/types";

// ─── Duration helpers ─────────────────────────────────────────────────────────

/**
 * Convert a Geotab duration string like "00:01:23.0000000" to "HH:MM:SS".
 * Falls back to "00:00:00" for missing/malformed values.
 */
function normalizeDuration(raw?: string): string {
  if (!raw) return "00:00:00";
  // Strip sub-seconds (Geotab format: "HH:MM:SS.fffffff")
  const parts = raw.split(".");
  return parts[0] ?? "00:00:00";
}

// ─── Device normalizer ────────────────────────────────────────────────────────

export function normalizeDevice(device: GeotabDevice): VehicleCard {
  return {
    id: device.id,
    name: device.name,
    deviceType: device.deviceType,
    // activeTo is the last communication timestamp in some contexts
    lastCommunication: device.activeTo,
  };
}

// ─── Trip normalizer ──────────────────────────────────────────────────────────

export function normalizeTrip(
  trip: GeotabTrip,
  deviceName = "Unknown Vehicle"
): TripSummary {
  const distanceMeters = trip.distance ?? 0;

  return {
    id: trip.id,
    deviceId: trip.device.id,
    deviceName,
    start: trip.start,
    stop: trip.stop,
    distanceMeters,
    distanceKm: Math.round((distanceMeters / 1000) * 100) / 100, // 2 dp
    drivingDuration: normalizeDuration(trip.drivingDuration),
    idlingDuration: normalizeDuration(trip.idlingDuration),
    averageSpeedKmh: trip.averageSpeed ?? 0,
    maxSpeedKmh: trip.maximumSpeed ?? 0,
    // Geotab: x = lon, y = lat
    startPoint: { lat: trip.startPoint.y, lon: trip.startPoint.x },
    endPoint: { lat: trip.stopPoint.y, lon: trip.stopPoint.x },
  };
}

// ─── LogRecord normalizer ─────────────────────────────────────────────────────

export function normalizeLogRecord(record: GeotabLogRecord): BreadcrumbPoint {
  return {
    dateTime: record.dateTime,
    lat: record.latitude,
    lon: record.longitude,
    speedKmh: record.speed,
    heading: record.heading,
  };
}

// ─── Batch helpers ────────────────────────────────────────────────────────────

/** Build a device-id → device-name lookup map from a raw device list. */
export function buildDeviceNameMap(
  devices: GeotabDevice[]
): Map<string, string> {
  return new Map(devices.map((d) => [d.id, d.name]));
}

// ─── DeviceStatusInfo normalizer ──────────────────────────────────────────────

export function normalizeDeviceStatus(
  status: GeotabDeviceStatusInfo
): DeviceStatusInfo {
  return {
    deviceId: status.device.id,
    dateTime: status.dateTime,
    position: { lat: status.latitude, lon: status.longitude },
    speedKmh: status.speed,
    isOnline: status.isDeviceCommunicating,
  };
}

// ─── Group normalizer ─────────────────────────────────────────────────────────

/** Convert a Geotab ARGB color to a CSS hex string. */
function argbToHex(c: { a: number; r: number; g: number; b: number }): string {
  return (
    "#" +
    [c.r, c.g, c.b]
      .map((v) => v.toString(16).padStart(2, "0"))
      .join("")
  );
}

export function normalizeGroup(
  group: GeotabGroup,
  vehicleCount: number
): FleetGroup {
  return {
    id: group.id,
    name: group.name,
    parentId: group.parent?.id,
    vehicleCount,
    color: group.color ? argbToHex(group.color) : undefined,
  };
}

// ─── Breadcrumb decimation ────────────────────────────────────────────────────

/**
 * Thin a breadcrumb array to at most `maxPoints` evenly spaced points.
 * Keeps the first and last point to preserve start/end accuracy.
 */
export function decimateBreadcrumbs(
  points: BreadcrumbPoint[],
  maxPoints: number
): BreadcrumbPoint[] {
  if (points.length <= maxPoints) return points;

  const step = (points.length - 1) / (maxPoints - 1);
  const result: BreadcrumbPoint[] = [];

  for (let i = 0; i < maxPoints; i++) {
    const index = Math.round(i * step);
    result.push(points[index]);
  }

  return result;
}

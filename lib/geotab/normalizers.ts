/**
 * lib/geotab/normalizers.ts
 *
 * Pure functions that convert raw Geotab API responses into
 * the stable app-facing types defined in types/index.ts.
 *
 * Coordinate note: Geotab uses x = longitude, y = latitude.
 * We always output LatLon { lat, lon } — never expose x/y downstream.
 *
 * Unit note:
 *   – distance: Geotab returns meters; we add a distanceKm field.
 *   – speed: Geotab returns km/h; no conversion needed.
 *   – durations: Geotab returns "HH:MM:SS" strings; passed through as-is.
 */

import type {
  GeotabDevice,
  GeotabTrip,
  GeotabLogRecord,
  GeotabDeviceStatusInfo,
  TripSummary,
  BreadcrumbPoint,
  VehicleCard,
  DeviceStatusInfo,
  LatLon,
} from "@/types";

// ─── DeviceStatusInfo lookup map ──────────────────────────────────────────────

// Build a lookup from deviceId → status so normalizeDevice can
// attach live position without an extra API call in the route handler.
type StatusMap = Map<string, GeotabDeviceStatusInfo>;

export function buildStatusMap(
  statuses: GeotabDeviceStatusInfo[]
): StatusMap {
  const map: StatusMap = new Map();
  for (const s of statuses) {
    map.set(s.device.id, s);
  }
  return map;
}

// ─── Device → VehicleCard ────────────────────────────────────────────────────

export function normalizeDevice(
  device: GeotabDevice,
  statusMap?: StatusMap
): VehicleCard {
  const status = statusMap?.get(device.id);

  const currentPosition: LatLon | undefined =
    status && status.latitude != null && status.longitude != null
      ? { lat: status.latitude, lon: status.longitude }
      : undefined;

  return {
    id: device.id,
    name: device.name,
    deviceType: device.deviceType,
    lastCommunication: status?.dateTime ?? device.activeTo,
    currentPosition,
  };
}

export function normalizeDevices(
  devices: GeotabDevice[],
  statuses?: GeotabDeviceStatusInfo[]
): VehicleCard[] {
  const statusMap = statuses ? buildStatusMap(statuses) : undefined;
  return devices.map((d) => normalizeDevice(d, statusMap));
}

// ─── Trip → TripSummary ──────────────────────────────────────────────────────

export function normalizeTrip(
  trip: GeotabTrip,
  deviceName?: string
): TripSummary {
  const distanceMeters = trip.distance ?? 0;
  return {
    id: trip.id,
    deviceId: trip.device.id,
    deviceName: deviceName ?? trip.device.id,
    start: trip.start,
    stop: trip.stop,
    distanceMeters,
    distanceKm: Math.round((distanceMeters / 1000) * 100) / 100,
    drivingDuration: trip.drivingDuration ?? "00:00:00",
    idlingDuration: trip.idlingDuration ?? "00:00:00",
    averageSpeedKmh: trip.averageSpeed ?? 0,
    maxSpeedKmh: trip.maximumSpeed ?? 0,
    // Geotab: x = longitude, y = latitude
    startPoint: { lat: trip.startPoint.y, lon: trip.startPoint.x },
    endPoint: { lat: trip.stopPoint.y, lon: trip.stopPoint.x },
  };
}

export function normalizeTrips(
  trips: GeotabTrip[],
  deviceName?: string
): TripSummary[] {
  return trips.map((t) => normalizeTrip(t, deviceName));
}

// ─── LogRecord → BreadcrumbPoint ─────────────────────────────────────────────

export function normalizeLogRecord(record: GeotabLogRecord): BreadcrumbPoint {
  return {
    dateTime: record.dateTime,
    lat: record.latitude,
    lon: record.longitude,
    speedKmh: record.speed,
    heading: record.heading,
  };
}

/**
 * Normalizes and optionally decimates breadcrumbs.
 * Large LogRecord sets (>2,000 pts) are thinned to avoid
 * sending massive payloads to the frontend map renderer.
 *
 * @param records   Raw Geotab LogRecord array
 * @param maxPoints Max points to return (0 = no limit)
 */
export function normalizeLogRecords(
  records: GeotabLogRecord[],
  maxPoints = 1500
): BreadcrumbPoint[] {
  const sorted = [...records].sort(
    (a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime()
  );

  if (maxPoints > 0 && sorted.length > maxPoints) {
    const step = Math.ceil(sorted.length / maxPoints);
    const decimated: GeotabLogRecord[] = [];
    for (let i = 0; i < sorted.length; i += step) {
      decimated.push(sorted[i]);
    }
    // Always include the last point
    if (decimated[decimated.length - 1] !== sorted[sorted.length - 1]) {
      decimated.push(sorted[sorted.length - 1]);
    }
    return decimated.map(normalizeLogRecord);
  }

  return sorted.map(normalizeLogRecord);
}

// ─── DeviceStatusInfo → DeviceStatusInfo (normalised) ───────────────────────

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

export function normalizeDeviceStatuses(
  statuses: GeotabDeviceStatusInfo[]
): DeviceStatusInfo[] {
  return statuses.map(normalizeDeviceStatus);
}

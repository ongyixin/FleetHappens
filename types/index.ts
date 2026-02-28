// ─── Shared primitives ─────────────────────────────────────────────────────

export interface LatLon {
  lat: number;
  lon: number;
}

// ─── Geotab API credentials ────────────────────────────────────────────────

export interface GeotabCredentials {
  server: string;
  database: string;
  userName: string;
  sessionId: string;
}

// ─── Raw Geotab API shapes (server-side only) ──────────────────────────────

export interface GeotabDevice {
  id: string;
  name: string;
  serialNumber?: string;
  vehicleIdentificationNumber?: string;
  comment?: string;
  deviceType?: string;
  activeFrom?: string;
  activeTo?: string;
  groups?: Array<{ id: string }>;
}

export interface GeotabStopPoint {
  x: number; // longitude
  y: number; // latitude
}

export interface GeotabTrip {
  id: string;
  device: { id: string };
  start: string;
  stop: string;
  distance: number; // meters
  drivingDuration: string;
  idlingDuration: string;
  averageSpeed: number; // km/h
  maximumSpeed: number; // km/h
  startPoint: GeotabStopPoint;
  stopPoint: GeotabStopPoint;
}

export interface GeotabLogRecord {
  id: string;
  dateTime: string;
  latitude: number;
  longitude: number;
  speed: number; // km/h
  heading?: number;
  device: { id: string };
}

export interface GeotabDeviceStatusInfo {
  device: { id: string };
  dateTime: string;
  latitude: number;
  longitude: number;
  speed: number;
  isDeviceCommunicating: boolean;
}

// ─── Normalised client-facing types ───────────────────────────────────────

/** Vehicle summary shown in the selector and left-panel header */
export interface VehicleCard {
  id: string;
  name: string;
  deviceType?: string;
  lastCommunication?: string;
  currentPosition?: LatLon;
}

/** Normalised trip summary — what the frontend uses */
export interface TripSummary {
  id: string;
  deviceId: string;
  deviceName: string;
  start: string; // ISO 8601 UTC
  stop: string;
  distanceMeters: number;
  distanceKm?: number; // convenience; distanceMeters / 1000
  drivingDuration: string; // "HH:MM:SS"
  idlingDuration: string;
  averageSpeedKmh: number;
  maxSpeedKmh: number;
  startPoint: LatLon;
  endPoint: LatLon;
  stopPoints?: StopPoint[];
}

/** A stop along a trip with optional dwell time */
export interface StopPoint {
  lat: number;
  lon: number;
  dwellSeconds?: number;
}

/** Normalised GPS breadcrumb point */
export interface BreadcrumbPoint {
  dateTime: string;
  lat: number;
  lon: number;
  speedKmh: number;
  heading?: number;
}

/** Raw GPS log record from Geotab (normalised from GeotabLogRecord). */
export interface LogRecord {
  id: string;
  dateTime: string;
  device: { id: string };
  latitude: number;
  longitude: number;
  speed: number; // km/h
  heading?: number;
}

/** Normalised device status — used by lib/geotab/normalize.ts and /api/geotab/status. */
export interface DeviceStatusInfo {
  deviceId: string;
  dateTime: string;
  position: LatLon;
  speedKmh: number;
  isOnline: boolean;
}

/** Reverse geocoding result (from Google, Mapbox, or Nominatim). */
export interface GeocodeResult {
  placeName: string;
  neighborhood?: string;
  city?: string;
  country?: string;
  formattedAddress?: string;
  source: "google" | "mapbox" | "nominatim";
}

// ─── Ace API types ──────────────────────────────────────────────────────────

export interface AceInsight {
  id: string;
  question: string;
  columns: string[];
  rows: Record<string, string | number>[];
  /** Alias for rows — some backend helpers access this field */
  previewArray?: Record<string, string | number>[];
  reasoning?: string;
  queriedAt: string;
  totalRowCount?: number;
  downloadUrl?: string;
  fromCache?: boolean;
}

export interface AcePollResult {
  status: "DONE" | "IN_PROGRESS" | "ERROR" | "FAILED";
  previewArray?: Record<string, string | number>[];
  columns?: string[];
  reasoning?: string;
  totalRowCount?: number;
  downloadUrl?: string;
}

/** Alias used by lib/ace/poller.ts */
export type AceMessageGroupStatus = AcePollResult;

/** Request body accepted by POST /api/ace/query */
export interface AceQueryRequest {
  /** Raw natural-language question (use this OR queryKey). */
  question?: string;
  /** Key for a predefined query template (see QUERY_KEYS in lib/ace/queries.ts). */
  queryKey?: string;
  /** Required when queryKey is "stop-visit". */
  coordinates?: LatLon;
  /** Radius in km for stop-visit query (default 1.0). */
  radiusKm?: number;
  /** Days back for fleet-scoped and stop-visit queries (default varies by query). */
  daysBack?: number;
  /** Fleet group name — required for fleet-scoped Pulse queries. */
  groupName?: string;
}

// ─── Amenity types ─────────────────────────────────────────────────────────

export type AmenityCategory = "fuel" | "food" | "rest" | "parking" | "other";

/** Used by lib/maps/places.ts */
export interface Amenity {
  name: string;
  category: AmenityCategory;
  distanceMeters: number;
  address?: string;
}

/** Alias used by lib/context/amenities.ts and StopContextPanel */
export type NearbyAmenity = Amenity;

// ─── Context Briefing types ────────────────────────────────────────────────

export interface StopContext {
  id: string;
  tripId: string;
  coordinates: LatLon;
  placeName: string;
  neighborhood?: string;
  city?: string;
  areaBriefing: string; // LLM-generated 2-3 sentence description
  fleetVisitCount?: number; // from Ace
  fleetVisitSummary?: string; // e.g. "14 visits, mostly weekdays"
  nearbyAmenities: NearbyAmenity[];
  generatedAt: string;
  fromCache?: boolean;
}

// ─── Comic / Story types ───────────────────────────────────────────────────

export type ComicTone = "guidebook" | "playful" | "cinematic";
/** Alias kept for backwards compat with lib/llm/prompts.ts */
export type TripTone = ComicTone;

export type SceneType = "opening" | "journey" | "highlight" | "arrival";

// ─── Story panel image payload ────────────────────────────────────────────────
// Produced by the image-enrichment pipeline; attached to each panel after
// story generation. All three kinds are safe to render even when a previous
// step failed.

export type StoryPanelImage =
  | {
      kind: "place-photo";
      /** Public CDN URL (no API key embedded — resolved by following the redirect). */
      imageUrl: string;
      attribution?: string;
      source: "live" | "cache";
      placeName?: string;
    }
  | {
      kind: "map";
      source: "generated";
    }
  | {
      kind: "fallback";
      icon?: string;
      label?: string;
      source: "fallback";
    };

export interface ComicPanel {
  panelNumber: number;
  sceneType: SceneType;
  locationName: string;
  caption: string;
  speechBubble?: string;
  mapAnchor: LatLon;
  timeLabel?: string;
  distanceLabel?: string;
  speedLabel?: string;
  dwellLabel?: string;
  /** Populated by the image-enrichment step after story text is generated. */
  image?: StoryPanelImage;
}

export interface ComicStory {
  id: string;
  tripId: string;
  title: string;
  tone: ComicTone;
  panels: ComicPanel[];
  createdAt: string;
}

// ─── UI State types ────────────────────────────────────────────────────────

export interface SelectedStop {
  tripId: string;
  coordinates: LatLon;
  stopIndex: number;
  useInStory: boolean;
}

export interface DashboardState {
  selectedDeviceId: string | null;
  selectedTripId: string | null;
  selectedStop: SelectedStop | null;
}

// ─── API Response types ────────────────────────────────────────────────────

/** Success response from any API route */
export interface ApiSuccess<T> {
  ok: true;
  data: T;
  fromCache?: boolean;
  /** Actual lookback window used, in days (returned by trips route when auto-expanding) */
  dateRangeDays?: number | null;
}

/** Error response from any API route */
export interface ApiError {
  ok: false;
  error: string;
  code?: string;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// ─── Fallback data shapes ──────────────────────────────────────────────────

export interface FallbackDevices {
  devices: GeotabDevice[];
}

export interface FallbackTrips {
  trips: TripSummary[];
}

export interface FallbackLogs {
  records: BreadcrumbPoint[];
}

// ─── Raw Geotab Group shape (server-side only) ────────────────────────────────

export interface GeotabGroup {
  id: string;
  name: string;
  parent?: { id: string };
  color?: { a: number; r: number; g: number; b: number };
}

// ─── Fleet Pulse types ─────────────────────────────────────────────────────────

/** A normalised fleet group for use in Fleet Pulse views. */
export interface FleetGroup {
  id: string;
  name: string;
  parentId?: string;
  vehicleCount: number;
  /** Hex color derived from Geotab group color, e.g. "#ff8000" */
  color?: string;
}

/** KPI summary for a single fleet group, used in the company overview. */
export interface FleetSummary {
  group: FleetGroup;
  totalDistanceKm: number;
  totalTrips: number;
  activeVehicles: number;
  totalVehicles: number;
  avgIdlePct: number;
  /** The lookback window these stats cover, in days. */
  periodDays: number;
}

/** Aggregated view across all fleet groups for the company/portfolio page. */
export interface CompanyPulseSummary {
  fleets: FleetSummary[];
  totals: {
    vehicles: number;
    activeVehicles: number;
    distanceKm: number;
    trips: number;
    avgIdlePct: number;
  };
}

export type VehicleStatus = "active" | "idle" | "offline";

/** A single vehicle's current activity state within a fleet. */
export interface VehicleActivity {
  vehicle: VehicleCard;
  status: VehicleStatus;
  lastTripEnd?: string;
  distanceTodayKm?: number;
  tripCountToday?: number;
  /** Last known position — from DeviceStatusInfo. */
  lastPosition?: LatLon;
}

/** Full detail payload for the single-fleet Fleet Pulse view. */
export interface FleetPulseDetail {
  group: FleetGroup;
  vehicles: VehicleActivity[];
  outliers: {
    topDistance?: VehicleActivity;
    topIdle?: VehicleActivity;
    topTrips?: VehicleActivity;
  };
}

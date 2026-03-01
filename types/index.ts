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
  /** Fleet group name — used in the Ace prompt for fleet-scoped queries. */
  groupName?: string;
  /** Fleet group ID (e.g. "g-north") — used to resolve per-group fallback files. */
  groupId?: string;
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

/** A single photo in the area photo gallery for a comic panel. */
export interface AreaPhoto {
  url: string;
  caption?: string;
  attribution?: string;
}

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
  /** Curated area photos for the photos gallery toggle view. */
  areaPhotos?: AreaPhoto[];
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

// ─── Location Dossier ─────────────────────────────────────────────────────────

/**
 * Persistent location profile keyed by a geohash cell.
 * Accumulates fleet visit history, area intelligence, and amenity data
 * across all visits to a given area. Grows richer with each fleet visit.
 */
export interface LocationDossier {
  /** Quantized coordinate key: "${lat.toFixed(3)}_${lon.toFixed(3)}" (~110m cell). */
  geohash: string;
  lat: number;
  lon: number;
  placeName: string;
  neighborhood?: string;
  city?: string;
  /** LLM-generated area description, cached after first generation. */
  areaBriefing: string;
  nearbyAmenities: NearbyAmenity[];
  /** Fleet visit count from Ace (90-day window). Null until Ace enrichment runs. */
  fleetVisitCount?: number;
  /** Human-readable fleet visit summary from Ace. */
  fleetVisitSummary?: string;
  /** Most common day of week for fleet visits, extracted from Ace. */
  peakDayOfWeek?: string;
  /** Number of times this dossier has been accessed via the app. */
  accessCount: number;
  /** ISO 8601 — when this dossier was first created. */
  firstSeenAt: string;
  /** ISO 8601 — when this dossier was last accessed. */
  lastSeenAt: string;
  createdAt: string;
  updatedAt: string;
}

// ─── AI Assistant types ────────────────────────────────────────────────────────

/** Current page context passed to the assistant with every query. */
export interface AssistantContext {
  currentPage: "home" | "pulse" | "fleet-detail" | "dashboard" | "story" | "features";
  currentFleetId?: string;
  currentFleetName?: string;
  currentDeviceId?: string;
  currentDeviceName?: string;
  currentTripId?: string;
}

/** Analysis topic for the "analyze" intent. */
export type AnalysisTopic =
  | "route_efficiency"
  | "anomalies"
  | "fleet_comparison"
  | "vehicle_patterns"
  | "general";

/** Classified intent from the LLM or keyword fallback router. */
export interface AssistantIntent {
  intent: "navigate" | "lookup" | "explain" | "analyze" | "conversational" | "off_topic" | "unknown";
  entity?: {
    type: "fleet" | "vehicle" | "trip" | "page";
    /** Raw name extracted from the query (before entity resolution). */
    name: string;
  };
  /** The metric the user is asking about. */
  metric?: "distance" | "idle" | "trips" | "active" | "status" | "speed";
  /** Relative timeframe extracted from the query. */
  timeframe?: string;
  /** Target page for navigate intent. */
  targetPage?: "home" | "pulse" | "fleet-detail" | "dashboard" | "story" | "features";
  /** Analysis sub-topic for the "analyze" intent. */
  analysisTopic?: AnalysisTopic;
}

/** Navigation action the assistant can perform. */
export interface AssistantAction {
  type: "navigate";
  url: string;
  label: string;
}

/** Structured data snippet optionally included in the response. */
export interface AssistantDataSnippet {
  metric: string;
  value: string | number;
  unit?: string;
  /** Optional secondary values (e.g. "of total") */
  context?: string;
}

/** Full response returned by POST /api/assistant/query. */
export interface AssistantResponse {
  /** The natural-language answer to show in the palette. */
  text: string;
  /** Optional navigation action — shown as a button in the result card. */
  action?: AssistantAction;
  /** Optional structured data snippet for quick-scan reading. */
  data?: AssistantDataSnippet;
  /** Follow-up query suggestions shown below the result. */
  suggestions?: string[];
  /** True if the response came from the keyword fallback (LLM was unavailable). */
  fromFallback?: boolean;
  /** Data sources used to ground the response (for analyze intent). */
  sources?: string[];
}

/** Request body accepted by POST /api/assistant/query. */
export interface AssistantQueryRequest {
  query: string;
  context?: AssistantContext;
}

// ─── Next-Stop Prediction types ───────────────────────────────────────────────

/** Raw signal scores used to compute a prediction's confidence. */
export interface PredictionSignals {
  /** Visit-frequency share of total historical trips (0–1). */
  frequency: number;
  /** Gaussian proximity to the destination's typical arrival hour (0–1). */
  temporal: number;
  /** Exponential decay from most-recent visit date (0–1). */
  recency: number;
  /** Route-pattern chain match score (0–1). */
  sequence: number;
}

/** A single ranked prediction for a vehicle's likely next stop. */
export interface StopPrediction {
  rank: number;
  locationName: string;
  /**
   * Normalized likelihood 0–1.
   * Computed from multi-signal scoring (frequency + temporal + recency + sequence),
   * optionally re-ranked by LLM reasoning.
   */
  confidence: number;
  visitCount: number;
  avgDwellMinutes?: number;
  coordinates?: LatLon;
  /** Hour of day (UTC) when this destination is typically reached. */
  typicalArrivalHour?: number;
  /** Pre-loaded context briefing for the top prediction (rank === 1 only). */
  preloadedBriefing?: StopContext | null;
  /** LLM-generated one-sentence explanation for this prediction. */
  reasoning?: string;
  /**
   * LLM-detected anomaly in the vehicle's current pattern relative to history.
   * Only present on rank-1 prediction when a meaningful deviation is detected.
   */
  anomaly?: string;
  /** Raw signal breakdown used to compute this prediction's score. */
  signals?: PredictionSignals;
}

/** Full result returned by GET /api/predict/next-stop. */
export interface NextStopPredictionResult {
  deviceId: string;
  fromCoordinates: LatLon;
  predictions: StopPrediction[];
  /** Total historical trip count used to compute confidence scores. */
  basedOnTrips: number;
  queriedAt: string;
  fromCache?: boolean;
  /** True when LLM re-ranking was applied to the predictions. */
  fromLLM?: boolean;
}

// ─── Fleet Digest AI types ────────────────────────────────────────────────────

/** A forward-looking prediction about a fleet metric trend. */
export interface DigestPrediction {
  metric: string;
  direction: "up" | "down" | "stable";
  /** Human-readable magnitude, e.g. "2–3%" or "~50 km". */
  magnitude: string;
  /** LLM confidence 0–1. */
  confidence: number;
  /** Short explanation of why this trend is expected. */
  reasoning: string;
}

/** An anomaly detected in the fleet's current operating pattern. */
export interface DigestAnomaly {
  severity: "warning" | "critical";
  /** The metric or dimension the anomaly relates to. */
  metric: string;
  text: string;
}

/** An actionable recommendation produced by the digest analyst. */
export interface DigestRecommendation {
  priority: "high" | "medium" | "low";
  text: string;
}

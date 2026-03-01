/**
 * lib/predict/score.ts
 *
 * Multi-signal confidence scoring for next-stop prediction.
 *
 * Four signals are combined into a single normalized confidence score:
 *   1. Frequency  (40%) — how often this destination appears in trip history
 *   2. Temporal   (25%) — Gaussian proximity of the destination's typical arrival
 *                         hour to the current hour, with weekday/weekend awareness
 *   3. Recency    (20%) — exponential decay based on how recently the destination
 *                         was last visited; prevents stale patterns from dominating
 *   4. Sequence   (15%) — boost when Ace route-pattern data suggests this
 *                         destination is the next link in a known A→B→C chain
 *
 * All signals produce a 0–1 score. The final score is a weighted sum, then
 * min-max normalised across the full candidate set.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RawStopRow {
  destination_name?: unknown;
  location_name?: unknown;
  visit_count?: unknown;
  avg_dwell_minutes?: unknown;
  avg_arrival_hour?: unknown;
  last_visit_date?: unknown;
  day_of_week_pattern?: unknown; // "weekday" | "weekend" | "any"
  dest_lat?: unknown;
  dest_lon?: unknown;
}

export interface ScoredCandidate {
  locationName: string;
  visitCount: number;
  avgDwellMinutes?: number;
  typicalArrivalHour?: number;
  coordinates?: { lat: number; lon: number };
  rawScore: number;
  signals: {
    frequency: number;
    temporal: number;
    recency: number;
    sequence: number;
  };
}

export interface ScoreContext {
  currentHour: number;       // 0–23 UTC
  currentDayOfWeek: number;  // 0=Sunday … 6=Saturday
  /** Most recent trip endpoint coordinates — used for sequence matching */
  lastTripOrigin?: { lat: number; lon: number };
  /** Ace route-pattern rows for sequence signal */
  routePatternRows?: Array<{
    origin?: unknown;
    destination?: unknown;
    trip_count?: unknown;
  }>;
}

// ─── Signal weights ───────────────────────────────────────────────────────────

const WEIGHTS = {
  frequency: 0.40,
  temporal:  0.25,
  recency:   0.20,
  sequence:  0.15,
} as const;

// ─── Individual signal functions ──────────────────────────────────────────────

/**
 * Frequency signal — normalised visit share.
 * Returns the fraction of total visits this destination accounts for.
 */
function frequencySignal(visitCount: number, totalVisits: number): number {
  if (totalVisits <= 0) return 0;
  return Math.min(1, visitCount / totalVisits);
}

/**
 * Temporal signal — Gaussian proximity to the destination's typical arrival hour.
 *
 * Uses a Gaussian kernel with σ=3h so destinations that typically arrive
 * within 3 hours of the current time score ~0.6 and those exactly on-time
 * score 1.0.
 *
 * Day-of-week pattern modifier:
 *   - "weekday" pattern + weekend day → multiplied by 0.2 (strong penalty)
 *   - "weekend" pattern + weekday     → multiplied by 0.2
 *   - "any" or undefined              → no modification
 */
function temporalSignal(
  typicalArrivalHour: number | undefined,
  dayOfWeekPattern: string | undefined,
  ctx: ScoreContext
): number {
  // No temporal data — neutral score
  if (typicalArrivalHour === undefined) return 0.5;

  // Circular hour difference (handles midnight wrap)
  const diff = Math.min(
    Math.abs(typicalArrivalHour - ctx.currentHour),
    24 - Math.abs(typicalArrivalHour - ctx.currentHour)
  );

  // Gaussian kernel, σ=3 hours
  const sigma = 3;
  let score = Math.exp(-(diff * diff) / (2 * sigma * sigma));

  // Day-of-week awareness
  const isWeekend = ctx.currentDayOfWeek === 0 || ctx.currentDayOfWeek === 6;
  if (dayOfWeekPattern === "weekday" && isWeekend) score *= 0.2;
  if (dayOfWeekPattern === "weekend" && !isWeekend) score *= 0.2;

  return Math.max(0, Math.min(1, score));
}

/**
 * Recency signal — exponential decay from last visit date.
 *
 * Half-life = 14 days, so a destination visited today scores 1.0,
 * visited 14 days ago scores 0.5, visited 30 days ago scores ~0.25.
 */
function recencySignal(lastVisitDate: string | undefined): number {
  if (!lastVisitDate) return 0.5; // Unknown — neutral

  const lastVisit = new Date(lastVisitDate).getTime();
  if (isNaN(lastVisit)) return 0.5;

  const daysAgo = (Date.now() - lastVisit) / (1000 * 60 * 60 * 24);
  if (daysAgo < 0) return 1.0;

  const halfLifeDays = 14;
  return Math.pow(0.5, daysAgo / halfLifeDays);
}

/**
 * Sequence signal — boosts destinations that are the next step in a
 * known origin→destination route pattern from Ace.
 *
 * A destination scores 1.0 if it's the most frequent next stop after
 * an origin matching the vehicle's last trip endpoint within ~2 km.
 * Scores 0 if no route patterns are available or no match is found.
 */
function sequenceSignal(
  destinationName: string,
  ctx: ScoreContext
): number {
  const { routePatternRows, lastTripOrigin } = ctx;

  if (!routePatternRows?.length || !lastTripOrigin) return 0;

  // Find route-pattern rows whose destination matches this candidate
  const matchingRows = routePatternRows.filter((row) => {
    const dest = String(row.destination ?? "").toLowerCase();
    return dest && destinationName.toLowerCase().includes(dest.substring(0, 8));
  });

  if (!matchingRows.length) return 0;

  // Score proportional to trip_count of matching rows vs max in pattern set
  const maxCount = routePatternRows.reduce(
    (m, r) => Math.max(m, Number(r.trip_count) || 0),
    0
  );
  if (maxCount === 0) return 0;

  const bestMatch = matchingRows.reduce((best, r) => {
    const c = Number(r.trip_count) || 0;
    return c > (Number(best.trip_count) || 0) ? r : best;
  }, matchingRows[0]);

  return Math.min(1, (Number(bestMatch.trip_count) || 0) / maxCount);
}

// ─── Main scoring function ────────────────────────────────────────────────────

/**
 * Score all candidate stop rows and return them ranked by `rawScore`.
 *
 * The rawScore is a weighted sum of the four signals, min-max normalised
 * across all candidates so the full 0–1 range is always utilised.
 */
export function scoreCandidates(
  rows: RawStopRow[],
  ctx: ScoreContext
): ScoredCandidate[] {
  if (rows.length === 0) return [];

  const totalVisits = rows.reduce(
    (sum, r) => sum + (Number(r.visit_count) || 0),
    0
  );

  // Compute raw signals for each row
  const withSignals = rows.map((row): ScoredCandidate => {
    const visitCount = Number(row.visit_count) || 0;
    const typicalArrivalHour =
      row.avg_arrival_hour !== undefined
        ? Number(row.avg_arrival_hour)
        : undefined;
    const lastVisitDate =
      row.last_visit_date !== undefined ? String(row.last_visit_date) : undefined;
    const dayOfWeekPattern =
      row.day_of_week_pattern !== undefined
        ? String(row.day_of_week_pattern)
        : undefined;

    const destLat =
      row.dest_lat !== undefined ? Number(row.dest_lat) : undefined;
    const destLon =
      row.dest_lon !== undefined ? Number(row.dest_lon) : undefined;

    const locationName = String(
      row.destination_name ?? row.location_name ?? "Unknown"
    );

    const signals = {
      frequency: frequencySignal(visitCount, totalVisits),
      temporal: temporalSignal(typicalArrivalHour, dayOfWeekPattern, ctx),
      recency: recencySignal(lastVisitDate),
      sequence: sequenceSignal(locationName, ctx),
    };

    const rawScore =
      signals.frequency * WEIGHTS.frequency +
      signals.temporal  * WEIGHTS.temporal  +
      signals.recency   * WEIGHTS.recency   +
      signals.sequence  * WEIGHTS.sequence;

    return {
      locationName,
      visitCount,
      avgDwellMinutes:
        row.avg_dwell_minutes !== undefined
          ? Number(row.avg_dwell_minutes)
          : undefined,
      typicalArrivalHour,
      coordinates:
        destLat !== undefined &&
        destLon !== undefined &&
        !isNaN(destLat) &&
        !isNaN(destLon)
          ? { lat: destLat, lon: destLon }
          : undefined,
      rawScore,
      signals,
    };
  });

  // Min-max normalise rawScore so top candidate always scores closer to 1
  const scores = withSignals.map((c) => c.rawScore);
  const minScore = Math.min(...scores);
  const maxScore = Math.max(...scores);
  const range = maxScore - minScore;

  const normalised = withSignals.map((c) => ({
    ...c,
    rawScore: range > 0.001 ? (c.rawScore - minScore) / range : c.rawScore,
  }));

  // Sort descending by normalised score
  return normalised.sort((a, b) => b.rawScore - a.rawScore);
}

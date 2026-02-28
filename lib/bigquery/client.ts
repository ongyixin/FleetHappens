/**
 * lib/bigquery/client.ts
 *
 * Thin BigQuery wrapper for the FleetHappens analytics cache layer.
 *
 * Tables (auto-created on first write):
 *   ace_cache       — Ace query results with TTL
 *   trip_stories    — Persisted generated comic stories
 *   fleet_snapshots — Daily fleet KPI snapshots for trend charts
 *
 * Auth:
 *   Local dev  — Application Default Credentials (gcloud auth application-default login)
 *   Cloud Run  — Service account attached to the instance (automatic)
 *
 * Usage:
 *   import { bqGetAceCache, bqSetAceCache } from "@/lib/bigquery/client";
 */

import { BigQuery, type Table } from "@google-cloud/bigquery";
import type { ComicStory, ComicTone, LocationDossier } from "@/types";

// ─── Schema definitions ───────────────────────────────────────────────────────

const ACE_CACHE_SCHEMA = [
  { name: "query_key",   type: "STRING",    mode: "REQUIRED" },
  { name: "result",      type: "JSON",      mode: "REQUIRED" },
  { name: "queried_at",  type: "TIMESTAMP", mode: "REQUIRED" },
  { name: "ttl_minutes", type: "INT64",     mode: "REQUIRED" },
];

const TRIP_STORIES_SCHEMA = [
  { name: "trip_id",    type: "STRING",    mode: "REQUIRED" },
  { name: "tone",       type: "STRING",    mode: "REQUIRED" },
  { name: "story",      type: "JSON",      mode: "REQUIRED" },
  { name: "created_at", type: "TIMESTAMP", mode: "REQUIRED" },
];

const FLEET_SNAPSHOTS_SCHEMA = [
  { name: "snapshot_date", type: "DATE",   mode: "REQUIRED" },
  { name: "group_id",      type: "STRING", mode: "REQUIRED" },
  { name: "metrics",       type: "JSON",   mode: "REQUIRED" },
];

// ─── Client singleton ─────────────────────────────────────────────────────────

let _bq: BigQuery | null = null;

function getBigQuery(): BigQuery {
  if (!_bq) {
    const projectId = process.env.GOOGLE_CLOUD_PROJECT;
    if (!projectId) {
      throw new Error(
        "BigQuery not configured: GOOGLE_CLOUD_PROJECT env var is missing."
      );
    }
    _bq = new BigQuery({ projectId });
  }
  return _bq;
}

function getDataset(): ReturnType<BigQuery["dataset"]> {
  const datasetId = process.env.BIGQUERY_DATASET ?? "fleethappens";
  return getBigQuery().dataset(datasetId);
}

/** Ensure a table exists, creating it with the given schema if not. */
async function ensureTable(
  tableId: string,
  schema: object[]
): Promise<Table> {
  const dataset = getDataset();

  // Auto-create dataset if needed
  const [dsExists] = await dataset.exists();
  if (!dsExists) {
    await dataset.create({ location: process.env.GOOGLE_CLOUD_LOCATION ?? "us-central1" });
  }

  const table = dataset.table(tableId);
  const [tableExists] = await table.exists();
  if (!tableExists) {
    await table.create({ schema });
  }
  return table;
}

// ─── Ace cache ────────────────────────────────────────────────────────────────

/**
 * Retrieve a cached Ace query result from BigQuery.
 * Returns null if no fresh entry exists (respects TTL).
 */
export async function bqGetAceCache<T>(queryKey: string): Promise<T | null> {
  try {
    const dataset = getDataset();
    const datasetId = process.env.BIGQUERY_DATASET ?? "fleethappens";
    const projectId = process.env.GOOGLE_CLOUD_PROJECT!;

    const sql = `
      SELECT result, queried_at, ttl_minutes
      FROM \`${projectId}.${datasetId}.ace_cache\`
      WHERE query_key = @queryKey
        AND TIMESTAMP_ADD(queried_at, INTERVAL ttl_minutes MINUTE) > CURRENT_TIMESTAMP()
      ORDER BY queried_at DESC
      LIMIT 1
    `;

    const [rows] = await getBigQuery().query({
      query: sql,
      params: { queryKey },
    });

    if (!rows || rows.length === 0) return null;

    const resultRaw = rows[0].result;
    return (typeof resultRaw === "string" ? JSON.parse(resultRaw) : resultRaw) as T;
  } catch {
    // BigQuery errors should never crash the app — return null so the live call runs
    return null;
  }
}

/**
 * Write or update an Ace query result in BigQuery.
 * Inserts a new row; old rows expire naturally via TTL in the SELECT query.
 */
export async function bqSetAceCache<T>(
  queryKey: string,
  result: T,
  ttlMinutes = 30
): Promise<void> {
  try {
    const table = await ensureTable("ace_cache", ACE_CACHE_SCHEMA);
    await table.insert([
      {
        query_key:   queryKey,
        result:      JSON.stringify(result),
        queried_at:  BigQuery.timestamp(new Date()),
        ttl_minutes: ttlMinutes,
      },
    ]);
  } catch (err) {
    // Write failures are non-fatal — in-memory cache still works
    console.warn("[bigquery] ace_cache write failed:", err);
  }
}

// ─── Trip stories ─────────────────────────────────────────────────────────────

/**
 * Retrieve a persisted comic story for a given trip + tone.
 * Returns null if no story exists yet.
 */
export async function bqGetStory<T>(
  tripId: string,
  tone: string
): Promise<T | null> {
  try {
    const datasetId = process.env.BIGQUERY_DATASET ?? "fleethappens";
    const projectId = process.env.GOOGLE_CLOUD_PROJECT!;

    const sql = `
      SELECT story
      FROM \`${projectId}.${datasetId}.trip_stories\`
      WHERE trip_id = @tripId AND tone = @tone
      ORDER BY created_at DESC
      LIMIT 1
    `;

    const [rows] = await getBigQuery().query({ query: sql, params: { tripId, tone } });
    if (!rows || rows.length === 0) return null;

    const raw = rows[0].story;
    return (typeof raw === "string" ? JSON.parse(raw) : raw) as T;
  } catch {
    return null;
  }
}

/**
 * Persist a generated comic story to BigQuery so it can be retrieved
 * without re-calling the LLM.
 */
export async function bqSetStory<T>(
  tripId: string,
  tone: string,
  story: T
): Promise<void> {
  try {
    const table = await ensureTable("trip_stories", TRIP_STORIES_SCHEMA);
    await table.insert([
      {
        trip_id:    tripId,
        tone,
        story:      JSON.stringify(story),
        created_at: BigQuery.timestamp(new Date()),
      },
    ]);
  } catch (err) {
    console.warn("[bigquery] trip_stories write failed:", err);
  }
}

// ─── Fleet snapshots ──────────────────────────────────────────────────────────

/**
 * Write a daily fleet KPI snapshot. One row per group per day.
 * Used by /api/analytics/trends to power Fleet Trends charts.
 */
export async function bqWriteFleetSnapshot(
  groupId: string,
  metrics: Record<string, unknown>
): Promise<void> {
  try {
    const table = await ensureTable("fleet_snapshots", FLEET_SNAPSHOTS_SCHEMA);
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    await table.insert([
      {
        snapshot_date: today,
        group_id:      groupId,
        metrics:       JSON.stringify(metrics),
      },
    ]);
  } catch (err) {
    console.warn("[bigquery] fleet_snapshots write failed:", err);
  }
}

/**
 * Read fleet KPI snapshots for a group over the last N days.
 * Returns rows ordered oldest → newest, ready for recharts.
 */
export async function bqGetFleetTrends(
  groupId: string,
  days = 30
): Promise<Array<{ date: string; metrics: Record<string, unknown> }>> {
  try {
    const datasetId = process.env.BIGQUERY_DATASET ?? "fleethappens";
    const projectId = process.env.GOOGLE_CLOUD_PROJECT!;

    const sql = `
      SELECT snapshot_date, metrics
      FROM \`${projectId}.${datasetId}.fleet_snapshots\`
      WHERE group_id = @groupId
        AND snapshot_date >= DATE_SUB(CURRENT_DATE(), INTERVAL @days DAY)
      ORDER BY snapshot_date ASC
    `;

    const [rows] = await getBigQuery().query({
      query: sql,
      params: { groupId, days },
    });

    return (rows ?? []).map((r: { snapshot_date: string; metrics: string | Record<string, unknown> }) => ({
      date:    r.snapshot_date,
      metrics: typeof r.metrics === "string" ? JSON.parse(r.metrics) : r.metrics,
    }));
  } catch {
    return [];
  }
}

// ─── Location dossiers ────────────────────────────────────────────────────────

const LOCATION_DOSSIERS_SCHEMA = [
  { name: "geohash",    type: "STRING",    mode: "REQUIRED" },
  { name: "lat",        type: "FLOAT64",   mode: "REQUIRED" },
  { name: "lon",        type: "FLOAT64",   mode: "REQUIRED" },
  { name: "dossier",    type: "JSON",      mode: "REQUIRED" },
  { name: "updated_at", type: "TIMESTAMP", mode: "REQUIRED" },
];

/**
 * Retrieve the most recent location dossier for a given geohash key.
 * Returns null if no dossier exists yet or BigQuery is unavailable.
 */
export async function bqGetLocationDossier(geohash: string): Promise<LocationDossier | null> {
  try {
    const projectId = process.env.GOOGLE_CLOUD_PROJECT!;
    const datasetId = process.env.BIGQUERY_DATASET ?? "fleethappens";
    const sql = `
      SELECT dossier
      FROM \`${projectId}.${datasetId}.location_dossiers\`
      WHERE geohash = @geohash
      ORDER BY updated_at DESC
      LIMIT 1
    `;
    const [rows] = await getBigQuery().query({ query: sql, params: { geohash } });
    if (!rows || rows.length === 0) return null;
    const raw = rows[0].dossier;
    return (typeof raw === "string" ? JSON.parse(raw) : raw) as LocationDossier;
  } catch {
    return null;
  }
}

/**
 * Write or update a location dossier in BigQuery.
 *
 * Uses the insert-new-row pattern consistent with the rest of the BQ layer;
 * reads always SELECT the most recent row via ORDER BY updated_at DESC.
 */
export async function bqUpsertLocationDossier(dossier: LocationDossier): Promise<void> {
  try {
    const table = await ensureTable("location_dossiers", LOCATION_DOSSIERS_SCHEMA);
    await table.insert([{
      geohash:    dossier.geohash,
      lat:        dossier.lat,
      lon:        dossier.lon,
      dossier:    JSON.stringify(dossier),
      updated_at: BigQuery.timestamp(new Date()),
    }]);
  } catch (err) {
    console.warn("[bigquery] location_dossiers write failed:", err);
  }
}

/** True if BigQuery is configured and available. */
export function isBigQueryEnabled(): boolean {
  return Boolean(process.env.GOOGLE_CLOUD_PROJECT && process.env.BIGQUERY_DATASET !== "disabled");
}

// ─── Story catalogue (Storybook) ──────────────────────────────────────────────

export interface StorySummary {
  tripId: string;
  tone: string;
  title: string;
  panelCount: number;
  firstLocationName: string;
  lastLocationName: string;
  firstCaption: string;
  firstImageUrl?: string;
  createdAt: string;
}

function bqTimestampToISO(ts: unknown): string {
  if (!ts) return new Date().toISOString();
  if (typeof ts === "string") return ts;
  if (typeof ts === "object" && ts !== null && "value" in ts) {
    return String((ts as { value: unknown }).value);
  }
  return new Date().toISOString();
}

/**
 * List persisted comic stories for the Fleet Storybook gallery.
 * Returns stories ordered newest-first, with optional tone filter and pagination.
 */
export async function bqListStories(options?: {
  limit?: number;
  offset?: number;
  tone?: string;
}): Promise<{ stories: StorySummary[]; total: number }> {
  try {
    const { limit = 24, offset = 0, tone } = options ?? {};
    const datasetId = process.env.BIGQUERY_DATASET ?? "fleethappens";
    const projectId = process.env.GOOGLE_CLOUD_PROJECT!;

    const toneFilter = tone ? "AND tone = @tone" : "";

    const countSql = `
      SELECT COUNT(*) as total
      FROM \`${projectId}.${datasetId}.trip_stories\`
      WHERE 1=1 ${toneFilter}
    `;

    const sql = `
      SELECT trip_id, tone, story, created_at
      FROM \`${projectId}.${datasetId}.trip_stories\`
      WHERE 1=1 ${toneFilter}
      ORDER BY created_at DESC
      LIMIT @limit
      OFFSET @offset
    `;

    const baseParams: Record<string, unknown> = tone ? { tone } : {};
    const pageParams: Record<string, unknown> = { ...baseParams, limit, offset };

    const [[countRows], [rows]] = await Promise.all([
      getBigQuery().query({ query: countSql, params: baseParams }),
      getBigQuery().query({ query: sql, params: pageParams }),
    ]);

    const total = Number((countRows?.[0] as Record<string, unknown>)?.total ?? 0);

    interface BQStoryRow {
      trip_id: string;
      tone: string;
      story: string | Record<string, unknown>;
      created_at: unknown;
    }

    const stories: StorySummary[] = (rows ?? []).map((r: BQStoryRow) => {
      let parsed: ComicStory;
      try {
        parsed = (typeof r.story === "string"
          ? JSON.parse(r.story)
          : r.story) as ComicStory;
      } catch {
        parsed = {
          id: "",
          tripId: r.trip_id,
          title: "Untitled Story",
          tone: r.tone as ComicTone,
          panels: [],
          createdAt: "",
        };
      }

      const firstPanel = parsed.panels?.[0];
      const lastPanel  = parsed.panels?.[parsed.panels.length - 1];

      let firstImageUrl: string | undefined;
      if (firstPanel?.image?.kind === "place-photo") {
        firstImageUrl = firstPanel.image.imageUrl;
      }

      return {
        tripId:             r.trip_id,
        tone:               r.tone,
        title:              parsed.title ?? "Untitled Story",
        panelCount:         parsed.panels?.length ?? 0,
        firstLocationName:  firstPanel?.locationName ?? "Departure",
        lastLocationName:   lastPanel?.locationName  ?? "Destination",
        firstCaption:       firstPanel?.caption      ?? "",
        firstImageUrl,
        createdAt: bqTimestampToISO(r.created_at),
      };
    });

    return { stories, total };
  } catch (err) {
    console.warn("[bigquery] bqListStories failed:", err);
    return { stories: [], total: 0 };
  }
}

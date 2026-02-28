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

/** True if BigQuery is configured and available. */
export function isBigQueryEnabled(): boolean {
  return Boolean(process.env.GOOGLE_CLOUD_PROJECT && process.env.BIGQUERY_DATASET !== "disabled");
}

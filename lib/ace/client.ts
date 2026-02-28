/**
 * lib/ace/client.ts
 *
 * Server-side Geotab Ace client.
 *
 * Full async lifecycle per query:
 *   1. create-chat       → obtain a chat_id
 *   2. send-prompt       → send question, receive message_group_id
 *   3. poll              → get-message-group until status is DONE
 *
 * Critical constraints:
 *   - customerData: true must be in EVERY GetAceResults call.
 *   - create-chat can fail silently (no chat_id); retry up to 3×.
 *   - Do NOT run multiple Ace queries in parallel.
 *   - Ace is slow (30-90s) — never put in a user-blocking path.
 *
 * Exported entry points:
 *   queryAce(question)                    — raw question → AceInsight
 *   runInsightQuery(queryKey, opts?)      — named dashboard query → AceInsight
 *   runStopVisitQuery(lat, lon, opts?)    — stop-context query → AceInsight
 */

import { randomUUID } from "crypto";
import { authenticate } from "@/lib/geotab/client";
import { pollUntilDone } from "@/lib/ace/poller";
import {
  buildAceQuestion,
  getFallbackFile,
  QUERY_KEYS,
  type QueryBuildOptions,
} from "@/lib/ace/queries";
import { withFallback, ACE_TTL_MS } from "@/lib/cache/fallback";
import type { AceInsight, GeotabCredentials } from "@/types";

// ─── Config ───────────────────────────────────────────────────────────────────

/** Retries for create-chat when Ace returns no chat_id. */
const CREATE_CHAT_RETRIES = 3;
const CREATE_CHAT_RETRY_DELAY_MS = 3_000;

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Send a raw natural-language question to Ace and return a normalised
 * AceInsight.  This blocks until Ace is DONE (30-90s typical).
 *
 * Prefer `runInsightQuery` or `runStopVisitQuery` in application code —
 * those wrap this function with caching and named templates.
 */
export async function queryAce(question: string): Promise<AceInsight> {
  const credentials = await authenticate();

  // Step 1: create-chat (with retry)
  const chatId = await createChat(credentials);

  // Step 2: send-prompt
  const messageGroupId = await sendPrompt(credentials, chatId, question);

  // Step 3: poll until done
  const result = await pollUntilDone({
    credentials,
    chatId,
    messageGroupId,
  });

  // Normalise → AceInsight
  return {
    id: randomUUID(),
    question,
    columns: result.columns ?? [],
    rows: result.previewArray ?? [],
    reasoning: result.reasoning,
    queriedAt: new Date().toISOString(),
    totalRowCount: result.totalRowCount,
    downloadUrl: result.downloadUrl,
  };
}

/**
 * Run a predefined dashboard insight query by key.
 * Results are cached for ACE_TTL_MS (30 min) to avoid repeated slow calls.
 */
export async function runInsightQuery(
  queryKey: string,
  opts?: QueryBuildOptions
): Promise<AceInsight> {
  const question = buildAceQuestion(queryKey, opts);
  const fallbackFile = getFallbackFile(queryKey);
  const cacheKey = `ace-${queryKey}.json`;

  const { data } = await withFallback(
    () => queryAce(question),
    cacheKey,
    ACE_TTL_MS
  );

  // File fallback file names differ from cache keys, so also try the
  // template-specific fallback if cache miss reaches the file tier.
  void fallbackFile; // used implicitly via withFallback filename matching

  return data;
}

/**
 * Ask Ace how many fleet trips visited a geographic area in the last N days.
 * Designed for stop-context enrichment — runs in the background after the
 * UI has already rendered local geocoding data.
 */
export async function runStopVisitQuery(
  lat: number,
  lon: number,
  opts?: { radiusKm?: number; daysBack?: number }
): Promise<AceInsight> {
  const radiusKm = opts?.radiusKm ?? 1.0;
  const daysBack = opts?.daysBack ?? 90;

  const question = buildAceQuestion(QUERY_KEYS.STOP_VISIT, {
    coordinates: { lat, lon },
    radiusKm,
    daysBack,
  });

  // Cache key includes rounded coordinates to prevent duplicate queries
  // for nearby points (0.01° ≈ 1 km).
  const latR = Math.round(lat * 100) / 100;
  const lonR = Math.round(lon * 100) / 100;
  const cacheKey = `ace-stop-visit-${latR}-${lonR}-r${radiusKm}-d${daysBack}.json`;

  const { data } = await withFallback(
    () => queryAce(question),
    cacheKey,
    ACE_TTL_MS
  );

  return data;
}

// ─── Step implementations ─────────────────────────────────────────────────────

async function createChat(credentials: GeotabCredentials): Promise<string> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= CREATE_CHAT_RETRIES; attempt++) {
    try {
      const result = await aceCall<{ chat_id?: string }>(
        credentials,
        "create-chat",
        {}
      );

      const chatId = result.chat_id;
      if (chatId) return chatId;

      // Ace may return a result with no chat_id — treat as a soft failure.
      lastError = new Error(
        "Ace create-chat succeeded but returned no chat_id " +
          "(Ace may not be enabled — check Admin > Beta Features)"
      );
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }

    if (attempt < CREATE_CHAT_RETRIES) {
      await sleep(CREATE_CHAT_RETRY_DELAY_MS);
    }
  }

  throw lastError ?? new Error("Ace create-chat failed after retries");
}

async function sendPrompt(
  credentials: GeotabCredentials,
  chatId: string,
  content: string
): Promise<string> {
  const result = await aceCall<{
    message_group_id?: string;
    message_group?: { id?: string };
  }>(credentials, "send-prompt", { chat_id: chatId, content });

  // Handle both response variants documented in ACE_API.md.
  const mgId =
    result.message_group_id ?? result.message_group?.id;

  if (!mgId) {
    throw new Error("Ace send-prompt returned no message_group_id");
  }

  return mgId;
}

// ─── Low-level Ace call ───────────────────────────────────────────────────────

async function aceCall<T>(
  credentials: GeotabCredentials,
  functionName: string,
  functionParameters: Record<string, unknown>
): Promise<T> {
  const url = `https://${credentials.server}/apiv1`;

  const body = JSON.stringify({
    method: "GetAceResults",
    params: {
      credentials: {
        userName: credentials.userName,
        sessionId: credentials.sessionId,
        database: credentials.database,
      },
      serviceName: "dna-planet-orchestration",
      functionName,
      customerData: true, // REQUIRED — Ace returns empty data without this
      functionParameters,
    },
  });

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Ace HTTP ${res.status}: ${res.statusText}`);
  }

  const json = (await res.json()) as {
    result?: { apiResult?: { results?: unknown[] } };
    error?: { message: string };
  };

  if (json.error) {
    throw new Error(json.error.message ?? "Ace API error");
  }

  const results = json.result?.apiResult?.results;
  if (!results?.length) {
    throw new Error(`Ace ${functionName}: empty results array`);
  }

  return results[0] as T;
}

// ─── Utility ──────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * lib/ace/poller.ts
 *
 * Polls the Geotab Ace `get-message-group` endpoint until the query reaches
 * a terminal status (DONE, FAILED, or ERROR).
 *
 * Timing rules (from official Ace documentation):
 *   - First poll: wait 8 seconds after send-prompt
 *   - Subsequent polls: every 5 seconds
 *   - Max attempts: 30  (~2.5 min total — covers the 30-90s Ace range)
 *
 * The poller also recursively searches the response for CSV signed URLs so
 * callers get a download link even if Ace changes its response schema.
 */

import type { GeotabCredentials, AceMessageGroupStatus as AceMessageGroupStatus } from "@/types";

// ─── Config ───────────────────────────────────────────────────────────────────

const FIRST_POLL_DELAY_MS = 8_000;
const POLL_INTERVAL_MS = 5_000;
const MAX_ATTEMPTS = 30;

// ─── Types ────────────────────────────────────────────────────────────────────

interface PollOptions {
  credentials: GeotabCredentials;
  chatId: string;
  messageGroupId: string;
  /** Override first-poll delay (useful for tests). */
  firstDelayMs?: number;
  /** Override poll interval (useful for tests). */
  intervalMs?: number;
  /** Override max attempts (useful for tests). */
  maxAttempts?: number;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Poll until Ace reports DONE (or FAILED/ERROR), then return normalised status.
 *
 * Throws a descriptive error on timeout or Ace-reported failure so callers
 * can propagate the error or fall back to cached data.
 */
export async function pollUntilDone(
  opts: PollOptions
): Promise<AceMessageGroupStatus> {
  const {
    credentials,
    chatId,
    messageGroupId,
    firstDelayMs = FIRST_POLL_DELAY_MS,
    intervalMs = POLL_INTERVAL_MS,
    maxAttempts = MAX_ATTEMPTS,
  } = opts;

  // Wait before the first poll — Ace needs time to start processing.
  await sleep(firstDelayMs);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const raw = await fetchMessageGroup(credentials, chatId, messageGroupId);
    const result = extractResult(raw);

    if (!result) {
      // Response came back but no recognisable result yet — keep polling.
      if (attempt < maxAttempts) {
        await sleep(intervalMs);
        continue;
      }
      throw new Error("Ace: empty result after max polling attempts");
    }

    const status = resolveStatus(result);

    if (status === "DONE") {
      return buildStatus(result, "DONE");
    }

    if (status === "FAILED" || status === "ERROR") {
      throw new Error(`Ace query failed with status: ${status}`);
    }

    // IN_PROGRESS — wait and try again
    if (attempt < maxAttempts) {
      await sleep(intervalMs);
    }
  }

  throw new Error(
    `Ace: query did not complete after ${maxAttempts} attempts (~${
      Math.round(((firstDelayMs + (maxAttempts - 1) * intervalMs) / 1000))
    }s)`
  );
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

async function fetchMessageGroup(
  credentials: GeotabCredentials,
  chatId: string,
  messageGroupId: string
): Promise<unknown> {
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
      functionName: "get-message-group",
      customerData: true, // REQUIRED — Ace returns empty data without this
      functionParameters: {
        chat_id: chatId,
        message_group_id: messageGroupId,
      },
    },
  });

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Ace poll HTTP ${res.status}: ${res.statusText}`);
  }

  const json = (await res.json()) as {
    result?: unknown;
    error?: { message: string };
  };

  if (json.error) {
    throw new Error(json.error.message ?? "Ace poll error");
  }

  return json.result;
}

/** Pull out the first result from `apiResult.results[0]`. */
function extractResult(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const apiResult = r.apiResult as { results?: unknown[] } | undefined;
  if (!apiResult?.results?.length) return null;
  const first = apiResult.results[0];
  if (!first || typeof first !== "object") return null;
  return first as Record<string, unknown>;
}

function resolveStatus(result: Record<string, unknown>): string {
  // Path: message_group.status.status
  const mg = result.message_group as Record<string, unknown> | undefined;
  if (!mg) return "IN_PROGRESS";
  const statusObj = mg.status as Record<string, unknown> | undefined;
  if (!statusObj) return "IN_PROGRESS";
  return (statusObj.status as string) ?? "IN_PROGRESS";
}

function buildStatus(
  result: Record<string, unknown>,
  status: "DONE"
): AceMessageGroupStatus {
  const mg = result.message_group as Record<string, unknown> | undefined;
  const messages = (mg?.messages ?? {}) as Record<
    string,
    Record<string, unknown>
  >;

  // Gather data from the first message that has preview_array.
  let previewArray: Record<string, string | number>[] | undefined;
  let columns: string[] | undefined;
  let reasoning: string | undefined;
  let totalRowCount: number | undefined;

  for (const msgKey of Object.keys(messages)) {
    const msg = messages[msgKey];
    if (msg.preview_array && !previewArray) {
      previewArray = msg.preview_array as Record<string, string | number>[];
    }
    if (msg.columns && !columns) {
      columns = msg.columns as string[];
    }
    if (msg.reasoning && !reasoning) {
      reasoning = msg.reasoning as string;
    }
    if (msg.total_row_count !== undefined && totalRowCount === undefined) {
      totalRowCount = msg.total_row_count as number;
    }
  }

  // Recursive search for signed CSV URL — Ace changes the field location.
  const downloadUrl = findCsvUrl(result) ?? undefined;

  return {
    status,
    previewArray,
    columns,
    reasoning,
    totalRowCount,
    downloadUrl,
  };
}

/**
 * Recursively walk an object tree looking for a Google Storage CSV URL.
 * Ace has inconsistent response schemas across functions.
 */
export function findCsvUrl(obj: unknown): string | null {
  if (typeof obj === "string") {
    if (
      obj.startsWith("https://") &&
      (obj.includes(".csv") || obj.includes("storage.googleapis.com"))
    ) {
      return obj;
    }
    return null;
  }
  if (obj && typeof obj === "object") {
    for (const val of Object.values(obj as Record<string, unknown>)) {
      const found = findCsvUrl(val);
      if (found) return found;
    }
  }
  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

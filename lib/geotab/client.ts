/**
 * lib/geotab/client.ts
 *
 * Server-side wrapper around the Geotab Direct API (my.geotab.com/apiv1).
 * All credentials come from environment variables — never exposed to the client.
 *
 * Session is cached in module-level memory for the lifetime of the server
 * process.  If the session expires Geotab returns an InvalidUserException;
 * that causes a single transparent re-auth before re-throwing.
 */

import type {
  GeotabCredentials,
  GeotabDevice,
  GeotabGroup,
  GeotabTrip,
  GeotabLogRecord,
  GeotabDeviceStatusInfo,
} from "@/types";

// ─── Module-level session cache ───────────────────────────────────────────────

let cachedSession: GeotabCredentials | null = null;

// ─── Internal helpers ─────────────────────────────────────────────────────────

function getEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required env var: ${key}`);
  return value;
}

async function geotabPost<T>(
  server: string,
  method: string,
  params: Record<string, unknown>
): Promise<T> {
  const url = `https://${server}/apiv1`;
  const body = JSON.stringify({ method, params });

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    // Disable Next.js data-cache so every call hits the network
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Geotab HTTP ${res.status}: ${res.statusText}`);
  }

  const json = (await res.json()) as { result?: T; error?: { message: string } };

  if (json.error) {
    throw new Error(json.error.message ?? "Geotab API error");
  }

  if (json.result === undefined) {
    throw new Error("Geotab API returned no result");
  }

  return json.result;
}

// ─── Authentication ───────────────────────────────────────────────────────────

interface AuthResult {
  credentials: {
    userName: string;
    sessionId: string;
    database: string;
  };
  path: string; // server that should be used for subsequent calls
}

/**
 * Authenticate once and cache the session for the process lifetime.
 * Returns credentials that include the correct server for follow-up calls.
 */
export async function authenticate(): Promise<GeotabCredentials> {
  if (cachedSession) return cachedSession;

  const database = getEnv("GEOTAB_DATABASE");
  const userName = getEnv("GEOTAB_USERNAME");
  const password = getEnv("GEOTAB_PASSWORD");
  const server = process.env.GEOTAB_SERVER ?? "my.geotab.com";

  const result = await geotabPost<AuthResult>(server, "Authenticate", {
    database,
    userName,
    password,
  });

  // Geotab may redirect to a regional server — use result.path when present.
  const effectiveServer =
    result.path && result.path !== "ThisServer" ? result.path : server;

  cachedSession = {
    userName: result.credentials.userName,
    sessionId: result.credentials.sessionId,
    database: result.credentials.database,
    server: effectiveServer,
  };

  return cachedSession;
}

/** Clear cached session (e.g. after an InvalidUserException). */
function clearSession(): void {
  cachedSession = null;
}

// ─── Authenticated API call ───────────────────────────────────────────────────

/**
 * Make an authenticated Geotab API call.
 * On session-expiry errors it re-authenticates once and retries.
 */
export async function geotabCall<T>(
  method: string,
  params: Record<string, unknown>
): Promise<T> {
  const creds = await authenticate();

  try {
    return await geotabPost<T>(creds.server, method, {
      ...params,
      credentials: {
        userName: creds.userName,
        sessionId: creds.sessionId,
        database: creds.database,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("InvalidUser") || msg.includes("session")) {
      clearSession();
      const fresh = await authenticate();
      return geotabPost<T>(fresh.server, method, {
        ...params,
        credentials: {
          userName: fresh.userName,
          sessionId: fresh.sessionId,
          database: fresh.database,
        },
      });
    }
    throw err;
  }
}

// ─── Device queries ───────────────────────────────────────────────────────────

export async function getDevices(): Promise<GeotabDevice[]> {
  return geotabCall<GeotabDevice[]>("Get", { typeName: "Device" });
}

// ─── Group queries ────────────────────────────────────────────────────────────

export async function getGroups(): Promise<GeotabGroup[]> {
  return geotabCall<GeotabGroup[]>("Get", { typeName: "Group" });
}

// ─── Trip queries ─────────────────────────────────────────────────────────────

export async function getTrips(
  deviceId: string,
  fromDate: string,
  toDate: string
): Promise<GeotabTrip[]> {
  return geotabCall<GeotabTrip[]>("Get", {
    typeName: "Trip",
    search: {
      deviceSearch: { id: deviceId },
      fromDate,
      toDate,
    },
  });
}

// ─── GPS breadcrumb queries ───────────────────────────────────────────────────

export async function getLogRecords(
  deviceId: string,
  fromDate: string,
  toDate: string
): Promise<GeotabLogRecord[]> {
  return geotabCall<GeotabLogRecord[]>("Get", {
    typeName: "LogRecord",
    search: {
      deviceSearch: { id: deviceId },
      fromDate,
      toDate,
    },
    resultsLimit: 5000,
  });
}

// ─── Device status ────────────────────────────────────────────────────────────

export async function getDeviceStatus(
  deviceIds?: string[]
): Promise<GeotabDeviceStatusInfo[]> {
  // When a single device is requested, use deviceSearch for a targeted call.
  const search =
    deviceIds && deviceIds.length === 1
      ? { deviceSearch: { id: deviceIds[0] } }
      : undefined;

  return geotabCall<GeotabDeviceStatusInfo[]>("Get", {
    typeName: "DeviceStatusInfo",
    search,
  });
}

/**
 * lib/geotab/client.ts
 *
 * Server-side wrapper around the Geotab Direct API (my.geotab.com/apiv1).
 *
 * Two authentication modes:
 *
 *  1. Demo / fallback mode — no `userCreds` argument supplied.
 *     Credentials come from GEOTAB_* environment variables and the session is
 *     cached in module-level memory for the lifetime of the server process.
 *
 *  2. Per-user mode — a `userCreds: GeotabCredentials` argument is supplied
 *     (read from the visitor's encrypted session cookie).  The existing session
 *     is used directly; no env-var credentials are involved.
 *
 * All callers pass `userCreds` through; when it is null/undefined the existing
 * demo-account behaviour is preserved so the app works without logging in.
 */

import type {
  GeotabCredentials,
  GeotabDevice,
  GeotabGroup,
  GeotabTrip,
  GeotabLogRecord,
  GeotabDeviceStatusInfo,
} from "@/types";

// ─── Module-level demo session cache ─────────────────────────────────────────

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

// ─── Demo / env-var authentication ───────────────────────────────────────────

interface AuthResult {
  credentials: {
    userName: string;
    sessionId: string;
    database: string;
  };
  path: string; // server that should be used for subsequent calls
}

/**
 * Authenticate once with env-var credentials and cache the session.
 * Only used when no per-user credentials are provided.
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

/** Clear cached demo session (e.g. after an InvalidUserException). */
function clearSession(): void {
  cachedSession = null;
}

// ─── Authenticate from raw credentials (for /api/geotab/connect) ─────────────

/**
 * Authenticate with explicit credentials (username + password).
 * Returns a GeotabCredentials object with the sessionId set.
 * Never cached — caller is responsible for storing the result.
 */
export async function authenticateWith(
  database: string,
  userName: string,
  password: string,
  server = "my.geotab.com"
): Promise<GeotabCredentials> {
  const result = await geotabPost<AuthResult>(server, "Authenticate", {
    database,
    userName,
    password,
  });

  const effectiveServer =
    result.path && result.path !== "ThisServer" ? result.path : server;

  return {
    userName: result.credentials.userName,
    sessionId: result.credentials.sessionId,
    database: result.credentials.database,
    server: effectiveServer,
  };
}

// ─── Authenticated API call ───────────────────────────────────────────────────

/**
 * Make an authenticated Geotab API call.
 *
 * If `userCreds` is provided, uses it directly (per-user session from cookie).
 * Otherwise falls back to the cached env-var demo session, re-authenticating
 * on session-expiry errors.
 */
export async function geotabCall<T>(
  method: string,
  params: Record<string, unknown>,
  userCreds?: GeotabCredentials | null
): Promise<T> {
  if (userCreds) {
    // Per-user mode: use the session from the cookie directly.
    // If the session has expired, let the error propagate — the user will need
    // to log in again (same UX as any web app with an expiring session).
    return geotabPost<T>(userCreds.server, method, {
      ...params,
      credentials: {
        userName: userCreds.userName,
        sessionId: userCreds.sessionId,
        database: userCreds.database,
      },
    });
  }

  // Demo / env-var mode: cache the session and retry once on expiry.
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

export async function getDevices(
  userCreds?: GeotabCredentials | null
): Promise<GeotabDevice[]> {
  return geotabCall<GeotabDevice[]>("Get", { typeName: "Device" }, userCreds);
}

// ─── Group queries ────────────────────────────────────────────────────────────

export async function getGroups(
  userCreds?: GeotabCredentials | null
): Promise<GeotabGroup[]> {
  return geotabCall<GeotabGroup[]>("Get", { typeName: "Group" }, userCreds);
}

// ─── Trip queries ─────────────────────────────────────────────────────────────

export async function getTrips(
  deviceId: string,
  fromDate: string,
  toDate: string,
  userCreds?: GeotabCredentials | null
): Promise<GeotabTrip[]> {
  return geotabCall<GeotabTrip[]>(
    "Get",
    {
      typeName: "Trip",
      search: {
        deviceSearch: { id: deviceId },
        fromDate,
        toDate,
      },
    },
    userCreds
  );
}

// ─── GPS breadcrumb queries ───────────────────────────────────────────────────

export async function getLogRecords(
  deviceId: string,
  fromDate: string,
  toDate: string,
  userCreds?: GeotabCredentials | null
): Promise<GeotabLogRecord[]> {
  return geotabCall<GeotabLogRecord[]>(
    "Get",
    {
      typeName: "LogRecord",
      search: {
        deviceSearch: { id: deviceId },
        fromDate,
        toDate,
      },
      resultsLimit: 5000,
    },
    userCreds
  );
}

// ─── Device status ────────────────────────────────────────────────────────────

export async function getDeviceStatus(
  deviceIds?: string[],
  userCreds?: GeotabCredentials | null
): Promise<GeotabDeviceStatusInfo[]> {
  // When a single device is requested, use deviceSearch for a targeted call.
  const search =
    deviceIds && deviceIds.length === 1
      ? { deviceSearch: { id: deviceIds[0] } }
      : undefined;

  return geotabCall<GeotabDeviceStatusInfo[]>(
    "Get",
    {
      typeName: "DeviceStatusInfo",
      search,
    },
    userCreds
  );
}

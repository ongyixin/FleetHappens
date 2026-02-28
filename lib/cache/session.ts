/**
 * lib/cache/session.ts
 *
 * In-process Geotab session cache.
 *
 * Why in-process (not Redis/DB)?
 *   – Single-server hackathon deployment; no need for distributed cache.
 *   – Geotab sessions last ~24 h; one auth call per server restart is fine.
 *   – Adding Redis would increase demo-night failure surface.
 *
 * The cache stores the full GeotabSession (credentials + resolved server).
 * TTL defaults to 23 hours — safely under Geotab's session lifetime.
 *
 * NOTE: This module uses a module-level variable, which persists for the
 * lifetime of the Node.js process. In serverless deployments (Vercel Edge),
 * each cold start loses the cache — this is acceptable for hackathon scale.
 */

interface CachedSession {
  credentials: {
    database: string;
    userName: string;
    sessionId: string;
  };
  server: string;
}

interface SessionEntry {
  session: CachedSession;
  expiresAt: number; // ms timestamp
}

const SESSION_TTL_MS = 23 * 60 * 60 * 1000; // 23 hours

// Module-level cache — persists across route handler invocations in one process
let entry: SessionEntry | null = null;

export const sessionCache = {
  get(): CachedSession | null {
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      entry = null;
      return null;
    }
    return entry.session;
  },

  set(session: CachedSession): void {
    entry = {
      session,
      expiresAt: Date.now() + SESSION_TTL_MS,
    };
  },

  clear(): void {
    entry = null;
  },

  /** Returns true if a valid session is cached. */
  has(): boolean {
    return sessionCache.get() !== null;
  },
};

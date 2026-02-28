/**
 * lib/cache/fallback.ts
 *
 * Two-tier caching strategy for demo stability:
 *   1. In-memory cache (fast, process-lifetime, TTL-gated)
 *   2. File fallback   (public/fallback/<filename>, loaded when live call fails)
 *
 * Usage:
 *   const { data, fromCache } = await withFallback(
 *     () => fetchSomething(),
 *     "something.json"
 *   );
 *
 * The fallback file format must match whatever `fn` returns — the file is
 * loaded as-is and returned with `fromCache: true`.
 */

import path from "path";
import fs from "fs";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CacheEntry<T> {
  data: T;
  cachedAt: number;
}

export interface CacheResult<T> {
  data: T;
  fromCache: boolean;
}

// ─── Config ───────────────────────────────────────────────────────────────────

/** Default TTL: 5 minutes.  Ace queries are slow so we hold results longer. */
const DEFAULT_TTL_MS = 5 * 60 * 1000;

/** TTL for Ace results (queries take 30-90s — cache longer to protect UX). */
export const ACE_TTL_MS = 30 * 60 * 1000;

// ─── Store ────────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const store = new Map<string, CacheEntry<any>>();

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Wrap an async data-fetching function with two-tier fallback.
 *
 * Flow (normal mode):
 *   1. Serve from memory cache if entry is fresh (ttlMs).
 *   2. Call fn(); on success, update memory cache and return fresh data.
 *   3. On failure, serve stale memory cache if available.
 *   4. On failure with no memory cache, load public/fallback/<filename>.
 *   5. If no fallback file, re-throw the original error.
 *
 * Demo mode (PULSE_DEMO_GROUPS=true):
 *   Steps 2–3 are skipped entirely — no live API calls are ever attempted.
 *   Goes straight to the file fallback (step 4), then throws if not found.
 */
export async function withFallback<T>(
  fn: () => Promise<T>,
  filename: string,
  ttlMs = DEFAULT_TTL_MS
): Promise<CacheResult<T>> {
  const entry = store.get(filename) as CacheEntry<T> | undefined;

  // 1. Serve fresh memory cache (always, including demo mode)
  if (entry && Date.now() - entry.cachedAt < ttlMs) {
    return { data: entry.data, fromCache: true };
  }

  // Demo mode: skip all live calls — go straight to file fallback.
  if (process.env.PULSE_DEMO_GROUPS === "true") {
    const fileFallback = loadFileFallback<T>(filename);
    if (fileFallback !== null) {
      store.set(filename, { data: fileFallback, cachedAt: Date.now() });
      return { data: fileFallback, fromCache: true };
    }
    throw new Error(`[demo] No fallback file found for "${filename}"`);
  }

  // 2. Try live call
  try {
    const data = await fn();
    store.set(filename, { data, cachedAt: Date.now() });
    return { data, fromCache: false };
  } catch (liveErr) {
    // 3. Stale memory fallback
    if (entry) {
      console.warn(
        `[cache] Live call failed for "${filename}" — serving stale cache. Error: ${liveErr}`
      );
      return { data: entry.data, fromCache: true };
    }

    // 4. File fallback
    const fileFallback = loadFileFallback<T>(filename);
    if (fileFallback !== null) {
      // Seed memory cache with file data (half-TTL so a retry happens soon)
      store.set(filename, { data: fileFallback, cachedAt: Date.now() - ttlMs / 2 });
      console.warn(`[cache] Using file fallback for "${filename}".`);
      return { data: fileFallback, fromCache: true };
    }

    // 5. No fallback — propagate
    throw liveErr;
  }
}

/**
 * Manually seed the memory cache (e.g. after a background prefetch).
 */
export function setCacheEntry<T>(filename: string, data: T): void {
  store.set(filename, { data, cachedAt: Date.now() });
}

/**
 * Invalidate a specific entry (forces the next call to go live).
 */
export function invalidateCache(filename: string): void {
  store.delete(filename);
}

/**
 * Invalidate all entries whose filenames start with a given prefix.
 * Useful for clearing all ace-* entries at once.
 */
export function invalidateCacheByPrefix(prefix: string): void {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Read a file from public/fallback/<filename> and parse it as JSON.
 * Returns null if the file does not exist or cannot be parsed.
 * Exported so API routes can load fallback data directly (e.g. demo mode).
 */
export function loadFileFallback<T>(filename: string): T | null {
  try {
    const filePath = path.join(process.cwd(), "public", "fallback", filename);
    const raw = fs.readFileSync(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/**
 * Server-side in-memory PDF cache for Teams share integration.
 *
 * PDFs are stored by a UUID token for 1 hour, then evicted lazily.
 * The download route (/api/integrations/report-download/[token]) reads from here.
 *
 * This module lives in the Node.js server process and survives across requests
 * for the lifetime of the process (fine for demo/hackathon; use object storage
 * in a production multi-instance deployment).
 */

import { randomUUID } from "crypto";

const TTL_MS = 60 * 60 * 1000; // 1 hour

interface CacheEntry {
  buffer: Buffer;
  filename: string;
  expiresAt: number;
}

// Module-level singleton — persists across requests within one server process.
const PDF_CACHE = new Map<string, CacheEntry>();

/**
 * Stores a PDF buffer and returns a UUID token for later retrieval.
 */
export function storePdf(buffer: Buffer, filename: string): string {
  const token = randomUUID();
  PDF_CACHE.set(token, {
    buffer,
    filename,
    expiresAt: Date.now() + TTL_MS,
  });
  return token;
}

/**
 * Retrieves a PDF by token. Returns null if the token is unknown or expired.
 * Expired entries are evicted on access.
 */
export function retrievePdf(token: string): { buffer: Buffer; filename: string } | null {
  const entry = PDF_CACHE.get(token);
  if (!entry) return null;

  if (Date.now() > entry.expiresAt) {
    PDF_CACHE.delete(token);
    return null;
  }

  return { buffer: entry.buffer, filename: entry.filename };
}

/**
 * lib/geotab/session.ts
 *
 * Cookie-based per-user Geotab session management.
 *
 * The session cookie holds an AES-256-GCM-encrypted JSON payload containing
 * only the server-side sessionId, server, database, and userName — never the
 * raw password.  The cookie is httpOnly and SameSite=Lax so it cannot be read
 * by client-side JavaScript.
 *
 * Encryption uses NODE's built-in `crypto` (no extra dependencies).
 * SESSION_SECRET must be a 64-character hex string (32 bytes).
 */

import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import type { GeotabCredentials } from "@/types";

export const SESSION_COOKIE = "geotab_session";

// ─── Key derivation ───────────────────────────────────────────────────────────

function getKey(): Buffer {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 64) {
    // Fall back to a deterministic dev key so the app still works without the var,
    // but warn loudly so developers know to set it in production.
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "SESSION_SECRET env var must be set to a 64-char hex string in production"
      );
    }
    return Buffer.from("0".repeat(64), "hex");
  }
  return Buffer.from(secret.slice(0, 64), "hex");
}

// ─── Encrypt / Decrypt ────────────────────────────────────────────────────────

/**
 * Encrypt a GeotabCredentials object into a compact string suitable for a cookie value.
 * Format: <iv_hex>:<authTag_hex>:<ciphertext_hex>
 */
export function encryptSession(creds: GeotabCredentials): string {
  const key = getKey();
  const iv = randomBytes(12); // 96-bit IV for GCM
  const cipher = createCipheriv("aes-256-gcm", key, iv);

  const plaintext = JSON.stringify(creds);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    iv.toString("hex"),
    authTag.toString("hex"),
    encrypted.toString("hex"),
  ].join(":");
}

/**
 * Decrypt a cookie value back to GeotabCredentials.
 * Returns null if the value is missing, malformed, or tampered with.
 */
export function decryptSession(value: string): GeotabCredentials | null {
  try {
    const parts = value.split(":");
    if (parts.length !== 3) return null;

    const [ivHex, authTagHex, ciphertextHex] = parts;
    const key = getKey();
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    const ciphertext = Buffer.from(ciphertextHex, "hex");

    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);

    const creds = JSON.parse(decrypted.toString("utf8")) as GeotabCredentials;

    // Basic shape validation
    if (!creds.sessionId || !creds.database || !creds.userName || !creds.server) {
      return null;
    }

    return creds;
  } catch {
    return null;
  }
}

// ─── Request helpers ──────────────────────────────────────────────────────────

/**
 * Read the session from an incoming NextRequest's cookies.
 * Returns null if no valid session cookie exists (demo / unauthenticated).
 */
export function getSessionFromRequest(req: NextRequest): GeotabCredentials | null {
  const value = req.cookies.get(SESSION_COOKIE)?.value;
  if (!value) return null;
  return decryptSession(value);
}

/**
 * Read the session from the Next.js cookies() store (for Server Components /
 * Route Handlers that don't receive a NextRequest parameter).
 */
export async function getSessionFromCookies(): Promise<GeotabCredentials | null> {
  const cookieStore = await cookies();
  const value = cookieStore.get(SESSION_COOKIE)?.value;
  if (!value) return null;
  return decryptSession(value);
}

// ─── Cookie attributes ────────────────────────────────────────────────────────

/** Returns the Set-Cookie attributes for the session cookie. */
export function sessionCookieOptions(maxAgeSecs = 60 * 60 * 8): Record<string, string | boolean | number> {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSecs,
  };
}

/**
 * POST /api/geotab/connect  — authenticate a user with their own MyGeotab database
 * DELETE /api/geotab/connect — log out (clear session cookie)
 *
 * POST body: { database: string; userName: string; password: string; server?: string }
 *
 * On success the response sets an httpOnly encrypted session cookie containing
 * only the Geotab sessionId, server, database, and userName — never the password.
 */

import { NextRequest, NextResponse } from "next/server";
import { authenticateWith } from "@/lib/geotab/client";
import {
  encryptSession,
  SESSION_COOKIE,
  sessionCookieOptions,
} from "@/lib/geotab/session";
import type { ApiResponse } from "@/types";

// ─── POST: login ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  const { database, userName, password, server } = body as {
    database?: string;
    userName?: string;
    password?: string;
    server?: string;
  };

  if (!database || !userName || !password) {
    return NextResponse.json(
      {
        ok: false,
        error: "database, userName, and password are required",
      } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  try {
    const creds = await authenticateWith(
      database.trim(),
      userName.trim(),
      password,
      (server?.trim() || "my.geotab.com")
    );

    const encrypted = encryptSession(creds);
    const opts = sessionCookieOptions();

    const response = NextResponse.json({
      ok: true,
      data: { database: creds.database, server: creds.server },
    } satisfies ApiResponse<{ database: string; server: string }>);

    response.cookies.set(SESSION_COOKIE, encrypted, {
      httpOnly: opts.httpOnly as boolean,
      secure: opts.secure as boolean,
      sameSite: opts.sameSite as "lax",
      path: opts.path as string,
      maxAge: opts.maxAge as number,
    });

    return response;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Authentication failed";

    // Translate Geotab error messages into user-friendly text
    const userMessage =
      msg.toLowerCase().includes("invaliduser") ||
      msg.toLowerCase().includes("incorrect login")
        ? "Invalid database, username, or password. Please check your MyGeotab credentials."
        : msg.toLowerCase().includes("database")
        ? "Database not found. Check that the database name is correct."
        : "Could not connect to MyGeotab. Please verify your credentials and try again.";

    return NextResponse.json(
      { ok: false, error: userMessage } satisfies ApiResponse<never>,
      { status: 401 }
    );
  }
}

// ─── DELETE: logout ───────────────────────────────────────────────────────────

export async function DELETE(): Promise<NextResponse> {
  const response = NextResponse.json({ ok: true } as { ok: true });

  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0, // immediately expire
  });

  return response;
}

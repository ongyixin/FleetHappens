/**
 * GET /api/geotab/auth
 * Verifies Geotab credentials are configured and returns auth status.
 * Never returns session tokens to the client — session lives server-side only.
 *
 * When a user has connected their own database (cookie present), returns their
 * database info and isDemo: false.  Otherwise falls back to the env-var demo
 * account and returns isDemo: true.
 *
 * Owner: Geotab Integration Agent
 */

import { NextRequest, NextResponse } from "next/server";
import { authenticate } from "@/lib/geotab/client";
import { getSessionFromRequest } from "@/lib/geotab/session";
import type { ApiResponse } from "@/types";

export async function GET(req: NextRequest): Promise<NextResponse> {
  // Per-user session takes priority over demo credentials
  const userCreds = getSessionFromRequest(req);
  if (userCreds) {
    const response: ApiResponse<{ database: string; server: string; isDemo: boolean }> = {
      ok: true,
      data: {
        database: userCreds.database,
        server: userCreds.server,
        isDemo: false,
      },
    };
    return NextResponse.json(response);
  }

  // Fall back to demo / env-var auth
  try {
    const creds = await authenticate();
    const response: ApiResponse<{ database: string; server: string; isDemo: boolean }> = {
      ok: true,
      data: { database: creds.database, server: creds.server, isDemo: true },
    };
    return NextResponse.json(response);
  } catch (err) {
    const response: ApiResponse<never> = {
      ok: false,
      error: err instanceof Error ? err.message : "Authentication failed",
    };
    return NextResponse.json(response, { status: 401 });
  }
}

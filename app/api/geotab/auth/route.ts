/**
 * GET /api/geotab/auth
 * Verifies Geotab credentials are configured and returns auth status.
 * Never returns session tokens to the client — session lives server-side only.
 *
 * Owner: Geotab Integration Agent
 */

import { NextResponse } from "next/server";
import { authenticate } from "@/lib/geotab/client";
import type { ApiResponse } from "@/types";

export async function GET(): Promise<NextResponse> {
  try {
    const creds = await authenticate();
    const response: ApiResponse<{ database: string; server: string }> = {
      ok: true,
      data: { database: creds.database, server: creds.server },
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

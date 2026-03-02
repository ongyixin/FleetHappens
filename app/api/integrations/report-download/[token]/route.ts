/**
 * GET /api/integrations/report-download/[token]
 *
 * Serves a PDF that was cached by the Teams share flow.
 * Tokens are valid for 1 hour; expired or unknown tokens return 404.
 */

import { NextRequest } from "next/server";
import { retrievePdf } from "@/lib/integrations/pdf-cache";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: { token: string } },
) {
  const { token } = params;

  if (!token || typeof token !== "string") {
    return new Response("Missing token", { status: 400 });
  }

  const entry = retrievePdf(token);

  if (!entry) {
    return new Response("Report not found or link has expired", { status: 404 });
  }

  return new Response(new Uint8Array(entry.buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${entry.filename}"`,
      "Content-Length": String(entry.buffer.byteLength),
      "Cache-Control": "no-store",
    },
  });
}

/**
 * POST /api/integrations/slack/share
 *
 * Sends a structured Slack message to the configured SLACK_WEBHOOK_URL,
 * or uploads a PDF file when SLACK_BOT_TOKEN + SLACK_CHANNEL_ID are set.
 * Falls back to mock mode when no Slack credentials are configured.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sendSlackMessage } from "@/lib/integrations/slack";
import type { ApiResponse } from "@/types";
import type { SharePayload, ShareResult } from "@/types/integrations";

// ─── Validation schema ────────────────────────────────────────────────────────

const ShareMetricSchema = z.object({
  label: z.string().min(1),
  value: z.string().min(1),
});

const SharePayloadSchema = z.object({
  title:       z.string().min(1).max(200),
  summary:     z.string().min(1).max(1000),
  metrics:     z.array(ShareMetricSchema).max(20),
  linkUrl:     z.string().url(),
  source:      z.enum(["story", "digest", "pulse"]),
  userMessage: z.string().max(500).optional(),
  // pdfContext carries complex nested data validated by the PDF generation routes
  pdfContext:  z.unknown().optional(),
});

function resolveAppUrl(req: NextRequest): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  if (!configured) return req.nextUrl.origin;

  try {
    const host = new URL(configured).hostname;
    if (host === "localhost" || host === "127.0.0.1") {
      return req.nextUrl.origin;
    }
  } catch {
    return req.nextUrl.origin;
  }

  return configured;
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse<ApiResponse<ShareResult>>> {
  let rawBody: Record<string, unknown>;
  try {
    rawBody = await req.json() as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const parsed = SharePayloadSchema.safeParse(rawBody);
  if (!parsed.success) {
    const issues = parsed.error.flatten().fieldErrors;
    return NextResponse.json(
      { ok: false, error: "Invalid payload", code: JSON.stringify(issues) },
      { status: 400 }
    );
  }

  // Re-attach pdfContext from raw body (Zod passes it through as unknown)
  const payload: SharePayload = {
    ...parsed.data,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pdfContext: rawBody.pdfContext as SharePayload["pdfContext"],
  };

  try {
    const result = await sendSlackMessage(payload, resolveAppUrl(req));
    return NextResponse.json({ ok: true, data: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to send Slack message";
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }
}

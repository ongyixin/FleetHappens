/**
 * POST /api/assistant/query
 *
 * FleetHappens AI assistant query endpoint.
 *
 * Flow:
 *   1. Validate request body
 *   2. Classify intent (keyword fallback → LLM)
 *   3. Resolve intent to a structured response (calls existing API routes)
 *   4. Return AssistantResponse
 *
 * Constraints:
 *   - Never calls Ace (too slow for interactive use)
 *   - LLM is only used for classification and narration, never for fleet facts
 *   - Always returns a useful response, even on error
 */

import { NextRequest, NextResponse } from "next/server";
import type { ApiResponse, AssistantResponse, AssistantQueryRequest } from "@/types";
import { classifyIntent } from "@/lib/assistant/intents";
import { resolveIntent } from "@/lib/assistant/resolver";

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: AssistantQueryRequest;

  try {
    body = await req.json();
  } catch {
    const response: ApiResponse<AssistantResponse> = {
      ok: false,
      error: "Invalid request body — expected JSON with a 'query' field.",
    };
    return NextResponse.json(response, { status: 400 });
  }

  const { query, context } = body;

  if (!query || typeof query !== "string" || query.trim().length === 0) {
    const response: ApiResponse<AssistantResponse> = {
      ok: false,
      error: "Missing or empty 'query' field.",
    };
    return NextResponse.json(response, { status: 400 });
  }

  if (query.trim().length > 500) {
    const response: ApiResponse<AssistantResponse> = {
      ok: false,
      error: "Query too long — maximum 500 characters.",
    };
    return NextResponse.json(response, { status: 400 });
  }

  const normalizedContext = context ?? { currentPage: "home" as const };

  try {
    // Step 1: Classify intent
    const { intent, fromFallback } = await classifyIntent(query.trim(), normalizedContext);

    // Step 2: Resolve to a structured response
    const assistantResponse = await resolveIntent(
      intent,
      normalizedContext,
      fromFallback,
      query.trim()
    );

    // Tag with fallback flag if applicable
    if (fromFallback) {
      assistantResponse.fromFallback = true;
    }

    const response: ApiResponse<AssistantResponse> = {
      ok: true,
      data: assistantResponse,
    };
    return NextResponse.json(response);
  } catch (err) {
    // Always return a usable response — never a raw 500
    const fallbackResponse: AssistantResponse = {
      text: "I ran into an issue processing your query. Try navigating directly using the links below.",
      action: { type: "navigate", url: "/pulse", label: "Open Fleet Pulse" },
      suggestions: ["Open Fleet Pulse", "Go to dashboard"],
      fromFallback: true,
    };

    const response: ApiResponse<AssistantResponse> = {
      ok: true,
      data: fallbackResponse,
    };

    console.error("[assistant/query] Error:", err instanceof Error ? err.message : err);
    return NextResponse.json(response);
  }
}

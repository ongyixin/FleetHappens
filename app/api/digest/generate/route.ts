/**
 * POST /api/digest/generate
 *
 * Generates a Fleet Daily Digest — an LLM-narrated morning briefing that
 * synthesises fleet KPIs into a headline, 3-4 insight bullets, and a
 * "stat of the day" callout.
 *
 * Request body: DigestRequestBody
 * Response:     ApiResponse<DigestResult>
 *
 * Falls back to a deterministically-computed narrative if the LLM is
 * unavailable or times out, so the UI always has something to display.
 */

import { NextRequest, NextResponse } from "next/server";
import type { ApiResponse } from "@/types";

// ─── Shared types (also exported for the component) ──────────────────────────

export type InsightType = "positive" | "neutral" | "alert" | "record";

export interface DigestInsight {
  type: InsightType;
  text: string;
}

export interface DigestResult {
  headline: string;
  insights: DigestInsight[];
  statOfDay: {
    label: string;
    value: string;
    context: string;
  };
  generatedAt: string;
  fromLLM: boolean;
}

interface DigestRequestBody {
  totals: {
    vehicles: number;
    activeVehicles: number;
    distanceKm: number;
    trips: number;
    avgIdlePct: number;
  };
  fleetNames: string[];
  aceRows: Record<string, string | number>[];
}

// ─── Prompt builder ──────────────────────────────────────────────────────────

function buildPrompt(body: DigestRequestBody): string {
  const { totals, fleetNames, aceRows } = body;
  const { vehicles, activeVehicles, distanceKm, trips, avgIdlePct } = totals;

  const fmtDist =
    distanceKm >= 1000
      ? `${(distanceKm / 1000).toFixed(1)}k km`
      : `${Math.round(distanceKm)} km`;

  const aceSection =
    aceRows.length > 0
      ? `\nFleet group performance (last 7 days):\n${aceRows
          .slice(0, 5)
          .map((r) => {
            const name = r.group_name ?? r.device_name ?? "Fleet";
            const dist =
              r.total_distance_km != null ? `${r.total_distance_km} km` : "";
            const tc =
              r.trip_count != null ? `${r.trip_count} trips` : "";
            return `  - ${name}: ${[dist, tc].filter(Boolean).join(", ")}`;
          })
          .join("\n")}`
      : "";

  return `You are a fleet operations intelligence writer. Write a concise daily briefing.

Fleet metrics (last 7 days):
- Vehicles: ${vehicles} total, ${activeVehicles} active today
- Distance: ${fmtDist} across ${trips} trips
- Average idle: ${avgIdlePct > 0 ? `${avgIdlePct.toFixed(1)}%` : "data pending"}
- Fleet groups: ${fleetNames.join(", ") || "All Vehicles"}${aceSection}

Return ONLY a valid JSON object (no markdown, no extra text):
{
  "headline": "One punchy sentence. Active voice. Include one key metric. Max 20 words.",
  "insights": [
    { "type": "positive|neutral|alert|record", "text": "max 12 words per insight" }
  ],
  "statOfDay": {
    "label": "metric name (2-3 words)",
    "value": "formatted number with unit",
    "context": "one sentence, max 10 words"
  }
}

Include exactly 3-4 insights. Types: positive=good trend, neutral=informational, alert=needs attention, record=new record or achievement. Return only valid JSON.`;
}

// ─── Deterministic fallback ───────────────────────────────────────────────────

function computeFallback(body: DigestRequestBody): DigestResult {
  const { totals, fleetNames, aceRows } = body;
  const { vehicles, activeVehicles, distanceKm, trips, avgIdlePct } = totals;

  const activeRatio =
    vehicles > 0 ? Math.round((activeVehicles / vehicles) * 100) : 0;
  const fmtDist =
    distanceKm >= 1000
      ? `${(distanceKm / 1000).toFixed(1)}k km`
      : `${Math.round(distanceKm).toLocaleString()} km`;

  const headline =
    trips > 0 && distanceKm > 0
      ? `Your fleet covered ${fmtDist} across ${trips} trips — ${activeVehicles} vehicles active today.`
      : `${activeVehicles} of ${vehicles} vehicles are active across ${fleetNames.length || 1} fleet group${fleetNames.length !== 1 ? "s" : ""}.`;

  const insights: DigestInsight[] = [];

  if (distanceKm > 0) {
    insights.push({
      type: "positive",
      text: `Fleet covered ${fmtDist} across ${fleetNames.length || 1} group${fleetNames.length !== 1 ? "s" : ""} this week.`,
    });
  }

  if (avgIdlePct > 0) {
    const type: InsightType =
      avgIdlePct > 25 ? "alert" : avgIdlePct < 15 ? "positive" : "neutral";
    insights.push({
      type,
      text: `Average idle time was ${avgIdlePct.toFixed(1)}% of total drive time.`,
    });
  }

  const topRow = aceRows[0];
  if (topRow) {
    const name = String(topRow.group_name ?? topRow.device_name ?? "Top fleet");
    const dist =
      topRow.total_distance_km != null
        ? ` with ${Number(topRow.total_distance_km).toFixed(0)} km`
        : "";
    insights.push({
      type: "record",
      text: `${name} led all groups${dist} this week.`,
    });
  }

  insights.push({
    type: "neutral",
    text: `${activeRatio}% of all vehicles were active in the last 24 hours.`,
  });

  const statOfDay =
    topRow && topRow.total_distance_km != null
      ? {
          label: "Top fleet distance",
          value: `${Number(topRow.total_distance_km).toFixed(0)} km`,
          context: `${String(topRow.group_name ?? topRow.device_name ?? "Lead group")} over the last 7 days.`,
        }
      : {
          label: "Active vehicles",
          value: `${activeVehicles} / ${vehicles}`,
          context: `${activeRatio}% of fleet active in the last 24 hours.`,
        };

  return {
    headline,
    insights: insights.slice(0, 4),
    statOfDay,
    generatedAt: new Date().toISOString(),
    fromLLM: false,
  };
}

// ─── LLM callers ─────────────────────────────────────────────────────────────

async function callGemini(prompt: string): Promise<string> {
  const { VertexAI } = await import("@google-cloud/vertexai");
  const project = process.env.GOOGLE_CLOUD_PROJECT!;
  const location = process.env.GOOGLE_CLOUD_LOCATION ?? "us-central1";
  const vertexAI = new VertexAI({ project, location });
  const model = vertexAI.getGenerativeModel({
    model: "gemini-1.5-pro",
    generationConfig: {
      maxOutputTokens: 512,
      temperature: 0.65,
      responseMimeType: "application/json",
    },
  });
  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  });
  const text =
    result.response.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  if (!text) throw new Error("Gemini returned empty response");
  return text;
}

async function callAnthropic(prompt: string): Promise<string> {
  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const msg = await client.messages.create({
    model: "claude-3-5-haiku-20241022",
    max_tokens: 512,
    messages: [{ role: "user", content: prompt }],
  });
  const block = msg.content[0];
  if (block.type !== "text") throw new Error("Anthropic returned non-text block");
  return block.text;
}

async function callOpenAI(prompt: string): Promise<string> {
  const OpenAI = (await import("openai")).default;
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 512,
    response_format: { type: "json_object" },
  });
  return completion.choices[0]?.message?.content ?? "";
}

async function callLLM(prompt: string): Promise<string> {
  if (process.env.GOOGLE_CLOUD_PROJECT) return callGemini(prompt);
  if (process.env.ANTHROPIC_API_KEY) return callAnthropic(prompt);
  if (process.env.OPENAI_API_KEY) return callOpenAI(prompt);
  throw new Error("No LLM provider configured");
}

// ─── Response parser ──────────────────────────────────────────────────────────

function parseDigestJSON(raw: string): DigestResult {
  const cleaned = raw.replace(/```json\n?|\n?```/g, "").trim();
  const parsed = JSON.parse(cleaned) as {
    headline?: unknown;
    insights?: Array<{ type?: string; text?: string }>;
    statOfDay?: { label?: unknown; value?: unknown; context?: unknown };
  };

  if (!parsed.headline || !Array.isArray(parsed.insights) || !parsed.statOfDay) {
    throw new Error("Invalid digest JSON structure");
  }

  const validTypes = new Set<InsightType>(["positive", "neutral", "alert", "record"]);
  const insights: DigestInsight[] = (parsed.insights as Array<{ type?: string; text?: string }>)
    .filter((i) => i.text)
    .slice(0, 4)
    .map((i) => ({
      type: validTypes.has(i.type as InsightType)
        ? (i.type as InsightType)
        : "neutral",
      text: String(i.text),
    }));

  return {
    headline: String(parsed.headline),
    insights,
    statOfDay: {
      label: String(parsed.statOfDay.label ?? "Key metric"),
      value: String(parsed.statOfDay.value ?? "—"),
      context: String(parsed.statOfDay.context ?? ""),
    },
    generatedAt: new Date().toISOString(),
    fromLLM: true,
  };
}

// ─── Handler ─────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: DigestRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  if (!body?.totals) {
    return NextResponse.json(
      { ok: false, error: "Missing totals in request body" } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  try {
    const prompt = buildPrompt(body);
    const raw = await callLLM(prompt);
    const digest = parseDigestJSON(raw);
    return NextResponse.json(
      { ok: true, data: digest } satisfies ApiResponse<DigestResult>
    );
  } catch (err) {
    console.error(
      "[digest/generate] LLM failed, using fallback:",
      err instanceof Error ? err.message : err
    );
    const fallback = computeFallback(body);
    return NextResponse.json(
      { ok: true, data: fallback } satisfies ApiResponse<DigestResult>
    );
  }
}

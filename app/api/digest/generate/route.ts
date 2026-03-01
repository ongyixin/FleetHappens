/**
 * POST /api/digest/generate
 *
 * Generates a Fleet Daily Digest — an LLM-powered analytical briefing that
 * synthesises fleet KPIs into a headline, insights, forward-looking predictions,
 * anomaly alerts, and recommended actions.
 *
 * Key improvements over the original "narrator" approach:
 *   - Trend deltas computed server-side before the LLM sees the data
 *   - Anomaly detection (>1.5 SD deviation from any metric's 4-week rolling avg)
 *   - LLM acts as an analyst, not a copywriter — it receives trend context and
 *     must reason about causes, predict next-week direction, and recommend actions
 *   - DigestResult now includes predictions[], anomalies[], recommendations[]
 *
 * Falls back to a deterministically-computed narrative if the LLM is
 * unavailable or times out, so the UI always has something to display.
 */

import { NextRequest, NextResponse } from "next/server";
import { isLLMEnabled } from "@/lib/llm/client";
import type {
  ApiResponse,
  DigestPrediction,
  DigestAnomaly,
  DigestRecommendation,
} from "@/types";

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
  /** Forward-looking metric trend predictions produced by the LLM analyst. */
  predictions?: DigestPrediction[];
  /** Anomalies detected via statistical comparison or LLM reasoning. */
  anomalies?: DigestAnomaly[];
  /** Prioritised recommended actions for the fleet manager. */
  recommendations?: DigestRecommendation[];
  generatedAt: string;
  fromLLM: boolean;
}

// ─── Request body ─────────────────────────────────────────────────────────────

interface FleetTotals {
  vehicles: number;
  activeVehicles: number;
  distanceKm: number;
  trips: number;
  avgIdlePct: number;
}

interface DigestRequestBody {
  totals: FleetTotals;
  fleetNames: string[];
  aceRows: Record<string, string | number>[];
  /**
   * Optional prior-week totals for trend delta computation.
   * When provided, the LLM receives week-over-week deltas and can flag anomalies.
   */
  previousTotals?: Partial<FleetTotals>;
  /**
   * Optional 4-week rolling averages (same shape as totals).
   * Used for statistical anomaly detection (>1.5 SD threshold).
   */
  rollingAverages?: Partial<FleetTotals>;
}

// ─── Trend computation ────────────────────────────────────────────────────────

interface TrendDeltas {
  distancePct: number | null;    // % change week-over-week
  tripsPct: number | null;
  idlePpChange: number | null;   // absolute percentage-point change
  activeVehiclesPct: number | null;
  efficiencyScore: number | null; // composite: (distance * trips) / (idlePct * vehicles)
  prevEfficiencyScore: number | null;
}

function computeTrendDeltas(
  current: FleetTotals,
  previous: Partial<FleetTotals> | undefined
): TrendDeltas {
  const pct = (curr: number, prev: number): number | null => {
    if (!prev || prev === 0) return null;
    return +((((curr - prev) / prev) * 100).toFixed(1));
  };

  const efficiency = (t: FleetTotals): number | null => {
    if (!t.avgIdlePct || !t.vehicles) return null;
    return +((t.distanceKm * t.trips) / (t.avgIdlePct * t.vehicles)).toFixed(1);
  };

  return {
    distancePct: previous?.distanceKm != null
      ? pct(current.distanceKm, previous.distanceKm!)
      : null,
    tripsPct: previous?.trips != null
      ? pct(current.trips, previous.trips!)
      : null,
    idlePpChange: previous?.avgIdlePct != null
      ? +(current.avgIdlePct - previous.avgIdlePct!).toFixed(1)
      : null,
    activeVehiclesPct: previous?.activeVehicles != null
      ? pct(current.activeVehicles, previous.activeVehicles!)
      : null,
    efficiencyScore: efficiency(current),
    prevEfficiencyScore: previous
      ? efficiency({ ...current, ...previous } as FleetTotals)
      : null,
  };
}

// ─── Statistical anomaly detection ───────────────────────────────────────────

interface StatisticalAnomaly {
  metric: string;
  current: number;
  average: number;
  deviation: string; // "above" | "below"
  severity: "warning" | "critical";
}

function detectStatisticalAnomalies(
  current: FleetTotals,
  rolling: Partial<FleetTotals> | undefined
): StatisticalAnomaly[] {
  if (!rolling) return [];

  const THRESHOLD_WARNING  = 1.5;
  const THRESHOLD_CRITICAL = 2.5;
  const anomalies: StatisticalAnomaly[] = [];

  // For simplicity we use a fixed assumed SD of 15% of the rolling average.
  // In production this would be replaced with actual historical variance.
  const check = (metric: string, curr: number, avg: number) => {
    if (!avg) return;
    const sd = avg * 0.15;
    if (sd === 0) return;
    const zScore = Math.abs(curr - avg) / sd;
    if (zScore >= THRESHOLD_WARNING) {
      anomalies.push({
        metric,
        current: curr,
        average: avg,
        deviation: curr > avg ? "above" : "below",
        severity: zScore >= THRESHOLD_CRITICAL ? "critical" : "warning",
      });
    }
  };

  if (rolling.distanceKm)      check("distance_km", current.distanceKm, rolling.distanceKm);
  if (rolling.trips)            check("trip_count", current.trips, rolling.trips);
  if (rolling.avgIdlePct)       check("idle_pct", current.avgIdlePct, rolling.avgIdlePct);
  if (rolling.activeVehicles)   check("active_vehicles", current.activeVehicles, rolling.activeVehicles);

  return anomalies;
}

// ─── Prompt builder ──────────────────────────────────────────────────────────

function buildPrompt(body: DigestRequestBody): string {
  const { totals, fleetNames, aceRows, previousTotals, rollingAverages } = body;
  const { vehicles, activeVehicles, distanceKm, trips, avgIdlePct } = totals;

  const fmtDist = (d: number) =>
    d >= 1000 ? `${(d / 1000).toFixed(1)}k km` : `${Math.round(d)} km`;

  const deltas = computeTrendDeltas(totals, previousTotals);
  const anomalies = detectStatisticalAnomalies(totals, rollingAverages);

  // ── Current week section ─────────────────────────────────────────────────
  const currentSection = `Current week metrics:
- Vehicles: ${vehicles} total, ${activeVehicles} active
- Distance: ${fmtDist(distanceKm)} across ${trips} trips
- Average idle: ${avgIdlePct > 0 ? `${avgIdlePct.toFixed(1)}%` : "data pending"}
- Fleet groups: ${fleetNames.join(", ") || "All Vehicles"}`;

  // ── Prior week section (conditional) ─────────────────────────────────────
  const priorSection = previousTotals
    ? `\nPrior week metrics:
- Vehicles: ${previousTotals.vehicles ?? "?"} total, ${previousTotals.activeVehicles ?? "?"} active
- Distance: ${previousTotals.distanceKm != null ? fmtDist(previousTotals.distanceKm) : "?"}
- Trips: ${previousTotals.trips ?? "?"}
- Average idle: ${previousTotals.avgIdlePct != null ? `${previousTotals.avgIdlePct.toFixed(1)}%` : "?"}`
    : "";

  // ── Trend delta section ───────────────────────────────────────────────────
  const trendLines: string[] = [];
  if (deltas.distancePct !== null)
    trendLines.push(`- Distance: ${deltas.distancePct > 0 ? "+" : ""}${deltas.distancePct}% week-over-week`);
  if (deltas.tripsPct !== null)
    trendLines.push(`- Trips: ${deltas.tripsPct > 0 ? "+" : ""}${deltas.tripsPct}% week-over-week`);
  if (deltas.idlePpChange !== null)
    trendLines.push(`- Idle: ${deltas.idlePpChange > 0 ? "+" : ""}${deltas.idlePpChange}pp week-over-week`);
  if (deltas.efficiencyScore !== null && deltas.prevEfficiencyScore !== null) {
    const effPct = +(((deltas.efficiencyScore - deltas.prevEfficiencyScore) / Math.abs(deltas.prevEfficiencyScore)) * 100).toFixed(1);
    trendLines.push(`- Fleet efficiency score: ${effPct > 0 ? "+" : ""}${effPct}% week-over-week`);
  }
  const trendSection = trendLines.length
    ? `\nWeek-over-week trends:\n${trendLines.join("\n")}`
    : "";

  // ── Anomaly section ───────────────────────────────────────────────────────
  const anomalySection = anomalies.length
    ? `\nStatistical anomalies detected (>1.5 SD from 4-week rolling average):\n${anomalies
        .map(
          (a) =>
            `- ${a.metric}: ${a.current} is ${a.deviation} average (${a.average}), severity=${a.severity}`
        )
        .join("\n")}`
    : "";

  // ── Ace group data ─────────────────────────────────────────────────────────
  const aceSection = aceRows.length > 0
    ? `\nFleet group performance (last 7 days):\n${aceRows
        .slice(0, 5)
        .map((r) => {
          const name = r.group_name ?? r.device_name ?? "Fleet";
          const dist = r.total_distance_km != null ? `${r.total_distance_km} km` : "";
          const tc   = r.trip_count != null ? `${r.trip_count} trips` : "";
          return `  - ${name}: ${[dist, tc].filter(Boolean).join(", ")}`;
        })
        .join("\n")}`
    : "";

  return `You are a fleet operations intelligence analyst. 
You receive structured fleet telemetry data and produce actionable intelligence.
Your role is to identify patterns, predict trends, detect anomalies, and recommend actions — not merely describe numbers.
Return ONLY valid JSON (no markdown, no extra text).

${currentSection}${priorSection}${trendSection}${anomalySection}${aceSection}

Return this exact JSON structure:
{
  "headline": "One punchy sentence. Active voice. Include the most important trend or anomaly. Max 20 words.",
  "insights": [
    { "type": "positive|neutral|alert|record", "text": "max 14 words per insight, grounded in data" }
  ],
  "predictions": [
    {
      "metric": "metric_name_snake_case",
      "direction": "up|down|stable",
      "magnitude": "human-readable e.g. '2–4%' or '~50 km'",
      "confidence": 0.0,
      "reasoning": "one sentence ≤15 words citing the trend evidence"
    }
  ],
  "anomalies": [
    { "severity": "warning|critical", "metric": "metric_name", "text": "concise anomaly description ≤15 words" }
  ],
  "recommendations": [
    { "priority": "high|medium|low", "text": "one actionable recommendation ≤15 words" }
  ],
  "statOfDay": {
    "label": "metric name (2-3 words)",
    "value": "formatted number with unit",
    "context": "one sentence, max 10 words"
  }
}

Rules:
- insights: exactly 3–4 items. Types: positive=good trend, neutral=informational, alert=needs attention, record=new high/low.
- predictions: 1–3 forward-looking items for the NEXT week. Only include if there is real trend evidence.
- anomalies: only include if the data genuinely shows unusual patterns. Empty array is fine.
- recommendations: 1–3 actionable items. Prioritise by business impact.
- statOfDay: pick the single most surprising or significant number.
- Return empty arrays [] for predictions/anomalies/recommendations if no compelling data exists.`;
}

// ─── Deterministic fallback ───────────────────────────────────────────────────

function computeFallback(body: DigestRequestBody): DigestResult {
  const { totals, fleetNames, aceRows, previousTotals } = body;
  const { vehicles, activeVehicles, distanceKm, trips, avgIdlePct } = totals;

  const activeRatio = vehicles > 0 ? Math.round((activeVehicles / vehicles) * 100) : 0;
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
    const dist = topRow.total_distance_km != null
      ? ` with ${Number(topRow.total_distance_km).toFixed(0)} km`
      : "";
    insights.push({ type: "record", text: `${name} led all groups${dist} this week.` });
  }

  insights.push({
    type: "neutral",
    text: `${activeRatio}% of all vehicles were active in the last 24 hours.`,
  });

  // Simple deterministic trend prediction if we have prior-week data
  const predictions: DigestPrediction[] = [];
  if (previousTotals?.avgIdlePct != null) {
    const idleDelta = avgIdlePct - previousTotals.avgIdlePct;
    if (Math.abs(idleDelta) > 1) {
      predictions.push({
        metric: "idle_pct",
        direction: idleDelta > 0 ? "up" : "down",
        magnitude: `${Math.abs(idleDelta).toFixed(1)}pp`,
        confidence: 0.55,
        reasoning: `Idle ${idleDelta > 0 ? "increased" : "decreased"} ${Math.abs(idleDelta).toFixed(1)}pp this week.`,
      });
    }
  }

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
    predictions,
    anomalies: [],
    recommendations: [],
    statOfDay,
    generatedAt: new Date().toISOString(),
    fromLLM: false,
  };
}

// ─── LLM callers ─────────────────────────────────────────────────────────────

async function callGemini(prompt: string): Promise<string> {
  const { VertexAI } = await import("@google-cloud/vertexai");
  const project  = process.env.GOOGLE_CLOUD_PROJECT!;
  const location = process.env.GOOGLE_CLOUD_LOCATION ?? "us-central1";
  const vertexAI = new VertexAI({ project, location });
  const model = vertexAI.getGenerativeModel({
    model: "gemini-1.5-pro",
    generationConfig: {
      maxOutputTokens: 1024,
      temperature: 0.4,
      responseMimeType: "application/json",
    },
  });
  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  });
  const text = result.response.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  if (!text) throw new Error("Gemini returned empty response");
  return text;
}

async function callAnthropic(prompt: string): Promise<string> {
  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const msg = await client.messages.create({
    model: "claude-3-5-haiku-20241022",
    max_tokens: 1024,
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
    max_tokens: 1024,
    response_format: { type: "json_object" },
  });
  return completion.choices[0]?.message?.content ?? "";
}

async function callLLM(prompt: string): Promise<string> {
  if (!isLLMEnabled()) throw new Error("LLM disabled via LLM_ENABLED=false");
  if (process.env.GOOGLE_CLOUD_PROJECT) return callGemini(prompt);
  if (process.env.ANTHROPIC_API_KEY)    return callAnthropic(prompt);
  if (process.env.OPENAI_API_KEY)       return callOpenAI(prompt);
  throw new Error("No LLM provider configured");
}

// ─── Response parser ──────────────────────────────────────────────────────────

function parseDigestJSON(raw: string): DigestResult {
  const cleaned = raw.replace(/```json\n?|\n?```/g, "").trim();
  const parsed = JSON.parse(cleaned) as {
    headline?: unknown;
    insights?: Array<{ type?: string; text?: string }>;
    predictions?: Array<{
      metric?: string; direction?: string; magnitude?: string;
      confidence?: number; reasoning?: string;
    }>;
    anomalies?: Array<{ severity?: string; metric?: string; text?: string }>;
    recommendations?: Array<{ priority?: string; text?: string }>;
    statOfDay?: { label?: unknown; value?: unknown; context?: unknown };
  };

  if (!parsed.headline || !Array.isArray(parsed.insights) || !parsed.statOfDay) {
    throw new Error("Invalid digest JSON structure");
  }

  const validInsightTypes = new Set<InsightType>(["positive", "neutral", "alert", "record"]);
  const insights: DigestInsight[] = (parsed.insights as Array<{ type?: string; text?: string }>)
    .filter((i) => i.text)
    .slice(0, 4)
    .map((i) => ({
      type: validInsightTypes.has(i.type as InsightType)
        ? (i.type as InsightType)
        : "neutral",
      text: String(i.text),
    }));

  const validDirections = new Set(["up", "down", "stable"]);
  const predictions: DigestPrediction[] = (parsed.predictions ?? [])
    .filter((p) => p.metric && p.direction && p.reasoning)
    .slice(0, 3)
    .map((p) => ({
      metric: String(p.metric),
      direction: validDirections.has(p.direction ?? "") ? (p.direction as "up" | "down" | "stable") : "stable",
      magnitude: String(p.magnitude ?? ""),
      confidence: Math.min(1, Math.max(0, Number(p.confidence ?? 0.5))),
      reasoning: String(p.reasoning),
    }));

  const validSeverities = new Set(["warning", "critical"]);
  const anomalies: DigestAnomaly[] = (parsed.anomalies ?? [])
    .filter((a) => a.text)
    .slice(0, 4)
    .map((a) => ({
      severity: validSeverities.has(a.severity ?? "") ? (a.severity as "warning" | "critical") : "warning",
      metric: String(a.metric ?? "fleet"),
      text: String(a.text),
    }));

  const validPriorities = new Set(["high", "medium", "low"]);
  const recommendations: DigestRecommendation[] = (parsed.recommendations ?? [])
    .filter((r) => r.text)
    .slice(0, 3)
    .map((r) => ({
      priority: validPriorities.has(r.priority ?? "") ? (r.priority as "high" | "medium" | "low") : "medium",
      text: String(r.text),
    }));

  return {
    headline: String(parsed.headline),
    insights,
    predictions,
    anomalies,
    recommendations,
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
    const raw    = await callLLM(prompt);
    const digest = parseDigestJSON(raw);
    return NextResponse.json({ ok: true, data: digest } satisfies ApiResponse<DigestResult>);
  } catch (err) {
    console.error(
      "[digest/generate] LLM failed, using fallback:",
      err instanceof Error ? err.message : err
    );
    const fallback = computeFallback(body);
    return NextResponse.json({ ok: true, data: fallback } satisfies ApiResponse<DigestResult>);
  }
}

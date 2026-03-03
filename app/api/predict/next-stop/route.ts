/**
 * GET /api/predict/next-stop
 *
 * Predicts the most likely next stop(s) for a vehicle based on its current
 * position and historical Ace route patterns.
 *
 * Prediction pipeline:
 *   1. Query Ace for common destinations from this origin
 *   2. Score candidates with multi-signal engine (frequency + temporal +
 *      recency + sequence)
 *   3. Send top candidates to LLM for re-ranking, reasoning, and anomaly
 *      detection (3 s budget — falls back to scored order on timeout)
 *   4. Pre-load context briefing for the #1 prediction (best-effort)
 *
 * Query params:
 *   deviceId   — Geotab device ID (used for cache keying)
 *   lat        — Current latitude (vehicle's last known position)
 *   lon        — Current longitude
 *
 * Response: ApiResponse<NextStopPredictionResult>
 */

import { NextRequest, NextResponse } from "next/server";
import { runInsightQuery } from "@/lib/ace/client";
import { QUERY_KEYS } from "@/lib/ace/queries";
import { scoreCandidates, type ScoreContext } from "@/lib/predict/score";
import { generateText } from "@/lib/llm/client";
import { loadFileFallback } from "@/lib/cache/fallback";
import type {
  ApiResponse,
  NextStopPredictionResult,
  StopPrediction,
  StopContext,
  LatLon,
} from "@/types";

export const dynamic = "force-dynamic";

const BRIEFING_TIMEOUT_MS = 12_000;
const LLM_REASONING_TIMEOUT_MS = 5_000;

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = req.nextUrl;
  const deviceId = searchParams.get("deviceId") ?? "";
  const latStr = searchParams.get("lat");
  const lonStr = searchParams.get("lon");

  if (!latStr || !lonStr) {
    return NextResponse.json(
      { ok: false, error: "lat and lon query params are required" } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  const lat = parseFloat(latStr);
  const lon = parseFloat(lonStr);

  if (isNaN(lat) || isNaN(lon)) {
    return NextResponse.json(
      { ok: false, error: "lat and lon must be valid numbers" } satisfies ApiResponse<never>,
      { status: 400 }
    );
  }

  // Demo mode: serve per-vehicle varied predictions without hitting Ace.
  // A seeded shuffle of the expanded mock data pool ensures each vehicle
  // consistently "sees" a different set of destinations.
  if (process.env.PULSE_DEMO_GROUPS === "true") {
    const mock = loadFileFallback<{
      rows: Array<Record<string, string | number>>;
      reasoning: string;
    }>("ace-vehicle-next-stop.json");

    if (!mock) {
      return NextResponse.json(
        { ok: false, error: "[demo] Mock file not found" } satisfies ApiResponse<never>,
        { status: 404 }
      );
    }

    // Deterministic per-vehicle shuffle — same deviceId always produces the
    // same ordering, but different deviceIds produce different orderings.
    const seed = [...(deviceId || "x")].reduce(
      (acc, c) => ((acc * 31 + c.charCodeAt(0)) & 0x7fffffff),
      0
    );
    const shuffled = demoShuffleRows(mock.rows, seed);

    const now = new Date();
    const scored = scoreCandidates(shuffled, {
      currentHour: now.getUTCHours(),
      currentDayOfWeek: now.getUTCDay(),
      lastTripOrigin: { lat, lon },
    });

    const predictions: StopPrediction[] = scored.slice(0, 5).map((c, i) => ({
      rank: i + 1,
      locationName: c.locationName,
      confidence: Math.min(0.97, c.rawScore),
      visitCount: c.visitCount,
      avgDwellMinutes: c.avgDwellMinutes,
      typicalArrivalHour: c.typicalArrivalHour,
      coordinates: c.coordinates,
      signals: c.signals,
    }));

    const result: NextStopPredictionResult = {
      deviceId,
      fromCoordinates: { lat, lon },
      predictions,
      basedOnTrips: shuffled.reduce((s, r) => s + (Number(r.visit_count) || 0), 0),
      queriedAt: new Date().toISOString(),
      fromCache: true,
      fromLLM: false,
    };

    return NextResponse.json({ ok: true, data: result } satisfies ApiResponse<NextStopPredictionResult>);
  }

  try {
    // ── 1. Query Ace for common destinations from this origin ───────────────
    const aceInsight = await runInsightQuery(QUERY_KEYS.VEHICLE_NEXT_STOP, {
      coordinates: { lat, lon },
      radiusKm: 2.0,
      daysBack: 30,
    });

    const rows = aceInsight.rows as Array<Record<string, string | number>>;

    // ── 2. Multi-signal scoring ─────────────────────────────────────────────
    const now = new Date();
    const scoreCtx: ScoreContext = {
      currentHour: now.getUTCHours(),
      currentDayOfWeek: now.getUTCDay(),
      lastTripOrigin: { lat, lon },
    };

    const scored = scoreCandidates(rows, scoreCtx);

    // ── 3. LLM re-ranking + reasoning (3 s budget, best-effort) ────────────
    const [llmResult] = await Promise.allSettled([
      llmReasonWithTimeout(scored, scoreCtx, LLM_REASONING_TIMEOUT_MS),
    ]);

    const fromLLM = llmResult.status === "fulfilled" && llmResult.value !== null;
    const llmOutput: LLMOutput | null = fromLLM ? llmResult.value! : null;

    // ── 4. Build final predictions ──────────────────────────────────────────
    const rawPredictions: StopPrediction[] = scored.slice(0, 5).map((c, i) => {
      const llmEntry = llmOutput?.predictions?.find(
        (e: LLMPredictionEntry) => e.rank === i + 1 || e.locationName === c.locationName
      );

      return {
        rank: i + 1,
        locationName: c.locationName,
        confidence: llmEntry?.confidence ?? Math.min(0.97, c.rawScore),
        visitCount: c.visitCount,
        avgDwellMinutes: c.avgDwellMinutes,
        typicalArrivalHour: c.typicalArrivalHour,
        coordinates: c.coordinates,
        signals: c.signals,
        reasoning: llmEntry?.reasoning,
        ...(i === 0 && llmOutput?.anomaly
          ? { anomaly: llmOutput.anomaly }
          : {}),
      };
    });

    // Re-sort by LLM-adjusted confidence (LLM may have re-ranked)
    const predictions: StopPrediction[] = rawPredictions
      .sort((a, b) => b.confidence - a.confidence)
      .map((p, i) => ({ ...p, rank: i + 1 }));

    // ── 5. Pre-load briefing for the top prediction (best-effort) ───────────
    const top = predictions[0];
    if (top?.coordinates) {
      const briefing = await fetchBriefingWithTimeout(top.coordinates, deviceId);
      if (briefing) {
        predictions[0] = { ...predictions[0], preloadedBriefing: briefing };
      }
    }

    const totalVisits = rows.reduce(
      (sum, r) => sum + (Number(r.visit_count) || 0),
      0
    );

    const result: NextStopPredictionResult = {
      deviceId,
      fromCoordinates: { lat, lon },
      predictions,
      basedOnTrips: totalVisits,
      queriedAt: aceInsight.queriedAt,
      fromCache: aceInsight.fromCache,
      fromLLM,
    };

    return NextResponse.json({ ok: true, data: result } satisfies ApiResponse<NextStopPredictionResult>);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[predict/next-stop] error:", message);

    try {
      const fallback = await loadFallback(lat, lon, deviceId);
      return NextResponse.json({ ok: true, data: fallback } satisfies ApiResponse<NextStopPredictionResult>);
    } catch {
      return NextResponse.json(
        { ok: false, error: message } satisfies ApiResponse<never>,
        { status: 500 }
      );
    }
  }
}

// ─── LLM reasoning ────────────────────────────────────────────────────────────

interface LLMPredictionEntry {
  rank: number;
  locationName: string;
  confidence: number;
  reasoning: string;
}

interface LLMOutput {
  predictions: LLMPredictionEntry[];
  anomaly?: string;
}

async function llmReasonWithTimeout(
  candidates: ReturnType<typeof scoreCandidates>,
  ctx: ScoreContext,
  timeoutMs: number
): Promise<LLMOutput | null> {
  try {
    const result = await Promise.race([
      callLLMForReasoning(candidates, ctx),
      new Promise<null>((_, reject) =>
        setTimeout(() => reject(new Error("LLM timeout")), timeoutMs)
      ),
    ]);
    return result;
  } catch {
    return null;
  }
}

async function callLLMForReasoning(
  candidates: ReturnType<typeof scoreCandidates>,
  ctx: ScoreContext
): Promise<LLMOutput | null> {
  if (!candidates.length) return null;

  const now = new Date();
  const dayName = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][ctx.currentDayOfWeek];
  const isWeekend = ctx.currentDayOfWeek === 0 || ctx.currentDayOfWeek === 6;
  const timeOfDay =
    ctx.currentHour < 6  ? "early morning" :
    ctx.currentHour < 12 ? "morning" :
    ctx.currentHour < 17 ? "afternoon" :
    ctx.currentHour < 21 ? "evening" : "night";

  const candidatesList = candidates.slice(0, 5).map((c, i) => ({
    rank: i + 1,
    name: c.locationName,
    visitCount: c.visitCount,
    typicalArrivalHour: c.typicalArrivalHour,
    avgDwellMinutes: c.avgDwellMinutes,
    signals: {
      frequency: +(c.signals.frequency * 100).toFixed(0),
      temporal: +(c.signals.temporal * 100).toFixed(0),
      recency: +(c.signals.recency * 100).toFixed(0),
      sequence: +(c.signals.sequence * 100).toFixed(0),
    },
    multiSignalScore: +(c.rawScore * 100).toFixed(0),
  }));

  const systemPrompt = `You are a fleet route intelligence analyst. 
You reason about where a vehicle is most likely heading next based on multi-signal scoring of its historical trip patterns.
You are concise, precise, and grounded in the data. You never invent facts.
Return only valid JSON with no markdown.`;

  const userPrompt = `Vehicle prediction request:

Context:
- Current time: ${ctx.currentHour}:00 UTC (${timeOfDay} ${dayName}${isWeekend ? ", weekend" : ", weekday"})
- Date: ${now.toISOString().split("T")[0]}

Candidates (pre-scored, ranked by multi-signal score):
${JSON.stringify(candidatesList, null, 2)}

Signal key (0–100 scale):
- frequency: share of historical trips to this destination
- temporal: how well current hour matches typical arrival hour (Gaussian, σ=3h)
- recency: how recently visited (14-day half-life decay)
- sequence: route-chain pattern match score

Task:
1. Re-rank the candidates if temporal or recency signals strongly contradict the frequency leader
   (e.g. frequency winner never visited on weekends but it's Saturday → demote it)
2. Assign a calibrated confidence score (0.0–0.97) reflecting true likelihood
3. Write a 1-sentence reasoning per prediction (≤15 words, cite the strongest signal)
4. Detect any anomaly in the vehicle's current pattern vs its norms (optional, only if compelling)

Return this exact JSON structure:
{
  "predictions": [
    { "rank": 1, "locationName": "...", "confidence": 0.0, "reasoning": "..." },
    { "rank": 2, "locationName": "...", "confidence": 0.0, "reasoning": "..." }
  ],
  "anomaly": "one sentence or null"
}`;

  const raw = await generateText(systemPrompt, [{ role: "user", content: userPrompt }], {
    maxTokens: 512,
    temperature: 0.3,
    jsonMode: true,
  });

  const cleaned = raw.replace(/```json\n?|\n?```/g, "").trim();
  const parsed = JSON.parse(cleaned) as {
    predictions?: Array<{ rank?: number; locationName?: string; confidence?: number; reasoning?: string }>;
    anomaly?: string | null;
  };

  if (!Array.isArray(parsed.predictions)) return null;

  return {
    predictions: parsed.predictions
      .filter((p) => p.locationName && typeof p.confidence === "number")
      .map((p, i) => ({
        rank: p.rank ?? i + 1,
        locationName: String(p.locationName),
        confidence: Math.min(0.97, Math.max(0, Number(p.confidence))),
        reasoning: p.reasoning ? String(p.reasoning) : "",
      })),
    anomaly: parsed.anomaly && parsed.anomaly !== "null" ? String(parsed.anomaly) : undefined,
  };
}

// ─── Briefing pre-load ────────────────────────────────────────────────────────

async function fetchBriefingWithTimeout(
  coords: LatLon,
  tripId: string
): Promise<StopContext | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), BRIEFING_TIMEOUT_MS);

  try {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const res = await fetch(`${base}/api/context/briefing`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tripId: tripId || "predict",
        lat: coords.lat,
        lon: coords.lon,
        tone: "guidebook",
      }),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: StopContext };
    return json.data ?? null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// ─── Demo helpers ─────────────────────────────────────────────────────────────

/**
 * Fisher-Yates shuffle seeded by an integer.
 * Produces a deterministic, device-specific ordering of candidate rows
 * so each vehicle consistently shows different predicted destinations.
 */
function demoShuffleRows<T>(rows: T[], seed: number): T[] {
  const arr = [...rows];
  let s = seed;
  for (let i = arr.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) & 0x7fffffff;
    const j = s % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ─── Fallback ─────────────────────────────────────────────────────────────────

async function loadFallback(
  lat: number,
  lon: number,
  deviceId: string
): Promise<NextStopPredictionResult> {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const res = await fetch(`${base}/fallback/ace-vehicle-next-stop.json`);
  if (!res.ok) throw new Error("Fallback file not found");
  const data = (await res.json()) as {
    rows: Array<Record<string, string | number>>;
  };

  const rows = data.rows ?? [];
  const totalVisits = rows.reduce((s, r) => s + (Number(r.visit_count) || 0), 0);

  const now = new Date();
  const scored = scoreCandidates(rows, {
    currentHour: now.getUTCHours(),
    currentDayOfWeek: now.getUTCDay(),
  });

  const predictions: StopPrediction[] = scored.slice(0, 5).map((c, i) => ({
    rank: i + 1,
    locationName: c.locationName,
    confidence: Math.min(0.97, c.rawScore),
    visitCount: c.visitCount,
    avgDwellMinutes: c.avgDwellMinutes,
    typicalArrivalHour: c.typicalArrivalHour,
    coordinates: c.coordinates,
    signals: c.signals,
  }));

  return {
    deviceId,
    fromCoordinates: { lat, lon },
    predictions,
    basedOnTrips: totalVisits,
    queriedAt: new Date().toISOString(),
    fromCache: true,
    fromLLM: false,
  };
}

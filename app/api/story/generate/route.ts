/**
 * POST /api/story/generate
 *
 * Accepts trip data + optional context briefings, derives 4 story beats,
 * calls an LLM to generate captions, assembles and validates the ComicStory,
 * and returns it. Falls back to a pre-generated demo story on LLM failure.
 *
 * Owner: Comic Story Agent
 */

import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { deriveStoryBeats } from "@/lib/story/beats";
import { buildStoryPrompt } from "@/lib/story/prompts";
import { parseLLMOutput } from "@/lib/story/validate";
import { ComicToneSchema } from "@/lib/story/schema";
import { bqGetStory, bqSetStory, isBigQueryEnabled } from "@/lib/bigquery/client";
import type { ComicStory, ComicPanel, ComicTone, TripSummary, StopContext, BreadcrumbPoint } from "@/types";

// ─── Request schema ───────────────────────────────────────────────────────────

const PointSchema = z.object({ lat: z.number(), lon: z.number() });

const TripSummarySchema = z.object({
  id: z.string(),
  deviceId: z.string(),
  deviceName: z.string(),
  start: z.string(),
  stop: z.string(),
  distanceMeters: z.number(),
  distanceKm: z.number(),
  drivingDuration: z.string(),
  idlingDuration: z.string(),
  averageSpeedKmh: z.number(),
  maxSpeedKmh: z.number(),
  startPoint: PointSchema,
  endPoint: PointSchema,
  stopPoints: z
    .array(z.object({ lat: z.number(), lon: z.number(), dwellSeconds: z.number().optional() }))
    .optional(),
});

const RequestSchema = z.object({
  trip: TripSummarySchema,
  tone: ComicToneSchema.default("playful"),
  startLocationName: z.string().min(1).default("Departure"),
  endLocationName: z.string().min(1).default("Destination"),
  stopContexts: z.array(z.any()).optional(),
  breadcrumbs: z.array(z.any()).optional(),
});

// ─── LLM caller ───────────────────────────────────────────────────────────────
// Provider priority: Vertex AI Gemini > Claude > OpenAI
// JSON mode is used wherever possible to avoid markdown-wrapping issues.

async function callLLM(prompt: string): Promise<string> {
  if (process.env.GOOGLE_CLOUD_PROJECT) {
    return callGemini(prompt);
  }
  if (process.env.ANTHROPIC_API_KEY) {
    return callAnthropic(prompt);
  }
  if (process.env.OPENAI_API_KEY) {
    return callOpenAI(prompt);
  }
  throw new Error(
    "No LLM provider configured. Set GOOGLE_CLOUD_PROJECT (Vertex AI), ANTHROPIC_API_KEY, or OPENAI_API_KEY in .env."
  );
}

async function callGemini(prompt: string): Promise<string> {
  const { VertexAI } = await import("@google-cloud/vertexai");

  const project = process.env.GOOGLE_CLOUD_PROJECT!;
  const location = process.env.GOOGLE_CLOUD_LOCATION ?? "us-central1";

  const vertexAI = new VertexAI({ project, location });
  const model = vertexAI.getGenerativeModel({
    model: "gemini-1.5-pro",
    generationConfig: {
      maxOutputTokens: 1024,
      temperature: 0.7,
      responseMimeType: "application/json",
    },
  });

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  });

  const text = result.response.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  if (!text) throw new Error("Vertex AI Gemini returned empty response");
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

// ─── Fallback loader ──────────────────────────────────────────────────────────

async function loadFallbackStory(
  tripId: string,
  tone: ComicTone
): Promise<ComicStory | null> {
  try {
    const fallback = await import("@/public/fallback/story-demo.json");
    const story = fallback.default ?? fallback;
    // Patch the tripId and tone to match the request so the UI renders correctly.
    return {
      ...(story as ComicStory),
      id: `fallback-${Date.now()}`,
      tripId,
      tone,
      createdAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

// ─── Assembly ─────────────────────────────────────────────────────────────────

/**
 * Merges LLM creative output with structured beat data.
 * LLM provides: title, locationName, caption, speechBubble.
 * Beats provide: sceneType, mapAnchor, timeLabel, distanceLabel, speedLabel, dwellLabel.
 */
function assemblePanels(
  llmPanels: Array<{
    panelNumber: number;
    locationName: string;
    caption: string;
    speechBubble?: string;
  }>,
  beats: ReturnType<typeof deriveStoryBeats>
): ComicPanel[] {
  return llmPanels.map((lp) => {
    const beat = beats.find((b) => b.panelNumber === lp.panelNumber);
    if (!beat) {
      throw new Error(`No beat found for panelNumber ${lp.panelNumber}`);
    }
    const panel: ComicPanel = {
      panelNumber: lp.panelNumber as ComicPanel["panelNumber"],
      sceneType: beat.sceneType,
      locationName: lp.locationName,
      caption: lp.caption,
      mapAnchor: beat.coordinates,
      timeLabel: beat.timeLabel,
      distanceLabel: beat.distanceLabel,
      speedLabel: beat.speedLabel,
      dwellLabel: beat.dwellLabel,
    };
    if (lp.speechBubble) panel.speechBubble = lp.speechBubble;
    return panel;
  });
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  // 1. Parse and validate request body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Request body is not valid JSON" }, { status: 400 });
  }

  let input: z.infer<typeof RequestSchema>;
  try {
    input = RequestSchema.parse(body);
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: err.errors },
        { status: 400 }
      );
    }
    throw err;
  }

  const {
    trip,
    tone,
    startLocationName,
    endLocationName,
    stopContexts = [],
    breadcrumbs = [],
  } = input;

  // 2a. Check BigQuery for a persisted story before calling the LLM
  if (isBigQueryEnabled()) {
    const cached = await bqGetStory<ComicStory>(trip.id, tone);
    if (cached) {
      return NextResponse.json({ data: { ...cached, fromCache: true } });
    }
  }

  // 2b. Derive the 4 story beats from structured trip data
  const beats = deriveStoryBeats({
    trip: trip as TripSummary,
    startLocationName,
    endLocationName,
    stopContexts: stopContexts as StopContext[],
    breadcrumbs: breadcrumbs as BreadcrumbPoint[],
  });

  // 3. Build the prompt
  const prompt = buildStoryPrompt({
    beats,
    tone,
    tripMeta: {
      startLocationName,
      endLocationName,
      distanceKm: trip.distanceKm,
      drivingDuration: trip.drivingDuration,
      averageSpeedKmh: trip.averageSpeedKmh,
      maxSpeedKmh: trip.maxSpeedKmh,
    },
  });

  // 4. Call LLM — fall back to pre-generated story on failure
  let story: ComicStory;

  try {
    const rawOutput = await callLLM(prompt);
    const llmResult = parseLLMOutput(rawOutput);

    const panels = assemblePanels(llmResult.panels, beats);

    story = {
      id: crypto.randomUUID(),
      tripId: trip.id,
      title: llmResult.title,
      tone,
      panels,
      createdAt: new Date().toISOString(),
    };

    // Persist the generated story to BigQuery (non-blocking)
    if (isBigQueryEnabled()) {
      bqSetStory(trip.id, tone, story).catch(() => {});
    }
  } catch (llmErr) {
    console.error("[story/generate] LLM failed, using fallback:", llmErr);

    const fallback = await loadFallbackStory(trip.id, tone);
    if (fallback) {
      return NextResponse.json({ data: fallback, fromCache: true });
    }

    // No fallback available — return the error
    const message =
      llmErr instanceof Error ? llmErr.message : "Story generation failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  return NextResponse.json({ data: story });
}

/**
 * LLM area briefing generator.
 *
 * Provider priority (first key found in env wins):
 *   1. Vertex AI Gemini  (GOOGLE_CLOUD_PROJECT) — gemini-2.0-flash-001
 *   2. Anthropic Claude  (ANTHROPIC_API_KEY)    — claude-3-haiku-20240307
 *   3. OpenAI            (OPENAI_API_KEY)       — gpt-4o-mini
 *   4. Deterministic fallback (no LLM key needed — safe for demo/offline)
 *
 * Design rules (from MY_PROJECT.md):
 * - Output is grounded in structured place input — never fabricates
 * - 2–3 sentences max
 * - One practical/situational note for a driver or fleet operator
 * - Tone is configurable: guidebook | playful | cinematic
 */

import type { NearbyAmenity } from "@/types";

export interface BriefingInput {
  placeName: string;
  neighborhood?: string;
  city?: string;
  formattedAddress?: string;
  nearbyAmenities: NearbyAmenity[];
  coordinates: { lat: number; lon: number };
  tone?: "guidebook" | "playful" | "cinematic";
}

// ─── Public entry point ─────────────────────────────────────────────────────

export async function generateAreaBriefing(input: BriefingInput): Promise<string> {
  const prompt = buildPrompt(input);

  if (process.env.GOOGLE_CLOUD_PROJECT) {
    return callGemini(prompt);
  }
  if (process.env.ANTHROPIC_API_KEY) {
    return callAnthropic(prompt);
  }
  if (process.env.OPENAI_API_KEY) {
    return callOpenAI(prompt);
  }
  return buildDeterministicBriefing(input);
}

// ─── Prompt construction ─────────────────────────────────────────────────────

function buildPrompt(input: BriefingInput): string {
  const toneGuide: Record<string, string> = {
    guidebook: "Clear, informative guidebook style — elegant and factual.",
    playful: "Warm, upbeat, slightly punchy — like a friendly local.",
    cinematic: "Vivid, atmospheric, slightly literary — evocative of place.",
  };
  const toneInstruction = toneGuide[input.tone ?? "guidebook"];

  const amenitySummary =
    input.nearbyAmenities.length > 0
      ? input.nearbyAmenities
          .slice(0, 5)
          .map((a) => `${a.name} (${a.category}, ~${a.distanceMeters}m)`)
          .join(", ")
      : "none found within 800m";

  return `You are a concise route-aware local guide. Your audience is fleet drivers, managers, and shuttle passengers.

Location: ${input.placeName}${input.neighborhood ? `, ${input.neighborhood}` : ""}${input.city ? `, ${input.city}` : ""}
Coordinates: ${input.coordinates.lat.toFixed(5)}, ${input.coordinates.lon.toFixed(5)}
Full address: ${input.formattedAddress ?? "N/A"}
Nearby (within 800m): ${amenitySummary}

Style: ${toneInstruction}

Write exactly 2–3 sentences about this stop. Cover: (1) what the area is known for or its general character, and (2) one practical note useful to a driver or fleet operator — e.g. parking availability, fuel nearby, or a useful landmark. Strictly ground your answer in the data above. Do not invent specific businesses, street names, or facts not mentioned.`;
}

// ─── Anthropic Claude ────────────────────────────────────────────────────────

async function callAnthropic(prompt: string): Promise<string> {
  // Dynamic import avoids loading the SDK at module init time
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const response = await client.messages.create({
    model: "claude-3-haiku-20240307",
    max_tokens: 200,
    messages: [{ role: "user", content: prompt }],
  });

  const block = response.content[0];
  if (block.type !== "text") throw new Error("Unexpected Anthropic response type");
  return block.text.trim();
}

// ─── OpenAI ──────────────────────────────────────────────────────────────────

async function callOpenAI(prompt: string): Promise<string> {
  const { default: OpenAI } = await import("openai");
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 200,
    messages: [{ role: "user", content: prompt }],
  });

  return response.choices[0]?.message?.content?.trim() ?? buildDeterministicBriefing({ placeName: "", nearbyAmenities: [], coordinates: { lat: 0, lon: 0 } });
}

// ─── Vertex AI Gemini ─────────────────────────────────────────────────────────

async function callGemini(prompt: string): Promise<string> {
  const { VertexAI } = await import("@google-cloud/vertexai");

  const project  = process.env.GOOGLE_CLOUD_PROJECT!;
  const location = process.env.GOOGLE_CLOUD_LOCATION ?? "us-central1";

  const vertexAI = new VertexAI({ project, location });
  const model = vertexAI.getGenerativeModel({
    model: "gemini-2.0-flash-001",
    generationConfig: { maxOutputTokens: 256, temperature: 0.5 },
  });

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  });

  return result.response.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
}

// ─── Deterministic fallback (no LLM key) ─────────────────────────────────────

function buildDeterministicBriefing(input: BriefingInput): string {
  const location = input.neighborhood
    ? `${input.placeName} in the ${input.neighborhood} area`
    : input.placeName || "this location";

  const city = input.city ? ` in ${input.city}` : "";

  const fuelNearby = input.nearbyAmenities.find((a) => a.category === "fuel");
  const foodNearby = input.nearbyAmenities.find((a) => a.category === "food");

  let practicalNote = "Check local signage for parking options before stopping.";
  if (fuelNearby) {
    practicalNote = `${fuelNearby.name} is nearby (~${fuelNearby.distanceMeters}m) for refuelling.`;
  } else if (foodNearby) {
    practicalNote = `${foodNearby.name} is within walking distance (~${foodNearby.distanceMeters}m).`;
  }

  return `${location}${city} is a stop along your route. ${practicalNote}`;
}

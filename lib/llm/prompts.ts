/**
 * All LLM prompt templates.
 * Keep prompts here so they can be tuned without touching route handlers.
 *
 * Owner: LLM / Story Agent
 */

import type { TripSummary, StopContext, TripTone } from "@/types";

export const CONTEXT_BRIEFING_SYSTEM = `You are a local area expert writing concise briefings for fleet drivers and tour passengers. 
Given structured location data, generate a 2-3 sentence area briefing. 
Mention: what the area is known for, one practical note, and the fleet visit context if provided.
Keep it conversational and specific to the place. Never invent facts not in the provided data.`;

export function buildContextBriefingPrompt(params: {
  placeName: string;
  neighborhood?: string;
  city?: string;
  amenities: string[];
  fleetVisitCount?: number;
  fleetVisitSummary?: string;
}): string {
  const parts = [
    `Location: ${params.placeName}${params.neighborhood ? `, ${params.neighborhood}` : ""}${params.city ? `, ${params.city}` : ""}.`,
    params.amenities.length
      ? `Nearby: ${params.amenities.slice(0, 4).join(", ")}.`
      : "",
    params.fleetVisitCount != null
      ? `Fleet context: ${params.fleetVisitSummary ?? `${params.fleetVisitCount} fleet visits in the last 90 days`}.`
      : "",
    "Write a 2-3 sentence area briefing.",
  ];
  return parts.filter(Boolean).join(" ");
}

export const COMIC_STORY_SYSTEM = `You are a travel storytelling assistant creating comic-style trip recaps from real fleet data.
Generate exactly 4 panels as a JSON array. Each panel references real coordinates, timestamps, and place names from the provided data.
NEVER invent locations, distances, or speeds — only use values from the trip data.
Keep captions under 2 sentences. Speech bubbles are optional and short.`;

export function buildComicStoryPrompt(params: {
  trip: TripSummary;
  startLocation: string;
  endLocation: string;
  stopContexts: StopContext[];
  tone: TripTone;
}): string {
  const { trip, startLocation, endLocation, stopContexts, tone } = params;

  const contextBlock =
    stopContexts.length > 0
      ? stopContexts
          .map(
            (sc) =>
              `- Stop at ${sc.placeName}: "${sc.areaBriefing}"` +
              (sc.fleetVisitSummary ? ` Fleet: ${sc.fleetVisitSummary}.` : "")
          )
          .join("\n")
      : "No context briefings available for stops.";

  return `Trip data:
- Start: ${startLocation} at ${trip.start}
- End: ${endLocation} at ${trip.stop}
- Distance: ${trip.distanceKm} km
- Duration: ${trip.drivingDuration}
- Average speed: ${trip.averageSpeedKmh} km/h
- Max speed: ${trip.maxSpeedKmh} km/h
- Start coordinates: ${trip.startPoint.lat.toFixed(5)}, ${trip.startPoint.lon.toFixed(5)}
- End coordinates: ${trip.endPoint.lat.toFixed(5)}, ${trip.endPoint.lon.toFixed(5)}

Context briefings for stops:
${contextBlock}

Generate a JSON array of exactly 4 panels. Each panel must have:
- panelNumber (1-4)
- sceneType: "opening" | "journey" | "highlight" | "arrival"
- locationName: real place name from the data
- caption: 1-2 vivid sentences grounded in the trip data
- speechBubble: optional short personality-driven quip (or null)
- mapAnchor: { lat, lon } taken from trip start/end/stop coordinates above

Panels:
1 — opening: departure from ${startLocation}
2 — journey: the driving stretch (speed, distance, character of the route)
3 — highlight: most interesting stop${stopContexts.length ? ` (use context briefing for ${stopContexts[0].placeName})` : ""}
4 — arrival: reaching ${endLocation}

Tone: ${tone}
${tone === "guidebook" ? "Style: elegant, factual, measured." : ""}
${tone === "playful" ? "Style: warm, punchy, upbeat." : ""}
${tone === "cinematic" ? "Style: atmospheric, evocative, poetic." : ""}

Respond with only the JSON array, no markdown.`;
}

/**
 * Builds the LLM prompt for comic story generation.
 * Three tones: guidebook, playful, cinematic.
 *
 * Owner: Comic Story Agent
 */

import type { ComicTone } from "@/types";
import type { StoryBeat } from "./beats";

// ─── Tone style guides ────────────────────────────────────────────────────────

const TONE_GUIDES: Record<ComicTone, { description: string; example: string; bubbleNote: string }> = {
  guidebook: {
    description:
      "Elegant, factual, observational. Like a high-quality travel guide or route report.",
    example:
      '"The 113 km route from Madrid to Valencia took 1h 28m at an average of 78 km/h, cutting through the sun-baked Castilian plateau."',
    bubbleNote:
      "Speech bubbles are optional and sparse — use only if they add factual or observational value.",
  },
  playful: {
    description:
      "Warm, punchy, human. Like a road-trip blog post written by someone who genuinely enjoys driving.",
    example:
      '"Hit the road at 5:18 AM — someone\'s an early bird! 113 clicks later, the coast appeared and the GPS finally stopped complaining."',
    bubbleNote:
      "Speech bubbles add personality. Use them freely — short, punchy, fun.",
  },
  cinematic: {
    description:
      "Atmospheric, evocative. Like a film treatment or literary travel writing. Sparse but vivid.",
    example:
      '"Dawn broke over the Meseta. Steel and asphalt stretched toward the Mediterranean. The speedometer held steady at 130."',
    bubbleNote:
      "Speech bubbles are rare. Use only if the line is truly cinematic — or omit entirely.",
  },
};

// ─── Beat → prompt block ──────────────────────────────────────────────────────

function beatBlock(beat: StoryBeat): string {
  const lines: string[] = [
    `--- Panel ${beat.panelNumber} (${beat.sceneType.toUpperCase()}) ---`,
    `Location hint: ${beat.locationNameHint}`,
    `Coordinates:   ${beat.coordinates.lat.toFixed(5)}, ${beat.coordinates.lon.toFixed(5)}`,
    `Time:          ${beat.timeLabel}`,
  ];

  if (beat.distanceLabel) lines.push(`Distance:      ${beat.distanceLabel}`);
  if (beat.speedLabel) lines.push(`Speed:         ${beat.speedLabel}`);
  if (beat.dwellLabel) lines.push(`Stop duration: ${beat.dwellLabel}`);

  if (beat.enrichedContext) {
    const ctx = beat.enrichedContext;
    const place = ctx.neighborhood
      ? `${ctx.placeName}, ${ctx.neighborhood}`
      : ctx.placeName;
    lines.push(`** ENRICHED STOP — weave this context into the caption **`);
    lines.push(`   Place:           ${place}`);
    lines.push(`   Area briefing:   ${ctx.areaBriefing}`);
    if (ctx.fleetVisitCount || ctx.fleetVisitSummary) {
      const visitNote =
        ctx.fleetVisitSummary ??
        `${ctx.fleetVisitCount} fleet visits in the last 90 days`;
      lines.push(`   Fleet history:   ${visitNote}`);
    }
    if (ctx.nearbyAmenities.length > 0) {
      const amenities = ctx.nearbyAmenities
        .slice(0, 3)
        .map((a) => `${a.name} (${a.category}, ${Math.round(a.distanceMeters)}m)`)
        .join(", ");
      lines.push(`   Nearby:          ${amenities}`);
    }
  }

  return lines.join("\n");
}

// ─── Public builder ───────────────────────────────────────────────────────────

export interface PromptContext {
  beats: StoryBeat[];
  tone: ComicTone;
  tripMeta: {
    startLocationName: string;
    endLocationName: string;
    distanceKm: number;
    drivingDuration: string;
    averageSpeedKmh: number;
    maxSpeedKmh: number;
  };
}

export function buildStoryPrompt(ctx: PromptContext): string {
  const { beats, tone, tripMeta: t } = ctx;
  const guide = TONE_GUIDES[tone];

  const beatBlocks = beats.map(beatBlock).join("\n\n");

  return `\
You are a travel storytelling assistant for FleetHappens, a fleet analytics app.
Your job is to generate a 4-panel comic story from real vehicle trip data.

════════════════════════════════════════
TRIP OVERVIEW
════════════════════════════════════════
Start:          ${t.startLocationName}
End:            ${t.endLocationName}
Distance:       ${t.distanceKm} km
Duration:       ${t.drivingDuration}
Average speed:  ${t.averageSpeedKmh} km/h
Max speed:      ${t.maxSpeedKmh} km/h

════════════════════════════════════════
STORY BEATS (4 panels)
════════════════════════════════════════
${beatBlocks}

════════════════════════════════════════
TONE: ${tone.toUpperCase()}
════════════════════════════════════════
Style:   ${guide.description}
Example: ${guide.example}
Bubbles: ${guide.bubbleNote}

════════════════════════════════════════
HARD RULES
════════════════════════════════════════
1. Every caption must reference specific data from its beat (location, time, speed, or distance).
2. Captions are 1-2 sentences and under 220 characters.
3. Speech bubbles are under 80 characters. Omit the field if not used.
4. Location names must come from the provided location hints or place names — do NOT invent names.
5. For ENRICHED STOP panels: weave the area briefing and fleet visit history naturally into the caption.
6. The title captures the character of the whole trip in under 10 words.
7. panelNumber values must be 1, 2, 3, 4 exactly.

════════════════════════════════════════
OUTPUT FORMAT
════════════════════════════════════════
Respond with ONLY valid JSON — no markdown fences, no commentary.

{
  "title": "...",
  "panels": [
    {
      "panelNumber": 1,
      "locationName": "...",
      "caption": "...",
      "speechBubble": "..."
    },
    {
      "panelNumber": 2,
      "locationName": "...",
      "caption": "..."
    },
    {
      "panelNumber": 3,
      "locationName": "...",
      "caption": "...",
      "speechBubble": "..."
    },
    {
      "panelNumber": 4,
      "locationName": "...",
      "caption": "..."
    }
  ]
}`;
}

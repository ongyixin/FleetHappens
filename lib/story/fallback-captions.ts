/**
 * Deterministic caption and speech-bubble generation for comic story fallback.
 * Used when the LLM is unavailable — produces contextual text from beat data
 * so captions and quotes match the current route instead of hardcoded demo text.
 *
 * Owner: Comic Story Agent
 */

import type { ComicTone } from "@/types";
import type { StoryBeat } from "./beats";

// ─── Caption templates by sceneType and tone ──────────────────────────────────

type CaptionFn = (beat: StoryBeat, tripMeta: TripMeta) => string;
type BubbleFn = (beat: StoryBeat, tripMeta: TripMeta) => string | undefined;

interface TripMeta {
  startLocationName: string;
  endLocationName: string;
  distanceKm: number;
  drivingDuration: string;
  averageSpeedKmh: number;
  maxSpeedKmh: number;
}

const OPENING_CAPTIONS: Record<ComicTone, CaptionFn> = {
  guidebook: (b, t) =>
    `${b.timeLabel}. Departure from ${b.locationNameHint} — ${t.distanceKm} km to ${t.endLocationName}, max speed ${t.maxSpeedKmh} km/h.`,
  playful: (b, t) =>
    `Wheels rolling at ${b.timeLabel} from ${b.locationNameHint} — ${t.distanceKm} km ahead and the road's calling.`,
  cinematic: (b, t) =>
    `${b.timeLabel}. ${b.locationNameHint}. The engine turns over. ${t.distanceKm} km of asphalt ahead.`,
};

const JOURNEY_CAPTIONS: Record<ComicTone, CaptionFn> = {
  guidebook: (b, t) =>
    `${b.timeLabel}. En route — ${b.distanceLabel ?? "midpoint"}, averaging ${b.speedLabel ?? t.averageSpeedKmh + " km/h"}.`,
  playful: (b, t) =>
    `${b.timeLabel} — ${b.distanceLabel ?? "halfway there"}. ${b.speedLabel ?? "Cruising."} The miles are flying.`,
  cinematic: (b, t) =>
    `${b.timeLabel}. ${b.distanceLabel ?? "The middle stretch"}. Speed steady. The landscape scrolls.`,
};

const HIGHLIGHT_CAPTIONS: Record<ComicTone, CaptionFn> = {
  guidebook: (b, t) => {
    const dwell = b.dwellLabel ? ` — ${b.dwellLabel}` : "";
    const ctx = b.enrichedContext;
    if (ctx) {
      const visit = ctx.fleetVisitSummary ?? (ctx.fleetVisitCount ? `${ctx.fleetVisitCount} fleet visits this quarter` : "");
      return `Stop at ${b.locationNameHint}${dwell}. ${ctx.areaBriefing}${visit ? ` ${visit}.` : "."}`;
    }
    return `Notable stop at ${b.locationNameHint}${dwell}.`;
  },
  playful: (b, t) => {
    const dwell = b.dwellLabel ? ` — ${b.dwellLabel}` : "";
    const ctx = b.enrichedContext;
    if (ctx) {
      const visit = ctx.fleetVisitSummary ?? (ctx.fleetVisitCount ? `the fleet's ${ctx.fleetVisitCount}th visit here` : "");
      return `A ${b.dwellLabel ? b.dwellLabel.replace(" min stop", "-minute") : "quick"} stop at ${b.locationNameHint}. ${ctx.areaBriefing}${visit ? ` ${visit}.` : ""}`;
    }
    return `Stop at ${b.locationNameHint}${dwell}. A moment to breathe.`;
  },
  cinematic: (b, t) => {
    const dwell = b.dwellLabel ? ` ${b.dwellLabel}.` : ".";
    const ctx = b.enrichedContext;
    if (ctx) {
      return `${b.locationNameHint}${dwell} ${ctx.areaBriefing}`;
    }
    return `${b.locationNameHint}${dwell} A pause in the journey.`;
  },
};

const ARRIVAL_CAPTIONS: Record<ComicTone, CaptionFn> = {
  guidebook: (b, t) =>
    `Arrival at ${b.locationNameHint} at ${b.timeLabel} — ${t.distanceKm} km door to door, ${t.drivingDuration}, avg ${t.averageSpeedKmh} km/h.`,
  playful: (b, t) =>
    `Arrival at ${b.locationNameHint} at ${b.timeLabel} — ${t.distanceKm} km done, ${t.drivingDuration} on the clock. Mission accomplished.`,
  cinematic: (b, t) =>
    `${b.timeLabel}. ${b.locationNameHint}. ${t.distanceKm} km behind. The engine quiets.`,
};

const OPENING_BUBBLES: Record<ComicTone, BubbleFn> = {
  guidebook: () => undefined,
  playful: (b, t) => "Let's go.",
  cinematic: () => undefined,
};

const JOURNEY_BUBBLES: Record<ComicTone, BubbleFn> = {
  guidebook: () => undefined,
  playful: (b, t) => "Making good time.",
  cinematic: () => undefined,
};

const HIGHLIGHT_BUBBLES: Record<ComicTone, BubbleFn> = {
  guidebook: (b) => (b.enrichedContext?.fleetVisitSummary ? "Regular stop." : undefined),
  playful: (b) =>
    b.enrichedContext?.fleetVisitSummary
      ? "We know this place."
      : b.dwellLabel
        ? "Quick pit stop."
        : undefined,
  cinematic: () => undefined,
};

const ARRIVAL_BUBBLES: Record<ComicTone, BubbleFn> = {
  guidebook: () => undefined,
  playful: () => "That's a wrap.",
  cinematic: () => undefined,
};

// ─── Public API ───────────────────────────────────────────────────────────────

export interface FallbackCaptionInput {
  beat: StoryBeat;
  tone: ComicTone;
  tripMeta: TripMeta;
}

/**
 * Generates a contextual caption for a story panel from beat data.
 * No LLM required — uses deterministic templates keyed by sceneType and tone.
 */
export function generateFallbackCaption(input: FallbackCaptionInput): string {
  const { beat, tone, tripMeta } = input;
  const fns = {
    opening: OPENING_CAPTIONS,
    journey: JOURNEY_CAPTIONS,
    highlight: HIGHLIGHT_CAPTIONS,
    arrival: ARRIVAL_CAPTIONS,
  };
  const fn = fns[beat.sceneType]?.[tone] ?? OPENING_CAPTIONS.playful;
  return fn(beat, tripMeta);
}

/**
 * Generates an optional speech-bubble (chat-style quote) for a story panel.
 * Returns undefined when the tone prefers no bubble (e.g. guidebook, cinematic).
 */
export function generateFallbackSpeechBubble(input: FallbackCaptionInput): string | undefined {
  const { beat, tone, tripMeta } = input;
  const fns = {
    opening: OPENING_BUBBLES,
    journey: JOURNEY_BUBBLES,
    highlight: HIGHLIGHT_BUBBLES,
    arrival: ARRIVAL_BUBBLES,
  };
  const fn = fns[beat.sceneType]?.[tone] ?? OPENING_BUBBLES.playful;
  return fn(beat, tripMeta);
}

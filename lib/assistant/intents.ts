/**
 * lib/assistant/intents.ts
 *
 * Intent classification for the FleetHappens AI assistant.
 *
 * Two-layer approach:
 *   1. Keyword fallback router — regex-based, zero latency, works without LLM
 *   2. LLM classification — structured JSON output for natural-language queries
 *
 * Entity resolution: fuzzy string matching against known fleets and vehicles.
 */

import type {
  AssistantIntent,
  AssistantContext,
  FleetGroup,
  VehicleCard,
} from "@/types";
import { generateText } from "@/lib/llm/client";

// ─── Keyword fallback router ───────────────────────────────────────────────────

interface KeywordRoute {
  pattern: RegExp;
  intent: AssistantIntent;
}

const KEYWORD_ROUTES: KeywordRoute[] = [
  {
    pattern: /fleet\s*pulse|company\s*(overview|summary|wide)|all\s*fleets?/i,
    intent: { intent: "navigate", targetPage: "pulse", entity: { type: "page", name: "Fleet Pulse" } },
  },
  {
    pattern: /\b(go\s*(to\s*)?)?(the\s*)?home(\s*page)?|landing/i,
    intent: { intent: "navigate", targetPage: "home", entity: { type: "page", name: "Home" } },
  },
  {
    pattern: /\b(trip\s*)?(story|comic|recap|narrative)\b/i,
    intent: { intent: "navigate", targetPage: "story", entity: { type: "page", name: "Trip Story" } },
  },
  {
    pattern: /\b(vehicle\s*)?(dashboard|trips?\s*map|map|breadcrumb)\b/i,
    intent: { intent: "navigate", targetPage: "dashboard", entity: { type: "page", name: "Dashboard" } },
  },
  {
    pattern: /features?|how\s*it\s*works|about/i,
    intent: { intent: "navigate", targetPage: "features", entity: { type: "page", name: "Features" } },
  },
  {
    pattern: /how\s*many\s*(vehicles?|trucks?|cars?)\s*(are\s*)?(active|online|running|moving)/i,
    intent: { intent: "lookup", metric: "active" },
  },
  {
    pattern: /\b(total\s*)?(vehicles?|fleet\s*size|how\s*many\s*vehicles?)\b/i,
    intent: { intent: "lookup", metric: "status" },
  },
  {
    pattern: /\b(idle|idling|idle\s*(time|rate|percent|pct))\b/i,
    intent: { intent: "lookup", metric: "idle" },
  },
  {
    pattern: /\b(distance|km|kilometers?|miles?)\b.*\b(fleet|vehicle|today|week)\b|\b(fleet|vehicle)\b.*\b(distance|km)\b/i,
    intent: { intent: "lookup", metric: "distance" },
  },
  {
    pattern: /\b(trip\s*count|number\s*of\s*trips?|how\s*many\s*trips?)\b/i,
    intent: { intent: "lookup", metric: "trips" },
  },
  {
    pattern: /\b(speed|fast(est)?|max\s*speed)\b/i,
    intent: { intent: "lookup", metric: "speed" },
  },
  {
    pattern: /\b(summar(y|ize)|overview|what.s\s*happening|status)\b/i,
    intent: { intent: "explain" },
  },
];

/**
 * Pure keyword-based intent matching. Returns null if no pattern matches.
 * Used as fallback when LLM is unavailable and as a fast pre-filter.
 */
export function keywordClassify(query: string): AssistantIntent | null {
  const q = query.trim();
  for (const route of KEYWORD_ROUTES) {
    if (route.pattern.test(q)) {
      return route.intent;
    }
  }
  return null;
}

// ─── Fuzzy entity matching ────────────────────────────────────────────────────

/**
 * Simple Levenshtein distance for short strings (< 50 chars).
 * Sufficient for fuzzy fleet/vehicle name matching without a library.
 */
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
}

function score(query: string, candidate: string): number {
  const q = normalize(query);
  const c = normalize(candidate);
  if (c === q) return 1.0;
  if (c.includes(q) || q.includes(c)) return 0.85;
  const dist = levenshtein(q, c);
  const maxLen = Math.max(q.length, c.length);
  return maxLen === 0 ? 1.0 : 1 - dist / maxLen;
}

export interface FuzzyMatch<T> {
  item: T;
  score: number;
}

/** Find the best matching fleet group for a name extracted from a query. */
export function fuzzyMatchFleet(
  name: string,
  fleets: FleetGroup[]
): FuzzyMatch<FleetGroup> | null {
  if (!name || fleets.length === 0) return null;
  const scored = fleets.map((f) => ({ item: f, score: score(name, f.name) }));
  scored.sort((a, b) => b.score - a.score);
  return scored[0].score >= 0.4 ? scored[0] : null;
}

/** Find the best matching vehicle for a name extracted from a query. */
export function fuzzyMatchVehicle(
  name: string,
  vehicles: VehicleCard[]
): FuzzyMatch<VehicleCard> | null {
  if (!name || vehicles.length === 0) return null;
  const scored = vehicles.map((v) => ({ item: v, score: score(name, v.name) }));
  scored.sort((a, b) => b.score - a.score);
  return scored[0].score >= 0.4 ? scored[0] : null;
}

/** Return the top N closest fleet name suggestions for "did you mean?" UI. */
export function suggestFleets(
  name: string,
  fleets: FleetGroup[],
  topN = 3
): FleetGroup[] {
  const scored = fleets.map((f) => ({ item: f, score: score(name, f.name) }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topN).map((s) => s.item);
}

// ─── LLM intent classification ────────────────────────────────────────────────

const ASSISTANT_CLASSIFY_SYSTEM = `You are an intent classifier for FleetHappens, a fleet intelligence app.

The app has these pages:
- home: landing page / vehicle selector
- pulse: company-wide Fleet Pulse overview with fleet group KPIs
- fleet-detail: detail page for a specific fleet group
- dashboard: individual vehicle trip dashboard with GPS map
- story: comic-style trip story/recap
- features: how-it-works page

Classify the user's query into ONE of these intents:
- navigate: user wants to go to a specific page or view a specific fleet/vehicle
- lookup: user wants a quick data fact (active count, distance, idle rate, trip count)
- explain: user wants a summary or overview of what's happening
- unknown: query is unclear or outside the scope of fleet data

Extract entity names exactly as mentioned. Do not invent entity names.

Return ONLY valid JSON matching this schema:
{
  "intent": "navigate" | "lookup" | "explain" | "unknown",
  "entity": { "type": "fleet" | "vehicle" | "trip" | "page", "name": "string" } | null,
  "metric": "distance" | "idle" | "trips" | "active" | "status" | "speed" | null,
  "timeframe": "string describing timeframe" | null,
  "targetPage": "home" | "pulse" | "fleet-detail" | "dashboard" | "story" | "features" | null
}`;

/**
 * Classify a query using the LLM. Returns null if the LLM call fails —
 * callers should fall back to keywordClassify() in that case.
 */
export async function llmClassify(
  query: string,
  context: AssistantContext
): Promise<AssistantIntent | null> {
  const contextNote =
    context.currentPage !== "home"
      ? `The user is currently on the "${context.currentPage}" page` +
        (context.currentFleetName ? ` viewing the "${context.currentFleetName}" fleet` : "") +
        (context.currentDeviceName ? ` viewing vehicle "${context.currentDeviceName}"` : "") +
        "."
      : "";

  const userMessage = contextNote
    ? `${contextNote}\n\nUser query: "${query}"`
    : `User query: "${query}"`;

  try {
    const raw = await generateText(
      ASSISTANT_CLASSIFY_SYSTEM,
      [{ role: "user", content: userMessage }],
      { maxTokens: 256, temperature: 0 }
    );

    // Strip markdown fences if the LLM wraps in ```json
    const cleaned = raw.replace(/^```json?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
    const parsed = JSON.parse(cleaned) as AssistantIntent;

    if (!["navigate", "lookup", "explain", "unknown"].includes(parsed.intent)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Classify a query using keyword fallback first, then LLM.
 * Always returns an intent — worst case is { intent: "unknown" }.
 */
export async function classifyIntent(
  query: string,
  context: AssistantContext
): Promise<{ intent: AssistantIntent; fromFallback: boolean }> {
  // Fast path: keyword match (no LLM needed)
  const keyword = keywordClassify(query);
  if (keyword && keyword.intent !== "unknown") {
    // Keyword match is confident enough — skip LLM for speed
    if (keyword.intent === "navigate" && keyword.targetPage) {
      return { intent: keyword, fromFallback: true };
    }
  }

  // LLM path: more nuanced understanding
  const llm = await llmClassify(query, context);
  if (llm) {
    return { intent: llm, fromFallback: false };
  }

  // If LLM fails, use keyword match if we had one
  if (keyword) {
    return { intent: keyword, fromFallback: true };
  }

  // Complete fallback
  return { intent: { intent: "unknown" }, fromFallback: true };
}

// ─── Contextual suggestions ───────────────────────────────────────────────────

/** Return contextually relevant suggestion chips for the current page. */
export function getContextualSuggestions(context: AssistantContext): string[] {
  switch (context.currentPage) {
    case "home":
      return [
        "Open Fleet Pulse",
        "How many vehicles are active?",
        "Show me features",
      ];
    case "pulse":
      return [
        "Which fleet has the most distance?",
        "What's the total idle rate?",
        "How many vehicles are active?",
        context.currentFleetName ? `Summarize ${context.currentFleetName}` : "Summarize fleet activity",
      ].filter(Boolean) as string[];
    case "fleet-detail":
      return [
        context.currentFleetName ? `What's happening with ${context.currentFleetName}?` : "What's happening here?",
        "Which vehicle is idling most?",
        "Show me Fleet Pulse",
        "Go to dashboard",
      ].filter(Boolean) as string[];
    case "dashboard":
      return [
        "Create a trip story",
        "What was the last trip distance?",
        context.currentDeviceName ? `Show fleet for ${context.currentDeviceName}` : "Show Fleet Pulse",
        "Go to Fleet Pulse",
      ].filter(Boolean) as string[];
    case "story":
      return [
        "Go back to dashboard",
        "Go to Fleet Pulse",
        "How many vehicles are active?",
      ];
    default:
      return [
        "Open Fleet Pulse",
        "How many vehicles are active?",
        "Which fleet has the most distance?",
      ];
  }
}

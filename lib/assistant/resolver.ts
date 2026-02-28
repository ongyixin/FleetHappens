/**
 * lib/assistant/resolver.ts
 *
 * Maps classified intents to existing API calls and formats AssistantResponse objects.
 *
 * Rules:
 *   - Never calls Geotab or Ace directly — only calls internal API routes.
 *   - Never invents fleet facts — all data comes from API responses.
 *   - Ace queries are explicitly excluded (too slow for a command palette).
 *   - LLM is only used for narrating structured data, never as a data source.
 */

import type {
  AssistantIntent,
  AssistantContext,
  AssistantResponse,
  AssistantAction,
  CompanyPulseSummary,
  FleetPulseDetail,
  FleetGroup,
  VehicleCard,
  ApiResponse,
  TripSummary,
} from "@/types";
import {
  fuzzyMatchFleet,
  fuzzyMatchVehicle,
  suggestFleets,
} from "./intents";
import { generateText } from "@/lib/llm/client";

// ─── Internal fetch helpers ───────────────────────────────────────────────────

const BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

async function fetchPulseSummary(): Promise<CompanyPulseSummary | null> {
  try {
    const res = await fetch(`${BASE_URL}/api/pulse/summary`, {
      next: { revalidate: 60 },
    });
    const json: ApiResponse<CompanyPulseSummary> = await res.json();
    return json.ok ? json.data : null;
  } catch {
    return null;
  }
}

async function fetchFleetDetail(groupId: string): Promise<FleetPulseDetail | null> {
  try {
    const res = await fetch(`${BASE_URL}/api/pulse/fleet/${groupId}`, {
      next: { revalidate: 60 },
    });
    const json: ApiResponse<FleetPulseDetail> = await res.json();
    return json.ok ? json.data : null;
  } catch {
    return null;
  }
}

async function fetchDevices(): Promise<VehicleCard[] | null> {
  try {
    const res = await fetch(`${BASE_URL}/api/geotab/devices`, {
      next: { revalidate: 300 },
    });
    const json: ApiResponse<VehicleCard[]> = await res.json();
    return json.ok ? json.data : null;
  } catch {
    return null;
  }
}

async function fetchGroups(): Promise<FleetGroup[] | null> {
  try {
    const res = await fetch(`${BASE_URL}/api/geotab/groups`, {
      next: { revalidate: 300 },
    });
    const json: ApiResponse<FleetGroup[]> = await res.json();
    return json.ok ? json.data : null;
  } catch {
    return null;
  }
}

async function fetchTrips(deviceId: string): Promise<TripSummary[] | null> {
  try {
    const res = await fetch(
      `${BASE_URL}/api/geotab/trips?deviceId=${encodeURIComponent(deviceId)}`,
      { next: { revalidate: 120 } }
    );
    const json: ApiResponse<TripSummary[]> = await res.json();
    return json.ok ? json.data : null;
  } catch {
    return null;
  }
}

// ─── LLM narration helper ─────────────────────────────────────────────────────

const NARRATE_SYSTEM = `You are a concise fleet intelligence assistant.
Given structured fleet data, write a 1-2 sentence natural-language summary.
Be specific and factual. Never invent numbers not in the data.
Respond with only the summary text, no markdown.`;

async function narrateData(
  dataDescription: string,
  facts: string
): Promise<string | null> {
  try {
    const raw = await generateText(
      NARRATE_SYSTEM,
      [{ role: "user", content: `${dataDescription}\n\nData:\n${facts}` }],
      { maxTokens: 128, temperature: 0.3 }
    );
    return raw.trim() || null;
  } catch {
    return null;
  }
}

// ─── Page-level navigation targets ───────────────────────────────────────────

const PAGE_TARGETS: Record<string, { url: string; label: string; text: string }> = {
  home: { url: "/", label: "Go to Home", text: "Taking you to the home page." },
  pulse: { url: "/pulse", label: "Open Fleet Pulse", text: "Opening Fleet Pulse — your company-wide overview." },
  dashboard: { url: "/dashboard", label: "Open Dashboard", text: "Opening the vehicle trip dashboard." },
  story: { url: "/story", label: "View Trip Stories", text: "Taking you to trip stories." },
  features: { url: "/features", label: "View Features", text: "Opening the features overview." },
};

// ─── Resolver ─────────────────────────────────────────────────────────────────

export async function resolveIntent(
  intent: AssistantIntent,
  context: AssistantContext,
  fromFallback: boolean,
  rawQuery: string
): Promise<AssistantResponse> {
  switch (intent.intent) {
    case "navigate":
      return resolveNavigate(intent, context);
    case "lookup":
      return resolveLookup(intent, context, rawQuery);
    case "explain":
      return resolveExplain(intent, context);
    case "unknown":
    default:
      return resolveUnknown(rawQuery);
  }
}

// ─── Navigate handler ─────────────────────────────────────────────────────────

async function resolveNavigate(
  intent: AssistantIntent,
  context: AssistantContext
): Promise<AssistantResponse> {
  // If a specific fleet entity is named, resolve it
  if (intent.entity?.type === "fleet" && intent.entity.name) {
    const groups = await fetchGroups();
    if (groups) {
      const match = fuzzyMatchFleet(intent.entity.name, groups);
      if (match) {
        return {
          text: `Navigating to the **${match.item.name}** fleet — ${match.item.vehicleCount} vehicle${match.item.vehicleCount !== 1 ? "s" : ""}.`,
          action: {
            type: "navigate",
            url: `/pulse/${match.item.id}`,
            label: `View ${match.item.name}`,
          },
          suggestions: ["How many vehicles are active?", "Which fleet has the most distance?"],
        };
      }

      const suggestions = suggestFleets(intent.entity.name, groups, 3);
      if (suggestions.length > 0) {
        return {
          text: `I couldn't find a fleet called "${intent.entity.name}". Did you mean one of these?`,
          suggestions: suggestions.map((f) => `Show me ${f.name}`),
        };
      }
    }
    return {
      text: `I couldn't find a fleet called "${intent.entity.name}". Try opening Fleet Pulse to see all fleets.`,
      action: { type: "navigate", url: "/pulse", label: "Open Fleet Pulse" },
    };
  }

  // If a specific vehicle entity is named
  if (intent.entity?.type === "vehicle" && intent.entity.name) {
    const vehicles = await fetchDevices();
    if (vehicles) {
      const match = fuzzyMatchVehicle(intent.entity.name, vehicles);
      if (match) {
        return {
          text: `Found vehicle **${match.item.name}**. Opening the trip dashboard.`,
          action: {
            type: "navigate",
            url: `/dashboard?deviceId=${match.item.id}&deviceName=${encodeURIComponent(match.item.name)}`,
            label: `View ${match.item.name}`,
          },
          suggestions: ["What was the last trip distance?", "Create a trip story"],
        };
      }
    }
    return {
      text: `I couldn't find a vehicle called "${intent.entity.name}". Opening the vehicle selector.`,
      action: { type: "navigate", url: "/", label: "Select a Vehicle" },
    };
  }

  // Generic page navigation
  if (intent.targetPage) {
    const target = PAGE_TARGETS[intent.targetPage];
    if (target) {
      // Special handling: if navigating to story and we have a current trip
      if (intent.targetPage === "story" && context.currentTripId && context.currentDeviceId) {
        return {
          text: "Creating a trip story for the current trip.",
          action: {
            type: "navigate",
            url: `/story/${context.currentTripId}?deviceId=${context.currentDeviceId}${context.currentDeviceName ? `&deviceName=${encodeURIComponent(context.currentDeviceName)}` : ""}`,
            label: "View Trip Story",
          },
        };
      }
      // Special handling: if navigating to fleet-detail and we have a current fleet
      if (intent.targetPage === "fleet-detail" && context.currentFleetId) {
        return {
          text: `Navigating to the ${context.currentFleetName ?? "fleet"} detail view.`,
          action: {
            type: "navigate",
            url: `/pulse/${context.currentFleetId}`,
            label: `View ${context.currentFleetName ?? "Fleet"}`,
          },
        };
      }
      return {
        text: target.text,
        action: { type: "navigate", url: target.url, label: target.label },
      };
    }
  }

  // Fallback: send to pulse
  return {
    text: "Opening Fleet Pulse — your company-wide fleet overview.",
    action: { type: "navigate", url: "/pulse", label: "Open Fleet Pulse" },
  };
}

// ─── Lookup handler ───────────────────────────────────────────────────────────

async function resolveLookup(
  intent: AssistantIntent,
  context: AssistantContext,
  rawQuery: string
): Promise<AssistantResponse> {
  // Determine if this is fleet-scoped or company-wide
  const fleetName = intent.entity?.type === "fleet" ? intent.entity.name : undefined;

  // Fleet-scoped lookup
  if (fleetName) {
    const groups = await fetchGroups();
    if (!groups) return dataErrorResponse();

    const match = fuzzyMatchFleet(fleetName, groups);
    if (!match) {
      const suggestions = suggestFleets(fleetName, groups, 3);
      return {
        text: `I couldn't find a fleet called "${fleetName}".`,
        suggestions:
          suggestions.length > 0
            ? suggestions.map((f) => `Show me ${f.name}`)
            : ["Open Fleet Pulse"],
      };
    }

    const detail = await fetchFleetDetail(match.item.id);
    if (!detail) return dataErrorResponse();

    return formatFleetLookup(detail, intent.metric, match.item);
  }

  // Vehicle-scoped lookup
  if (intent.entity?.type === "vehicle") {
    const vehicles = await fetchDevices();
    if (!vehicles) return dataErrorResponse();

    const match = fuzzyMatchVehicle(intent.entity.name, vehicles);
    if (!match) {
      return {
        text: `I couldn't find a vehicle called "${intent.entity.name}".`,
        action: { type: "navigate", url: "/", label: "Select a Vehicle" },
      };
    }

    return formatVehicleLookup(match.item, intent.metric);
  }

  // Company-wide lookup — use pulse summary
  const summary = await fetchPulseSummary();
  if (!summary) return dataErrorResponse();

  return formatCompanyLookup(summary, intent.metric);
}

function formatCompanyLookup(
  summary: CompanyPulseSummary,
  metric?: string
): AssistantResponse {
  const { totals, fleets } = summary;
  const action: AssistantAction = {
    type: "navigate",
    url: "/pulse",
    label: "View Fleet Pulse",
  };

  switch (metric) {
    case "active":
      return {
        text: `**${totals.activeVehicles}** of ${totals.vehicles} vehicles are currently active across all fleets.`,
        data: { metric: "Active Vehicles", value: totals.activeVehicles, context: `of ${totals.vehicles} total` },
        action,
        suggestions: ["Which fleet has the most active vehicles?", "What's the idle rate?"],
      };

    case "status":
      return {
        text: `Your fleet has **${totals.vehicles}** vehicles total — ${totals.activeVehicles} active, ${totals.vehicles - totals.activeVehicles} idle or offline.`,
        data: { metric: "Total Vehicles", value: totals.vehicles },
        action,
        suggestions: ["Which fleet has the most vehicles?", "How many are active?"],
      };

    case "distance": {
      const topByDistance = [...fleets].sort(
        (a, b) => b.totalDistanceKm - a.totalDistanceKm
      )[0];
      if (topByDistance && topByDistance.totalDistanceKm > 0) {
        return {
          text: `The **${topByDistance.group.name}** fleet leads with ${topByDistance.totalDistanceKm.toFixed(0)} km this week.`,
          data: { metric: "Top Fleet Distance", value: topByDistance.totalDistanceKm, unit: "km" },
          action: {
            type: "navigate",
            url: `/pulse/${topByDistance.group.id}`,
            label: `View ${topByDistance.group.name}`,
          },
          suggestions: ["Which fleet has the most idle time?"],
        };
      }
      return {
        text: "Distance data is loaded by the fleet analytics engine. Open Fleet Pulse to see it.",
        action,
      };
    }

    case "idle":
      if (totals.avgIdlePct > 0) {
        return {
          text: `Fleet-wide average idle rate is **${totals.avgIdlePct.toFixed(1)}%**.`,
          data: { metric: "Avg Idle Rate", value: totals.avgIdlePct, unit: "%" },
          action,
          suggestions: ["Which fleet has the worst idle rate?"],
        };
      }
      return {
        text: "Idle rate data comes from the fleet analytics engine and loads on the Fleet Pulse page.",
        action,
      };

    case "trips":
      if (totals.trips > 0) {
        return {
          text: `**${totals.trips}** trips have been logged across all fleets this period.`,
          data: { metric: "Total Trips", value: totals.trips },
          action,
        };
      }
      return {
        text: "Trip count data loads from the analytics engine on Fleet Pulse.",
        action,
      };

    default:
      return {
        text: `Your fleet has **${totals.vehicles}** vehicles total, with **${totals.activeVehicles}** currently active.`,
        data: { metric: "Fleet Status", value: `${totals.activeVehicles} / ${totals.vehicles}`, context: "active" },
        action,
        suggestions: ["Which fleet has the most distance?", "What's the idle rate?"],
      };
  }
}

function formatFleetLookup(
  detail: FleetPulseDetail,
  metric: string | undefined,
  group: FleetGroup
): AssistantResponse {
  const action: AssistantAction = {
    type: "navigate",
    url: `/pulse/${group.id}`,
    label: `View ${group.name}`,
  };

  const activeCount = detail.vehicles.filter((v) => v.status === "active").length;
  const idleCount = detail.vehicles.filter((v) => v.status === "idle").length;
  const offlineCount = detail.vehicles.filter((v) => v.status === "offline").length;
  const total = detail.vehicles.length;

  switch (metric) {
    case "active":
      return {
        text: `**${activeCount}** of ${total} vehicles in ${group.name} are active right now.`,
        data: { metric: "Active", value: activeCount, context: `of ${total}` },
        action,
        suggestions: [`What's the idle rate for ${group.name}?`],
      };

    case "idle":
      return {
        text: `${group.name} has **${idleCount}** idle and **${offlineCount}** offline vehicles (${activeCount} active of ${total} total).`,
        data: { metric: "Idle Vehicles", value: idleCount, context: `of ${total}` },
        action,
      };

    case "status":
    default:
      return {
        text: `**${group.name}**: ${activeCount} active · ${idleCount} idle · ${offlineCount} offline out of ${total} vehicles.`,
        data: { metric: group.name, value: `${activeCount}A / ${idleCount}I / ${offlineCount}O`, context: "active / idle / offline" },
        action,
        suggestions: [`Which vehicle is idling most in ${group.name}?`, "Show Fleet Pulse"],
      };
  }
}

async function formatVehicleLookup(
  vehicle: VehicleCard,
  metric?: string
): Promise<AssistantResponse> {
  const action: AssistantAction = {
    type: "navigate",
    url: `/dashboard?deviceId=${vehicle.id}&deviceName=${encodeURIComponent(vehicle.name)}`,
    label: `View ${vehicle.name}`,
  };

  if (metric === "distance" || metric === "trips" || metric === "speed") {
    const trips = await fetchTrips(vehicle.id);
    if (trips && trips.length > 0) {
      const latest = trips[0];
      const lastTripDate = new Date(latest.start).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });

      if (metric === "distance") {
        return {
          text: `**${vehicle.name}**'s last trip on ${lastTripDate} covered **${latest.distanceKm?.toFixed(1) ?? (latest.distanceMeters / 1000).toFixed(1)} km**.`,
          data: { metric: "Last Trip Distance", value: latest.distanceKm ?? latest.distanceMeters / 1000, unit: "km" },
          action,
          suggestions: [`Create a story for ${vehicle.name}`, "Go to dashboard"],
        };
      }

      if (metric === "speed") {
        return {
          text: `**${vehicle.name}** hit a max speed of **${latest.maxSpeedKmh} km/h** on its last trip (${lastTripDate}).`,
          data: { metric: "Max Speed", value: latest.maxSpeedKmh, unit: "km/h" },
          action,
        };
      }

      return {
        text: `**${vehicle.name}** has ${trips.length} recorded trips. The most recent was on ${lastTripDate}.`,
        data: { metric: "Recent Trips", value: trips.length },
        action,
        suggestions: [`Create a story for ${vehicle.name}`],
      };
    }
  }

  return {
    text: `Found **${vehicle.name}**. Open the dashboard to see its trips and GPS history.`,
    action,
    suggestions: ["What was the last trip distance?", "Create a trip story"],
  };
}

// ─── Explain handler ──────────────────────────────────────────────────────────

async function resolveExplain(
  intent: AssistantIntent,
  context: AssistantContext
): Promise<AssistantResponse> {
  const fleetName = intent.entity?.type === "fleet" ? intent.entity.name : undefined;

  // Fleet-specific explain
  if (fleetName) {
    const groups = await fetchGroups();
    if (groups) {
      const match = fuzzyMatchFleet(fleetName, groups);
      if (match) {
        const detail = await fetchFleetDetail(match.item.id);
        if (detail) {
          const active = detail.vehicles.filter((v) => v.status === "active").length;
          const idle = detail.vehicles.filter((v) => v.status === "idle").length;
          const offline = detail.vehicles.filter((v) => v.status === "offline").length;
          const total = detail.vehicles.length;

          const facts = `Fleet: ${match.item.name}, Total: ${total} vehicles, Active: ${active}, Idle: ${idle}, Offline: ${offline}`;
          const narrated = await narrateData("Summarize this fleet's current status in 1-2 sentences.", facts);

          return {
            text: narrated ?? `**${match.item.name}**: ${active} active, ${idle} idle, ${offline} offline out of ${total} vehicles.`,
            action: {
              type: "navigate",
              url: `/pulse/${match.item.id}`,
              label: `View ${match.item.name}`,
            },
            suggestions: ["Which vehicle is idling most?", "Show Fleet Pulse"],
          };
        }
      }
    }
  }

  // Company-wide explain
  const summary = await fetchPulseSummary();
  if (!summary) return dataErrorResponse();

  const { totals, fleets } = summary;
  const topFleet = [...fleets].sort((a, b) => b.activeVehicles - a.activeVehicles)[0];
  const facts = [
    `Total vehicles: ${totals.vehicles}`,
    `Active: ${totals.activeVehicles}`,
    `Fleets: ${fleets.length}`,
    topFleet ? `Most active fleet: ${topFleet.group.name} (${topFleet.activeVehicles} active)` : "",
  ]
    .filter(Boolean)
    .join(", ");

  const narrated = await narrateData("Summarize the company fleet status in 1-2 sentences.", facts);

  return {
    text: narrated ?? `Your fleet has **${totals.vehicles}** vehicles across ${fleets.length} fleets, with **${totals.activeVehicles}** currently active.`,
    action: { type: "navigate", url: "/pulse", label: "View Fleet Pulse" },
    suggestions: [
      topFleet ? `Show me ${topFleet.group.name}` : "Show Fleet Pulse",
      "How many vehicles are active?",
    ].filter(Boolean) as string[],
  };
}

// ─── Unknown handler ──────────────────────────────────────────────────────────

function resolveUnknown(rawQuery: string): AssistantResponse {
  const q = rawQuery.toLowerCase();
  const isQuestion = q.includes("?") || /^(what|how|which|who|when|where|why|is|are|can|show)/i.test(q);

  if (isQuestion) {
    return {
      text: "I can help with fleet navigation and quick lookups. Try asking about specific fleets, vehicles, or metrics.",
      suggestions: [
        "How many vehicles are active?",
        "Open Fleet Pulse",
        "Which fleet has the most distance?",
        "Go to dashboard",
      ],
    };
  }

  return {
    text: "I'm not sure what you're looking for. Try navigating to a specific fleet or asking about fleet metrics.",
    suggestions: [
      "Open Fleet Pulse",
      "How many vehicles are active?",
      "Show me the dashboard",
    ],
  };
}

// ─── Error helpers ────────────────────────────────────────────────────────────

function dataErrorResponse(): AssistantResponse {
  return {
    text: "I'm having trouble loading fleet data right now. Try refreshing the page.",
    action: { type: "navigate", url: "/pulse", label: "Open Fleet Pulse" },
  };
}

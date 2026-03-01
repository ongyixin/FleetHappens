/**
 * lib/assistant/analyze.ts
 *
 * Grounded open-ended analysis for the FleetHappens AI assistant.
 *
 * Design principles:
 *   - Data dossier pattern: facts are gathered deterministically first,
 *     then the LLM receives a bounded, structured context it must stay within.
 *   - The LLM never invents numbers — every claim must trace to a value in the dossier.
 *   - Deterministic fallback ensures the UI always has a useful answer even if LLM fails.
 *   - No Ace calls — only fast internal API routes (< 2s total gather time).
 */

import type {
  AssistantIntent,
  AssistantContext,
  AssistantResponse,
  AssistantAction,
  AnalysisTopic,
  CompanyPulseSummary,
  FleetPulseDetail,
  FleetGroup,
  FleetSummary,
  VehicleActivity,
  ApiResponse,
} from "@/types";
import { generateText } from "@/lib/llm/client";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

// ─── API fetch helpers ────────────────────────────────────────────────────────

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

// ─── Derived metric helpers ───────────────────────────────────────────────────

interface VehicleEfficiency {
  name: string;
  fleetName: string;
  status: string;
  distanceKm: number;
  idleFlag: boolean;
}

interface FleetRanking {
  name: string;
  activeVehicles: number;
  totalVehicles: number;
  activePct: number;
  totalDistanceKm: number;
  avgIdlePct: number;
  trips: number;
  compositeScore: number;
}

interface VehicleOutlier {
  name: string;
  fleetName: string;
  reason: string;
  severity: "warning" | "critical";
}

// ─── DataDossier ─────────────────────────────────────────────────────────────

interface DataDossier {
  topic: AnalysisTopic;
  sources: string[];
  // Summary-level
  totalVehicles?: number;
  activeVehicles?: number;
  fleetCount?: number;
  // Per-fleet rankings (fleet_comparison, route_efficiency)
  fleetRankings?: FleetRanking[];
  // Efficiency-flagged vehicles (route_efficiency)
  idleOutliers?: VehicleEfficiency[];
  offlineVehicles?: VehicleEfficiency[];
  // Outlier vehicles (anomalies, vehicle_patterns)
  vehicleOutliers?: VehicleOutlier[];
  // Raw fleet details gathered (for general fallback narration)
  fleetDetails?: { group: FleetGroup; active: number; idle: number; offline: number; total: number }[];
}

// ─── Data gathering ───────────────────────────────────────────────────────────

function computeFleetRanking(summary: FleetSummary): FleetRanking {
  const activePct =
    summary.totalVehicles > 0
      ? (summary.activeVehicles / summary.totalVehicles) * 100
      : 0;
  // Composite score: weight active% heavily, penalise idle, add normalised distance
  // All values normalised relative to themselves; this gives a relative ranking
  const compositeScore = activePct * 0.5 - summary.avgIdlePct * 0.3 + summary.totalDistanceKm * 0.001;
  return {
    name: summary.group.name,
    activeVehicles: summary.activeVehicles,
    totalVehicles: summary.totalVehicles,
    activePct,
    totalDistanceKm: summary.totalDistanceKm,
    avgIdlePct: summary.avgIdlePct,
    trips: summary.totalTrips,
    compositeScore,
  };
}

function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

function detectVehicleOutliers(
  vehicles: VehicleActivity[],
  fleetName: string
): VehicleOutlier[] {
  const outliers: VehicleOutlier[] = [];

  // Flag offline vehicles (always worth flagging)
  for (const v of vehicles) {
    if (v.status === "offline") {
      outliers.push({
        name: v.vehicle.name,
        fleetName,
        reason: "Vehicle is offline",
        severity: "warning",
      });
    }
  }

  // Flag vehicles with unusually high distance (> mean + 1 SD)
  const distances = vehicles
    .map((v) => v.distanceTodayKm ?? 0)
    .filter((d) => d > 0);
  if (distances.length >= 3) {
    const mean = distances.reduce((a, b) => a + b, 0) / distances.length;
    const sd = stdDev(distances);
    for (const v of vehicles) {
      const d = v.distanceTodayKm ?? 0;
      if (d > 0 && d > mean + sd) {
        outliers.push({
          name: v.vehicle.name,
          fleetName,
          reason: `Unusually high distance today: ${d.toFixed(0)} km (fleet avg ${mean.toFixed(0)} km)`,
          severity: "warning",
        });
      }
    }
  }

  return outliers;
}

export async function gatherDossier(
  topic: AnalysisTopic,
  context: AssistantContext
): Promise<DataDossier> {
  const dossier: DataDossier = { topic, sources: [] };

  const summary = await fetchPulseSummary();
  if (!summary) return dossier;
  dossier.sources.push("Fleet Pulse summary");

  dossier.totalVehicles = summary.totals.vehicles;
  dossier.activeVehicles = summary.totals.activeVehicles;
  dossier.fleetCount = summary.fleets.length;

  if (topic === "fleet_comparison" || topic === "general") {
    dossier.fleetRankings = summary.fleets
      .map(computeFleetRanking)
      .sort((a, b) => b.compositeScore - a.compositeScore);
    return dossier;
  }

  // For anomalies, route_efficiency, vehicle_patterns — fetch fleet details
  // Prioritise current fleet context, then fetch all fleets (up to 5 to stay fast)
  const groupsToFetch: { id: string; name: string }[] = [];

  if (context.currentFleetId && context.currentFleetName) {
    groupsToFetch.push({ id: context.currentFleetId, name: context.currentFleetName });
  } else {
    // Take up to 5 fleets
    for (const f of summary.fleets.slice(0, 5)) {
      groupsToFetch.push({ id: f.group.id, name: f.group.name });
    }
  }

  const detailResults = await Promise.allSettled(
    groupsToFetch.map((g) => fetchFleetDetail(g.id))
  );

  dossier.fleetDetails = [];
  dossier.vehicleOutliers = [];
  dossier.idleOutliers = [];
  dossier.offlineVehicles = [];

  const fleetDetailsFetched: string[] = [];

  for (let i = 0; i < detailResults.length; i++) {
    const result = detailResults[i];
    if (result.status !== "fulfilled" || !result.value) continue;
    const detail = result.value;
    const fleetName = groupsToFetch[i].name;
    fleetDetailsFetched.push(fleetName);

    const active = detail.vehicles.filter((v) => v.status === "active").length;
    const idle = detail.vehicles.filter((v) => v.status === "idle").length;
    const offline = detail.vehicles.filter((v) => v.status === "offline").length;
    const total = detail.vehicles.length;

    dossier.fleetDetails.push({ group: detail.group, active, idle, offline, total });

    const outliers = detectVehicleOutliers(detail.vehicles, fleetName);
    dossier.vehicleOutliers.push(...outliers);

    // Idle outliers for route_efficiency
    if (topic === "route_efficiency") {
      const idleVehicles = detail.vehicles.filter((v) => v.status === "idle");
      for (const v of idleVehicles) {
        dossier.idleOutliers.push({
          name: v.vehicle.name,
          fleetName,
          status: v.status,
          distanceKm: v.distanceTodayKm ?? 0,
          idleFlag: true,
        });
      }
      const offlineVehicles = detail.vehicles.filter((v) => v.status === "offline");
      for (const v of offlineVehicles) {
        dossier.offlineVehicles.push({
          name: v.vehicle.name,
          fleetName,
          status: v.status,
          distanceKm: 0,
          idleFlag: false,
        });
      }
    }
  }

  if (fleetDetailsFetched.length > 0) {
    dossier.sources.push(
      `${fleetDetailsFetched.length} fleet detail${fleetDetailsFetched.length > 1 ? "s" : ""} (${fleetDetailsFetched.join(", ")})`
    );
  }

  return dossier;
}

// ─── Dossier formatter ────────────────────────────────────────────────────────

export function formatDossier(dossier: DataDossier): string {
  const lines: string[] = ["=== FLEET DATA ==="];

  if (dossier.totalVehicles !== undefined) {
    lines.push(
      `Company: ${dossier.totalVehicles} vehicles total, ${dossier.activeVehicles} active, ${dossier.fleetCount} fleets`
    );
  }

  if (dossier.fleetRankings && dossier.fleetRankings.length > 0) {
    lines.push("\nFleet rankings (best → worst composite score):");
    for (const f of dossier.fleetRankings) {
      lines.push(
        `  ${f.name}: ${f.activeVehicles}/${f.totalVehicles} active (${f.activePct.toFixed(0)}%), ` +
          `idle avg ${f.avgIdlePct.toFixed(1)}%, ${f.totalDistanceKm.toFixed(0)} km, ${f.trips} trips`
      );
    }
  }

  if (dossier.fleetDetails && dossier.fleetDetails.length > 0) {
    lines.push("\nFleet status breakdown:");
    for (const f of dossier.fleetDetails) {
      lines.push(
        `  ${f.group.name}: ${f.active} active, ${f.idle} idle, ${f.offline} offline (${f.total} total)`
      );
    }
  }

  if (dossier.idleOutliers && dossier.idleOutliers.length > 0) {
    lines.push(`\nCurrently idle vehicles (${dossier.idleOutliers.length}):`);
    for (const v of dossier.idleOutliers.slice(0, 10)) {
      lines.push(`  ${v.name} (${v.fleetName}) — idle`);
    }
    if (dossier.idleOutliers.length > 10) {
      lines.push(`  ...and ${dossier.idleOutliers.length - 10} more`);
    }
  }

  if (dossier.offlineVehicles && dossier.offlineVehicles.length > 0) {
    lines.push(`\nOffline vehicles (${dossier.offlineVehicles.length}):`);
    for (const v of dossier.offlineVehicles.slice(0, 5)) {
      lines.push(`  ${v.name} (${v.fleetName}) — offline`);
    }
  }

  if (dossier.vehicleOutliers && dossier.vehicleOutliers.length > 0) {
    lines.push(`\nVehicle outliers / anomalies detected (${dossier.vehicleOutliers.length}):`);
    const byFleet: Record<string, VehicleOutlier[]> = {};
    for (const o of dossier.vehicleOutliers) {
      (byFleet[o.fleetName] ??= []).push(o);
    }
    for (const [fleet, items] of Object.entries(byFleet)) {
      for (const item of items.slice(0, 6)) {
        lines.push(`  [${item.severity.toUpperCase()}] ${item.name} (${fleet}): ${item.reason}`);
      }
    }
  }

  lines.push("=== END DATA ===");
  return lines.join("\n");
}

// ─── Grounding prompt ─────────────────────────────────────────────────────────

const GROUNDING_SYSTEM = `You are a fleet intelligence analyst for FleetHappens.

RULES:
1. Answer ONLY based on the DATA section provided — never invent numbers, vehicle names, or metrics.
2. Cite specific values to support every claim (e.g. "North fleet's 34% idle rate").
3. If the data is insufficient to answer, say what additional data would help.
4. Keep the answer to 2-4 sentences. Be direct and actionable.
5. When recommending action, tie it to a specific metric or vehicle name from the data.
6. Do not use markdown formatting — plain sentences only.`;

export async function groundedAnalysis(
  question: string,
  dossier: DataDossier
): Promise<string | null> {
  const dossierText = formatDossier(dossier);
  try {
    const raw = await generateText(
      GROUNDING_SYSTEM,
      [
        {
          role: "user",
          content: `${dossierText}\n\nQuestion: ${question}`,
        },
      ],
      { maxTokens: 256, temperature: 0.2 }
    );
    return raw.trim() || null;
  } catch {
    return null;
  }
}

// ─── Deterministic fallback ───────────────────────────────────────────────────

export function deterministicFallback(
  topic: AnalysisTopic,
  dossier: DataDossier
): string {
  switch (topic) {
    case "route_efficiency": {
      const idleCount = dossier.idleOutliers?.length ?? 0;
      const offlineCount = dossier.offlineVehicles?.length ?? 0;
      if (idleCount > 0 || offlineCount > 0) {
        const parts: string[] = [];
        if (idleCount > 0) parts.push(`${idleCount} vehicle${idleCount > 1 ? "s are" : " is"} currently idle`);
        if (offlineCount > 0) parts.push(`${offlineCount} vehicle${offlineCount > 1 ? "s are" : " is"} offline`);
        return `${parts.join(" and ")}. Reviewing idle vehicle assignments and reactivating offline units would improve fleet efficiency.`;
      }
      return "No idle or offline vehicles detected. Open Fleet Pulse for a full fleet efficiency view.";
    }

    case "anomalies": {
      const outliers = dossier.vehicleOutliers ?? [];
      if (outliers.length === 0) {
        return "No statistical outliers detected in the current fleet data. All vehicles appear within normal operating parameters.";
      }
      const critical = outliers.filter((o) => o.severity === "critical");
      const warning = outliers.filter((o) => o.severity === "warning");
      const parts: string[] = [];
      if (critical.length > 0) parts.push(`${critical.length} critical`);
      if (warning.length > 0) parts.push(`${warning.length} warning`);
      const first = outliers[0];
      return `${outliers.length} anomal${outliers.length > 1 ? "ies" : "y"} detected (${parts.join(", ")}). Most notable: ${first.name} in ${first.fleetName} — ${first.reason}.`;
    }

    case "fleet_comparison": {
      const rankings = dossier.fleetRankings ?? [];
      if (rankings.length < 2) {
        return "Fleet comparison requires multiple fleets. Open Fleet Pulse to see all fleet groups.";
      }
      const best = rankings[0];
      const worst = rankings[rankings.length - 1];
      return `${best.name} leads with ${best.activeVehicles}/${best.totalVehicles} active vehicles (${best.activePct.toFixed(0)}%). ${worst.name} trails at ${worst.activeVehicles}/${worst.totalVehicles} active (${worst.activePct.toFixed(0)}%).`;
    }

    case "vehicle_patterns": {
      const outliers = dossier.vehicleOutliers ?? [];
      if (outliers.length === 0) {
        return "No vehicles with unusual patterns detected. All vehicles appear to be operating within normal parameters.";
      }
      const first = outliers[0];
      return `${outliers.length} vehicle${outliers.length > 1 ? "s" : ""} flagged with unusual patterns. Highest concern: ${first.name} in ${first.fleetName} — ${first.reason}.`;
    }

    case "general":
    default: {
      const rankings = dossier.fleetRankings ?? [];
      const total = dossier.totalVehicles ?? 0;
      const active = dossier.activeVehicles ?? 0;
      if (rankings.length > 0) {
        const best = rankings[0];
        return `Fleet overview: ${active} of ${total} vehicles are active across ${dossier.fleetCount} fleets. ${best.name} is the most active fleet with ${best.activeVehicles}/${best.totalVehicles} vehicles running.`;
      }
      return `Fleet overview: ${active} of ${total} vehicles are currently active. Open Fleet Pulse for the full breakdown.`;
    }
  }
}

// ─── Suggestions by topic ─────────────────────────────────────────────────────

function suggestionsForTopic(topic: AnalysisTopic): string[] {
  switch (topic) {
    case "route_efficiency":
      return [
        "What anomalies exist in the fleet?",
        "Which fleet is performing best?",
        "How many vehicles are active?",
      ];
    case "anomalies":
      return [
        "Which route needs optimising?",
        "Any vehicles with unusual behaviour?",
        "Open Fleet Pulse",
      ];
    case "fleet_comparison":
      return [
        "Which route needs optimising?",
        "What are the most common anomalies?",
        "How many vehicles are active?",
      ];
    case "vehicle_patterns":
      return [
        "What anomalies exist?",
        "Which fleet is performing best?",
        "Open Fleet Pulse",
      ];
    case "general":
    default:
      return [
        "Which route needs optimising?",
        "Which fleet is performing best?",
        "What anomalies exist?",
      ];
  }
}

function actionForTopic(topic: AnalysisTopic, context: AssistantContext) {
  if (
    (topic === "vehicle_patterns" || topic === "anomalies") &&
    context.currentFleetId
  ) {
    return {
      type: "navigate" as const,
      url: `/pulse/${context.currentFleetId}`,
      label: `View ${context.currentFleetName ?? "Fleet"}`,
    };
  }
  return {
    type: "navigate" as const,
    url: "/pulse",
    label: "Open Fleet Pulse",
  };
}

// ─── Main resolver ────────────────────────────────────────────────────────────

export async function resolveAnalyze(
  intent: AssistantIntent,
  context: AssistantContext,
  rawQuery: string
): Promise<AssistantResponse> {
  const topic: AnalysisTopic = intent.analysisTopic ?? "general";

  const dossier = await gatherDossier(topic, context);

  // Guard: no data available
  if (!dossier.totalVehicles && !dossier.fleetRankings) {
    return {
      text: "I'm having trouble loading fleet data right now. Try opening Fleet Pulse directly.",
      action: { type: "navigate", url: "/pulse", label: "Open Fleet Pulse" },
      suggestions: suggestionsForTopic(topic),
    };
  }

  const llmAnswer = await groundedAnalysis(rawQuery, dossier);
  const text = llmAnswer ?? deterministicFallback(topic, dossier);

  return {
    text,
    action: actionForTopic(topic, context),
    suggestions: suggestionsForTopic(topic),
    sources: dossier.sources,
  };
}

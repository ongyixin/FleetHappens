/**
 * lib/assistant/suggestions.ts
 *
 * Pure, client-safe helper: contextual suggestion chips.
 * No server-side imports — safe to import from "use client" components.
 */

import type { AssistantContext } from "@/types";

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
        context.currentFleetName
          ? `Summarize ${context.currentFleetName}`
          : "Summarize fleet activity",
      ].filter(Boolean) as string[];
    case "fleet-detail":
      return [
        context.currentFleetName
          ? `What's happening with ${context.currentFleetName}?`
          : "What's happening here?",
        "Which vehicle is idling most?",
        "Show me Fleet Pulse",
        "Go to dashboard",
      ].filter(Boolean) as string[];
    case "dashboard":
      return [
        "Create a trip story",
        "What was the last trip distance?",
        context.currentDeviceName
          ? `Show fleet for ${context.currentDeviceName}`
          : "Show Fleet Pulse",
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

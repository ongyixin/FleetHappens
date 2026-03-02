// ─── Enterprise Integration Types ──────────────────────────────────────────

import type { ComicStory, TripSummary, ReportPayload } from "@/types";

/**
 * A single metric/stat to display in the shared message.
 * e.g. { label: "Distance", value: "142 km" }
 */
export interface ShareMetric {
  label: string;
  value: string;
}

/**
 * Raw data needed to generate a PDF server-side inside the share routes.
 * When present, a PDF is generated and delivered (uploaded to Slack, or
 * served via a time-limited download URL for Teams).
 * When absent, the routes fall back to the current link-based message.
 */
export type PdfContext =
  | { type: "story"; story: ComicStory; trip: TripSummary | null }
  | { type: "report"; payload: ReportPayload };

/**
 * Payload sent from the client to the /api/integrations/{slack,teams}/share routes.
 * Constructed from existing report data (ComicStory + TripSummary, DigestResult, etc.)
 */
export interface SharePayload {
  /** Report/story title shown as the message heading. */
  title: string;
  /** One or two sentence summary — used as the body text. */
  summary: string;
  /** Key metrics to surface as a fact/field list. */
  metrics: ShareMetric[];
  /** Deep-link back to the report or dashboard page. */
  linkUrl: string;
  /** Which surface originated the share action. */
  source: "story" | "digest" | "pulse";
  /** Optional free-text message from the user, appended after the report card. */
  userMessage?: string;
  /**
   * When present, the share route generates a PDF and delivers it as a file
   * (Slack file upload) or a time-limited download link (Teams).
   */
  pdfContext?: PdfContext;
}

/**
 * Returned by the share API routes in the `data` field of ApiResponse.
 */
export interface ShareResult {
  /** true when the message was actually delivered to the webhook. */
  sent: boolean;
  /** true when operating in mock/demo mode (webhook URL not configured). */
  mock?: boolean;
  /** Human-readable status message for the toast. */
  message: string;
}

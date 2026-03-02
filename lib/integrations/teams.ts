/**
 * Microsoft Teams integration helper.
 *
 * Two delivery modes:
 *   1. PDF download link — when pdfContext is provided. Generates the PDF
 *      server-side, stores it in the in-memory cache, and includes a
 *      "Download PDF" button in the Adaptive Card pointing to the download route.
 *   2. Page link — fallback when pdfContext is absent; "View Report →" button
 *      links to the dashboard page (current behaviour).
 *
 * When TEAMS_WEBHOOK_URL is not set, returns a mock success (demo mode).
 *
 * Adaptive Card schema: v1.4 (broadly supported in Teams).
 */

import type { SharePayload, ShareResult } from "@/types/integrations";
import { generateSharePdf } from "@/lib/integrations/pdf";
import { storePdf } from "@/lib/integrations/pdf-cache";

// ─── Adaptive Card shapes (minimal subset we need) ────────────────────────────

interface ACTextBlock {
  type: "TextBlock";
  text: string;
  size?: "Small" | "Default" | "Medium" | "Large" | "ExtraLarge";
  weight?: "Lighter" | "Default" | "Bolder";
  color?: "Default" | "Dark" | "Light" | "Accent" | "Good" | "Warning" | "Attention";
  wrap?: boolean;
  spacing?: "None" | "Small" | "Default" | "Medium" | "Large" | "ExtraLarge" | "Padding";
}

interface ACFactSet {
  type: "FactSet";
  facts: { title: string; value: string }[];
  spacing?: string;
}

interface ACActionOpenUrl {
  type: "Action.OpenUrl";
  title: string;
  url: string;
}

interface AdaptiveCard {
  type: "AdaptiveCard";
  version: "1.4";
  body: (ACTextBlock | ACFactSet)[];
  actions: ACActionOpenUrl[];
}

interface TeamsWebhookPayload {
  type: "message";
  attachments: TeamsAttachment[];
}

interface TeamsAttachment {
  contentType: "application/vnd.microsoft.card.adaptive";
  contentUrl: null;
  content: AdaptiveCard;
}

// ─── Source label map ─────────────────────────────────────────────────────────

const SOURCE_LABELS: Record<SharePayload["source"], string> = {
  story:  "Trip Story",
  digest: "Fleet Daily Digest",
  pulse:  "Fleet Pulse",
};

// ─── Adaptive Card builder ────────────────────────────────────────────────────

export function buildTeamsCard(
  payload: SharePayload,
  actionTitle = "View Report →",
  actionUrl?: string,
): TeamsWebhookPayload {
  const sourceLabel = SOURCE_LABELS[payload.source];
  const resolvedUrl = actionUrl ?? payload.linkUrl;

  const body: (ACTextBlock | ACFactSet)[] = [
    {
      type: "TextBlock",
      text: payload.title,
      size: "Large",
      weight: "Bolder",
      wrap: true,
    },
    {
      type: "TextBlock",
      text: payload.summary,
      wrap: true,
      spacing: "Small",
    },
  ];

  if (payload.userMessage?.trim()) {
    body.push({
      type: "TextBlock",
      text: payload.userMessage.trim(),
      wrap: true,
      spacing: "Small",
      color: "Accent",
    });
  }

  if (payload.metrics.length > 0) {
    body.push({
      type: "FactSet",
      facts: payload.metrics.map((m) => ({ title: m.label, value: m.value })),
      spacing: "Medium",
    });
  }

  body.push({
    type: "TextBlock",
    text: `Shared from FleetHappens · ${sourceLabel}`,
    size: "Small",
    color: "Light",
    spacing: "Medium",
  });

  const card: AdaptiveCard = {
    type: "AdaptiveCard",
    version: "1.4",
    body,
    actions: [
      {
        type: "Action.OpenUrl",
        title: actionTitle,
        url: resolvedUrl,
      },
    ],
  };

  return {
    type: "message",
    attachments: [
      {
        contentType: "application/vnd.microsoft.card.adaptive",
        contentUrl: null,
        content: card,
      },
    ],
  };
}

// ─── Sender ───────────────────────────────────────────────────────────────────

export async function sendTeamsMessage(
  payload: SharePayload,
  appUrlOverride?: string,
): Promise<ShareResult> {
  const webhookUrl = process.env.TEAMS_WEBHOOK_URL;

  if (!webhookUrl) {
    return {
      sent: false,
      mock: true,
      message: "Shared (demo mode) — set TEAMS_WEBHOOK_URL to deliver for real",
    };
  }

  const appUrl = appUrlOverride ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  // ── Path 1: Generate PDF, cache it, include download link ─────────────────
  if (payload.pdfContext) {
    try {
      const { buffer, filename } = await generateSharePdf(payload.pdfContext, appUrl);
      const token       = storePdf(buffer, filename);
      const downloadUrl = `${appUrl}/api/integrations/report-download/${token}`;

      const card = buildTeamsCard(payload, "Download PDF (1h link) →", downloadUrl);

      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(card),
        signal: AbortSignal.timeout(8000),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => res.statusText);
        throw new Error(`Teams webhook returned ${res.status}: ${text}`);
      }

      return { sent: true, message: "Report PDF shared to Microsoft Teams" };
    } catch (err) {
      // PDF generation failed — fall through to page-link fallback
      console.error("[teams] PDF generation failed, falling back to page link:", err);
    }
  }

  // ── Path 2: Page-link message (current behaviour / fallback) ──────────────
  const body = buildTeamsCard(payload);

  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Teams webhook returned ${res.status}: ${text}`);
  }

  return {
    sent: true,
    message: "Report shared to Microsoft Teams",
  };
}

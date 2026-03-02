/**
 * Slack integration helper.
 *
 * Two delivery modes:
 *   1. PDF file upload — when SLACK_BOT_TOKEN + SLACK_CHANNEL_ID are set and
 *      pdfContext is provided. Uses the Slack Files API v2 (3-step upload).
 *   2. Webhook message — fallback; sends a Block Kit message via SLACK_WEBHOOK_URL.
 *
 * When neither is configured, returns a mock success (demo mode).
 */

import type { SharePayload, ShareResult } from "@/types/integrations";
import { generateSharePdf } from "@/lib/integrations/pdf";

// ─── Block Kit shapes (minimal subset we need) ────────────────────────────────

interface SlackTextObject {
  type: "plain_text" | "mrkdwn";
  text: string;
  emoji?: boolean;
}

interface SlackHeaderBlock {
  type: "header";
  text: SlackTextObject;
}

interface SlackSectionBlock {
  type: "section";
  text?: SlackTextObject;
  fields?: SlackTextObject[];
}

interface SlackDividerBlock {
  type: "divider";
}

interface SlackActionsBlock {
  type: "actions";
  elements: SlackButtonElement[];
}

interface SlackButtonElement {
  type: "button";
  text: SlackTextObject;
  url: string;
  action_id: string;
  style?: "primary" | "danger";
}

interface SlackContextBlock {
  type: "context";
  elements: SlackTextObject[];
}

type SlackBlock =
  | SlackHeaderBlock
  | SlackSectionBlock
  | SlackDividerBlock
  | SlackActionsBlock
  | SlackContextBlock;

interface SlackMessage {
  blocks: SlackBlock[];
  text: string; // fallback for notifications
}

// ─── Source label map ─────────────────────────────────────────────────────────

const SOURCE_LABELS: Record<SharePayload["source"], string> = {
  story:  "Trip Story",
  digest: "Fleet Daily Digest",
  pulse:  "Fleet Pulse",
};

// ─── Block Kit builder ────────────────────────────────────────────────────────

export function buildSlackBlocks(payload: SharePayload, actionLabel = "View Report →"): SlackMessage {
  const sourceLabel = SOURCE_LABELS[payload.source];

  const blocks: SlackBlock[] = [
    {
      type: "header",
      text: { type: "plain_text", text: `📋 ${payload.title}`, emoji: true },
    },
    {
      type: "section",
      text: { type: "mrkdwn", text: payload.summary },
    },
  ];

  if (payload.userMessage?.trim()) {
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: `> ${payload.userMessage.trim()}` },
    });
  }

  // Metrics as two-column fields (Slack supports up to 10 per section block)
  if (payload.metrics.length > 0) {
    blocks.push({ type: "divider" });

    const fields: SlackTextObject[] = payload.metrics.map((m) => ({
      type: "mrkdwn",
      text: `*${m.label}*\n${m.value}`,
    }));

    // Slack recommends ≤10 fields per section; split if needed
    for (let i = 0; i < fields.length; i += 10) {
      blocks.push({
        type: "section",
        fields: fields.slice(i, i + 10),
      });
    }
  }

  blocks.push({ type: "divider" });

  blocks.push({
    type: "actions",
    elements: [
      {
        type: "button",
        text: { type: "plain_text", text: actionLabel, emoji: true },
        url: payload.linkUrl,
        action_id: "view_report",
        style: "primary",
      },
    ],
  });

  blocks.push({
    type: "context",
    elements: [
      {
        type: "mrkdwn",
        text: `Shared from *FleetHappens* · ${sourceLabel}`,
      },
    ],
  });

  return {
    blocks,
    text: `${payload.title} — shared from FleetHappens`,
  };
}

// ─── Slack Files API v2 upload ────────────────────────────────────────────────

interface SlackUploadUrlResponse {
  ok: boolean;
  upload_url?: string;
  file_id?: string;
  error?: string;
}

interface SlackCompleteResponse {
  ok: boolean;
  error?: string;
}

/**
 * Uploads a PDF to Slack using the Files API v2 three-step process:
 * 1. Get upload URL + file_id
 * 2. PUT the binary to the upload URL
 * 3. Complete the upload and share to the channel
 */
async function uploadSlackPdf(
  buffer: Buffer,
  filename: string,
  title: string,
  channelId: string,
  botToken: string,
): Promise<void> {
  // Step 1: get upload URL
  const urlRes = await fetch("https://slack.com/api/files.getUploadURLExternal", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${botToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ filename, length: buffer.byteLength }),
    signal: AbortSignal.timeout(10_000),
  });

  const urlData = await urlRes.json() as SlackUploadUrlResponse;
  if (!urlData.ok || !urlData.upload_url || !urlData.file_id) {
    throw new Error(`Slack getUploadURLExternal failed: ${urlData.error ?? "unknown"}`);
  }

  // Step 2: PUT the PDF binary to the upload URL
  const putRes = await fetch(urlData.upload_url, {
    method: "PUT",
    headers: { "Content-Type": "application/pdf" },
    body: new Uint8Array(buffer),
    signal: AbortSignal.timeout(30_000),
  });

  if (!putRes.ok) {
    throw new Error(`Slack file PUT failed: ${putRes.status} ${putRes.statusText}`);
  }

  // Step 3: complete the upload and share to channel
  const completeRes = await fetch("https://slack.com/api/files.completeUploadExternal", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${botToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      files: [{ id: urlData.file_id, title }],
      channel_id: channelId,
    }),
    signal: AbortSignal.timeout(10_000),
  });

  const completeData = await completeRes.json() as SlackCompleteResponse;
  if (!completeData.ok) {
    throw new Error(`Slack completeUploadExternal failed: ${completeData.error ?? "unknown"}`);
  }
}

// ─── Sender ───────────────────────────────────────────────────────────────────

export async function sendSlackMessage(
  payload: SharePayload,
  appUrlOverride?: string,
): Promise<ShareResult> {
  const botToken  = process.env.SLACK_BOT_TOKEN;
  const channelId = process.env.SLACK_CHANNEL_ID;
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;

  const hasPdfContext  = !!payload.pdfContext;
  const hasFileUpload  = !!(botToken && channelId);
  const appUrl         = appUrlOverride ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  // ── Path 1: PDF file upload via Bot Token ─────────────────────────────────
  if (hasPdfContext && hasFileUpload) {
    try {
      const { buffer, filename } = await generateSharePdf(payload.pdfContext!, appUrl);
      await uploadSlackPdf(buffer, filename, payload.title, channelId!, botToken!);

      // Also post a context message via webhook if configured (so the channel
      // sees a summary card alongside the file)
      if (webhookUrl) {
        const msg = buildSlackBlocks(payload, "View Dashboard →");
        await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(msg),
          signal: AbortSignal.timeout(8000),
        }).catch(() => { /* non-fatal */ });
      }

      return { sent: true, message: "PDF uploaded to Slack" };
    } catch (err) {
      // PDF generation or upload failed — fall through to webhook fallback
      console.error("[slack] PDF upload failed, falling back to webhook:", err);
    }
  }

  // ── Path 2: Webhook message (current behaviour / fallback) ────────────────
  if (!webhookUrl) {
    return {
      sent: false,
      mock: true,
      message: "Shared (demo mode) — set SLACK_WEBHOOK_URL or SLACK_BOT_TOKEN + SLACK_CHANNEL_ID to deliver for real",
    };
  }

  const body = buildSlackBlocks(payload);

  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Slack webhook returned ${res.status}: ${text}`);
  }

  return {
    sent: true,
    message: "Report shared to Slack",
  };
}

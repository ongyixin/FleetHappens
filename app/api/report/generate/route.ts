/**
 * POST /api/report/generate
 *
 * Accepts a ReportPayload JSON body, builds a PDF with jsPDF, and streams
 * it back as application/pdf.
 */

import { NextRequest, NextResponse } from "next/server";
import type { ReportPayload } from "@/types";
import { buildReportPdf } from "@/lib/report/pdf-builder";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let payload: ReportPayload;

  try {
    payload = (await req.json()) as ReportPayload;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  if (!payload?.metadata?.title?.trim()) {
    return NextResponse.json({ ok: false, error: "Report title is required" }, { status: 422 });
  }

  const enabledSections = (payload.sections ?? []).filter((s) => s.enabled);
  if (enabledSections.length === 0) {
    return NextResponse.json({ ok: false, error: "Select at least one section" }, { status: 422 });
  }

  try {
    const pdfBuffer = buildReportPdf(payload);

    const slug = payload.metadata.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48);
    const dateStr = new Date(payload.metadata.generatedAt).toISOString().slice(0, 10);
    const filename = `fleethappens-report-${slug}-${dateStr}.pdf`;

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(pdfBuffer.byteLength),
      },
    });
  } catch (err) {
    console.error("[report/generate] PDF build error:", err);
    return NextResponse.json({ ok: false, error: "Failed to generate PDF" }, { status: 500 });
  }
}

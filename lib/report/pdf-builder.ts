/**
 * Generalized PDF builder for the FleetHappens Report Builder.
 *
 * Produces a portrait A4 PDF with the Obsidian Atlas brand palette.
 * Each ReportSection type has a dedicated renderer. Sections flow
 * top-to-bottom with automatic page breaks.
 *
 * Reuses palette, brand helpers, and layout constants from
 * lib/story/pdf-builder.ts (kept in sync manually).
 */

import { jsPDF } from "jspdf";
import type { ReportPayload, ReportSection } from "@/types";

// ─── Palette ───────────────────────────────────────────────────────────────

type RGB = [number, number, number];

const C = {
  amber:          [245, 166,  35] as RGB,
  blue:           [ 56, 189, 248] as RGB,
  teal:           [ 52, 211, 153] as RGB,
  purple:         [167, 139, 250] as RGB,
  textDark:       [ 26,  26,  46] as RGB,
  textMid:        [ 90,  90, 120] as RGB,
  textLight:      [150, 150, 175] as RGB,
  panelBg:        [248, 249, 252] as RGB,
  panelBorder:    [218, 220, 232] as RGB,
  divider:        [218, 220, 232] as RGB,
  white:          [255, 255, 255] as RGB,
  rowAlt:         [240, 242, 248] as RGB,
  metricBg:       [235, 237, 248] as RGB,
};

// ─── Layout constants (mm) ─────────────────────────────────────────────────

const PW = 210;
const PH = 297;
const ML = 14;
const MB = 14;
const CW = PW - ML * 2;

const BAR_H    = 3;
const BRAND_H  = 10;
const DIV_H    = 1;
const BRAND_TOTAL = BAR_H + BRAND_H + DIV_H;

const CONTENT_TOP = BRAND_TOTAL + 6;
const CONTENT_BOT = PH - MB - 10;

// ─── Drawing helpers ───────────────────────────────────────────────────────

function fc(doc: jsPDF, color: RGB) { doc.setFillColor(color[0], color[1], color[2]); }
function dc(doc: jsPDF, color: RGB) { doc.setDrawColor(color[0], color[1], color[2]); }
function tc(doc: jsPDF, color: RGB) { doc.setTextColor(color[0], color[1], color[2]); }

function drawAmberBar(doc: jsPDF) {
  fc(doc, C.amber);
  doc.rect(0, 0, PW, BAR_H, "F");
}

function drawBrandRow(doc: jsPDF, rightLabel: string) {
  const ty = BAR_H + 7.5;
  fc(doc, C.amber);
  doc.roundedRect(ML, BAR_H + 2.5, 5, 5, 0.8, 0.8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  tc(doc, C.textDark);
  doc.text("FleetHappens", ML + 7, ty);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  tc(doc, C.textLight);
  doc.text(rightLabel, PW - ML, ty, { align: "right" });
  dc(doc, C.divider);
  doc.setLineWidth(0.25);
  doc.line(ML, BAR_H + BRAND_H + 0.5, PW - ML, BAR_H + BRAND_H + 0.5);
}

function drawPageFooter(doc: jsPDF, pageNum: number, totalPages: number) {
  const fy = PH - MB + 3;
  dc(doc, C.divider);
  doc.setLineWidth(0.2);
  doc.line(ML, fy - 2.5, PW - ML, fy - 2.5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  tc(doc, C.textLight);
  doc.text(`Page ${pageNum} of ${totalPages}`, ML, fy);
  doc.text("FleetHappens", PW - ML, fy, { align: "right" });
}

/** Horizontal divider line at the given Y. */
function hRule(doc: jsPDF, y: number) {
  dc(doc, C.divider);
  doc.setLineWidth(0.2);
  doc.line(ML, y, PW - ML, y);
}

// ─── Page management ──────────────────────────────────────────────────────

interface DocState {
  doc: jsPDF;
  y: number;
  page: number;
  rightLabel: string;
  pages: number[]; // running page numbers (used at footer-draw time)
}

function newPage(state: DocState) {
  state.doc.addPage();
  state.page += 1;
  drawAmberBar(state.doc);
  drawBrandRow(state.doc, state.rightLabel);
  state.y = CONTENT_TOP;
}

/** Ensure at least `needed` mm of vertical space remains. */
function ensureSpace(state: DocState, needed: number) {
  if (state.y + needed > CONTENT_BOT) newPage(state);
}

// ─── Section heading ──────────────────────────────────────────────────────

function drawSectionHeading(state: DocState, label: string, accentColor: RGB = C.amber) {
  ensureSpace(state, 12);
  fc(state.doc, accentColor);
  state.doc.rect(ML, state.y, 3, 6, "F");
  state.doc.setFont("helvetica", "bold");
  state.doc.setFontSize(10);
  tc(state.doc, C.textDark);
  state.doc.text(label, ML + 6, state.y + 4.5);
  state.y += 10;
}

// ─── Section renderers ────────────────────────────────────────────────────

function renderKpiStrip(state: DocState, section: ReportSection) {
  drawSectionHeading(state, section.label, C.amber);
  const d = section.data as Record<string, unknown>;

  const metrics: Array<[string, string, string]> = [];
  if (d.totalVehicles !== undefined)  metrics.push(["Total Vehicles",   String(d.totalVehicles), ""]);
  if (d.activeVehicles !== undefined) metrics.push(["Active",           String(d.activeVehicles), "vehicles moving"]);
  if (d.totalDistanceKm !== undefined) metrics.push(["Distance",        `${Number(d.totalDistanceKm).toFixed(1)} km`, "today"]);
  if (d.totalTrips !== undefined)     metrics.push(["Trips",            String(d.totalTrips), "completed"]);
  if (d.idlePct !== undefined)        metrics.push(["Idle %",      `${Number(d.idlePct).toFixed(1)}%`,     "of engine-on time"]);
  if (d.avgIdlePct !== undefined)     metrics.push(["Avg Idle %",  `${Number(d.avgIdlePct).toFixed(1)}%`,  "fleet average"]);
  if (d.idleVehicles !== undefined)   metrics.push(["Idle Vehicles", String(d.idleVehicles),              "currently idle"]);

  if (d.groupName) {
    state.doc.setFont("helvetica", "normal");
    state.doc.setFontSize(8);
    tc(state.doc, C.textMid);
    state.doc.text(String(d.groupName), ML, state.y);
    state.y += 5;
  }

  const cols = 3;
  const boxW = CW / cols - 2;
  const boxH = 18;
  const gap = 2;

  for (let i = 0; i < metrics.length; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = ML + col * (boxW + gap);
    const y = state.y + row * (boxH + gap);

    ensureSpace(state, boxH + gap);

    fc(state.doc, C.metricBg);
    state.doc.roundedRect(x, y, boxW, boxH, 1.5, 1.5, "F");

    state.doc.setFont("helvetica", "bold");
    state.doc.setFontSize(14);
    tc(state.doc, C.textDark);
    state.doc.text(metrics[i][1], x + boxW / 2, y + 9, { align: "center" });

    state.doc.setFont("helvetica", "normal");
    state.doc.setFontSize(7);
    tc(state.doc, C.textLight);
    state.doc.text(metrics[i][0].toUpperCase(), x + boxW / 2, y + 14, { align: "center" });
  }

  const rows = Math.ceil(metrics.length / cols);
  state.y += rows * (boxH + gap) + 4;
}

function renderFleetCards(state: DocState, section: ReportSection) {
  drawSectionHeading(state, section.label, C.teal);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fleets = section.data as any[];
  if (!Array.isArray(fleets) || fleets.length === 0) return;

  const colW = (CW - 4) / 2;
  const cardH = 24;
  const gap = 3;

  for (let i = 0; i < fleets.length; i++) {
    const f = fleets[i];
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = ML + col * (colW + 4);
    const y = state.y + row * (cardH + gap);

    ensureSpace(state, cardH + gap);

    fc(state.doc, C.panelBg);
    dc(state.doc, C.panelBorder);
    state.doc.setLineWidth(0.2);
    state.doc.roundedRect(x, y, colW, cardH, 1.5, 1.5, "FD");

    fc(state.doc, C.amber);
    state.doc.rect(x, y + 2, 2.5, cardH - 4, "F");

    state.doc.setFont("helvetica", "bold");
    state.doc.setFontSize(8.5);
    tc(state.doc, C.textDark);
    const name = f.group?.name ?? f.name ?? "Fleet";
    state.doc.text(String(name).slice(0, 28), x + 6, y + 7);

    state.doc.setFont("helvetica", "normal");
    state.doc.setFontSize(7.5);
    tc(state.doc, C.textMid);
    const vehicles = f.totalVehicles ?? f.vehicles ?? f.vehicleCount ?? 0;
    const distance = f.totalDistanceKm ?? f.distanceKm ?? 0;
    const trips = f.totalTrips ?? f.trips ?? 0;
    state.doc.text(`${vehicles} vehicles  ·  ${Number(distance).toFixed(1)} km  ·  ${trips} trips`, x + 6, y + 13);

    const idlePct = f.avgIdlePct ?? f.idlePct;
    if (idlePct !== undefined) {
      state.doc.setFontSize(7);
      tc(state.doc, C.textLight);
      state.doc.text(`Avg idle: ${Number(idlePct).toFixed(1)}%`, x + 6, y + 19);
    }
  }

  const rows = Math.ceil(fleets.length / 2);
  state.y += rows * (cardH + gap) + 4;
}

function renderVehicleTable(state: DocState, section: ReportSection) {
  drawSectionHeading(state, section.label, C.blue);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const vehicles = section.data as any[];
  if (!Array.isArray(vehicles) || vehicles.length === 0) return;

  const headers = ["Vehicle", "Status", "Distance (km)", "Trips"];
  const colWidths = [72, 30, 40, 30];
  const rowH = 7;
  const headerH = 8;

  ensureSpace(state, headerH + 4);

  // Header row
  fc(state.doc, C.textDark);
  state.doc.rect(ML, state.y, CW, headerH, "F");
  let cx = ML + 2;
  for (let i = 0; i < headers.length; i++) {
    state.doc.setFont("helvetica", "bold");
    state.doc.setFontSize(7.5);
    tc(state.doc, C.white);
    state.doc.text(headers[i], cx, state.y + 5.5);
    cx += colWidths[i];
  }
  state.y += headerH;

  for (let idx = 0; idx < vehicles.length; idx++) {
    const v = vehicles[idx];
    ensureSpace(state, rowH + 1);

    if (idx % 2 === 1) {
      fc(state.doc, C.rowAlt);
      state.doc.rect(ML, state.y, CW, rowH, "F");
    }

    cx = ML + 2;
    const row = [
      String(v.name ?? v.deviceName ?? "—"),
      v.isActive ? "Active" : "Idle",
      String(Number(v.distanceKm ?? v.totalDistanceKm ?? 0).toFixed(1)),
      String(v.trips ?? v.totalTrips ?? 0),
    ];
    for (let i = 0; i < row.length; i++) {
      state.doc.setFont("helvetica", "normal");
      state.doc.setFontSize(7.5);
      tc(state.doc, C.textDark);
      const cell = row[i].slice(0, 30);
      state.doc.text(cell, cx, state.y + 5);
      cx += colWidths[i];
    }
    state.y += rowH;
  }
  state.y += 4;
}

function renderAceInsight(state: DocState, section: ReportSection) {
  drawSectionHeading(state, section.label, C.purple);

  const insight = section.data as {
    question?: string;
    reasoning?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rows?: any[];
    summary?: string;
  };

  if (insight.question) {
    state.doc.setFont("helvetica", "bold");
    state.doc.setFontSize(8.5);
    tc(state.doc, C.textDark);
    const qLines = state.doc.splitTextToSize(insight.question, CW) as string[];
    ensureSpace(state, qLines.length * 4.5 + 2);
    state.doc.text(qLines, ML, state.y);
    state.y += qLines.length * 4.5 + 3;
  }

  const narrative = insight.reasoning ?? insight.summary ?? "";
  if (narrative) {
    state.doc.setFont("helvetica", "normal");
    state.doc.setFontSize(8);
    tc(state.doc, C.textMid);
    const lines = state.doc.splitTextToSize(narrative, CW) as string[];
    const maxLines = 8;
    const truncated = lines.slice(0, maxLines);
    ensureSpace(state, truncated.length * 4.2 + 2);
    state.doc.text(truncated, ML, state.y);
    state.y += truncated.length * 4.2 + 4;
  }

  if (Array.isArray(insight.rows) && insight.rows.length > 0) {
    const rows = insight.rows.slice(0, 8);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const keys = Object.keys(rows[0] as any).slice(0, 4);
    const colW = CW / keys.length;
    const rowH = 6.5;
    const headerH = 7;

    ensureSpace(state, headerH + rows.length * rowH + 4);

    fc(state.doc, C.purple);
    state.doc.rect(ML, state.y, CW, headerH, "F");
    let cx = ML + 2;
    for (const k of keys) {
      state.doc.setFont("helvetica", "bold");
      state.doc.setFontSize(7);
      tc(state.doc, C.white);
      state.doc.text(String(k).slice(0, 22), cx, state.y + 5);
      cx += colW;
    }
    state.y += headerH;

    for (let ri = 0; ri < rows.length; ri++) {
      if (ri % 2 === 1) {
        fc(state.doc, C.rowAlt);
        state.doc.rect(ML, state.y, CW, rowH, "F");
      }
      cx = ML + 2;
      for (const k of keys) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const val = String((rows[ri] as any)[k] ?? "—").slice(0, 22);
        state.doc.setFont("helvetica", "normal");
        state.doc.setFontSize(7.5);
        tc(state.doc, C.textDark);
        state.doc.text(val, cx, state.y + 4.5);
        cx += colW;
      }
      state.y += rowH;
    }
    state.y += 4;
  }
}

function renderTripStats(state: DocState, section: ReportSection) {
  drawSectionHeading(state, section.label, C.teal);

  const trip = section.data as {
    deviceName?: string;
    start?: string;
    distanceMeters?: number;
    distanceKm?: number;
    drivingDuration?: string;
    averageSpeedKmh?: number;
    maxSpeedKmh?: number;
    idlingDuration?: string;
  };

  const distKm = trip.distanceKm ?? (trip.distanceMeters ? trip.distanceMeters / 1000 : 0);
  const dateStr = trip.start
    ? new Date(trip.start).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
    : "";

  ensureSpace(state, 30);

  if (trip.deviceName) {
    state.doc.setFont("helvetica", "bold");
    state.doc.setFontSize(9);
    tc(state.doc, C.textDark);
    state.doc.text(trip.deviceName, ML, state.y);
    state.y += 5;
  }
  if (dateStr) {
    state.doc.setFont("helvetica", "normal");
    state.doc.setFontSize(8);
    tc(state.doc, C.textMid);
    state.doc.text(dateStr, ML, state.y);
    state.y += 5;
  }

  const stats: Array<[string, string]> = [
    ["Distance",      `${distKm.toFixed(1)} km`],
    ["Duration",      trip.drivingDuration ?? "—"],
    ["Avg Speed",     trip.averageSpeedKmh !== undefined ? `${trip.averageSpeedKmh} km/h` : "—"],
    ["Max Speed",     trip.maxSpeedKmh !== undefined ? `${trip.maxSpeedKmh} km/h` : "—"],
    ["Idle Time",     trip.idlingDuration ?? "—"],
  ];

  const colW = CW / stats.length;
  const boxH = 18;

  for (let i = 0; i < stats.length; i++) {
    const x = ML + i * colW;
    fc(state.doc, C.metricBg);
    state.doc.roundedRect(x, state.y, colW - 2, boxH, 1.5, 1.5, "F");

    state.doc.setFont("helvetica", "bold");
    state.doc.setFontSize(11);
    tc(state.doc, C.textDark);
    state.doc.text(stats[i][1], x + (colW - 2) / 2, state.y + 9, { align: "center" });

    state.doc.setFont("helvetica", "normal");
    state.doc.setFontSize(6.5);
    tc(state.doc, C.textLight);
    state.doc.text(stats[i][0].toUpperCase(), x + (colW - 2) / 2, state.y + 14, { align: "center" });
  }
  state.y += boxH + 5;
}

function renderTripList(state: DocState, section: ReportSection) {
  drawSectionHeading(state, section.label, C.blue);

  const trips = section.data as Array<{
    deviceName?: string;
    start?: string;
    distanceMeters?: number;
    distanceKm?: number;
    drivingDuration?: string;
    averageSpeedKmh?: number;
  }>;
  if (!Array.isArray(trips) || trips.length === 0) return;

  const headers = ["Date", "Vehicle", "Distance (km)", "Duration", "Avg Speed"];
  const colWidths = [38, 48, 30, 32, 34];
  const rowH = 7;
  const headerH = 8;

  ensureSpace(state, headerH + 4);

  fc(state.doc, C.blue);
  state.doc.rect(ML, state.y, CW, headerH, "F");
  let cx = ML + 2;
  for (let i = 0; i < headers.length; i++) {
    state.doc.setFont("helvetica", "bold");
    state.doc.setFontSize(7);
    tc(state.doc, C.white);
    state.doc.text(headers[i], cx, state.y + 5.5);
    cx += colWidths[i];
  }
  state.y += headerH;

  for (let idx = 0; idx < trips.length; idx++) {
    const t = trips[idx];
    ensureSpace(state, rowH + 1);

    if (idx % 2 === 1) {
      fc(state.doc, C.rowAlt);
      state.doc.rect(ML, state.y, CW, rowH, "F");
    }

    const distKm = t.distanceKm ?? (t.distanceMeters ? t.distanceMeters / 1000 : 0);
    const row = [
      t.start ? new Date(t.start).toLocaleDateString("en-CA") : "—",
      (t.deviceName ?? "—").slice(0, 20),
      distKm.toFixed(1),
      t.drivingDuration ?? "—",
      t.averageSpeedKmh !== undefined ? `${t.averageSpeedKmh} km/h` : "—",
    ];

    cx = ML + 2;
    for (let i = 0; i < row.length; i++) {
      state.doc.setFont("helvetica", "normal");
      state.doc.setFontSize(7.5);
      tc(state.doc, C.textDark);
      state.doc.text(row[i], cx, state.y + 5);
      cx += colWidths[i];
    }
    state.y += rowH;
  }
  state.y += 4;
}

function renderNarrative(state: DocState, section: ReportSection) {
  drawSectionHeading(state, section.label, C.teal);

  const d = section.data as { title?: string; text?: string };
  const text = d.text ?? String(section.data);

  state.doc.setFont("helvetica", "normal");
  state.doc.setFontSize(9);
  tc(state.doc, C.textDark);
  const lines = state.doc.splitTextToSize(text, CW) as string[];

  let i = 0;
  while (i < lines.length) {
    ensureSpace(state, 5);
    state.doc.text(lines[i], ML, state.y);
    state.y += 4.8;
    i++;
  }
  state.y += 3;
}

function renderLocationDossier(state: DocState, section: ReportSection) {
  drawSectionHeading(state, section.label, C.purple);

  const dossier = section.data as {
    placeName?: string;
    address?: string;
    areaBriefing?: string;
    fleetVisitSummary?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    amenities?: any[];
  };

  ensureSpace(state, 12);

  if (dossier.placeName) {
    state.doc.setFont("helvetica", "bold");
    state.doc.setFontSize(10);
    tc(state.doc, C.textDark);
    state.doc.text(dossier.placeName, ML, state.y);
    state.y += 6;
  }
  if (dossier.address) {
    state.doc.setFont("helvetica", "normal");
    state.doc.setFontSize(8);
    tc(state.doc, C.textMid);
    state.doc.text(dossier.address, ML, state.y);
    state.y += 5;
  }
  hRule(state.doc, state.y);
  state.y += 4;

  const paragraphs = [dossier.areaBriefing, dossier.fleetVisitSummary].filter(Boolean) as string[];
  for (const p of paragraphs) {
    state.doc.setFont("helvetica", "normal");
    state.doc.setFontSize(8.5);
    tc(state.doc, C.textDark);
    const lines = state.doc.splitTextToSize(p, CW) as string[];
    ensureSpace(state, lines.length * 4.5 + 4);
    state.doc.text(lines, ML, state.y);
    state.y += lines.length * 4.5 + 4;
  }

  if (Array.isArray(dossier.amenities) && dossier.amenities.length > 0) {
    state.doc.setFont("helvetica", "bold");
    state.doc.setFontSize(8);
    tc(state.doc, C.textDark);
    state.doc.text("Nearby Amenities", ML, state.y);
    state.y += 5;

    for (const am of dossier.amenities.slice(0, 6)) {
      ensureSpace(state, 5);
      state.doc.setFont("helvetica", "normal");
      state.doc.setFontSize(7.5);
      tc(state.doc, C.textMid);
      const name = am.name ?? am.type ?? "—";
      const type = am.type ?? "";
      state.doc.text(`• ${name}${type && type !== name ? `  (${type})` : ""}`, ML + 3, state.y);
      state.y += 5;
    }
    state.y += 2;
  }
}

function renderTrendChart(state: DocState, section: ReportSection) {
  drawSectionHeading(state, section.label, C.blue);

  const trends = section.data as Array<{ date?: string; distanceKm?: number; kmDriven?: number }>;
  if (!Array.isArray(trends) || trends.length === 0) return;

  const headers = ["Date", "Distance (km)"];
  const colWidths = [60, 60];
  const rowH = 6.5;
  const headerH = 7;

  ensureSpace(state, headerH + 4);

  fc(state.doc, C.blue);
  state.doc.rect(ML, state.y, 124, headerH, "F");
  let cx = ML + 2;
  for (let i = 0; i < headers.length; i++) {
    state.doc.setFont("helvetica", "bold");
    state.doc.setFontSize(7.5);
    tc(state.doc, C.white);
    state.doc.text(headers[i], cx, state.y + 5);
    cx += colWidths[i];
  }
  state.y += headerH;

  for (let idx = 0; idx < Math.min(trends.length, 14); idx++) {
    const t = trends[idx];
    ensureSpace(state, rowH + 1);

    if (idx % 2 === 1) {
      fc(state.doc, C.rowAlt);
      state.doc.rect(ML, state.y, 124, rowH, "F");
    }

    const dist = t.distanceKm ?? t.kmDriven ?? 0;
    const row = [t.date ?? "—", Number(dist).toFixed(1)];
    cx = ML + 2;
    for (let i = 0; i < row.length; i++) {
      state.doc.setFont("helvetica", "normal");
      state.doc.setFontSize(7.5);
      tc(state.doc, C.textDark);
      state.doc.text(row[i], cx, state.y + 4.5);
      cx += colWidths[i];
    }
    state.y += rowH;
  }
  state.y += 4;
}

// ─── Cover page ───────────────────────────────────────────────────────────

function drawCoverPage(doc: jsPDF, payload: ReportPayload) {
  const { metadata } = payload;

  drawAmberBar(doc);

  // Logo square
  fc(doc, C.amber);
  doc.roundedRect(ML, BAR_H + 2.5, 5, 5, 0.8, 0.8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  tc(doc, C.textDark);
  doc.text("FleetHappens", ML + 7, BAR_H + 7.5);

  // Decorative cover band
  const bandY = 60;
  fc(doc, C.amber);
  doc.rect(0, bandY, PW, 1.5, "F");
  fc(doc, C.teal);
  doc.rect(0, bandY + 1.5, PW, 0.5, "F");

  // Title
  let cy = bandY + 16;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  tc(doc, C.textDark);
  const titleLines = (doc.splitTextToSize(metadata.title, CW) as string[]).slice(0, 3);
  doc.text(titleLines, ML, cy);
  cy += titleLines.length * 10 + 4;

  // Subtitle
  if (metadata.subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    tc(doc, C.textMid);
    const subLines = (doc.splitTextToSize(metadata.subtitle, CW) as string[]).slice(0, 2);
    doc.text(subLines, ML, cy);
    cy += subLines.length * 6 + 4;
  }

  hRule(doc, cy);
  cy += 8;

  // Metadata row
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  tc(doc, C.textMid);
  const generatedDate = new Date(metadata.generatedAt).toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
  doc.text(`Generated: ${generatedDate}`, ML, cy);
  cy += 6;

  if (metadata.audience) {
    const audienceLabel: Record<string, string> = {
      internal: "Internal Use",
      stakeholder: "Stakeholder Update",
      client: "Client-Facing",
      driver: "Driver / Trip Debrief",
    };
    doc.text(`Audience: ${audienceLabel[metadata.audience] ?? metadata.audience}`, ML, cy);
    cy += 6;
  }

  // Notes
  if (metadata.notes) {
    cy += 6;
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8.5);
    tc(doc, C.textLight);
    const noteLines = (doc.splitTextToSize(metadata.notes, CW) as string[]).slice(0, 4);
    doc.text(noteLines, ML, cy);
  }

  // Bottom branding
  const botY = PH - 24;
  hRule(doc, botY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  tc(doc, C.textLight);
  doc.text("Powered by Geotab Direct API  ·  Ace AI", ML, botY + 6);
  doc.text("FleetHappens", PW - ML, botY + 6, { align: "right" });
}

// ─── Main entry ───────────────────────────────────────────────────────────

/**
 * Builds a report PDF from a ReportPayload and returns it as an ArrayBuffer.
 * The first page is always a cover page. Content pages follow.
 */
export function buildReportPdf(payload: ReportPayload): ArrayBuffer {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  // Page 1: cover
  drawCoverPage(doc, payload);

  const enabledSections = payload.sections.filter((s) => s.enabled);
  if (enabledSections.length === 0) {
    return doc.output("arraybuffer");
  }

  // Page 2+: content
  doc.addPage();
  const rightLabel = payload.metadata.title.slice(0, 40);
  const state: DocState = { doc, y: CONTENT_TOP, page: 2, rightLabel, pages: [] };
  drawAmberBar(doc);
  drawBrandRow(doc, rightLabel);

  for (const section of enabledSections) {
    switch (section.type) {
      case "kpi-strip":        renderKpiStrip(state, section);       break;
      case "fleet-cards":      renderFleetCards(state, section);     break;
      case "vehicle-table":    renderVehicleTable(state, section);   break;
      case "ace-insight":      renderAceInsight(state, section);     break;
      case "trip-stats":       renderTripStats(state, section);      break;
      case "trip-list":        renderTripList(state, section);       break;
      case "narrative":        renderNarrative(state, section);      break;
      case "location-dossier": renderLocationDossier(state, section); break;
      case "trend-chart":      renderTrendChart(state, section);     break;
      default: break;
    }
    // Breathing room between sections
    state.y += 2;
    hRule(state.doc, state.y);
    state.y += 5;
  }

  const totalPages = state.page;
  // Draw footers on every content page
  for (let p = 2; p <= totalPages; p++) {
    doc.setPage(p);
    drawPageFooter(doc, p, totalPages);
  }

  return doc.output("arraybuffer");
}

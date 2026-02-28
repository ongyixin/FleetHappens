/**
 * PDF builder for the Trip Story export.
 *
 * Produces a portrait A4 PDF with a light print-friendly theme.
 * Layout: 2 pages × 2 panels each. Every panel shows a static map pin
 * image (left) and a place photo (right) side-by-side.
 *
 * Owner: Story Export
 */

import { jsPDF } from "jspdf";
import type { ComicStory, ComicPanel, TripSummary } from "@/types";

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface PanelImages {
  /** Base64-encoded static map PNG from Google, or null if unavailable. */
  mapBase64: string | null;
  /** MIME type of map image */
  mapMime: "PNG" | "JPEG";
  /** Base64-encoded place/area photo, or null if unavailable. */
  photoBase64: string | null;
  /** MIME type of photo image */
  photoMime: "PNG" | "JPEG";
}

// ─── Palette + constants ───────────────────────────────────────────────────────

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
  imgPlaceholder: [228, 230, 240] as RGB,
  divider:        [218, 220, 232] as RGB,
  speechBg:       [240, 242, 250] as RGB,
  white:          [255, 255, 255] as RGB,
};

const SCENE_ACCENT: Record<string, RGB> = {
  opening:   C.blue,
  journey:   C.teal,
  highlight: C.amber,
  arrival:   C.purple,
};

const SCENE_LABEL: Record<string, string> = {
  opening:   "Departure",
  journey:   "On the Road",
  highlight: "Highlight",
  arrival:   "Arrival",
};

// ─── Layout measurements (all in mm) ──────────────────────────────────────────

const PW = 210;           // page width
const PH = 297;           // page height
const ML = 14;            // left/right margin
const MB = 12;            // bottom margin
const CW = PW - ML * 2;  // content width: 182mm

// Brand section at top of every page
const BAR_H   = 3;        // amber colour stripe
const BRAND_H = 10;       // FleetHappens text row
const DIV_H   = 1;        // divider after brand row
const BRAND_TOTAL = BAR_H + BRAND_H + DIV_H; // 14mm

// Cover section (page 1 only): title + trip info
const COVER_START = BRAND_TOTAL + 5;   // y where cover text begins: 19mm
const COVER_H     = 30;               // reserved height for cover content
const COVER_END   = COVER_START + COVER_H; // 49mm

// Panel dimensions
const PANEL_H    = 100;               // height of each panel box
const PANEL_GAP  = 5;                 // vertical gap between panels
const PAD        = 4;                 // inner horizontal padding inside panel

// After the 2.5mm accent strip + PAD, text/image content starts here (relative to ML)
const STRIP_W    = 2.5;
const INNER_X    = ML + STRIP_W + PAD;   // absolute x of inner content
const INNER_W    = CW - STRIP_W - PAD - PAD; // usable inner width: ~171mm

// Images: two side-by-side within inner content
const IMG_GAP    = 4;
const IMG_W      = (INNER_W - IMG_GAP) / 2;  // ~83.5mm each
const IMG_H      = 42;               // image height in mm

// Y positions
const P1_Y1 = COVER_END + 4;                 // page 1, panel 1 top: ~53mm
const P1_Y2 = P1_Y1 + PANEL_H + PANEL_GAP;  // page 1, panel 2 top: ~158mm
const P2_Y3 = BRAND_TOTAL + 5;               // page 2, panel 3 top: 19mm
const P2_Y4 = P2_Y3 + PANEL_H + PANEL_GAP;  // page 2, panel 4 top: ~124mm

// ─── Drawing helpers ───────────────────────────────────────────────────────────

function fc(doc: jsPDF, color: RGB) {
  doc.setFillColor(color[0], color[1], color[2]);
}
function dc(doc: jsPDF, color: RGB) {
  doc.setDrawColor(color[0], color[1], color[2]);
}
function tc(doc: jsPDF, color: RGB) {
  doc.setTextColor(color[0], color[1], color[2]);
}

// ─── Page-level elements ───────────────────────────────────────────────────────

function drawAmberBar(doc: jsPDF) {
  fc(doc, C.amber);
  doc.rect(0, 0, PW, BAR_H, "F");
}

function drawBrandRow(doc: jsPDF) {
  const ty = BAR_H + 7.5;

  // Logo square
  fc(doc, C.amber);
  doc.roundedRect(ML, BAR_H + 2.5, 5, 5, 0.8, 0.8, "F");

  // Brand name
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  tc(doc, C.textDark);
  doc.text("FleetHappens", ML + 7, ty);

  // Right-aligned label
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  tc(doc, C.textLight);
  doc.text("Trip Story Report", PW - ML, ty, { align: "right" });

  // Divider
  dc(doc, C.divider);
  doc.setLineWidth(0.25);
  doc.line(ML, BAR_H + BRAND_H + 0.5, PW - ML, BAR_H + BRAND_H + 0.5);
}

function drawCover(doc: jsPDF, story: ComicStory, trip: TripSummary | null) {
  let cy = COVER_START + 4;

  // Story title (large)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  tc(doc, C.textDark);
  const titleLines = (doc.splitTextToSize(story.title, CW) as string[]).slice(0, 2);
  doc.text(titleLines, ML, cy);
  cy += titleLines.length * 7.5 + 2;

  if (trip) {
    // Vehicle · date
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    tc(doc, C.textMid);
    const dateStr = new Date(trip.start).toLocaleDateString("en-US", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    });
    doc.text(`${trip.deviceName}  ·  ${dateStr}`, ML, cy);
    cy += 5;

    // Stats
    const dist = trip.distanceKm ?? (trip.distanceMeters / 1000).toFixed(1);
    doc.text(
      `Distance: ${dist} km  ·  Avg speed: ${trip.averageSpeedKmh} km/h  ·  Max: ${trip.maxSpeedKmh} km/h`,
      ML, cy,
    );
    cy += 5;
  }

  // Tone badge
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  tc(doc, C.amber);
  doc.text(`TONE: ${story.tone.toUpperCase()}`, ML, cy);
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

// ─── Panel ────────────────────────────────────────────────────────────────────

function drawPanel(
  doc: jsPDF,
  panel: ComicPanel,
  panelY: number,
  images: PanelImages,
) {
  const accent    = SCENE_ACCENT[panel.sceneType] ?? C.amber;
  const sceneLabel = SCENE_LABEL[panel.sceneType] ?? panel.sceneType;
  const panelNum  = panel.panelNumber.toString().padStart(2, "0");

  // ── Panel background ────────────────────────────────────────────────────────
  fc(doc, C.panelBg);
  doc.roundedRect(ML, panelY, CW, PANEL_H, 2, 2, "F");

  // ── Panel border ────────────────────────────────────────────────────────────
  dc(doc, C.panelBorder);
  doc.setLineWidth(0.3);
  doc.roundedRect(ML, panelY, CW, PANEL_H, 2, 2, "S");

  // ── Left accent strip ───────────────────────────────────────────────────────
  fc(doc, accent);
  doc.rect(ML, panelY + 2, STRIP_W, PANEL_H - 4, "F");

  // ── Panel header ────────────────────────────────────────────────────────────
  let cy = panelY + PAD + 3.5;

  // "01  ·  DEPARTURE"
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(accent[0], accent[1], accent[2]);
  doc.text(`${panelNum}  ·  ${sceneLabel.toUpperCase()}`, INNER_X, cy);
  cy += 4;

  // Location name
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  tc(doc, C.textDark);
  const locLines = (doc.splitTextToSize(panel.locationName, INNER_W) as string[]).slice(0, 1);
  doc.text(locLines, INNER_X, cy);
  cy += 5.5;

  // Thin divider
  dc(doc, C.divider);
  doc.setLineWidth(0.2);
  doc.line(INNER_X, cy, ML + CW - PAD, cy);
  cy += 3.5;

  // ── Images row (map left, photo right) ──────────────────────────────────────
  const mapX   = INNER_X;
  const photoX = INNER_X + IMG_W + IMG_GAP;

  // Map image
  if (images.mapBase64) {
    doc.addImage(images.mapBase64, images.mapMime, mapX, cy, IMG_W, IMG_H);
    // Rounded overlay border
    dc(doc, C.panelBorder);
    doc.setLineWidth(0.2);
    doc.roundedRect(mapX, cy, IMG_W, IMG_H, 1, 1, "S");
    // "MAP PIN" label
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6);
    tc(doc, C.white);
    fc(doc, C.textDark);
    const lblW = 14;
    doc.roundedRect(mapX + 2, cy + IMG_H - 6.5, lblW, 5, 0.8, 0.8, "F");
    doc.text("MAP PIN", mapX + 2 + lblW / 2, cy + IMG_H - 3.5, { align: "center" });
  } else {
    fc(doc, C.imgPlaceholder);
    doc.roundedRect(mapX, cy, IMG_W, IMG_H, 1, 1, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    tc(doc, C.textLight);
    doc.text("Map unavailable", mapX + IMG_W / 2, cy + IMG_H / 2, { align: "center" });
  }

  // Place photo
  if (images.photoBase64) {
    doc.addImage(images.photoBase64, images.photoMime, photoX, cy, IMG_W, IMG_H);
    dc(doc, C.panelBorder);
    doc.setLineWidth(0.2);
    doc.roundedRect(photoX, cy, IMG_W, IMG_H, 1, 1, "S");
    // "PLACE PHOTO" label
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6);
    tc(doc, C.white);
    fc(doc, C.textDark);
    const pLblW = 18;
    doc.roundedRect(photoX + 2, cy + IMG_H - 6.5, pLblW, 5, 0.8, 0.8, "F");
    doc.text("PLACE PHOTO", photoX + 2 + pLblW / 2, cy + IMG_H - 3.5, { align: "center" });
  } else {
    fc(doc, C.imgPlaceholder);
    doc.roundedRect(photoX, cy, IMG_W, IMG_H, 1, 1, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    tc(doc, C.textLight);
    const locTrunc = panel.locationName.length > 20 ? panel.locationName.slice(0, 18) + "…" : panel.locationName;
    doc.text(locTrunc, photoX + IMG_W / 2, cy + IMG_H / 2 - 2, { align: "center" });
    doc.text("No photo available", photoX + IMG_W / 2, cy + IMG_H / 2 + 3, { align: "center" });
  }

  cy += IMG_H + 4;

  // ── Caption ─────────────────────────────────────────────────────────────────
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  tc(doc, C.textDark);
  const captionLines = (doc.splitTextToSize(panel.caption, INNER_W) as string[]).slice(0, 3);
  doc.text(captionLines, INNER_X, cy);
  cy += captionLines.length * 4.2 + 2;

  // ── Speech bubble ───────────────────────────────────────────────────────────
  if (panel.speechBubble) {
    const maxBubbleW = Math.min(INNER_W * 0.82, 115);
    const bubbleText = `\u201C${panel.speechBubble}\u201D`;
    doc.setFont("helvetica", "oblique");
    doc.setFontSize(8);
    const bLines = (doc.splitTextToSize(bubbleText, maxBubbleW - 7) as string[]).slice(0, 2);
    const bH = bLines.length * 4.2 + 5;
    fc(doc, C.speechBg);
    doc.roundedRect(INNER_X, cy, maxBubbleW, bH, 1.5, 1.5, "F");
    tc(doc, C.textMid);
    doc.text(bLines, INNER_X + 4, cy + 4.5);
    cy += bH + 3;
  }

  // ── Stats row ───────────────────────────────────────────────────────────────
  const stats: string[] = [];
  if (panel.timeLabel)     stats.push(panel.timeLabel);
  if (panel.distanceLabel) stats.push(panel.distanceLabel);
  if (panel.speedLabel)    stats.push(panel.speedLabel);
  if (panel.dwellLabel)    stats.push(panel.dwellLabel);
  if (stats.length > 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    tc(doc, C.textLight);
    doc.text(stats.join("  ·  "), INNER_X, cy);
  }
}

// ─── Main entry point ──────────────────────────────────────────────────────────

/**
 * Builds the PDF and returns it as an ArrayBuffer ready for streaming.
 * `panelImages` must be an array of exactly 4 entries (one per comic panel).
 */
export function buildStoryPdf(
  story: ComicStory,
  trip: TripSummary | null,
  panelImages: PanelImages[],
): ArrayBuffer {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  // ── Page 1: brand + cover + panels 1 & 2 ─────────────────────────────────
  drawAmberBar(doc);
  drawBrandRow(doc);
  drawCover(doc, story, trip);
  drawPanel(doc, story.panels[0], P1_Y1, panelImages[0] ?? { mapBase64: null, mapMime: "PNG", photoBase64: null, photoMime: "JPEG" });
  drawPanel(doc, story.panels[1], P1_Y2, panelImages[1] ?? { mapBase64: null, mapMime: "PNG", photoBase64: null, photoMime: "JPEG" });
  drawPageFooter(doc, 1, 2);

  // ── Page 2: brand + panels 3 & 4 + attribution footer ────────────────────
  doc.addPage();
  drawAmberBar(doc);
  drawBrandRow(doc);
  drawPanel(doc, story.panels[2], P2_Y3, panelImages[2] ?? { mapBase64: null, mapMime: "PNG", photoBase64: null, photoMime: "JPEG" });
  drawPanel(doc, story.panels[3], P2_Y4, panelImages[3] ?? { mapBase64: null, mapMime: "PNG", photoBase64: null, photoMime: "JPEG" });

  // Attribution footer
  const attrY = P2_Y4 + PANEL_H + 7;
  dc(doc, C.divider);
  doc.setLineWidth(0.2);
  doc.line(ML, attrY, PW - ML, attrY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  tc(doc, C.textLight);
  doc.text(`Generated ${new Date(story.createdAt).toLocaleString()}`, ML, attrY + 4.5);
  doc.text("Powered by Geotab Direct API + Ace", ML, attrY + 9);

  drawPageFooter(doc, 2, 2);

  return doc.output("arraybuffer");
}

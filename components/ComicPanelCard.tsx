"use client";

import { MapPin, Clock, Route, Gauge } from "lucide-react";
import type { ComicPanel, ComicTone } from "@/types";
import { cn } from "@/lib/utils";
import ComicPanelImage from "@/components/story/ComicPanelImage";

interface ComicPanelCardProps {
  panel: ComicPanel;
  tone: ComicTone;
  panelIndex: number;
  /** True while the image enrichment API call is in-flight. */
  isEnriching?: boolean;
}

const SCENE_LABELS: Record<string, string> = {
  opening:   "Departure",
  journey:   "On the Road",
  highlight: "Highlight",
  arrival:   "Arrival",
};

// More restrained, editorial gradients
const PANEL_GRADIENT: Record<string, { bg: string; accent: string }> = {
  opening:   { bg: "from-[#0e2440] to-[#1a3a5c]", accent: "bg-fleet-blue" },
  journey:   { bg: "from-[#0e2440] to-[#163330]", accent: "bg-fleet-teal" },
  highlight: { bg: "from-[#1c1200] to-[#2d1d00]", accent: "bg-fleet-orange" },
  arrival:   { bg: "from-[#0e2440] to-[#1a1040]", accent: "bg-[#6d5ae6]" },
};

const SCENE_NUMBERS = ["01", "02", "03", "04"];

export default function ComicPanelCard({
  panel,
  panelIndex,
  isEnriching,
}: ComicPanelCardProps) {
  const style = PANEL_GRADIENT[panel.sceneType] ?? PANEL_GRADIENT.opening;

  return (
    <div
      className={cn(
        "relative rounded-2xl overflow-hidden flex flex-col",
        "bg-gradient-to-br shadow-[0_8px_32px_rgba(14,36,64,0.3)]",
        style.bg
      )}
    >
      {/* Accent stripe — colored by scene */}
      <div className={cn("h-[3px] w-full", style.accent)} />

      {/* Panel header */}
      <div className="flex items-start justify-between px-5 pt-3.5 pb-0">
        <div className="flex items-center gap-2.5">
          <span className="font-mono text-[11px] font-bold text-white/30 tracking-wider">
            {SCENE_NUMBERS[panelIndex] ?? `0${panelIndex + 1}`}
          </span>
          <div className="w-px h-3 bg-white/15" />
          <span className="text-[11px] font-semibold text-white/50 uppercase tracking-wider">
            {SCENE_LABELS[panel.sceneType]}
          </span>
        </div>
      </div>

      {/* ── Image area ─────────────────────────────────────────────────────── */}
      <div className="mt-3">
        <ComicPanelImage
          image={panel.image}
          mapAnchor={panel.mapAnchor}
          sceneType={panel.sceneType}
          locationName={panel.locationName}
          isEnriching={isEnriching && !panel.image}
        />
      </div>

      {/* ── Main content ───────────────────────────────────────────────────── */}
      <div className="flex-1 px-5 pt-4 pb-4 flex flex-col justify-end">
        {/* Location */}
        <div className="mb-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <MapPin className="h-3 w-3 text-white/40" />
            <span className="text-[11px] text-white/40 font-medium uppercase tracking-wide">
              {panel.locationName}
            </span>
          </div>
          <div className="h-px bg-white/10 mb-3" />
        </div>

        {/* Caption — heavier weight, expressive */}
        <p className="text-white text-[14px] leading-relaxed font-semibold mb-4 tracking-tight">
          {panel.caption}
        </p>

        {/* Speech bubble */}
        {panel.speechBubble && (
          <div className="relative bg-white rounded-2xl rounded-bl-sm px-4 py-3 mb-2 shadow-md max-w-[88%] self-start">
            <p className="text-sm text-gray-800 italic leading-snug font-medium">
              &ldquo;{panel.speechBubble}&rdquo;
            </p>
            {/* Tail */}
            <div
              className="absolute -bottom-2.5 left-5 w-0 h-0"
              style={{
                borderLeft: "7px solid transparent",
                borderRight: "7px solid transparent",
                borderTop: "10px solid white",
              }}
            />
          </div>
        )}
      </div>

      {/* Footer — metadata */}
      <div className="bg-black/30 px-5 py-3 flex items-center gap-4 flex-wrap">
        {panel.timeLabel && (
          <div className="flex items-center gap-1.5 text-[11px] text-white/50">
            <Clock className="h-3 w-3" />
            {panel.timeLabel}
          </div>
        )}
        {panel.distanceLabel && (
          <div className="flex items-center gap-1.5 text-[11px] text-white/50">
            <Route className="h-3 w-3" />
            {panel.distanceLabel}
          </div>
        )}
        {panel.speedLabel && (
          <div className="flex items-center gap-1.5 text-[11px] text-white/50">
            <Gauge className="h-3 w-3" />
            {panel.speedLabel}
          </div>
        )}
        <div className="ml-auto text-[10px] text-white/25 font-mono tabular-nums">
          {panel.mapAnchor.lat.toFixed(4)}, {panel.mapAnchor.lon.toFixed(4)}
        </div>
      </div>
    </div>
  );
}

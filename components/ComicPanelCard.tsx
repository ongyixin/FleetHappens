"use client";

import { MapPin, Clock, Route, Gauge } from "lucide-react";
import type { ComicPanel, ComicTone } from "@/types";
import ComicPanelImage from "@/components/story/ComicPanelImage";

interface ComicPanelCardProps {
  panel: ComicPanel;
  tone: ComicTone;
  panelIndex: number;
  isEnriching?: boolean;
}

const SCENE_LABELS: Record<string, string> = {
  opening:   "Departure",
  journey:   "On the Road",
  highlight: "Highlight",
  arrival:   "Arrival",
};

const SCENE_STYLES: Record<string, { gradient: string; accent: string; accentHex: string; num: string }> = {
  opening:   { gradient: "from-[#0d1117] via-[#0e1a2e] to-[#111827]",  accent: "text-[#38bdf8]",  accentHex: "#38bdf8",  num: "01" },
  journey:   { gradient: "from-[#0d1117] via-[#0e2218] to-[#111820]",  accent: "text-[#34d399]",  accentHex: "#34d399",  num: "02" },
  highlight: { gradient: "from-[#0d1117] via-[#261508] to-[#1c1208]",  accent: "text-[#f5a623]",  accentHex: "#f5a623",  num: "03" },
  arrival:   { gradient: "from-[#0d1117] via-[#150f2e] to-[#0f0d20]",  accent: "text-[#a78bfa]",  accentHex: "#a78bfa",  num: "04" },
};

const ACCENT_BARS: Record<string, string> = {
  opening:   "bg-[#38bdf8]",
  journey:   "bg-[#34d399]",
  highlight: "bg-[#f5a623]",
  arrival:   "bg-[#a78bfa]",
};

export default function ComicPanelCard({ panel, panelIndex, isEnriching }: ComicPanelCardProps) {
  const style = SCENE_STYLES[panel.sceneType] ?? SCENE_STYLES.opening;
  const bar   = ACCENT_BARS[panel.sceneType] ?? ACCENT_BARS.opening;

  return (
    <div className={`relative rounded-2xl overflow-hidden flex flex-col bg-gradient-to-br ${style.gradient} shadow-[0_12px_40px_rgba(0,0,0,0.5)] border border-[rgba(255,255,255,0.07)] animate-fade-up`}>
      {/* Accent top bar */}
      <div className={`h-[2.5px] w-full ${bar}`} />

      {/* Panel header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-0">
        <div className="flex items-center gap-2.5">
          <span className={`font-data text-[11px] font-bold tracking-wider ${style.accent} opacity-60`}>
            {style.num}
          </span>
          <div className="w-px h-3 bg-[rgba(255,255,255,0.12)]" />
          <span className="text-[10px] font-bold text-[rgba(232,237,248,0.45)] uppercase tracking-[0.14em] font-body">
            {SCENE_LABELS[panel.sceneType]}
          </span>
        </div>
      </div>

      {/* Image area */}
      <div className="mt-3">
        <ComicPanelImage
          image={panel.image}
          mapAnchor={panel.mapAnchor}
          sceneType={panel.sceneType}
          locationName={panel.locationName}
          isEnriching={isEnriching && !panel.image}
        />
      </div>

      {/* Content */}
      <div className="flex-1 px-5 pt-4 pb-4 flex flex-col justify-end">
        {/* Location */}
        <div className="mb-3">
          <div className="flex items-center gap-1.5 mb-2">
            <MapPin className={`h-3 w-3 ${style.accent} opacity-60`} />
            <span className="text-[10px] text-[rgba(232,237,248,0.45)] font-body font-semibold uppercase tracking-[0.1em]">
              {panel.locationName}
            </span>
          </div>
          <div className="h-px bg-[rgba(255,255,255,0.08)]" />
        </div>

        {/* Caption */}
        <p className="text-[14px] text-white leading-relaxed font-body font-semibold mb-4 tracking-tight">
          {panel.caption}
        </p>

        {/* Speech bubble */}
        {panel.speechBubble && (
          <div className="relative bg-white/95 rounded-2xl rounded-bl-sm px-4 py-3 mb-2 shadow-lg max-w-[90%] self-start">
            <p className="text-sm text-gray-800 italic leading-snug font-body font-medium">
              &ldquo;{panel.speechBubble}&rdquo;
            </p>
            <div
              className="absolute -bottom-2.5 left-5 w-0 h-0"
              style={{
                borderLeft: "7px solid transparent",
                borderRight: "7px solid transparent",
                borderTop: "10px solid rgba(255,255,255,0.95)",
              }}
            />
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="bg-[rgba(0,0,0,0.35)] px-5 py-3 flex items-center gap-4 flex-wrap border-t border-[rgba(255,255,255,0.06)]">
        {panel.timeLabel && (
          <div className="flex items-center gap-1.5 text-[10px] text-[rgba(232,237,248,0.45)] font-data">
            <Clock className="h-2.5 w-2.5" />
            {panel.timeLabel}
          </div>
        )}
        {panel.distanceLabel && (
          <div className="flex items-center gap-1.5 text-[10px] text-[rgba(232,237,248,0.45)] font-data">
            <Route className="h-2.5 w-2.5" />
            {panel.distanceLabel}
          </div>
        )}
        {panel.speedLabel && (
          <div className="flex items-center gap-1.5 text-[10px] text-[rgba(232,237,248,0.45)] font-data">
            <Gauge className="h-2.5 w-2.5" />
            {panel.speedLabel}
          </div>
        )}
        <div className="ml-auto text-[9px] text-[rgba(232,237,248,0.2)] font-data tabular-nums">
          {panel.mapAnchor.lat.toFixed(4)}, {panel.mapAnchor.lon.toFixed(4)}
        </div>
      </div>
    </div>
  );
}

"use client";

import Image from "next/image";
import { useState } from "react";
import { MapPin, Clock, Route, Gauge, Navigation, Images, Camera, ChevronLeft, ChevronRight } from "lucide-react";
import type { ComicPanel, ComicTone, AreaPhoto, SceneType } from "@/types";
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

// ─── Photo gallery sub-component ──────────────────────────────────────────────

function PhotoGallery({
  photos,
  locationName,
}: {
  photos: AreaPhoto[];
  sceneType: SceneType;
  locationName: string;
}) {
  const [current, setCurrent] = useState(0);
  const [imgError, setImgError] = useState(false);

  const photo = photos[current];
  const hasMultiple = photos.length > 1;

  const prev = () => {
    setImgError(false);
    setCurrent((i) => (i - 1 + photos.length) % photos.length);
  };
  const next = () => {
    setImgError(false);
    setCurrent((i) => (i + 1) % photos.length);
  };

  if (!photo) return null;

  return (
    <div className="relative w-full aspect-[16/9] overflow-hidden border-b border-white/5 group bg-[rgba(255,255,255,0.03)]">
      {imgError ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
          <Camera className="h-5 w-5 text-white/20" />
          <span className="text-[10px] text-white/25 font-body">{locationName}</span>
        </div>
      ) : (
        <Image
          key={`${current}-${photo.url}`}
          src={photo.url}
          alt={photo.caption ?? locationName}
          fill
          className="object-cover transition-opacity duration-300"
          sizes="(max-width: 768px) 100vw, 50vw"
          unoptimized
          onError={() => setImgError(true)}
        />
      )}

      {/* Bottom gradient */}
      {!imgError && (
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />
      )}

      {/* Prev / next arrows */}
      {hasMultiple && (
        <>
          <button
            onClick={prev}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80 z-10"
            aria-label="Previous photo"
          >
            <ChevronLeft className="h-3.5 w-3.5 text-white" />
          </button>
          <button
            onClick={next}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80 z-10"
            aria-label="Next photo"
          >
            <ChevronRight className="h-3.5 w-3.5 text-white" />
          </button>
        </>
      )}

      {/* Dot indicators */}
      {hasMultiple && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1 z-10">
          {photos.map((_, i) => (
            <button
              key={i}
              onClick={() => { setImgError(false); setCurrent(i); }}
              className={`h-1 rounded-full transition-all duration-200 ${
                i === current
                  ? "w-4 bg-white"
                  : "w-1 bg-white/35 hover:bg-white/60"
              }`}
              aria-label={`Go to photo ${i + 1}`}
            />
          ))}
        </div>
      )}

      {/* Caption + attribution overlay */}
      {!imgError && (
        <div className="absolute inset-x-0 bottom-0 px-3 pb-2 flex items-end justify-between gap-2 z-10">
          {photo.caption && (
            <div className="flex items-center gap-1 bg-black/50 backdrop-blur-sm rounded-full px-2 py-0.5 max-w-[60%]">
              <Camera className="h-2.5 w-2.5 text-white/60 shrink-0" />
              <span className="text-[9px] text-white/55 font-medium leading-none truncate">
                {photo.caption}
              </span>
            </div>
          )}
          {photo.attribution && (
            <span className="text-[8px] text-white/30 bg-black/40 backdrop-blur-sm rounded px-1.5 py-0.5 max-w-[38%] truncate shrink-0">
              {photo.attribution}
            </span>
          )}
        </div>
      )}

      {/* Photo counter badge */}
      {hasMultiple && (
        <div className="absolute top-2 right-2 bg-black/50 backdrop-blur-sm rounded-full px-1.5 py-0.5 z-10">
          <span className="text-[9px] text-white/50 font-data tabular-nums">
            {current + 1}/{photos.length}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function ComicPanelCard({ panel, panelIndex, isEnriching }: ComicPanelCardProps) {
  const style = SCENE_STYLES[panel.sceneType] ?? SCENE_STYLES.opening;
  const bar   = ACCENT_BARS[panel.sceneType] ?? ACCENT_BARS.opening;

  const hasPhotos = (panel.areaPhotos?.length ?? 0) > 0;
  const [viewMode, setViewMode] = useState<"map" | "photos">("map");

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

        {/* Map / Photos toggle — only shown when area photos exist */}
        {hasPhotos && (
          <div className="flex items-center gap-0.5 bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.06)] rounded-lg p-0.5">
            <button
              onClick={() => setViewMode("map")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-body font-semibold transition-all duration-150 ${
                viewMode === "map"
                  ? "bg-[rgba(255,255,255,0.1)] text-white shadow-sm"
                  : "text-[rgba(232,237,248,0.38)] hover:text-[rgba(232,237,248,0.7)]"
              }`}
            >
              <Navigation className="h-2.5 w-2.5" />
              Map
            </button>
            <button
              onClick={() => setViewMode("photos")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-body font-semibold transition-all duration-150 ${
                viewMode === "photos"
                  ? "bg-[rgba(245,166,35,0.18)] text-[#f5a623] shadow-sm"
                  : "text-[rgba(232,237,248,0.38)] hover:text-[rgba(232,237,248,0.7)]"
              }`}
            >
              <Images className="h-2.5 w-2.5" />
              Photos
            </button>
          </div>
        )}
      </div>

      {/* Image / Gallery area */}
      <div className="mt-3">
        {viewMode === "photos" && hasPhotos ? (
          <PhotoGallery
            photos={panel.areaPhotos!}
            sceneType={panel.sceneType}
            locationName={panel.locationName}
          />
        ) : (
          <ComicPanelImage
            image={panel.image}
            mapAnchor={panel.mapAnchor}
            sceneType={panel.sceneType}
            locationName={panel.locationName}
            isEnriching={isEnriching && !panel.image}
          />
        )}
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

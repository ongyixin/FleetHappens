"use client";

/**
 * ComicPanelImage — renders the image area of a single comic panel.
 *
 * Priority order (matches the enrichment pipeline):
 *   1. place-photo  → real Google Place photo, 16:9 aspect ratio
 *   2. map          → stylised location card (no external API needed)
 *   3. fallback     → icon badge (always available)
 *   undefined       → map card (enrichment not yet run or not applicable)
 *
 * The component is safe to render before enrichment completes — pass
 * `isEnriching={true}` to show a shimmer skeleton in place of the image.
 */

import Image from "next/image";
import { useState } from "react";
import { Camera, Navigation, Loader2 } from "lucide-react";
import type { StoryPanelImage, LatLon, SceneType } from "@/types";
import { cn } from "@/lib/utils";

// ─── Props ────────────────────────────────────────────────────────────────────

interface ComicPanelImageProps {
  image: StoryPanelImage | undefined;
  mapAnchor: LatLon;
  sceneType: SceneType;
  locationName: string;
  /** True while the enrichment API call is in-flight. Shows a shimmer. */
  isEnriching?: boolean;
}

// ─── Theme helpers ────────────────────────────────────────────────────────────

type SceneTheme = { ring: string; icon: string; glow: string };

const SCENE_THEME: Record<SceneType, SceneTheme> = {
  opening: {
    ring: "ring-fleet-blue/30",
    icon: "text-fleet-blue",
    glow: "bg-fleet-blue/10",
  },
  journey: {
    ring: "ring-fleet-teal/30",
    icon: "text-fleet-teal",
    glow: "bg-fleet-teal/10",
  },
  highlight: {
    ring: "ring-fleet-orange/30",
    icon: "text-fleet-orange",
    glow: "bg-fleet-orange/10",
  },
  arrival: {
    ring: "ring-[#6d5ae6]/30",
    icon: "text-[#6d5ae6]",
    glow: "bg-[#6d5ae6]/10",
  },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function EnrichingShimmer() {
  return (
    <div className="w-full aspect-[16/9] bg-white/5 flex items-center justify-center border-b border-white/5 relative overflow-hidden">
      {/* Animated sweep */}
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.4s_infinite] bg-gradient-to-r from-transparent via-white/8 to-transparent" />
      <Loader2 className="h-5 w-5 text-white/20 animate-spin" />
    </div>
  );
}

function MapCard({
  mapAnchor,
  sceneType,
  locationName,
}: {
  mapAnchor: LatLon;
  sceneType: SceneType;
  locationName: string;
}) {
  const theme = SCENE_THEME[sceneType];
  return (
    <div
      className={cn(
        "w-full aspect-[16/9] flex items-center justify-center",
        "bg-gradient-to-br from-white/[0.04] to-transparent",
        "border-b border-white/5 relative overflow-hidden"
      )}
    >
      {/* Subtle dot grid */}
      <div
        className="absolute inset-0 opacity-15"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(255,255,255,0.35) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      />
      {/* Cross-hair lines */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-0 right-0 h-px bg-white/[0.04]" />
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/[0.04]" />
      </div>

      {/* Center content */}
      <div className="relative z-10 flex flex-col items-center gap-2 px-6 text-center">
        <div className={cn("rounded-full p-2.5 ring-1", theme.ring, theme.glow)}>
          <Navigation className={cn("h-4 w-4", theme.icon)} />
        </div>
        <p className="text-[11px] text-white/45 font-medium uppercase tracking-wider leading-tight max-w-[180px]">
          {locationName}
        </p>
        <p className="font-mono text-[9px] text-white/20 tabular-nums">
          {mapAnchor.lat.toFixed(4)}, {mapAnchor.lon.toFixed(4)}
        </p>
      </div>
    </div>
  );
}

function FallbackCard({
  label,
  sceneType,
}: {
  label?: string;
  sceneType: SceneType;
}) {
  const theme = SCENE_THEME[sceneType];
  return (
    <div
      className={cn(
        "w-full aspect-[16/9] flex items-center justify-center",
        "bg-gradient-to-br from-white/[0.03] to-transparent",
        "border-b border-white/5"
      )}
    >
      <div className="flex flex-col items-center gap-2">
        <div className={cn("rounded-xl p-3 ring-1", theme.ring, theme.glow)}>
          <Navigation className={cn("h-4 w-4", theme.icon)} />
        </div>
        {label && (
          <span className="text-[11px] text-white/30 font-medium">{label}</span>
        )}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ComicPanelImage({
  image,
  mapAnchor,
  sceneType,
  locationName,
  isEnriching,
}: ComicPanelImageProps) {
  const [imgError, setImgError] = useState(false);

  if (isEnriching && !image) {
    return <EnrichingShimmer />;
  }

  if (!image || image.kind === "map") {
    return (
      <MapCard
        mapAnchor={mapAnchor}
        sceneType={sceneType}
        locationName={locationName}
      />
    );
  }

  if (image.kind === "fallback") {
    return <FallbackCard label={image.label} sceneType={sceneType} />;
  }

  // place-photo
  if (imgError) {
    // Image failed to load — degrade to map card gracefully.
    return (
      <MapCard
        mapAnchor={mapAnchor}
        sceneType={sceneType}
        locationName={locationName}
      />
    );
  }

  return (
    <div className="relative w-full aspect-[16/9] overflow-hidden border-b border-white/5">
      <Image
        src={image.imageUrl}
        alt={image.placeName ?? locationName}
        fill
        className="object-cover"
        sizes="(max-width: 768px) 100vw, 50vw"
        onError={() => setImgError(true)}
        unoptimized
      />
      {/* Bottom gradient for caption legibility */}
      <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-black/70 to-transparent" />

      {/* Photo badge */}
      <div className="absolute bottom-2 left-3 right-3 flex items-end justify-between gap-2">
        <div className="flex items-center gap-1 bg-black/50 backdrop-blur-sm rounded-full px-2 py-0.5">
          <Camera className="h-2.5 w-2.5 text-white/60 shrink-0" />
          <span className="text-[9px] text-white/55 font-medium leading-none">
            {image.placeName ?? "Place photo"}
          </span>
        </div>
        {image.attribution && (
          <span className="text-[8px] text-white/30 bg-black/40 backdrop-blur-sm rounded px-1.5 py-0.5 max-w-[130px] truncate shrink-0">
            {image.attribution}
          </span>
        )}
      </div>
    </div>
  );
}

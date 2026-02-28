"use client";

import { useState } from "react";
import { RefreshCw, Share2, Download, Loader2, Sparkles, ImageIcon } from "lucide-react";
import type { ComicStory, ComicTone, TripSummary } from "@/types";
import ComicPanelCard from "@/components/ComicPanelCard";
import ToneSelector from "@/components/ToneSelector";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface ComicStoryRendererProps {
  story: ComicStory | null;
  trip: TripSummary | null;
  loading: boolean;
  generating: boolean;
  /** True while the image enrichment step is in-flight after generation. */
  enriching?: boolean;
  tone: ComicTone;
  onToneChange: (tone: ComicTone) => void;
  onRegenerate: (tone: ComicTone) => void;
}

function PanelSkeleton() {
  return (
    <div className="rounded-2xl overflow-hidden shadow-xl bg-gradient-to-br from-[#0e2440] to-[#1a3a5c] flex flex-col">
      <div className="h-[3px] bg-fleet-blue/40" />
      <div className="p-5 pt-4 min-h-[220px] flex flex-col justify-end">
        <Skeleton className="h-2.5 w-20 bg-white/15 mb-4" />
        <Skeleton className="h-px w-full bg-white/10 mb-4" />
        <Skeleton className="h-4 w-full bg-white/20 mb-2" />
        <Skeleton className="h-4 w-4/5 bg-white/20 mb-4" />
        <Skeleton className="h-10 w-3/5 bg-white/10 rounded-2xl" />
      </div>
      <div className="bg-black/25 px-5 py-3 flex gap-4">
        <Skeleton className="h-2.5 w-16 bg-white/15" />
        <Skeleton className="h-2.5 w-16 bg-white/15" />
      </div>
    </div>
  );
}

export default function ComicStoryRenderer({
  story,
  trip,
  loading,
  generating,
  enriching = false,
  tone,
  onToneChange,
  onRegenerate,
}: ComicStoryRendererProps) {
  const [pendingTone, setPendingTone] = useState<ComicTone>(tone);

  const handleToneChange = (t: ComicTone) => {
    setPendingTone(t);
    onToneChange(t);
  };

  const handleRegenerate = () => {
    onRegenerate(pendingTone);
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Story title + actions */}
      {story && (
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Sparkles className="h-4 w-4 text-fleet-orange" />
              <h2 className="text-2xl font-extrabold text-white tracking-tight leading-tight">
                {story.title}
              </h2>
            </div>
            {trip && (
              <p className="text-sm text-white/40">
                {trip.deviceName} · {new Date(trip.start).toLocaleDateString("en-US", {
                  month: "long", day: "numeric", year: "numeric",
                })}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="ghost"
              className="text-white/40 hover:text-white hover:bg-white/8 text-xs"
            >
              <Share2 className="h-3.5 w-3.5 mr-1.5" />
              Share
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-white/40 hover:text-white hover:bg-white/8 text-xs"
            >
              <Download className="h-3.5 w-3.5 mr-1.5" />
              Export
            </Button>
          </div>
        </div>
      )}

      {/* Tone selector + generate button */}
      <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/8 p-5">
        <div className="mb-5">
          <ToneSelector
            value={pendingTone}
            onChange={handleToneChange}
            disabled={generating}
          />
        </div>
        <Button
          onClick={handleRegenerate}
          disabled={generating || loading || !trip}
          variant="fleet"
          size="lg"
          className="w-full gap-2 bg-fleet-orange hover:bg-fleet-orange/90 shadow-[0_4px_12px_rgba(234,124,30,0.3)]"
        >
          {generating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating story…
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4" />
              {story ? "Regenerate Story" : "Generate Trip Story"}
            </>
          )}
        </Button>
        {!trip && (
          <p className="text-xs text-white/30 text-center mt-2.5">
            No trip loaded — the story will generate from cached data
          </p>
        )}
      </div>

      {/* Panels grid */}
      {(loading || generating) && !story ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <PanelSkeleton key={i} />
          ))}
        </div>
      ) : story ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {story.panels.map((panel, i) => (
              <ComicPanelCard
                key={panel.panelNumber}
                panel={panel}
                tone={story.tone}
                panelIndex={i}
                isEnriching={enriching}
              />
            ))}
          </div>

          {/* Image enrichment status */}
          {enriching && (
            <div className="flex items-center gap-2 text-[11px] text-white/30 px-1">
              <ImageIcon className="h-3 w-3 animate-pulse text-fleet-orange/50" />
              Finding place photos…
            </div>
          )}

          {/* Story footer */}
          <div className="flex items-center justify-between text-[11px] text-white/20 px-1 border-t border-white/8 pt-4">
            <span>
              FleetHappens · {story.panels.length} panels · {story.tone} tone
            </span>
            <span className="font-mono">
              {new Date(story.createdAt).toLocaleTimeString()}
            </span>
          </div>
        </>
      ) : null}

      {/* Empty state */}
      {!loading && !generating && !story && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="rounded-2xl bg-white/5 border border-white/8 p-8 mb-5">
            <Sparkles className="h-10 w-10 text-white/20 mx-auto" />
          </div>
          <p className="text-white/60 font-bold text-lg mb-1.5">
            Your story is waiting
          </p>
          <p className="text-sm text-white/30 max-w-sm leading-relaxed">
            Select a tone, optionally explore stop contexts on the dashboard for richer panels, then hit{" "}
            <span className="text-fleet-orange font-semibold">"Generate Trip Story"</span> above.
          </p>
        </div>
      )}
    </div>
  );
}

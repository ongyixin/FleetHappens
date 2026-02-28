"use client";

import { useState } from "react";
import { RefreshCw, Share2, Download, Loader2, Sparkles, ImageIcon } from "lucide-react";
import type { ComicStory, ComicTone, TripSummary } from "@/types";
import ComicPanelCard from "@/components/ComicPanelCard";
import ToneSelector from "@/components/ToneSelector";

interface ComicStoryRendererProps {
  story: ComicStory | null;
  trip: TripSummary | null;
  loading: boolean;
  generating: boolean;
  enriching?: boolean;
  tone: ComicTone;
  onToneChange: (tone: ComicTone) => void;
  onRegenerate: (tone: ComicTone) => void;
}

function PanelSkeleton({ index }: { index: number }) {
  const colors = ["#38bdf8", "#34d399", "#f5a623", "#a78bfa"];
  const color  = colors[index % colors.length];
  return (
    <div className="rounded-2xl overflow-hidden bg-[#0f1319] border border-[rgba(255,255,255,0.07)] animate-fade-up" style={{ animationDelay: `${index * 80}ms` }}>
      <div className="h-[2.5px]" style={{ background: color, opacity: 0.6 }} />
      <div className="p-5 min-h-[240px] flex flex-col justify-end space-y-3">
        <div className="h-2.5 w-16 rounded skeleton-shimmer" />
        <div className="h-px w-full skeleton-shimmer" />
        <div className="h-4 w-full rounded skeleton-shimmer" />
        <div className="h-4 w-4/5 rounded skeleton-shimmer" />
        <div className="h-10 w-3/5 rounded-2xl skeleton-shimmer" />
      </div>
      <div className="bg-[rgba(0,0,0,0.3)] px-5 py-3 flex gap-4 border-t border-[rgba(255,255,255,0.05)]">
        <div className="h-2.5 w-14 rounded skeleton-shimmer" />
        <div className="h-2.5 w-14 rounded skeleton-shimmer" />
      </div>
    </div>
  );
}

export default function ComicStoryRenderer({
  story, trip, loading, generating, enriching = false, tone, onToneChange, onRegenerate,
}: ComicStoryRendererProps) {
  const [pendingTone, setPendingTone] = useState<ComicTone>(tone);

  const handleToneChange = (t: ComicTone) => { setPendingTone(t); onToneChange(t); };
  const handleRegenerate = () => onRegenerate(pendingTone);

  return (
    <div className="space-y-8 pb-20">
      {/* Story title + actions */}
      {story && (
        <div className="flex items-start justify-between gap-4 animate-fade-up">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Sparkles className="h-4 w-4 text-[#fb923c]" />
              <h2 className="font-display font-extrabold text-2xl text-white tracking-tight leading-tight">
                {story.title}
              </h2>
            </div>
            {trip && (
              <p className="text-sm text-[rgba(232,237,248,0.38)] font-data">
                {trip.deviceName} · {new Date(trip.start).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[11px] text-[rgba(232,237,248,0.4)] hover:text-white hover:bg-[rgba(255,255,255,0.07)] transition-all border border-transparent hover:border-[rgba(255,255,255,0.08)] font-body">
              <Share2 className="h-3.5 w-3.5" />
              Share
            </button>
            <button className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[11px] text-[rgba(232,237,248,0.4)] hover:text-white hover:bg-[rgba(255,255,255,0.07)] transition-all border border-transparent hover:border-[rgba(255,255,255,0.08)] font-body">
              <Download className="h-3.5 w-3.5" />
              Export
            </button>
          </div>
        </div>
      )}

      {/* Tone selector + generate button */}
      <div className="bg-[rgba(255,255,255,0.04)] backdrop-blur-sm rounded-2xl border border-[rgba(255,255,255,0.08)] p-5 animate-fade-up" style={{ animationDelay: "60ms" }}>
        <div className="mb-5">
          <ToneSelector value={pendingTone} onChange={handleToneChange} disabled={generating} />
        </div>
        <button
          onClick={handleRegenerate}
          disabled={generating || loading || !trip}
          className="w-full h-12 rounded-xl text-sm font-display font-bold flex items-center justify-center gap-2 btn-amber disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
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
        </button>
        {!trip && (
          <p className="text-xs text-[rgba(232,237,248,0.3)] text-center mt-2.5 font-body">
            No trip loaded — the story will generate from cached data
          </p>
        )}
      </div>

      {/* Panels */}
      {(loading || generating) && !story ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {Array.from({ length: 4 }).map((_, i) => <PanelSkeleton key={i} index={i} />)}
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

          {enriching && (
            <div className="flex items-center gap-2 text-[11px] text-[rgba(232,237,248,0.3)] px-1 font-body">
              <ImageIcon className="h-3 w-3 animate-pulse text-[#fb923c]/60" />
              Finding place photos…
            </div>
          )}

          {/* Story footer */}
          <div className="flex items-center justify-between text-[10px] text-[rgba(232,237,248,0.2)] px-1 border-t border-[rgba(255,255,255,0.07)] pt-4">
            <span className="font-body">
              FleetHappens · {story.panels.length} panels · {story.tone} tone
            </span>
            <span className="font-data">
              {new Date(story.createdAt).toLocaleTimeString()}
            </span>
          </div>
        </>
      ) : null}

      {/* Empty state */}
      {!loading && !generating && !story && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="rounded-2xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.07)] p-10 mb-5">
            <Sparkles className="h-10 w-10 text-[rgba(232,237,248,0.18)] mx-auto" />
          </div>
          <p className="font-display font-bold text-white text-xl mb-1.5">Your story is waiting</p>
          <p className="text-sm text-[rgba(232,237,248,0.38)] max-w-sm leading-relaxed font-body">
            Select a tone, optionally explore stop contexts on the dashboard for richer panels, then hit{" "}
            <span className="text-[#f5a623] font-semibold">"Generate Trip Story"</span> above.
          </p>
        </div>
      )}
    </div>
  );
}

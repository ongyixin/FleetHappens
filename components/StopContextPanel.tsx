"use client";

import type { StopContext, Amenity, LatLon } from "@/types";
import { X, MapPin, Fuel, Coffee, ParkingCircle, MoreHorizontal, Users, BookmarkPlus, BookmarkCheck, Navigation2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  context: StopContext | null;
  loading: boolean;
  onClose: () => void;
  onUseInStory?: (ctx: StopContext) => void;
  coordinates?: LatLon | null;
  useInStory?: boolean;
  onToggleUseInStory?: () => void;
}

function AmenityIcon({ category }: { category: Amenity["category"] }) {
  switch (category) {
    case "fuel":    return <Fuel className="w-3.5 h-3.5" />;
    case "food":    return <Coffee className="w-3.5 h-3.5" />;
    case "parking": return <ParkingCircle className="w-3.5 h-3.5" />;
    default:        return <MoreHorizontal className="w-3.5 h-3.5" />;
  }
}

const AMENITY_STYLES: Record<string, string> = {
  fuel:    "bg-[rgba(251,146,60,0.12)] text-[#fb923c]",
  food:    "bg-[rgba(52,211,153,0.12)] text-[#34d399]",
  parking: "bg-[rgba(56,189,248,0.12)] text-[#38bdf8]",
  other:   "bg-[rgba(255,255,255,0.06)] text-[rgba(232,237,248,0.5)]",
};

export default function StopContextPanel({ context, loading, onClose, onUseInStory, coordinates, useInStory = false, onToggleUseInStory }: Props) {
  function handleUseInStory() {
    if (onToggleUseInStory) onToggleUseInStory();
    else if (onUseInStory && context) onUseInStory(context);
  }

  return (
    <aside className="fixed right-0 top-0 bottom-0 w-80 z-50 flex flex-col bg-[#0d1018] border-l border-[rgba(255,255,255,0.09)] shadow-[-8px_0_32px_rgba(0,0,0,0.5)] panel-open overflow-y-auto">
      {/* Amber top accent */}
      <div className="shrink-0 h-[2px] bg-gradient-to-r from-[#f5a623] via-[#fb923c] to-transparent" />

      {/* Header */}
      <div className="shrink-0 flex items-start justify-between px-5 py-4 border-b border-[rgba(255,255,255,0.07)]">
        <div className="min-w-0">
          <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[rgba(232,237,248,0.35)] font-body mb-1">
            Stop Context
          </p>
          {context ? (
            <h2 className="font-display font-bold text-base text-white leading-tight">{context.placeName}</h2>
          ) : coordinates ? (
            <p className="text-[11px] font-data text-[rgba(232,237,248,0.5)]">
              {coordinates.lat.toFixed(4)}, {coordinates.lon.toFixed(4)}
            </p>
          ) : (
            <h2 className="font-display font-bold text-sm text-white">Identifying stop…</h2>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-[rgba(255,255,255,0.08)] transition-colors ml-2 shrink-0 text-[rgba(232,237,248,0.4)] hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Loading state */}
      {loading && !context && (
        <div className="flex-1 p-5 space-y-4">
          <div className="flex items-center gap-2 text-[rgba(232,237,248,0.4)] text-xs font-body">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#f5a623]" />
            Geocoding location…
          </div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className={cn("h-3 rounded skeleton-shimmer", i === 1 ? "w-3/4" : i === 3 ? "w-1/2" : "w-full")}
              style={{ animationDelay: `${i * 80}ms` }}
            />
          ))}
        </div>
      )}

      {/* Content */}
      {context && (
        <div className="flex-1 divide-y divide-[rgba(255,255,255,0.06)]">
          {/* Place info */}
          <div className="px-5 py-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-[rgba(245,166,35,0.1)] shrink-0 mt-0.5">
                <Navigation2 className="w-4 h-4 text-[#f5a623]" />
              </div>
              <div className="min-w-0">
                <h3 className="font-display font-bold text-lg text-white leading-tight">{context.placeName}</h3>
                {context.neighborhood && (
                  <p className="text-xs text-[rgba(232,237,248,0.5)] mt-0.5 font-body">{context.neighborhood}</p>
                )}
                {coordinates && (
                  <p className="text-[10px] text-[rgba(232,237,248,0.3)] mt-1 font-data">
                    {coordinates.lat.toFixed(5)}, {coordinates.lon.toFixed(5)}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Area briefing */}
          <div className="px-5 py-4">
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[rgba(232,237,248,0.35)] font-body mb-2.5">
              Area Briefing
            </p>
            <p className="text-sm leading-relaxed text-[rgba(232,237,248,0.8)] font-body">
              {context.areaBriefing}
            </p>
          </div>

          {/* Fleet visit history */}
          <div className="px-5 py-4">
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[rgba(232,237,248,0.35)] font-body mb-2.5">
              Fleet Visits
            </p>
            {context.fleetVisitCount != null ? (
              <div className="flex items-start gap-2.5">
                <div className="p-1.5 rounded-lg bg-[rgba(245,166,35,0.1)] shrink-0">
                  <Users className="w-3.5 h-3.5 text-[#f5a623]" />
                </div>
                <p className="text-sm text-[rgba(232,237,248,0.75)] font-body leading-snug">
                  {context.fleetVisitSummary ?? `${context.fleetVisitCount} visits in the last 90 days`}
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-[rgba(232,237,248,0.4)] font-body">
                <Loader2 className="w-3 h-3 animate-spin text-[#f5a623]" />
                Loading fleet history from Ace…
              </div>
            )}
          </div>

          {/* Nearby amenities */}
          {context.nearbyAmenities.length > 0 && (
            <div className="px-5 py-4">
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[rgba(232,237,248,0.35)] font-body mb-2.5">
                Nearby
              </p>
              <ul className="space-y-2">
                {context.nearbyAmenities.slice(0, 5).map((a, i) => (
                  <li key={i} className="flex items-center gap-2.5">
                    <div className={cn("p-1.5 rounded-lg shrink-0", AMENITY_STYLES[a.category] ?? AMENITY_STYLES.other)}>
                      <AmenityIcon category={a.category} />
                    </div>
                    <span className="flex-1 truncate text-sm text-[rgba(232,237,248,0.75)] font-body">{a.name}</span>
                    <span className="text-[10px] text-[rgba(232,237,248,0.35)] shrink-0 font-data tabular-nums">
                      {a.distanceMeters < 1000 ? `${a.distanceMeters}m` : `${(a.distanceMeters / 1000).toFixed(1)}km`}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Coords context */}
          <div className="px-5 py-3">
            <p className="text-[10px] text-[rgba(232,237,248,0.25)] font-data flex items-center gap-1.5">
              <MapPin className="w-3 h-3" />
              {context.coordinates?.lat?.toFixed(5)}, {context.coordinates?.lon?.toFixed(5)}
            </p>
          </div>

          {/* Use in story */}
          {(onUseInStory ?? onToggleUseInStory) && (
            <div className="px-5 py-4">
              <button
                onClick={handleUseInStory}
                className={cn(
                  "w-full py-2.5 px-4 rounded-xl text-sm font-display font-bold transition-all flex items-center justify-center gap-2",
                  useInStory
                    ? "bg-[#f5a623] text-[#09090e] shadow-[0_4px_12px_rgba(245,166,35,0.3)]"
                    : "bg-[rgba(245,166,35,0.08)] hover:bg-[rgba(245,166,35,0.14)] text-[#f5a623] border border-[rgba(245,166,35,0.2)]"
                )}
              >
                {useInStory ? <BookmarkCheck className="w-4 h-4" /> : <BookmarkPlus className="w-4 h-4" />}
                {useInStory ? "Added to Trip Story" : "Use in Trip Story"}
              </button>
              {!useInStory && (
                <p className="text-[11px] text-[rgba(232,237,248,0.3)] text-center mt-1.5 font-body">
                  Adds rich area context to this stop&apos;s panel
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </aside>
  );
}

/**
 * StopContextPanel — slide-in panel showing context briefing for a stop.
 * Phase 1: place name + area briefing + nearby amenities (fast, ~3-5s)
 * Phase 2: fleet visit history from Ace (async enrichment)
 */

"use client";

import type { StopContext, Amenity, LatLon } from "@/types";
import {
  X, MapPin, Fuel, Coffee, ParkingCircle, MoreHorizontal,
  Users, BookmarkPlus, BookmarkCheck, Navigation2, Loader2,
} from "lucide-react";
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

const AMENITY_COLORS: Record<string, string> = {
  fuel:    "bg-fleet-orange/10 text-fleet-orange",
  food:    "bg-fleet-teal/10 text-fleet-teal",
  parking: "bg-fleet-blue/10 text-fleet-blue",
  other:   "bg-muted text-muted-foreground",
};

export default function StopContextPanel({
  context,
  loading,
  onClose,
  onUseInStory,
  coordinates,
  useInStory = false,
  onToggleUseInStory,
}: Props) {
  function handleUseInStory() {
    if (onToggleUseInStory) {
      onToggleUseInStory();
    } else if (onUseInStory && context) {
      onUseInStory(context);
    }
  }

  return (
    <aside className="w-80 border-l border-border bg-white flex flex-col animate-slide-in-right shrink-0 overflow-y-auto shadow-[-4px_0_16px_rgba(14,36,64,0.06)]">
      {/* Header — navy accent strip */}
      <div className="shrink-0">
        <div className="h-1 bg-gradient-to-r from-fleet-navy via-fleet-blue to-fleet-teal" />
        <div className="flex items-start justify-between px-4 py-3.5 border-b border-border">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">
              Stop Context
            </p>
            {context ? (
              <h2 className="font-bold text-sm text-fleet-navy leading-tight truncate">
                {context.placeName}
              </h2>
            ) : coordinates ? (
              <p className="text-xs text-muted-foreground font-mono">
                {coordinates.lat.toFixed(4)}, {coordinates.lon.toFixed(4)}
              </p>
            ) : (
              <h2 className="font-bold text-sm text-fleet-navy">Identifying stop…</h2>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-muted transition-colors ml-2 shrink-0 text-muted-foreground hover:text-foreground"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Loading skeleton */}
      {loading && !context && (
        <div className="flex-1 p-4 space-y-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-fleet-blue" />
            Geocoding location…
          </div>
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-3.5 rounded bg-muted animate-pulse",
                i === 1 ? "w-3/4" : i === 3 ? "w-1/2" : "w-full"
              )}
              style={{ animationDelay: `${i * 80}ms` }}
            />
          ))}
        </div>
      )}

      {/* Content */}
      {context && (
        <div className="flex-1 divide-y divide-border">
          {/* Place info */}
          <div className="px-4 py-4">
            <div className="flex items-start gap-2.5">
              <div className="p-2 rounded-lg bg-fleet-blue/8 shrink-0 mt-0.5">
                <Navigation2 className="w-3.5 h-3.5 text-fleet-blue" />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-base text-fleet-navy leading-tight">
                  {context.placeName}
                </h3>
                {context.neighborhood && (
                  <p className="text-xs text-muted-foreground mt-0.5">{context.neighborhood}</p>
                )}
                {coordinates && (
                  <p className="text-[10px] text-muted-foreground/60 mt-1 font-mono">
                    {coordinates.lat.toFixed(5)}, {coordinates.lon.toFixed(5)}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Area briefing */}
          <div className="px-4 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Area Briefing
            </p>
            <p className="text-sm leading-relaxed text-foreground">
              {context.areaBriefing}
            </p>
          </div>

          {/* Fleet visit history */}
          <div className="px-4 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Fleet Visits
            </p>
            {context.fleetVisitCount != null ? (
              <div className="flex items-start gap-2.5">
                <div className="p-1.5 rounded-md bg-fleet-amber/10 shrink-0">
                  <Users className="w-3.5 h-3.5 text-fleet-amber" />
                </div>
                <p className="text-sm text-foreground leading-snug">
                  {context.fleetVisitSummary ?? `${context.fleetVisitCount} visits in the last 90 days`}
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="w-3 h-3 animate-spin text-fleet-amber" />
                <span>Loading fleet history from Ace…</span>
              </div>
            )}
          </div>

          {/* Nearby amenities */}
          {context.nearbyAmenities.length > 0 && (
            <div className="px-4 py-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2.5">
                Nearby
              </p>
              <ul className="space-y-2">
                {context.nearbyAmenities.slice(0, 5).map((a, i) => (
                  <li key={i} className="flex items-center gap-2.5">
                    <div className={cn(
                      "p-1.5 rounded-md shrink-0",
                      AMENITY_COLORS[a.category] ?? AMENITY_COLORS.other
                    )}>
                      <AmenityIcon category={a.category} />
                    </div>
                    <span className="flex-1 truncate text-sm text-foreground">{a.name}</span>
                    <span className="text-[11px] text-muted-foreground shrink-0 tabular-nums">
                      {a.distanceMeters < 1000
                        ? `${a.distanceMeters}m`
                        : `${(a.distanceMeters / 1000).toFixed(1)}km`}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Use in story toggle */}
          {(onUseInStory ?? onToggleUseInStory) && (
            <div className="px-4 py-4">
              <button
                onClick={handleUseInStory}
                className={cn(
                  "w-full py-2.5 px-4 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2",
                  useInStory
                    ? "bg-fleet-navy text-white hover:bg-fleet-navy/90 shadow-sm"
                    : "bg-fleet-navy/8 hover:bg-fleet-navy/12 text-fleet-navy border border-fleet-navy/15"
                )}
              >
                {useInStory ? (
                  <BookmarkCheck className="w-4 h-4" />
                ) : (
                  <BookmarkPlus className="w-4 h-4" />
                )}
                {useInStory ? "Added to Trip Story" : "Use in Trip Story"}
              </button>
              {!useInStory && (
                <p className="text-[11px] text-muted-foreground text-center mt-1.5">
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

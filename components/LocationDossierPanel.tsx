"use client";

import { useEffect, useState } from "react";
import type { LocationDossier, NearbyAmenity, LatLon } from "@/types";
import {
  X, MapPin, Fuel, Coffee, ParkingCircle, MoreHorizontal,
  Loader2, BookmarkPlus, BookmarkCheck, Archive,
  Activity, Clock, CalendarDays, Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Sub-components ───────────────────────────────────────────────────────────

function AmenityIcon({ category }: { category: NearbyAmenity["category"] }) {
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

// ─── Utilities ────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

function isWithinDays(iso: string, days: number): boolean {
  try {
    return Date.now() - new Date(iso).getTime() < days * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

/** 0–100 composite score: fleet visits + app views + data completeness. */
function computeKnowledgeDepth(dossier: LocationDossier): number {
  let score = 0;
  score += Math.min((dossier.accessCount ?? 0) * 4, 25);
  score += Math.min((dossier.fleetVisitCount ?? 0) * 3, 45);
  if (dossier.areaBriefing) score += 15;
  if ((dossier.nearbyAmenities?.length ?? 0) > 0) score += 10;
  if (dossier.peakDayOfWeek) score += 5;
  return Math.min(score, 100);
}

function knowledgeLabel(depth: number): string {
  if (depth >= 81) return "Expert";
  if (depth >= 51) return "Well Known";
  if (depth >= 21) return "Familiar";
  return "Uncharted";
}

// ─── Animated counter hook ────────────────────────────────────────────────────

function useCountUp(target: number, duration = 900): number {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (target === 0) { setCount(0); return; }
    const start = performance.now();
    function step(now: number) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setCount(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }, [target, duration]);
  return count;
}

// ─── Phase label ──────────────────────────────────────────────────────────────

function phaseLabel(phase: string): string {
  switch (phase) {
    case "fetching":  return "Checking fleet memory…";
    case "briefing":  return "Generating area briefing…";
    case "enriching": return "Enriching with fleet data…";
    default:          return "Loading…";
  }
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface LocationDossierPanelProps {
  dossier: LocationDossier | null;
  loading: boolean;
  phase: "fetching" | "briefing" | "enriching" | "ready";
  onClose: () => void;
  coordinates?: LatLon | null;
  useInStory?: boolean;
  onToggleUseInStory?: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function LocationDossierPanel({
  dossier,
  loading,
  phase,
  onClose,
  coordinates,
  useInStory = false,
  onToggleUseInStory,
}: LocationDossierPanelProps) {
  const visitCount = useCountUp(dossier?.fleetVisitCount ?? 0, 1000);
  const depth = dossier ? computeKnowledgeDepth(dossier) : 0;
  const isNew = dossier ? (dossier.accessCount ?? 0) <= 1 : false;
  const isActive = dossier?.lastSeenAt ? isWithinDays(dossier.lastSeenAt, 7) : false;

  return (
    <aside className="fixed right-0 top-14 bottom-0 w-80 z-50 flex flex-col bg-[#090d11] border-l border-[rgba(255,255,255,0.08)] shadow-[-12px_0_40px_rgba(0,0,0,0.7)] panel-open overflow-y-auto">

      {/* Teal accent stripe — visual distinction from amber StopContextPanel */}
      <div className="shrink-0 h-[2px] bg-gradient-to-r from-[#2dd4bf] via-[#0ea5e9] to-transparent" />

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="shrink-0 flex items-start justify-between px-5 py-4 border-b border-[rgba(255,255,255,0.07)]">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Archive className="w-3 h-3 text-[#2dd4bf] shrink-0" />
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[rgba(45,212,191,0.65)] font-body">
              Location Dossier
            </p>
            {!loading && dossier && isNew && (
              <span className="text-xs font-bold uppercase tracking-wide bg-[rgba(245,166,35,0.15)] text-[#f5a623] border border-[rgba(245,166,35,0.3)] rounded-full px-1.5 py-0.5 font-body">
                New
              </span>
            )}
            {!loading && dossier && !isNew && isActive && (
              <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wide bg-[rgba(52,211,153,0.1)] text-[#34d399] border border-[rgba(52,211,153,0.2)] rounded-full px-1.5 py-0.5 font-body">
                <span className="w-1.5 h-1.5 rounded-full bg-[#34d399] animate-pulse shrink-0" />
                Active
              </span>
            )}
          </div>

          {dossier ? (
            <>
              <h2 className="font-display font-bold text-[15px] text-white leading-tight">
                {dossier.placeName}
              </h2>
              {dossier.neighborhood && (
                <p className="text-sm text-[rgba(232,237,248,0.45)] mt-0.5 font-body">
                  {dossier.neighborhood}
                  {dossier.city ? `, ${dossier.city}` : ""}
                </p>
              )}
            </>
          ) : coordinates ? (
            <p className="text-sm font-data text-[rgba(232,237,248,0.5)]">
              {coordinates.lat.toFixed(4)}°, {coordinates.lon.toFixed(4)}°
            </p>
          ) : (
            <h2 className="font-display font-bold text-sm text-white">
              Identifying location…
            </h2>
          )}
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-[rgba(255,255,255,0.08)] transition-colors ml-2 shrink-0 text-[rgba(232,237,248,0.4)] hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* ── Loading skeleton ─────────────────────────────────────────────── */}
      {loading && !dossier && (
        <div className="flex-1 p-5 space-y-4">
          <div className="flex items-center gap-2 text-[rgba(232,237,248,0.4)] text-sm font-body">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#2dd4bf]" />
            {phaseLabel(phase)}
          </div>
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-3 rounded skeleton-shimmer",
                i === 0 ? "w-1/2 h-8" : i === 2 ? "w-3/4" : i === 4 ? "w-1/2" : "w-full"
              )}
              style={{ animationDelay: `${i * 80}ms` }}
            />
          ))}
        </div>
      )}

      {/* ── Dossier content ──────────────────────────────────────────────── */}
      {dossier && (
        <div className="flex-1 divide-y divide-[rgba(255,255,255,0.06)]">

          {/* Fleet Memory block */}
          <div className="px-5 py-4">
            <div className="flex items-center gap-2 mb-3.5">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[rgba(45,212,191,0.65)] font-body">
                Fleet Memory
              </p>
              {phase === "enriching" && (
                <span className="inline-flex items-center gap-1 text-sm text-[rgba(232,237,248,0.35)] font-body">
                  <Loader2 className="w-2.5 h-2.5 animate-spin text-[#2dd4bf]" />
                  updating
                </span>
              )}
            </div>

            {/* Visit count hero + timeline stats */}
            <div className="flex items-start gap-4 mb-4">

              {/* Animated visit count */}
              <div className="shrink-0 text-center">
                <div className="text-[2.5rem] leading-none font-bold font-data text-white tabular-nums animate-count-up">
                  {phase === "enriching" || (phase !== "ready" && !dossier.fleetVisitCount)
                    ? "—"
                    : visitCount}
                </div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[rgba(45,212,191,0.55)] font-body mt-1">
                  Fleet Visits
                </p>
              </div>

              {/* Stat rows */}
              <div className="flex-1 space-y-2.5 pt-0.5">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-[rgba(45,212,191,0.4)] shrink-0" />
                  <span className="text-sm text-[rgba(232,237,248,0.35)] font-body">First seen</span>
                  <span className="ml-auto text-sm font-data text-[rgba(232,237,248,0.75)] tabular-nums">
                    {formatDate(dossier.firstSeenAt)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Activity className="w-3 h-3 text-[rgba(45,212,191,0.4)] shrink-0" />
                  <span className="text-sm text-[rgba(232,237,248,0.35)] font-body">Last seen</span>
                  <span className="ml-auto text-sm font-data text-[rgba(232,237,248,0.75)] tabular-nums">
                    {formatDate(dossier.lastSeenAt)}
                  </span>
                </div>
                {dossier.peakDayOfWeek && (
                  <div className="flex items-center gap-1.5">
                    <CalendarDays className="w-3 h-3 text-[rgba(45,212,191,0.4)] shrink-0" />
                    <span className="text-sm text-[rgba(232,237,248,0.35)] font-body">Peak day</span>
                    <span className="ml-auto text-sm font-data text-[rgba(232,237,248,0.75)]">
                      {dossier.peakDayOfWeek}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Knowledge depth gauge */}
            <div className="bg-[rgba(255,255,255,0.03)] rounded-xl p-3 border border-[rgba(255,255,255,0.05)]">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Layers className="w-3 h-3 text-[rgba(45,212,191,0.5)]" />
                  <span className="text-xs font-bold uppercase tracking-[0.14em] text-[rgba(232,237,248,0.35)] font-body">
                    Knowledge depth
                  </span>
                </div>
                <span className="text-sm font-bold font-data text-[#2dd4bf]">
                  {knowledgeLabel(depth)}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-[rgba(255,255,255,0.06)] overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#2dd4bf] to-[#0ea5e9] transition-all duration-[1200ms] ease-out"
                  style={{ width: `${depth}%` }}
                />
              </div>
              <p className="text-sm text-[rgba(232,237,248,0.28)] mt-1.5 font-body">
                {dossier.accessCount} dossier view{dossier.accessCount !== 1 ? "s" : ""}
                {dossier.fleetVisitSummary ? ` · ${dossier.fleetVisitSummary}` : ""}
              </p>
            </div>
          </div>

          {/* Area briefing */}
          <div className="px-5 py-4">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[rgba(232,237,248,0.35)] font-body mb-2.5">
              Area Briefing
            </p>
            <p className="text-[13px] leading-relaxed text-[rgba(232,237,248,0.8)] font-body">
              {dossier.areaBriefing}
            </p>
          </div>

          {/* Nearby amenities */}
          {dossier.nearbyAmenities?.length > 0 && (
            <div className="px-5 py-4">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[rgba(232,237,248,0.35)] font-body mb-2.5">
                Nearby
              </p>
              <ul className="space-y-2">
                {dossier.nearbyAmenities.slice(0, 5).map((a, i) => (
                  <li key={i} className="flex items-center gap-2.5">
                    <div className={cn("p-1.5 rounded-lg shrink-0", AMENITY_STYLES[a.category] ?? AMENITY_STYLES.other)}>
                      <AmenityIcon category={a.category} />
                    </div>
                    <span className="flex-1 truncate text-[13px] text-[rgba(232,237,248,0.75)] font-body">
                      {a.name}
                    </span>
                    <span className="text-sm text-[rgba(232,237,248,0.35)] shrink-0 font-data tabular-nums">
                      {a.distanceMeters < 1000
                        ? `${a.distanceMeters}m`
                        : `${(a.distanceMeters / 1000).toFixed(1)}km`}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Coordinates footer */}
          <div className="px-5 py-3">
            <p className="text-sm text-[rgba(232,237,248,0.22)] font-data flex items-center gap-1.5">
              <MapPin className="w-3 h-3" />
              {dossier.lat.toFixed(5)}, {dossier.lon.toFixed(5)}
            </p>
          </div>

          {/* Use in trip story */}
          {onToggleUseInStory && (
            <div className="px-5 py-4">
              <button
                onClick={onToggleUseInStory}
                className={cn(
                  "w-full py-2.5 px-4 rounded-xl text-sm font-display font-bold transition-all flex items-center justify-center gap-2",
                  useInStory
                    ? "bg-[#f5a623] text-[#09090e] shadow-[0_4px_12px_rgba(245,166,35,0.3)]"
                    : "bg-[rgba(245,166,35,0.08)] hover:bg-[rgba(245,166,35,0.14)] text-[#f5a623] border border-[rgba(245,166,35,0.2)]"
                )}
              >
                {useInStory
                  ? <BookmarkCheck className="w-4 h-4" />
                  : <BookmarkPlus className="w-4 h-4" />}
                {useInStory ? "Added to Trip Story" : "Use in Trip Story"}
              </button>
              {!useInStory && (
                <p className="text-sm text-[rgba(232,237,248,0.3)] text-center mt-1.5 font-body">
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

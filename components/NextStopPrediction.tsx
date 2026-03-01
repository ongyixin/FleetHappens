"use client";

/**
 * NextStopPrediction
 *
 * Displays ranked next-stop predictions for the selected vehicle, powered by
 * multi-signal scoring + LLM re-ranking. Each prediction includes:
 *   - Confidence bar
 *   - LLM-generated reasoning sentence
 *   - Signal breakdown (frequency / temporal / recency / sequence)
 *   - Anomaly badge on rank-1 if a pattern break is detected
 *   - Pre-loaded area briefing for the top prediction
 *
 * Visual identity: instrument-panel / cockpit aesthetic — dark viridian on
 * charcoal, with a thin cyan horizon-line accent. Forward motion through
 * asymmetric layout and staggered reveal.
 */

import { useEffect, useState, useRef } from "react";
import {
  Navigation, Clock, MapPin, Zap, ChevronRight,
  Loader2, TriangleAlert, Brain, BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { NextStopPredictionResult, StopPrediction, LatLon } from "@/types";

// ─── Props ───────────────────────────────────────────────────────────────────

interface NextStopPredictionProps {
  deviceId: string;
  /** Most recent trip endpoint used as the "current position" origin. */
  currentPosition: LatLon;
  /** Called when user taps a prediction (opens stop context panel). */
  onStopSelect?: (coords: LatLon, locationName: string) => void;
  /** Called once the API result is loaded — lets parents capture it without re-fetching. */
  onResultLoaded?: (result: NextStopPredictionResult) => void;
  className?: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const CONFIDENCE_LABELS: [number, string][] = [
  [0.6,  "Very Likely"],
  [0.35, "Likely"],
  [0.15, "Possible"],
  [0,    "Low Signal"],
];

function confidenceLabel(c: number): string {
  for (const [threshold, label] of CONFIDENCE_LABELS) {
    if (c >= threshold) return label;
  }
  return "Low Signal";
}

function formatHour(h: number): string {
  const period  = h < 12 ? "AM" : "PM";
  const display = h % 12 === 0 ? 12 : h % 12;
  return `~${display}${period}`;
}

// ─── Confidence bar ───────────────────────────────────────────────────────────

function ConfidenceBar({ value, rank }: { value: number; rank: number }) {
  const [animated, setAnimated] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 80 + rank * 120);
    return () => clearTimeout(t);
  }, [rank]);

  const pct   = Math.round(value * 100);
  const color =
    rank === 1
      ? "bg-[#2dd4bf]"
      : rank === 2
      ? "bg-[rgba(45,212,191,0.55)]"
      : "bg-[rgba(45,212,191,0.3)]";

  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 h-1 bg-[rgba(255,255,255,0.06)] rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-700 ease-out", color)}
          style={{ width: animated ? `${pct}%` : "0%" }}
        />
      </div>
      <span className="text-[10px] font-data text-[rgba(232,237,248,0.45)] w-7 text-right shrink-0">
        {pct}%
      </span>
    </div>
  );
}

// ─── Signal breakdown bar ─────────────────────────────────────────────────────

interface SignalBarProps {
  signals: NonNullable<StopPrediction["signals"]>;
  rank: number;
}

function SignalBreakdown({ signals, rank }: SignalBarProps) {
  const [animated, setAnimated] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 200 + rank * 140);
    return () => clearTimeout(t);
  }, [rank]);

  const bars: Array<{ key: keyof typeof signals; label: string; color: string }> = [
    { key: "frequency", label: "Freq",  color: "rgba(45,212,191,0.8)" },
    { key: "temporal",  label: "Time",  color: "rgba(56,189,248,0.8)"  },
    { key: "recency",   label: "Recnt", color: "rgba(167,139,250,0.8)" },
    { key: "sequence",  label: "Seq",   color: "rgba(245,166,35,0.8)"  },
  ];

  return (
    <div className="mt-1.5">
      <div className="flex items-center gap-1 mb-1">
        <BarChart3 className="w-2.5 h-2.5 text-[rgba(45,212,191,0.4)]" />
        <span className="text-[9px] font-data uppercase tracking-[0.14em] text-[rgba(232,237,248,0.25)]">
          Signal breakdown
        </span>
      </div>
      <div className="space-y-0.5">
        {bars.map(({ key, label, color }) => {
          const pct = Math.round(signals[key] * 100);
          return (
            <div key={key} className="flex items-center gap-1.5">
              <span
                className="w-7 text-[8.5px] font-data shrink-0"
                style={{ color: "rgba(232,237,248,0.3)" }}
              >
                {label}
              </span>
              <div className="flex-1 h-[3px] bg-[rgba(255,255,255,0.05)] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-600 ease-out"
                  style={{
                    width: animated ? `${pct}%` : "0%",
                    background: color,
                    transitionDuration: "600ms",
                  }}
                />
              </div>
              <span
                className="w-6 text-[8.5px] font-data text-right shrink-0 tabular-nums"
                style={{ color: "rgba(232,237,248,0.28)" }}
              >
                {pct}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Anomaly badge ────────────────────────────────────────────────────────────

function AnomalyBadge({ text }: { text: string }) {
  return (
    <div
      className="mt-2 flex items-start gap-1.5 rounded-md px-2 py-1.5"
      style={{
        background: "rgba(251,146,60,0.08)",
        border: "1px solid rgba(251,146,60,0.22)",
      }}
    >
      <TriangleAlert className="w-3 h-3 text-[#fb923c] shrink-0 mt-0.5" />
      <p className="text-[10px] text-[rgba(251,146,60,0.85)] font-body leading-snug">
        {text}
      </p>
    </div>
  );
}

// ─── Prediction row ───────────────────────────────────────────────────────────

function PredictionRow({
  prediction,
  expanded,
  onClick,
  showPreloaded,
  fromLLM,
}: {
  prediction: StopPrediction;
  expanded: boolean;
  onClick: () => void;
  showPreloaded: boolean;
  fromLLM: boolean;
}) {
  const isTop      = prediction.rank === 1;
  const hasBriefing = !!prediction.preloadedBriefing?.areaBriefing;
  const hasSignals  = !!prediction.signals;
  const hasReasoning = !!prediction.reasoning;
  const hasAnomaly  = isTop && !!prediction.anomaly;

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left rounded-lg transition-all duration-200 group",
        isTop
          ? "bg-[rgba(45,212,191,0.06)] border border-[rgba(45,212,191,0.18)] hover:border-[rgba(45,212,191,0.32)] hover:bg-[rgba(45,212,191,0.09)]"
          : "border border-transparent hover:bg-[rgba(255,255,255,0.04)] hover:border-[rgba(255,255,255,0.07)]",
        expanded ? "p-3" : "px-3 py-2"
      )}
    >
      {/* Row header */}
      <div className="flex items-start gap-2.5">
        {/* Rank indicator */}
        <div
          className={cn(
            "shrink-0 w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-bold font-data mt-0.5",
            isTop
              ? "bg-[rgba(45,212,191,0.2)] text-[#2dd4bf]"
              : "bg-[rgba(255,255,255,0.06)] text-[rgba(232,237,248,0.35)]"
          )}
        >
          {prediction.rank}
        </div>

        <div className="flex-1 min-w-0">
          {/* Location name */}
          <div className="flex items-center gap-1.5 mb-1.5">
            <span
              className={cn(
                "text-[13px] font-semibold leading-tight truncate font-body",
                isTop ? "text-white" : "text-[rgba(232,237,248,0.75)]"
              )}
            >
              {prediction.locationName}
            </span>
            {isTop && hasBriefing && showPreloaded && (
              <span className="shrink-0 inline-flex items-center gap-1 text-[8px] font-bold font-data uppercase tracking-wider text-[#2dd4bf] bg-[rgba(45,212,191,0.12)] border border-[rgba(45,212,191,0.25)] rounded px-1.5 py-0.5">
                <Zap className="w-2 h-2" />
                Pre-loaded
              </span>
            )}
            {fromLLM && isTop && (
              <span className="shrink-0 inline-flex items-center gap-1 text-[8px] font-bold font-data uppercase tracking-wider text-[rgba(167,139,250,0.85)] bg-[rgba(167,139,250,0.1)] border border-[rgba(167,139,250,0.2)] rounded px-1.5 py-0.5">
                <Brain className="w-2 h-2" />
                AI
              </span>
            )}
          </div>

          {/* Confidence bar */}
          <ConfidenceBar value={prediction.confidence} rank={prediction.rank} />

          {/* Meta row */}
          <div className="flex items-center gap-3 mt-1.5">
            <span
              className={cn(
                "text-[10px] font-bold font-data",
                isTop ? "text-[#2dd4bf]" : "text-[rgba(232,237,248,0.4)]"
              )}
            >
              {confidenceLabel(prediction.confidence)}
            </span>
            {prediction.visitCount > 0 && (
              <span className="text-[10px] text-[rgba(232,237,248,0.3)] font-data">
                {prediction.visitCount}× trips
              </span>
            )}
            {prediction.typicalArrivalHour !== undefined && (
              <span className="flex items-center gap-1 text-[10px] text-[rgba(232,237,248,0.3)] font-data">
                <Clock className="w-2.5 h-2.5" />
                {formatHour(prediction.typicalArrivalHour)}
              </span>
            )}
            {prediction.avgDwellMinutes !== undefined && (
              <span className="text-[10px] text-[rgba(232,237,248,0.3)] font-data">
                {prediction.avgDwellMinutes}min dwell
              </span>
            )}
          </div>

          {/* LLM reasoning sentence */}
          {hasReasoning && (
            <p className="mt-1.5 text-[11px] text-[rgba(232,237,248,0.5)] font-body leading-snug italic">
              {prediction.reasoning}
            </p>
          )}

          {/* Anomaly badge */}
          {hasAnomaly && <AnomalyBadge text={prediction.anomaly!} />}

          {/* Signal breakdown — shown when expanded or for non-top rows inline */}
          {hasSignals && (expanded || !isTop) && (
            <SignalBreakdown signals={prediction.signals!} rank={prediction.rank} />
          )}
        </div>

        {/* Chevron */}
        {prediction.coordinates && (
          <ChevronRight
            className={cn(
              "shrink-0 w-3.5 h-3.5 mt-1 transition-colors",
              isTop
                ? "text-[rgba(45,212,191,0.5)] group-hover:text-[#2dd4bf]"
                : "text-[rgba(232,237,248,0.2)] group-hover:text-[rgba(232,237,248,0.5)]"
            )}
          />
        )}
      </div>

      {/* Expanded briefing (top prediction only, when briefing is pre-loaded) */}
      {isTop && expanded && hasBriefing && (
        <div className="mt-3 pt-3 border-t border-[rgba(45,212,191,0.12)]">
          <div className="flex items-center gap-1.5 mb-1.5">
            <MapPin className="w-3 h-3 text-[#2dd4bf]" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-[rgba(45,212,191,0.7)] font-body">
              Pre-loaded Briefing
            </span>
          </div>
          <p className="text-[12px] text-[rgba(232,237,248,0.65)] leading-relaxed font-body">
            {prediction.preloadedBriefing!.areaBriefing}
          </p>
          {prediction.preloadedBriefing?.nearbyAmenities &&
            prediction.preloadedBriefing.nearbyAmenities.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {prediction.preloadedBriefing.nearbyAmenities.slice(0, 3).map((a, i) => (
                  <span
                    key={i}
                    className="text-[10px] text-[rgba(232,237,248,0.45)] bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.07)] rounded px-2 py-0.5 font-body"
                  >
                    {a.name}
                  </span>
                ))}
              </div>
            )}
        </div>
      )}

      {/* Expanded signal breakdown for top prediction */}
      {isTop && expanded && hasSignals && (
        <div className="mt-3 pt-3 border-t border-[rgba(45,212,191,0.08)]">
          <SignalBreakdown signals={prediction.signals!} rank={1} />
        </div>
      )}
    </button>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function NextStopSkeleton() {
  return (
    <div className="space-y-2.5 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-2.5 px-1">
          <div className="w-5 h-5 rounded-md bg-[rgba(255,255,255,0.05)]" />
          <div className="flex-1 space-y-1.5">
            <div
              className="h-3 rounded bg-[rgba(255,255,255,0.06)]"
              style={{ width: `${70 - i * 12}%` }}
            />
            <div className="h-1 rounded-full bg-[rgba(45,212,191,0.07)]" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Scanning animation overlay ───────────────────────────────────────────────

function ScanLine() {
  return (
    <div className="absolute inset-x-0 top-0 h-full overflow-hidden pointer-events-none rounded-xl">
      <div
        className="absolute inset-x-0 h-12 opacity-[0.06]"
        style={{
          background: "linear-gradient(180deg, transparent 0%, #2dd4bf 50%, transparent 100%)",
          animation: "scan-down 2.4s ease-in-out infinite",
        }}
      />
      <style>{`
        @keyframes scan-down {
          0%   { top: -3rem; }
          100% { top: 100%; }
        }
      `}</style>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function NextStopPrediction({
  deviceId,
  currentPosition,
  onStopSelect,
  onResultLoaded,
  className,
}: NextStopPredictionProps) {
  const [result, setResult]       = useState<NextStopPredictionResult | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [expandedTop, setExpandedTop] = useState(true);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);
    setResult(null);

    fetch(
      `/api/predict/next-stop?deviceId=${encodeURIComponent(deviceId)}&lat=${currentPosition.lat}&lon=${currentPosition.lon}`,
      { signal: controller.signal }
    )
      .then((r) => r.json())
      .then((json) => {
        if (controller.signal.aborted) return;
        if (json.ok) {
          const r = json.data as NextStopPredictionResult;
          setResult(r);
          onResultLoaded?.(r);
        } else {
          setError(json.error ?? "Prediction unavailable");
        }
      })
      .catch((err) => {
        if (err instanceof Error && err.name === "AbortError") return;
        setError("Could not load prediction");
        // Load fallback from static file
        fetch("/fallback/ace-vehicle-next-stop.json")
          .then((r) => r.json())
          .then((data) => {
            const rows = (data.rows ?? []) as Array<Record<string, string | number>>;
            const totalVisits = rows.reduce((s: number, r) => s + (Number(r.visit_count) || 0), 0);
            const predictions = rows.slice(0, 5).map((row, i) => {
              const destLat = row.dest_lat !== undefined ? Number(row.dest_lat) : undefined;
              const destLon = row.dest_lon !== undefined ? Number(row.dest_lon) : undefined;
              return {
                rank: i + 1,
                locationName: String(row.destination_name ?? `Destination ${i + 1}`),
                confidence: totalVisits > 0 ? (Number(row.visit_count) || 0) / totalVisits : 0,
                visitCount: Number(row.visit_count) || 0,
                avgDwellMinutes:
                  row.avg_dwell_minutes !== undefined ? Number(row.avg_dwell_minutes) : undefined,
                typicalArrivalHour:
                  row.avg_arrival_hour !== undefined ? Number(row.avg_arrival_hour) : undefined,
                coordinates:
                  destLat !== undefined && destLon !== undefined
                    ? { lat: destLat, lon: destLon }
                    : undefined,
              };
            });
            const fallbackResult: NextStopPredictionResult = {
              deviceId,
              fromCoordinates: currentPosition,
              predictions,
              basedOnTrips: totalVisits,
              queriedAt: new Date().toISOString(),
              fromCache: true,
              fromLLM: false,
            };
            setResult(fallbackResult);
            onResultLoaded?.(fallbackResult);
            setError(null);
          })
          .catch(() => {});
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [deviceId, currentPosition.lat, currentPosition.lon]);

  const predictions = result?.predictions ?? [];
  const fromLLM     = result?.fromLLM ?? false;

  return (
    <div
      className={cn(
        "relative w-80 shrink-0 rounded-xl border overflow-hidden",
        "bg-[#0d1117] border-[rgba(45,212,191,0.15)]",
        className
      )}
    >
      {/* Ambient glow top-left */}
      <div className="absolute -top-8 -left-8 w-32 h-32 rounded-full bg-[#2dd4bf] opacity-[0.04] blur-2xl pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 px-3.5 pt-3 pb-2.5 border-b border-[rgba(45,212,191,0.1)]">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-[rgba(45,212,191,0.12)] flex items-center justify-center shrink-0">
            <Navigation className="w-3.5 h-3.5 text-[#2dd4bf]" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-xs font-bold font-display text-white">Next Stop</span>
            <span className="text-[10px] text-[rgba(45,212,191,0.65)] font-body ml-1.5">Prediction</span>
          </div>
          {loading && <Loader2 className="w-3 h-3 text-[rgba(45,212,191,0.5)] animate-spin shrink-0" />}
          {!loading && result && (
            <div className="flex items-center gap-1.5 shrink-0">
              {fromLLM && (
                <span className="text-[9px] font-bold font-data uppercase tracking-wider px-1.5 py-0.5 rounded border shrink-0 text-[rgba(167,139,250,0.9)] border-[rgba(167,139,250,0.25)] bg-[rgba(167,139,250,0.07)] flex items-center gap-1">
                  <Brain className="w-2 h-2" />
                  LLM
                </span>
              )}
              <span
                className={cn(
                  "text-[9px] font-bold font-data uppercase tracking-wider px-1.5 py-0.5 rounded border shrink-0",
                  result.fromCache
                    ? "text-[rgba(232,237,248,0.3)] border-[rgba(255,255,255,0.08)] bg-transparent"
                    : "text-[#2dd4bf] border-[rgba(45,212,191,0.25)] bg-[rgba(45,212,191,0.06)]"
                )}
              >
                {result.fromCache ? "Cached" : "Live"}
              </span>
            </div>
          )}
        </div>

        {/* Sub-label */}
        {result && (
          <p className="text-[10px] text-[rgba(232,237,248,0.3)] mt-1.5 font-body">
            Based on {result.basedOnTrips} historical trips from this origin
          </p>
        )}
        {loading && (
          <p className="text-[10px] text-[rgba(45,212,191,0.4)] mt-1.5 font-body flex items-center gap-1">
            <span>Querying Ace · scoring signals · reasoning…</span>
            <span className="inline-flex gap-0.5">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-0.5 h-0.5 rounded-full bg-[#2dd4bf] animate-bounce"
                  style={{ animationDelay: `${i * 150}ms` }}
                />
              ))}
            </span>
          </p>
        )}
      </div>

      {/* Scan animation while loading */}
      {loading && <ScanLine />}

      {/* Body */}
      <div className="relative z-10 p-3 space-y-1.5">
        {loading && <NextStopSkeleton />}

        {!loading && error && predictions.length === 0 && (
          <div className="flex items-center gap-2 px-1 py-2">
            <TriangleAlert className="w-3.5 h-3.5 text-[rgba(232,237,248,0.25)] shrink-0" />
            <p className="text-[11px] text-[rgba(232,237,248,0.35)] font-body">{error}</p>
          </div>
        )}

        {!loading &&
          predictions.map((p) => (
            <PredictionRow
              key={p.rank}
              prediction={p}
              expanded={p.rank === 1 && expandedTop}
              showPreloaded={!loading}
              fromLLM={fromLLM}
              onClick={() => {
                if (p.rank === 1) setExpandedTop((v) => !v);
                if (p.coordinates && onStopSelect) {
                  onStopSelect(p.coordinates, p.locationName);
                }
              }}
            />
          ))}
      </div>

      {/* Footer horizon line */}
      <div className="h-px bg-gradient-to-r from-transparent via-[rgba(45,212,191,0.25)] to-transparent" />
    </div>
  );
}

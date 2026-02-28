"use client";

import { useState, useEffect, useRef } from "react";
import {
  TrendingUp,
  ArrowRight,
  AlertTriangle,
  Zap,
  ChevronDown,
  Brain,
  Newspaper,
} from "lucide-react";
import type { CompanyPulseSummary, AceInsight } from "@/types";
import type { DigestResult, InsightType } from "@/app/api/digest/generate/route";

// ─── Icon + colour config per insight type ───────────────────────────────────

const INSIGHT_CONFIG: Record<
  InsightType,
  { icon: React.ElementType; color: string; bg: string }
> = {
  positive: {
    icon: TrendingUp,
    color: "#34d399",
    bg: "rgba(52,211,153,0.10)",
  },
  neutral: {
    icon: ArrowRight,
    color: "#38bdf8",
    bg: "rgba(56,189,248,0.10)",
  },
  alert: {
    icon: AlertTriangle,
    color: "#fb923c",
    bg: "rgba(251,146,60,0.10)",
  },
  record: {
    icon: Zap,
    color: "#f5a623",
    bg: "rgba(245,166,35,0.10)",
  },
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function DigestSkeleton() {
  return (
    <div className="px-5 pb-5 space-y-4">
      {/* Headline shimmer */}
      <div className="space-y-2 pt-1">
        <div className="h-5 w-4/5 rounded skeleton-shimmer" />
        <div className="h-5 w-3/5 rounded skeleton-shimmer" />
      </div>
      <div className="h-px bg-[rgba(255,255,255,0.05)]" />
      {/* Insight rows */}
      <div className="space-y-2.5">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="h-6 w-6 rounded-lg skeleton-shimmer shrink-0" />
            <div className="h-3.5 rounded skeleton-shimmer flex-1" />
          </div>
        ))}
      </div>
      <div className="h-px bg-[rgba(255,255,255,0.05)]" />
      {/* Stat callout */}
      <div className="rounded-lg h-16 skeleton-shimmer" />
    </div>
  );
}

// ─── Content ──────────────────────────────────────────────────────────────────

function DigestContent({ digest }: { digest: DigestResult }) {
  return (
    <div className="px-5 pb-5 space-y-4 animate-fade-up">
      {/* Headline */}
      <p className="font-display font-bold text-[1.1rem] leading-snug text-white pt-1">
        {digest.headline}
      </p>

      <div className="h-px bg-[rgba(255,255,255,0.06)]" />

      {/* Insight rows */}
      <div className="space-y-1.5 stagger">
        {digest.insights.map((insight, i) => {
          const cfg = INSIGHT_CONFIG[insight.type];
          const Icon = cfg.icon;
          return (
            <div
              key={i}
              className="flex items-start gap-3 animate-fade-up rounded-lg px-2.5 py-2"
              style={{ background: cfg.bg }}
            >
              <span
                className="mt-0.5 rounded p-1 shrink-0"
                style={{ background: `${cfg.color}18` }}
              >
                <Icon className="h-3 w-3" style={{ color: cfg.color }} />
              </span>
              <span className="text-[13px] font-body text-[rgba(232,237,248,0.82)] leading-snug">
                {insight.text}
              </span>
            </div>
          );
        })}
      </div>

      <div className="h-px bg-[rgba(255,255,255,0.06)]" />

      {/* Stat of the day */}
      <div
        className="rounded-lg p-3.5 flex items-center gap-4"
        style={{
          background: "rgba(245,166,35,0.05)",
          border: "1px solid rgba(245,166,35,0.18)",
        }}
      >
        <div className="shrink-0">
          <p className="text-[9px] font-data font-bold uppercase tracking-[0.18em] text-[rgba(245,166,35,0.55)] mb-0.5">
            Stat of the Day
          </p>
          <p className="text-[10px] font-data text-[rgba(232,237,248,0.4)] leading-tight">
            {digest.statOfDay.label}
          </p>
        </div>
        <div className="w-px self-stretch bg-[rgba(245,166,35,0.15)]" />
        <div className="flex-1 min-w-0">
          <p className="text-2xl font-display font-bold text-[#f5a623] tabular-nums leading-none">
            {digest.statOfDay.value}
          </p>
          {digest.statOfDay.context && (
            <p className="text-[11px] font-body text-[rgba(232,237,248,0.38)] mt-1 leading-snug">
              {digest.statOfDay.context}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  summary: CompanyPulseSummary | null;
  aceInsight: AceInsight | null;
}

export default function FleetDailyDigest({ summary, aceInsight }: Props) {
  const [digest, setDigest] = useState<DigestResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(true);
  const hasFetched = useRef(false);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  useEffect(() => {
    if (!summary || hasFetched.current) return;
    hasFetched.current = true;

    async function loadDigest() {
      setIsLoading(true);
      try {
        const res = await fetch("/api/digest/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            totals: summary!.totals,
            fleetNames: summary!.fleets.map((f) => f.group.name),
            aceRows: aceInsight?.rows ?? [],
          }),
        });
        const data = (await res.json()) as { ok: boolean; data?: DigestResult };
        if (data.ok && data.data) setDigest(data.data);
      } catch {
        // Silent fail — no digest is better than a broken UI
      } finally {
        setIsLoading(false);
      }
    }

    loadDigest();
  }, [summary]); // eslint-disable-line react-hooks/exhaustive-deps

  // Don't render until there's something to show
  if (!isLoading && !digest && !summary) return null;

  const showContent = isLoading || digest;

  return (
    <div
      className="atlas-card rounded-xl overflow-hidden animate-fade-up"
      style={{ borderLeft: "2px solid rgba(245,166,35,0.5)" }}
    >
      {/* ── Header bar ─────────────────────────────────────────────────────── */}
      <button
        onClick={() => setIsOpen((o) => !o)}
        className="w-full px-4 py-3 flex items-center gap-2.5 hover:bg-[rgba(255,255,255,0.02)] transition-colors"
      >
        {/* Blinking pulse dot */}
        <span className="relative flex h-2 w-2 shrink-0">
          {isLoading && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#f5a623] opacity-60" />
          )}
          <span
            className={`relative inline-flex rounded-full h-2 w-2 transition-colors ${
              isLoading ? "bg-[rgba(245,166,35,0.45)]" : "bg-[#f5a623]"
            }`}
          />
        </span>

        <Newspaper className="h-3 w-3 text-[#f5a623] shrink-0" />

        <span className="text-[10px] font-data font-bold uppercase tracking-[0.2em] text-[#f5a623]">
          Fleet Daily Brief
        </span>

        <span className="w-px h-3 bg-[rgba(255,255,255,0.1)] shrink-0" />

        <span className="text-[10px] font-data text-[rgba(232,237,248,0.32)]">
          {today}
        </span>

        {isLoading && (
          <>
            <span className="w-px h-3 bg-[rgba(255,255,255,0.1)] shrink-0" />
            <span className="text-[10px] font-body text-[rgba(232,237,248,0.28)] italic">
              Generating briefing…
            </span>
          </>
        )}

        {digest?.fromLLM && !isLoading && (
          <>
            <span className="w-px h-3 bg-[rgba(255,255,255,0.1)] shrink-0" />
            <span className="flex items-center gap-1 text-[10px] font-body text-[rgba(232,237,248,0.3)]">
              <Brain className="h-2.5 w-2.5 text-[#f5a623]" />
              AI
            </span>
          </>
        )}

        <ChevronDown
          className={`h-3.5 w-3.5 ml-auto text-[rgba(232,237,248,0.28)] transition-transform duration-200 ${
            isOpen ? "" : "-rotate-90"
          }`}
        />
      </button>

      {/* ── Collapsible content ─────────────────────────────────────────────── */}
      <div
        className="overflow-hidden transition-[max-height] duration-300 ease-in-out"
        style={{ maxHeight: isOpen ? "520px" : "0px" }}
      >
        {showContent ? (
          isLoading ? (
            <DigestSkeleton />
          ) : digest ? (
            <DigestContent digest={digest} />
          ) : null
        ) : null}
      </div>
    </div>
  );
}

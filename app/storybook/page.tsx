"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  ArrowLeft,
  Sparkles,
  MapPin,
  Search,
  X,
  ChevronRight,
  Loader2,
  Library,
} from "lucide-react";
import type { ComicTone } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface StorySummary {
  tripId: string;
  tone: string;
  title: string;
  panelCount: number;
  firstLocationName: string;
  lastLocationName: string;
  firstCaption: string;
  firstImageUrl?: string;
  createdAt: string;
}

interface LibraryData {
  stories: StorySummary[];
  total: number;
  bigqueryEnabled: boolean;
}

// ─── Tone config ──────────────────────────────────────────────────────────────

const TONE_CONFIG: Record<string, {
  label: string;
  color: string;
  bg: string;
  glow: string;
  badge: string;
  cardBg: string;
  cardGlow: string;
}> = {
  guidebook: {
    label: "Guidebook",
    color: "#38bdf8",
    bg: "rgba(56,189,248,0.08)",
    glow: "rgba(56,189,248,0.3)",
    badge: "bg-[rgba(56,189,248,0.12)] text-[#38bdf8] border border-[rgba(56,189,248,0.25)]",
    cardBg: "bg-[#040f18]",
    cardGlow: "radial-gradient(ellipse at 40% 30%, rgba(56,189,248,0.18) 0%, transparent 70%)",
  },
  playful: {
    label: "Playful",
    color: "#f5a623",
    bg: "rgba(245,166,35,0.08)",
    glow: "rgba(245,166,35,0.3)",
    badge: "bg-[rgba(245,166,35,0.12)] text-[#f5a623] border border-[rgba(245,166,35,0.25)]",
    cardBg: "bg-[#100900]",
    cardGlow: "radial-gradient(ellipse at 40% 30%, rgba(245,166,35,0.2) 0%, transparent 70%)",
  },
  cinematic: {
    label: "Cinematic",
    color: "#a78bfa",
    bg: "rgba(167,139,250,0.08)",
    glow: "rgba(167,139,250,0.3)",
    badge: "bg-[rgba(167,139,250,0.12)] text-[#a78bfa] border border-[rgba(167,139,250,0.25)]",
    cardBg: "bg-[#09060f]",
    cardGlow: "radial-gradient(ellipse at 40% 30%, rgba(167,139,250,0.18) 0%, transparent 70%)",
  },
};

const TONE_FILTERS: Array<{ value: ComicTone | "all"; label: string }> = [
  { value: "all",        label: "All Stories" },
  { value: "guidebook",  label: "Guidebook" },
  { value: "playful",    label: "Playful" },
  { value: "cinematic",  label: "Cinematic" },
];

const PAGE_SIZE = 24;

// ─── Skeleton card ────────────────────────────────────────────────────────────

function StoryCardSkeleton({ index }: { index: number }) {
  return (
    <div
      className="flex flex-col rounded-2xl overflow-hidden bg-[#101318] border border-[rgba(255,255,255,0.07)] animate-fade-up"
      style={{ animationDelay: `${index * 45}ms` }}
    >
      <div className="aspect-[4/3] skeleton-shimmer" />
      <div className="p-4 space-y-3">
        <div className="h-4 w-4/5 rounded skeleton-shimmer" />
        <div className="h-3 w-2/3 rounded skeleton-shimmer" />
        <div className="h-3 w-full rounded skeleton-shimmer" />
        <div className="h-3 w-3/4 rounded skeleton-shimmer" />
        <div className="h-px w-full skeleton-shimmer mt-2" />
        <div className="flex justify-between">
          <div className="h-2.5 w-20 rounded skeleton-shimmer" />
          <div className="h-2.5 w-14 rounded skeleton-shimmer" />
        </div>
      </div>
    </div>
  );
}

// ─── Story card ───────────────────────────────────────────────────────────────

function StoryCard({ story, index }: { story: StorySummary; index: number }) {
  const router  = useRouter();
  const cfg     = TONE_CONFIG[story.tone] ?? TONE_CONFIG.playful;
  const dateStr = useMemo(() => {
    try {
      return new Date(story.createdAt).toLocaleDateString("en-US", {
        month: "short", day: "numeric", year: "numeric",
      });
    } catch { return ""; }
  }, [story.createdAt]);

  return (
    <button
      onClick={() => router.push(`/story/${story.tripId}`)}
      className="group relative flex flex-col rounded-2xl overflow-hidden border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.18)] transition-all duration-300 animate-fade-up text-left cursor-pointer"
      style={{ animationDelay: `${Math.min(index * 40, 400)}ms` }}
    >
      {/* ── Visual cover ── */}
      <div className="relative aspect-[4/3] overflow-hidden">
        {story.firstImageUrl ? (
          <>
            <img
              src={story.firstImageUrl}
              alt={story.title}
              className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-700 ease-out"
            />
            {/* Gradient overlay so text is always readable */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#09090e] via-[rgba(9,9,14,0.3)] to-transparent" />
          </>
        ) : (
          <div className={`relative w-full h-full ${cfg.cardBg}`}>
            {/* Grid texture */}
            <div className="absolute inset-0 atlas-grid-bg opacity-30" />
            {/* Tone glow */}
            <div className="absolute inset-0" style={{ background: cfg.cardGlow }} />
            {/* Faded location ghost text */}
            <div className="absolute inset-0 flex items-center justify-center overflow-hidden select-none pointer-events-none">
              <span
                className="font-display font-extrabold leading-none text-center px-4 tracking-[-0.04em]"
                style={{
                  fontSize: "clamp(48px, 9vw, 80px)",
                  color: "rgba(255,255,255,0.04)",
                  lineHeight: 1,
                }}
              >
                {story.firstLocationName}
              </span>
            </div>
            {/* Bottom gradient to card bg */}
            <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#09090e] to-transparent" />
          </div>
        )}

        {/* Top-left tone badge */}
        <div className="absolute top-3 left-3 z-10">
          <span className={`text-[9px] font-bold uppercase tracking-[0.18em] px-2.5 py-1 rounded-full font-body ${cfg.badge}`}>
            {cfg.label}
          </span>
        </div>

        {/* Top-right issue number */}
        <div className="absolute top-3 right-3 z-10">
          <span className="text-[9px] font-data text-[rgba(255,255,255,0.25)]">
            #{String(index + 1).padStart(3, "0")}
          </span>
        </div>

        {/* Hover CTA overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
          <div
            className="flex items-center gap-1.5 px-4 py-2 rounded-full text-[11px] font-display font-bold text-white border border-[rgba(255,255,255,0.2)] backdrop-blur-md"
            style={{ background: "rgba(9,9,14,0.6)" }}
          >
            <BookOpen className="h-3.5 w-3.5" />
            Read Story
            <ChevronRight className="h-3 w-3" />
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div
        className="p-4 flex flex-col flex-1 bg-[#0d0f14]"
        style={{
          borderTop: `1px solid ${cfg.color}22`,
        }}
      >
        {/* Title */}
        <h3 className="font-display font-bold text-white text-[15px] leading-snug mb-2.5 line-clamp-2 group-hover:text-[var(--card-color)] transition-colors" style={{ "--card-color": cfg.color } as React.CSSProperties}>
          {story.title}
        </h3>

        {/* Route */}
        <div className="flex items-center gap-1.5 text-[11px] text-[rgba(232,237,248,0.38)] font-body mb-3 min-w-0">
          <MapPin className="h-2.5 w-2.5 shrink-0" style={{ color: cfg.color, opacity: 0.7 }} />
          <span className="truncate">{story.firstLocationName}</span>
          <span className="shrink-0 text-[rgba(255,255,255,0.18)]">→</span>
          <span className="truncate">{story.lastLocationName}</span>
        </div>

        {/* Caption excerpt */}
        {story.firstCaption && (
          <p className="text-[11px] italic text-[rgba(232,237,248,0.32)] font-body leading-relaxed line-clamp-2 flex-1 mb-3">
            &ldquo;{story.firstCaption}&rdquo;
          </p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2.5 border-t border-[rgba(255,255,255,0.06)] mt-auto">
          <span className="text-[10px] font-data text-[rgba(232,237,248,0.28)]">
            {dateStr}
          </span>
          <span className="text-[10px] font-body text-[rgba(232,237,248,0.28)]">
            {story.panelCount} panels
          </span>
        </div>
      </div>
    </button>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ bigqueryEnabled }: { bigqueryEnabled: boolean }) {
  const router = useRouter();
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-24 text-center">
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-3xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] flex items-center justify-center">
          <Library className="h-9 w-9 text-[rgba(232,237,248,0.15)]" />
        </div>
        <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[rgba(245,166,35,0.12)] border border-[rgba(245,166,35,0.2)] flex items-center justify-center">
          <Sparkles className="h-2.5 w-2.5 text-[#f5a623]" />
        </div>
      </div>

      <h3 className="font-display font-bold text-xl text-white mb-2">
        {bigqueryEnabled ? "The storybook is empty" : "Storybook not yet connected"}
      </h3>

      {bigqueryEnabled ? (
        <p className="text-sm text-[rgba(232,237,248,0.42)] max-w-sm leading-relaxed font-body mb-6">
          Stories appear here once generated. Select a trip from the Dashboard
          and hit <span className="text-[#f5a623] font-semibold">Create Trip Story</span> to begin.
        </p>
      ) : (
        <p className="text-sm text-[rgba(232,237,248,0.42)] max-w-sm leading-relaxed font-body mb-6">
          Stories are cached in BigQuery. Configure{" "}
          <span className="font-mono text-[rgba(232,237,248,0.6)] text-[12px]">GOOGLE_CLOUD_PROJECT</span>{" "}
          in your <span className="font-mono text-[rgba(232,237,248,0.6)] text-[12px]">.env.local</span> to
          enable persistent story archiving.
        </p>
      )}

      <button
        onClick={() => router.push("/")}
        className="inline-flex items-center gap-2 h-10 px-5 rounded-xl text-sm btn-amber font-body"
      >
        <Sparkles className="h-3.5 w-3.5" />
        Generate your first story
      </button>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function StorybookPage() {
  const router = useRouter();

  const [stories,          setStories]          = useState<StorySummary[]>([]);
  const [total,            setTotal]            = useState(0);
  const [bigqueryEnabled,  setBigqueryEnabled]  = useState(true);
  const [loading,          setLoading]          = useState(true);
  const [loadingMore,      setLoadingMore]      = useState(false);
  const [error,            setError]            = useState<string | null>(null);
  const [toneFilter,       setToneFilter]       = useState<ComicTone | "all">("all");
  const [searchQuery,      setSearchQuery]      = useState("");
  const [offset,           setOffset]           = useState(0);

  const fetchStories = useCallback(async (tone: ComicTone | "all", off: number, append: boolean) => {
    if (append) setLoadingMore(true);
    else        setLoading(true);

    try {
      const params = new URLSearchParams({
        limit:  String(PAGE_SIZE),
        offset: String(off),
      });
      if (tone !== "all") params.set("tone", tone);

      const res  = await fetch(`/api/story/library?${params.toString()}`);
      if (!res.ok) throw new Error("API error");
      const json = await res.json();

      if (!json.ok) throw new Error(json.error ?? "Library fetch failed");

      const { stories: fetched, total: t, bigqueryEnabled: bq } = json.data as LibraryData;
      setBigqueryEnabled(bq);
      setTotal(t);
      setStories((prev) => append ? [...prev, ...fetched] : fetched);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load stories");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    setOffset(0);
    fetchStories(toneFilter, 0, false);
  }, [toneFilter, fetchStories]);

  function handleLoadMore() {
    const nextOffset = offset + PAGE_SIZE;
    setOffset(nextOffset);
    fetchStories(toneFilter, nextOffset, true);
  }

  // Client-side search filter
  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return stories;
    const q = searchQuery.toLowerCase();
    return stories.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.firstLocationName.toLowerCase().includes(q) ||
        s.lastLocationName.toLowerCase().includes(q) ||
        s.firstCaption.toLowerCase().includes(q)
    );
  }, [stories, searchQuery]);

  const hasMore = stories.length < total;

  return (
    <div className="min-h-screen bg-[#09090e] overflow-x-hidden">
      {/* ── Atmospheric background ── */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0 atlas-grid-bg opacity-40" />
        <div className="absolute top-0 left-1/3 w-[800px] h-[500px] bg-[radial-gradient(ellipse_at_top,rgba(245,166,35,0.05)_0%,transparent_60%)]" />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[400px] bg-[radial-gradient(ellipse_at_bottom,rgba(167,139,250,0.04)_0%,transparent_60%)]" />
      </div>

      {/* ── Sticky header ── */}
      <header className="sticky top-0 z-20 border-b border-[rgba(255,255,255,0.07)] bg-[rgba(9,9,14,0.88)] backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center gap-3">
          {/* Brand */}
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-2 group shrink-0"
          >
            <div className="w-7 h-7 rounded-lg bg-[#f5a623] flex items-center justify-center shadow-[0_2px_8px_rgba(245,166,35,0.3)] group-hover:shadow-[0_2px_12px_rgba(245,166,35,0.5)] transition-shadow">
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                <path d="M2 7 C2 4 4 2 7 2 S12 4 12 7 L7 12 L2 7Z" fill="#09090e" />
              </svg>
            </div>
            <span className="font-display font-bold text-[rgba(232,237,248,0.6)] text-sm hidden sm:block group-hover:text-white transition-colors">
              FleetHappens
            </span>
          </button>

          <span className="text-[rgba(255,255,255,0.15)] text-sm">/</span>

          <div className="flex items-center gap-2 text-sm text-white">
            <Library className="h-3.5 w-3.5 text-[#f5a623]" />
            <span className="font-display font-bold">Storybook</span>
          </div>

          <div className="ml-auto flex items-center gap-3">
            {!loading && total > 0 && (
              <span className="hidden sm:block text-[11px] font-body text-[rgba(232,237,248,0.35)]">
                {total} {total === 1 ? "story" : "stories"} archived
              </span>
            )}
            <button
              onClick={() => router.push("/")}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[11px] text-[rgba(232,237,248,0.45)] hover:text-white hover:bg-[rgba(255,255,255,0.07)] border border-transparent hover:border-[rgba(255,255,255,0.09)] transition-all font-body"
            >
              <ArrowLeft className="h-3 w-3" />
              Back
            </button>
          </div>
        </div>
      </header>

      {/* ── Page content ── */}
      <div className="relative z-10 max-w-7xl mx-auto px-6">

        {/* ── Hero ── */}
        <div className="pt-14 pb-10">
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2 mb-6 animate-fade-in">
            <div className="w-1.5 h-1.5 rounded-full bg-[#f5a623] animate-glow-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[rgba(232,237,248,0.4)] font-body">
              Fleet Archive
            </span>
          </div>

          {/* Headline */}
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-2">
            <h1
              className="font-display font-extrabold text-white tracking-[-0.03em] leading-[0.94] animate-fade-up"
              style={{ fontSize: "clamp(2.8rem, 7vw, 5.5rem)" }}
            >
              <span className="block">The Fleet</span>
              <span className="block text-[#f5a623]">Storybook.</span>
            </h1>

            {!loading && total > 0 && (
              <p
                className="font-display font-bold text-[rgba(232,237,248,0.25)] shrink-0 animate-fade-up mb-1"
                style={{ fontSize: "clamp(1rem, 2.5vw, 1.5rem)", animationDelay: "80ms" }}
              >
                {total} {total === 1 ? "story" : "stories"}
                <br className="hidden sm:block" />
                <span className="sm:hidden"> </span>
                in the archive
              </p>
            )}
          </div>

          <p
            className="text-[rgba(232,237,248,0.48)] font-body leading-relaxed max-w-lg animate-fade-up"
            style={{ animationDelay: "100ms", fontSize: "clamp(0.875rem, 1.5vw, 1rem)" }}
          >
            Every route your fleet drove, narrated. Browse, filter, and revisit
            the comic stories generated from real Geotab trip data.
          </p>
        </div>

        {/* ── Controls bar ── */}
        <div
          className="flex flex-col sm:flex-row sm:items-center gap-3 mb-8 animate-fade-up"
          style={{ animationDelay: "140ms" }}
        >
          {/* Tone filter pills */}
          <div className="flex items-center gap-2 flex-wrap">
            {TONE_FILTERS.map(({ value, label }) => {
              const isActive = toneFilter === value;
              const cfg = value !== "all" ? TONE_CONFIG[value] : null;
              return (
                <button
                  key={value}
                  onClick={() => setToneFilter(value)}
                  className={`h-8 px-3.5 rounded-full text-[11px] font-semibold font-body border transition-all ${
                    isActive
                      ? "bg-[rgba(255,255,255,0.1)] border-[rgba(255,255,255,0.18)] text-white"
                      : "border-[rgba(255,255,255,0.08)] text-[rgba(232,237,248,0.45)] hover:border-[rgba(255,255,255,0.14)] hover:text-[rgba(232,237,248,0.7)] bg-transparent"
                  }`}
                  style={isActive && cfg ? { borderColor: `${cfg.color}40`, color: cfg.color, background: `${cfg.color}12` } : {}}
                >
                  {label}
                  {value !== "all" && cfg && (
                    <span
                      className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full"
                      style={{ background: cfg.color, opacity: isActive ? 1 : 0.4 }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Search */}
          <div className="relative sm:ml-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[rgba(232,237,248,0.3)] pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search stories…"
              className="h-8 pl-9 pr-9 rounded-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.09)] text-[12px] text-[rgba(232,237,248,0.8)] placeholder:text-[rgba(232,237,248,0.3)] font-body focus:outline-none focus:border-[rgba(255,255,255,0.18)] focus:bg-[rgba(255,255,255,0.07)] transition-all w-52"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[rgba(232,237,248,0.3)] hover:text-[rgba(232,237,248,0.7)] transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        {/* ── Story grid ── */}
        {error ? (
          <div className="py-16 flex flex-col items-center gap-3 text-center">
            <div className="rounded-2xl bg-[rgba(248,113,113,0.08)] border border-[rgba(248,113,113,0.2)] p-6">
              <BookOpen className="h-7 w-7 text-[#f87171] mx-auto" />
            </div>
            <p className="text-sm font-semibold text-[#f87171] font-body">{error}</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 pb-6">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <StoryCardSkeleton key={i} index={i} />
                ))
              ) : filtered.length === 0 ? (
                <EmptyState bigqueryEnabled={bigqueryEnabled} />
              ) : (
                filtered.map((story, i) => (
                  <StoryCard key={`${story.tripId}-${story.tone}-${i}`} story={story} index={i} />
                ))
              )}
            </div>

            {/* ── Search no-results ── */}
            {!loading && searchQuery && filtered.length === 0 && stories.length > 0 && (
              <div className="py-12 flex flex-col items-center gap-2 text-center">
                <p className="text-sm font-semibold text-[rgba(232,237,248,0.5)] font-body">
                  No stories match &ldquo;{searchQuery}&rdquo;
                </p>
                <button
                  onClick={() => setSearchQuery("")}
                  className="text-xs text-[#f5a623] hover:underline font-body"
                >
                  Clear search
                </button>
              </div>
            )}

            {/* ── Load more ── */}
            {!loading && hasMore && !searchQuery && (
              <div className="flex justify-center pb-16">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="inline-flex items-center gap-2 h-10 px-6 rounded-xl text-sm font-body font-semibold text-[rgba(232,237,248,0.6)] hover:text-white bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.09)] hover:border-[rgba(255,255,255,0.16)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loadingMore ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Loading…
                    </>
                  ) : (
                    <>
                      Load more
                      <span className="text-[11px] text-[rgba(232,237,248,0.35)]">
                        ({total - stories.length} remaining)
                      </span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* ── Footer padding ── */}
            {!loading && !hasMore && filtered.length > 0 && (
              <div className="flex flex-col items-center gap-2 pb-16 pt-4">
                <div className="h-px w-32 bg-gradient-to-r from-transparent via-[rgba(255,255,255,0.1)] to-transparent" />
                <p className="text-[10px] font-body text-[rgba(232,237,248,0.2)] uppercase tracking-[0.15em]">
                  End of archive
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

"use client";

/**
 * CommandPalette — FleetHappens AI assistant command palette.
 *
 * Architecture:
 *   - ONE global palette instance lives in app/layout.tsx
 *   - Global Cmd+K listener and a custom "openCommandPalette" event both open it
 *   - CommandPaletteTrigger renders a lightweight pill button that fires the event
 *   - This avoids duplicate dialog instances across pages
 *
 * Design system: Obsidian Atlas — dark cartographic theme, amber accents.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import {
  Search,
  ArrowRight,
  Navigation,
  Zap,
  Loader2,
  Command,
  X,
  TrendingUp,
  Truck,
  MapPin,
  BookOpen,
  ChevronRight,
  Sparkles,
  AlertCircle,
  Bot,
} from "lucide-react";
import type {
  AssistantResponse,
  AssistantContext,
  ApiResponse,
} from "@/types";
import { getContextualSuggestions } from "@/lib/assistant/suggestions";

// ─── Custom event name ────────────────────────────────────────────────────────

export const OPEN_PALETTE_EVENT = "openCommandPalette";

// ─── Context builder ──────────────────────────────────────────────────────────

function useAssistantContext(): AssistantContext {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (pathname === "/pulse") {
    return { currentPage: "pulse" };
  }
  if (pathname?.startsWith("/pulse/")) {
    const groupId = pathname.split("/pulse/")[1]?.split("?")[0];
    return {
      currentPage: "fleet-detail",
      currentFleetId: groupId,
      currentFleetName: searchParams?.get("groupName") ?? undefined,
    };
  }
  if (pathname === "/dashboard") {
    return {
      currentPage: "dashboard",
      currentDeviceId: searchParams?.get("deviceId") ?? undefined,
      currentDeviceName: searchParams?.get("deviceName") ?? undefined,
      currentFleetId: searchParams?.get("groupId") ?? undefined,
    };
  }
  if (pathname?.startsWith("/story/")) {
    const tripId = pathname.split("/story/")[1]?.split("?")[0];
    return {
      currentPage: "story",
      currentTripId: tripId,
      currentDeviceId: searchParams?.get("deviceId") ?? undefined,
      currentDeviceName: searchParams?.get("deviceName") ?? undefined,
    };
  }
  if (pathname === "/features") {
    return { currentPage: "features" };
  }
  return { currentPage: "home" };
}

// ─── Markdown-bold renderer (simple **text** → <strong>) ─────────────────────

function renderMarkdown(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i} className="text-[var(--text-primary)] font-semibold">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

// ─── Suggestion chip icons ────────────────────────────────────────────────────

function SuggestionIcon({ text }: { text: string }) {
  const lower = text.toLowerCase();
  if (lower.includes("fleet") || lower.includes("pulse") || lower.includes("overview")) {
    return <TrendingUp className="w-3 h-3" />;
  }
  if (lower.includes("vehicle") || lower.includes("truck") || lower.includes("dashboard")) {
    return <Truck className="w-3 h-3" />;
  }
  if (lower.includes("story") || lower.includes("comic") || lower.includes("recap")) {
    return <BookOpen className="w-3 h-3" />;
  }
  if (lower.includes("map") || lower.includes("stop") || lower.includes("location")) {
    return <MapPin className="w-3 h-3" />;
  }
  if (lower.includes("active") || lower.includes("idle") || lower.includes("distance")) {
    return <Zap className="w-3 h-3" />;
  }
  return <Sparkles className="w-3 h-3" />;
}

// ─── Result card ──────────────────────────────────────────────────────────────

interface ResultCardProps {
  response: AssistantResponse;
  isSelected: boolean;
  onAction: (url: string) => void;
  onSuggestion: (text: string) => void;
}

function ResultCard({ response, isSelected, onAction, onSuggestion }: ResultCardProps) {
  return (
    <div className="animate-fade-up">
      {/* Answer text */}
      <div
        className={`
          rounded-xl border px-4 py-3.5 transition-all duration-150
          ${isSelected && response.action
            ? "border-[rgba(245,166,35,0.4)] bg-[var(--surface-3)]"
            : "border-[var(--border-default)] bg-[var(--surface-2)]"
          }
        `}
      >
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="mt-0.5 flex-shrink-0 w-7 h-7 rounded-lg bg-[rgba(245,166,35,0.12)] border border-[rgba(245,166,35,0.2)] flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-[var(--amber)]" />
          </div>

          <div className="flex-1 min-w-0">
            {/* Data snippet */}
            {response.data && (
              <div className="mb-2 flex items-baseline gap-2">
                <span className="font-data text-2xl font-semibold text-[var(--amber)] leading-none">
                  {response.data.value}
                  {response.data.unit && (
                    <span className="text-sm font-normal ml-1 text-[var(--text-muted)]">
                      {response.data.unit}
                    </span>
                  )}
                </span>
                {response.data.context && (
                  <span className="text-xs text-[var(--text-muted)] font-data">
                    {response.data.context}
                  </span>
                )}
              </div>
            )}

            {/* Answer text */}
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed font-body">
              {renderMarkdown(response.text)}
            </p>

            {/* Fallback indicator */}
            {response.fromFallback && (
              <p className="mt-1.5 text-[10px] text-[var(--text-faint)] font-data uppercase tracking-wide">
                keyword match
              </p>
            )}
          </div>
        </div>

        {/* Action button */}
        {response.action && (
          <button
            onClick={() => onAction(response.action!.url)}
            className={`
              mt-3 w-full flex items-center justify-between gap-2 px-3 py-2.5
              rounded-lg border text-sm font-semibold font-display
              transition-all duration-150 group
              ${isSelected
                ? "bg-[var(--amber)] text-[#09090e] border-[var(--amber)] shadow-[0_4px_16px_rgba(245,166,35,0.35)]"
                : "bg-[rgba(245,166,35,0.08)] text-[var(--amber)] border-[rgba(245,166,35,0.2)] hover:bg-[rgba(245,166,35,0.15)] hover:border-[rgba(245,166,35,0.35)]"
              }
            `}
          >
            <span className="flex items-center gap-2">
              <Navigation className="w-3.5 h-3.5 flex-shrink-0" />
              {response.action.label}
            </span>
            <ArrowRight className={`w-3.5 h-3.5 transition-transform duration-150 ${isSelected ? "translate-x-0.5" : "group-hover:translate-x-0.5"}`} />
          </button>
        )}
      </div>

      {/* Follow-up suggestions */}
      {response.suggestions && response.suggestions.length > 0 && (
        <div className="mt-3">
          <p className="text-[10px] uppercase tracking-widest text-[var(--text-faint)] font-data mb-2 px-0.5">
            Try also
          </p>
          <div className="flex flex-wrap gap-1.5">
            {response.suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => onSuggestion(s)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs text-[var(--text-secondary)] bg-[var(--surface-2)] border border-[var(--border-default)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-3)] transition-all duration-100 font-body"
              >
                <SuggestionIcon text={s} />
                {s}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="space-y-2 animate-fade-in">
      <div className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-2)] px-4 py-3.5">
        <div className="flex items-start gap-3">
          <div className="skeleton-shimmer mt-0.5 w-7 h-7 rounded-lg" />
          <div className="flex-1 space-y-2">
            <div className="skeleton-shimmer h-4 w-2/3 rounded" />
            <div className="skeleton-shimmer h-3 w-full rounded" />
            <div className="skeleton-shimmer h-3 w-4/5 rounded" />
          </div>
        </div>
        <div className="skeleton-shimmer mt-3 h-9 w-full rounded-lg" />
      </div>
    </div>
  );
}

// ─── Error state ──────────────────────────────────────────────────────────────

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-[rgba(248,113,113,0.3)] bg-[rgba(248,113,113,0.05)] px-4 py-3 animate-fade-in">
      <AlertCircle className="w-4 h-4 text-[var(--red)] flex-shrink-0 mt-0.5" />
      <p className="text-sm text-[var(--text-secondary)] font-body">{message}</p>
    </div>
  );
}

// ─── Empty state / suggestion chips ──────────────────────────────────────────

interface EmptyStateProps {
  suggestions: string[];
  onSuggestion: (text: string) => void;
}

function EmptyState({ suggestions, onSuggestion }: EmptyStateProps) {
  return (
    <div className="animate-fade-up space-y-3">
      <p className="text-[10px] uppercase tracking-widest text-[var(--text-faint)] font-data px-0.5">
        Suggestions
      </p>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((s, i) => (
          <button
            key={i}
            onClick={() => onSuggestion(s)}
            style={{ animationDelay: `${i * 40}ms` }}
            className="animate-fade-up flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-body text-[var(--text-secondary)] bg-[var(--surface-2)] border border-[var(--border-default)] hover:border-[rgba(245,166,35,0.35)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-3)] hover:shadow-[0_0_12px_rgba(245,166,35,0.08)] transition-all duration-150 group"
          >
            <span className="w-5 h-5 rounded-md bg-[rgba(245,166,35,0.1)] flex items-center justify-center text-[var(--amber)] flex-shrink-0 group-hover:bg-[rgba(245,166,35,0.18)] transition-colors duration-150">
              <SuggestionIcon text={s} />
            </span>
            {s}
            <ChevronRight className="w-3 h-3 ml-auto text-[var(--text-faint)] group-hover:text-[var(--amber)] group-hover:translate-x-0.5 transition-all duration-150" />
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Global CommandPalette (used in layout) ───────────────────────────────────
// Renders no visible trigger. Opens via Cmd+K or OPEN_PALETTE_EVENT.

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<AssistantResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSelected] = useState(true);

  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();
  const context = useAssistantContext();
  const suggestions = getContextualSuggestions(context);

  // ── Global Cmd+K + custom event listener ──────────────────────────────────
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
      }
    }
    function handleEvent() {
      setOpen(true);
    }
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener(OPEN_PALETTE_EVENT, handleEvent);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener(OPEN_PALETTE_EVENT, handleEvent);
    };
  }, []);

  // ── Focus input on open ────────────────────────────────────────────────────
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    } else {
      setQuery("");
      setResponse(null);
      setError(null);
      setIsLoading(false);
    }
  }, [open]);

  // ── Query execution ────────────────────────────────────────────────────────
  const executeQuery = useCallback(
    async (q: string) => {
      if (!q.trim()) {
        setResponse(null);
        setError(null);
        return;
      }

      setIsLoading(true);
      setError(null);
      setResponse(null);

      try {
        const res = await fetch("/api/assistant/query", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: q.trim(), context }),
        });

        const json: ApiResponse<AssistantResponse> = await res.json();

        if (json.ok) {
          setResponse(json.data);
        } else {
          setError(json.error ?? "Something went wrong. Please try again.");
        }
      } catch {
        setError("Couldn't connect to the assistant. Check your connection.");
      } finally {
        setIsLoading(false);
      }
    },
    [context]
  );

  // ── Debounced query ────────────────────────────────────────────────────────
  const handleInputChange = useCallback(
    (value: string) => {
      setQuery(value);

      if (debounceRef.current) clearTimeout(debounceRef.current);

      if (!value.trim()) {
        setResponse(null);
        setError(null);
        setIsLoading(false);
        return;
      }

      debounceRef.current = setTimeout(() => {
        executeQuery(value);
      }, 400);
    },
    [executeQuery]
  );

  // ── Keyboard navigation ────────────────────────────────────────────────────
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && response?.action) {
        e.preventDefault();
        handleNavigate(response.action.url);
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [response]
  );

  const handleNavigate = useCallback(
    (url: string) => {
      setOpen(false);
      router.push(url);
    },
    [router]
  );

  const handleSuggestion = useCallback(
    (text: string) => {
      setQuery(text);
      executeQuery(text);
    },
    [executeQuery]
  );

  const showEmpty = !query && !isLoading && !response && !error;

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        {/* Backdrop */}
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-fade-in" />

        {/* Palette panel */}
        <Dialog.Content
          className="fixed z-50 left-1/2 -translate-x-1/2 w-[92vw] max-w-[560px] top-[12vh] sm:top-[15vh] outline-none"
          onOpenAutoFocus={(e) => e.preventDefault()}
          aria-label="Fleet assistant command palette"
        >
          <div className="atlas-card-raised atlas-amber-border rounded-2xl overflow-hidden shadow-[0_24px_80px_rgba(0,0,0,0.7),0_0_0_1px_rgba(245,166,35,0.12)] animate-slide-in-bottom">

            {/* Header bar */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[var(--border-subtle)]">
              <div className="flex-shrink-0">
                {isLoading ? (
                  <Loader2 className="w-4 h-4 text-[var(--amber)] animate-spin" />
                ) : (
                  <Search className="w-4 h-4 text-[var(--text-muted)]" />
                )}
              </div>

              <input
                ref={inputRef}
                value={query}
                onChange={(e) => handleInputChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about your fleet..."
                className="flex-1 bg-transparent outline-none border-none text-[var(--text-primary)] placeholder:text-[var(--text-faint)] text-sm font-body"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
              />

              <div className="flex items-center gap-2 flex-shrink-0">
                {query && (
                  <button
                    onClick={() => handleInputChange("")}
                    className="w-5 h-5 rounded-full bg-[var(--surface-3)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                    aria-label="Clear query"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-1 text-[10px] font-data text-[var(--text-faint)] hover:text-[var(--text-muted)] transition-colors"
                  aria-label="Close"
                >
                  <kbd className="px-1 py-0.5 rounded bg-[var(--surface-3)] border border-[var(--border-subtle)] text-[var(--text-faint)] font-data leading-tight">
                    esc
                  </kbd>
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="px-4 py-3 max-h-[60vh] overflow-y-auto space-y-2">
              {showEmpty && (
                <EmptyState suggestions={suggestions} onSuggestion={handleSuggestion} />
              )}
              {isLoading && <LoadingSkeleton />}
              {!isLoading && response && (
                <ResultCard
                  response={response}
                  isSelected={isSelected}
                  onAction={handleNavigate}
                  onSuggestion={handleSuggestion}
                />
              )}
              {!isLoading && error && <ErrorState message={error} />}
            </div>

            {/* Footer hint */}
            <div className="px-4 py-2.5 border-t border-[var(--border-subtle)] flex items-center justify-between">
              <div className="flex items-center gap-3 text-[10px] font-data text-[var(--text-faint)]">
                <span className="flex items-center gap-1">
                  <kbd className="px-1 py-0.5 rounded bg-[var(--surface-3)] border border-[var(--border-subtle)]">↵</kbd>
                  navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1 py-0.5 rounded bg-[var(--surface-3)] border border-[var(--border-subtle)]">esc</kbd>
                  close
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-data text-[var(--text-faint)]">
                <Command className="w-3 h-3" />
                <span>FleetHappens</span>
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ─── CommandPaletteTrigger ────────────────────────────────────────────────────
// Fixed bottom-right floating action button.
// Lives in app/layout.tsx so it's always visible on every page.
// Fires OPEN_PALETTE_EVENT to open the global palette.

export function CommandPaletteTrigger() {
  function handleClick() {
    window.dispatchEvent(new CustomEvent(OPEN_PALETTE_EVENT));
  }

  return (
    <button
      onClick={handleClick}
      aria-label="Ask fleet AI (⌘K)"
      className="
        fixed bottom-6 right-6 z-40
        group flex items-center gap-2.5
        h-12 pl-3.5 pr-4 rounded-full
        bg-[#f5a623] text-[#09090e]
        shadow-[0_4px_20px_rgba(245,166,35,0.45),0_2px_8px_rgba(0,0,0,0.4)]
        hover:bg-[#f9b93a]
        hover:shadow-[0_6px_28px_rgba(245,166,35,0.6),0_2px_10px_rgba(0,0,0,0.4)]
        hover:-translate-y-0.5
        active:translate-y-0
        active:shadow-[0_2px_10px_rgba(245,166,35,0.4)]
        transition-all duration-150
        focus:outline-none focus:ring-2 focus:ring-[rgba(245,166,35,0.5)] focus:ring-offset-2 focus:ring-offset-[#09090e]
        font-display font-bold text-sm
      "
    >
      <Bot className="w-4.5 h-4.5 flex-shrink-0 w-[18px] h-[18px]" />
      <span className="hidden sm:inline leading-none">Ask fleet AI</span>
      <kbd className="
        hidden sm:flex items-center justify-center
        ml-1 px-1.5 py-0.5 rounded-md
        bg-[rgba(9,9,14,0.18)] text-[rgba(9,9,14,0.65)]
        text-[10px] font-data leading-tight
        border border-[rgba(9,9,14,0.12)]
      ">
        ⌘K
      </kbd>
    </button>
  );
}

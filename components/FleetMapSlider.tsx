"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  Truck, Brain, BarChart2, Map,
  ChevronUp, ChevronDown,
  Maximize2, Minimize2,
  PanelRightClose, PanelRightOpen,
} from "lucide-react";

type PanelTab = "activity" | "intelligence" | "trends";

const MIN_WIDTH = 280;
const DEFAULT_WIDTH = 400;
// fraction of container for "maximised" snap
const MAX_SNAP_FRACTION = 0.62;
// hard cap so the map always has some breathing room
const DRAG_MAX_FRACTION = 0.72;

interface FleetMapSliderProps {
  mapContent: React.ReactNode;
  statsContent?: React.ReactNode;
  activityContent: React.ReactNode;
  intelligenceContent: React.ReactNode;
  trendsContent: React.ReactNode;
}

export default function FleetMapSlider({
  mapContent,
  statsContent,
  activityContent,
  intelligenceContent,
  trendsContent,
}: FleetMapSliderProps) {
  const [activeTab, setActiveTab] = useState<PanelTab>("activity");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [panelWidth, setPanelWidth] = useState(DEFAULT_WIDTH);
  const [isMaximised, setIsMaximised] = useState(false);
  const [isMinimised, setIsMinimised] = useState(false);
  // Suppress CSS transition while the user is actively dragging
  const [dragging, setDragging] = useState(false);
  // Whether the viewport is at the desktop breakpoint (≥1024px)
  const [isDesktop, setIsDesktop] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const pointerDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartWidth = useRef(DEFAULT_WIDTH);
  // Width to restore when toggling maximise / minimise
  const savedWidth = useRef(DEFAULT_WIDTH);

  // Track desktop breakpoint
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    setIsDesktop(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Clamp panel width whenever the container resizes
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(() => {
      if (!containerRef.current) return;
      const maxW = Math.floor(containerRef.current.offsetWidth * DRAG_MAX_FRACTION);
      setPanelWidth((w) => Math.min(Math.max(w, MIN_WIDTH), maxW));
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // ── Drag-resize ────────────────────────────────────────────────────────
  const onDragStart = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      pointerDragging.current = true;
      dragStartX.current = e.clientX;
      dragStartWidth.current = panelWidth;
      setDragging(true);
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [panelWidth]
  );

  const onDragMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!pointerDragging.current || !containerRef.current) return;
      const maxW = Math.floor(containerRef.current.offsetWidth * DRAG_MAX_FRACTION);
      // dragging left = positive delta = panel grows
      const delta = dragStartX.current - e.clientX;
      const next = Math.min(Math.max(dragStartWidth.current + delta, MIN_WIDTH), maxW);
      setPanelWidth(next);
      // Exit snap states when user manually resizes
      setIsMaximised(false);
      setIsMinimised(false);
    },
    []
  );

  const onDragEnd = useCallback(() => {
    if (!pointerDragging.current) return;
    pointerDragging.current = false;
    setDragging(false);
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }, []);

  // ── Maximise / Minimise ────────────────────────────────────────────────
  function handleMaximise() {
    if (isMaximised) {
      setIsMaximised(false);
    } else {
      if (!isMinimised) savedWidth.current = panelWidth;
      setIsMaximised(true);
      setIsMinimised(false);
    }
  }

  function handleMinimise() {
    if (isMinimised) {
      setPanelWidth(savedWidth.current);
      setIsMinimised(false);
    } else {
      if (!isMaximised) savedWidth.current = panelWidth;
      setPanelWidth(MIN_WIDTH);
      setIsMinimised(true);
      setIsMaximised(false);
    }
  }

  const tabs: { id: PanelTab; label: string; icon: React.ElementType; color: string }[] = [
    { id: "activity",     label: "Vehicles",     icon: Truck,     color: "#38bdf8" },
    { id: "intelligence", label: "Intelligence", icon: Brain,     color: "#f5a623" },
    { id: "trends",       label: "Trends",       icon: BarChart2, color: "#34d399" },
  ];

  // Desktop panel style — switches to absolute overlay when maximised
  const desktopWidthStyle: React.CSSProperties = isDesktop
    ? isMaximised
      ? {
          position: "absolute",
          inset: 0,
          width: "100%",
          maxHeight: "100%",
          zIndex: 770,
          transition: "none",
        }
      : {
          width: panelWidth,
          flexShrink: 0,
          transition: dragging ? "none" : "width 0.22s cubic-bezier(0.16,1,0.3,1)",
        }
    : {};

  return (
    <div ref={containerRef} className="relative flex h-full overflow-hidden">
      {/* ── Left: Map ── */}
      <div className="relative flex-1 min-w-0">
        {mapContent}

        {/* Fleet map badge */}
        <div className="absolute top-3 left-3 z-[750] pointer-events-none">
          <div className="flex items-center gap-1.5 bg-[rgba(9,9,14,0.8)] backdrop-blur-md border border-[rgba(56,189,248,0.2)] rounded-lg px-2.5 py-1.5">
            <Map className="h-3 w-3 text-[#38bdf8]" />
            <span className="text-sm font-display font-bold text-white tracking-wide">Fleet Map</span>
          </div>
        </div>

        {/* Mobile toggle */}
        <button
          className="lg:hidden absolute bottom-5 right-4 z-[750] flex items-center gap-2 bg-[rgba(11,15,23,0.95)] backdrop-blur-md border border-[rgba(255,255,255,0.12)] rounded-xl px-3.5 py-2.5 shadow-lg"
          onClick={() => setMobileOpen((v) => !v)}
        >
          <Brain className="h-3.5 w-3.5 text-[#f5a623]" />
          <span className="text-sm font-display font-bold text-white">Fleet Intel</span>
          {mobileOpen
            ? <ChevronDown className="h-3.5 w-3.5 text-[rgba(232,237,248,0.4)]" />
            : <ChevronUp   className="h-3.5 w-3.5 text-[rgba(232,237,248,0.4)]" />}
        </button>
      </div>

      {/* ── Drag handle (desktop only, hidden when maximised) ── */}
      <div
        className={`shrink-0 w-[5px] items-stretch cursor-col-resize z-[760] group ${isMaximised || !isDesktop ? "hidden" : "flex"}`}
        onPointerDown={onDragStart}
        onPointerMove={onDragMove}
        onPointerUp={onDragEnd}
        onPointerCancel={onDragEnd}
      >
        <div className="w-px mx-auto bg-[rgba(255,255,255,0.07)] group-hover:bg-[rgba(56,189,248,0.4)] group-active:bg-[rgba(56,189,248,0.7)] transition-colors duration-150" />
      </div>

      {/* ── Intelligence panel ── */}
      <aside
        className={[
          "flex flex-col bg-[#0b0f17]",
          // Mobile: slide-up bottom sheet
          "fixed bottom-0 left-0 right-0 z-[800] rounded-t-2xl",
          "transition-transform duration-300 ease-out",
          mobileOpen ? "translate-y-0" : "translate-y-full",
          // Desktop: static, width controlled via inline style
          "lg:static lg:rounded-none lg:z-auto lg:translate-y-0 lg:transition-none",
        ].join(" ")}
        style={{
          boxShadow: "0 -8px 40px rgba(0,0,0,0.55)",
          maxHeight: "80dvh",
          ...desktopWidthStyle,
        }}
      >
        {/* ── Header: stats + tabs + controls ── */}
        <div className="shrink-0 border-b border-[rgba(255,255,255,0.07)]">
          {statsContent && (
            <div className="px-4 pt-3 pb-2.5 border-b border-[rgba(255,255,255,0.05)]">
              {statsContent}
            </div>
          )}

          {/* Tab row */}
          <div className="flex items-center px-3 gap-1">
            <div className="flex flex-1 min-w-0 -mb-px overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="flex items-center gap-1.5 px-3 py-2.5 text-sm font-body font-semibold border-b-2 transition-all duration-200 whitespace-nowrap shrink-0"
                  style={{
                    borderColor: activeTab === tab.id ? tab.color : "transparent",
                    color: activeTab === tab.id ? tab.color : "rgba(232,237,248,0.4)",
                  }}
                >
                  <tab.icon className="h-3 w-3" />
                  {/* Hide labels when minimised to keep the thin panel tidy */}
                  {!isMinimised && <span>{tab.label}</span>}
                </button>
              ))}
            </div>

            {/* Resize controls (desktop only) */}
            <div className="hidden lg:flex items-center gap-0.5 shrink-0 pb-px">
              <button
                onClick={handleMinimise}
                title={isMinimised ? "Restore panel" : "Collapse panel"}
                className="h-6 w-6 rounded-md flex items-center justify-center transition-colors duration-150 text-[rgba(232,237,248,0.3)] hover:text-white hover:bg-[rgba(255,255,255,0.07)]"
              >
                {isMinimised
                  ? <PanelRightOpen  className="h-3.5 w-3.5" />
                  : <PanelRightClose className="h-3.5 w-3.5" />}
              </button>
              <button
                onClick={handleMaximise}
                title={isMaximised ? "Restore panel" : "Expand panel"}
                className="h-6 w-6 rounded-md flex items-center justify-center transition-colors duration-150 text-[rgba(232,237,248,0.3)] hover:text-white hover:bg-[rgba(255,255,255,0.07)]"
              >
                {isMaximised
                  ? <Minimize2 className="h-3.5 w-3.5" />
                  : <Maximize2 className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable tab content — hidden while minimised */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {!isMinimised && (
            <div className="p-4 space-y-4">
              {activeTab === "activity"     && activityContent}
              {activeTab === "intelligence" && intelligenceContent}
              {activeTab === "trends"       && trendsContent}
            </div>
          )}
        </div>
      </aside>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-[799] bg-black/40 backdrop-blur-[2px]"
          onClick={() => setMobileOpen(false)}
        />
      )}
    </div>
  );
}

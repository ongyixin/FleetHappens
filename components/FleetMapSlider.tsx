"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { Map, Brain } from "lucide-react";

interface FleetMapSliderProps {
  mapContent: React.ReactNode;
  intelContent: React.ReactNode;
}

type SliderView = "map" | "intel";

const HANDLE_HEIGHT = 60;
const MAP_PEEK = 72;

export default function FleetMapSlider({ mapContent, intelContent }: FleetMapSliderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<SliderView>("map");
  const [isDragging, setIsDragging] = useState(false);
  const [livePanelY, setLivePanelY] = useState<number | null>(null);
  const [containerH, setContainerH] = useState(600);

  const dragStartY = useRef(0);
  const dragStartPanelY = useRef(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setContainerH(el.offsetHeight));
    ro.observe(el);
    setContainerH(el.offsetHeight);
    return () => ro.disconnect();
  }, []);

  const mapViewY = containerH - HANDLE_HEIGHT;
  const intelViewY = MAP_PEEK;

  const snappedY = view === "map" ? mapViewY : intelViewY;
  const displayY = livePanelY ?? snappedY;

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      dragStartY.current = e.clientY;
      dragStartPanelY.current = displayY;
      setIsDragging(true);
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    [displayY]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return;
      const delta = e.clientY - dragStartY.current;
      const newY = Math.max(MAP_PEEK, Math.min(mapViewY, dragStartPanelY.current + delta));
      setLivePanelY(newY);
    },
    [isDragging, mapViewY]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return;
      const delta = e.clientY - dragStartY.current;
      const resolved = dragStartPanelY.current + delta;
      const mid = (mapViewY + intelViewY) / 2;
      setView(resolved > mid ? "map" : "intel");
      setLivePanelY(null);
      setIsDragging(false);
    },
    [isDragging, mapViewY, intelViewY]
  );

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden rounded-2xl border border-[rgba(255,255,255,0.07)]"
      style={{ height: "calc(100vh - 260px)", minHeight: 520, maxHeight: 820 }}
    >
      {/* ── Map layer (always rendered beneath) ── */}
      <div className="absolute inset-0">{mapContent}</div>

      {/* ── Map-mode overlay badge ── */}
      <div
        className="absolute top-3 left-3 z-[750] pointer-events-none"
        style={{
          opacity: view === "map" ? 1 : 0,
          transition: "opacity 0.3s ease",
        }}
      >
        <div className="flex items-center gap-1.5 bg-[rgba(9,9,14,0.8)] backdrop-blur-md border border-[rgba(56,189,248,0.2)] rounded-lg px-2.5 py-1.5">
          <Map className="h-3 w-3 text-[#38bdf8]" />
          <span className="text-[10px] font-display font-bold text-white tracking-wide">Fleet Map</span>
        </div>
      </div>

      {/* ── Intelligence panel (slides up from bottom) ── */}
      {/* z-index must exceed Leaflet's highest internal pane (tooltip = 650)   */}
      {/* so the handle and Intel toggle always receive pointer events first.   */}
      <div
        className="absolute left-0 right-0 bg-[#0b0f17] rounded-t-2xl"
        style={{
          top: 0,
          bottom: 0,
          zIndex: 700,
          transform: `translateY(${displayY}px)`,
          transition: isDragging ? "none" : "transform 0.48s cubic-bezier(0.16, 1, 0.3, 1)",
          willChange: "transform",
          boxShadow: "0 -12px 48px rgba(0,0,0,0.7), 0 -1px 0 rgba(255,255,255,0.06)",
        }}
      >
        {/* ── Drag handle ── */}
        <div
          className="cursor-grab active:cursor-grabbing touch-none select-none"
          style={{ height: HANDLE_HEIGHT }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          {/* Pill indicator */}
          <div className="flex justify-center pt-2.5">
            <div className="w-8 h-1 rounded-full bg-[rgba(255,255,255,0.18)]" />
          </div>

          <div className="flex items-center justify-between px-4 mt-2">
            {/* Left: label */}
            <div className="flex items-center gap-2.5">
              <div
                className="h-7 w-7 rounded-xl flex items-center justify-center transition-colors duration-300"
                style={{
                  background: view === "intel" ? "rgba(245,166,35,0.15)" : "rgba(255,255,255,0.05)",
                }}
              >
                <Brain
                  className="h-3.5 w-3.5 transition-colors duration-300"
                  style={{ color: view === "intel" ? "#f5a623" : "rgba(232,237,248,0.3)" }}
                />
              </div>
              <div>
                <p className="text-[12px] font-display font-bold text-white leading-none">Fleet Intelligence</p>
                <p className="text-[10px] text-[rgba(232,237,248,0.35)] font-body mt-0.5 leading-none">
                  {view === "map" ? "Swipe up to explore insights" : "Swipe down for map view"}
                </p>
              </div>
            </div>

            {/* Right: Map / Intel toggle pills */}
            <div
              className="flex items-center rounded-lg p-0.5 gap-0.5"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => { setView("map"); setLivePanelY(null); }}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[10px] font-body font-semibold transition-all duration-200"
                style={{
                  background: view === "map" ? "rgba(56,189,248,0.15)" : "transparent",
                  color: view === "map" ? "#38bdf8" : "rgba(232,237,248,0.4)",
                }}
              >
                <Map className="h-2.5 w-2.5" />
                Map
              </button>
              <button
                onClick={() => { setView("intel"); setLivePanelY(null); }}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[10px] font-body font-semibold transition-all duration-200"
                style={{
                  background: view === "intel" ? "rgba(245,166,35,0.15)" : "transparent",
                  color: view === "intel" ? "#f5a623" : "rgba(232,237,248,0.4)",
                }}
              >
                <Brain className="h-2.5 w-2.5" />
                Intel
              </button>
            </div>
          </div>
        </div>

        {/* ── Panel content ── */}
        <div
          className="overflow-y-auto"
          style={{ height: `calc(100% - ${HANDLE_HEIGHT}px)` }}
        >
          <div className="p-4 space-y-5">{intelContent}</div>
        </div>
      </div>
    </div>
  );
}

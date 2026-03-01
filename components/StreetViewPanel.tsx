/**
 * StreetViewPanel — slide-in panel showing an interactive Google Street View
 * panorama for a clicked breadcrumb point on the vehicle route.
 *
 * Loads the Google Maps JS API lazily on first open (zero bundle impact until
 * the user actually clicks the route). Falls back gracefully when Street View
 * coverage is unavailable at the requested location.
 */

"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { X, MapPin, Navigation, AlertTriangle, Eye } from "lucide-react";
import type { LatLon } from "@/types";

const MIN_WIDTH = 320;
const MAX_WIDTH = 900;
const DEFAULT_WIDTH = 384; // w-96

// ─── Types ────────────────────────────────────────────────────────────────────

type PanelState = "loading" | "ready" | "no-coverage" | "error";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCoords(coords: LatLon): string {
  const lat = Math.abs(coords.lat).toFixed(5) + (coords.lat >= 0 ? "°N" : "°S");
  const lon = Math.abs(coords.lon).toFixed(5) + (coords.lon >= 0 ? "°E" : "°W");
  return `${lat}, ${lon}`;
}

async function reverseGeocode(coords: LatLon): Promise<string | null> {
  try {
    const res = await fetch(
      `/api/geocode?lat=${coords.lat}&lon=${coords.lon}`
    );
    if (!res.ok) return null;
    const json = await res.json();
    // GeocodeResult shape: { data: { placeName, formattedAddress, ... } }
    const data = json.data as { placeName?: string; formattedAddress?: string } | undefined;
    return data?.formattedAddress ?? data?.placeName ?? null;
  } catch {
    return null;
  }
}

// ─── Skeleton shimmer ─────────────────────────────────────────────────────────

function SkeletonShimmer() {
  return (
    <div className="absolute inset-0 flex flex-col">
      <div className="shrink-0 h-1 bg-gradient-to-r from-[#f59e0b] via-[#fbbf24] to-transparent animate-pulse" />
      <div className="flex-1 relative overflow-hidden bg-[#0a0d10]">
        {/* Animated scan line */}
        <div
          className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(245,158,11,0.4)] to-transparent"
          style={{ animation: "sv-scan 2.2s ease-in-out infinite" }}
        />
        {/* Grid pattern suggesting a street scene */}
        <div className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: "linear-gradient(rgba(56,189,248,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(56,189,248,0.6) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <div className="w-10 h-10 rounded-full border border-[rgba(245,158,11,0.3)] flex items-center justify-center">
            <Eye className="w-5 h-5 text-[rgba(245,158,11,0.5)]" />
          </div>
          <p className="text-[11px] font-body text-[rgba(232,237,248,0.4)] tracking-wide">
            Loading Street View…
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── No-coverage fallback ─────────────────────────────────────────────────────

function NoCoverageFallback({ coords }: { coords: LatLon }) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const staticMapUrl = apiKey
    ? `https://maps.googleapis.com/maps/api/staticmap?center=${coords.lat},${coords.lon}&zoom=16&size=560x320&maptype=satellite&key=${apiKey}`
    : null;

  return (
    <div className="absolute inset-0 flex flex-col bg-[#0a0d10]">
      {staticMapUrl ? (
        <div className="relative flex-1 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={staticMapUrl}
            alt="Satellite view"
            className="w-full h-full object-cover opacity-60"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[rgba(9,13,17,0.9)]" />
          <div className="absolute inset-x-0 bottom-0 pb-6 flex flex-col items-center gap-2">
            <div className="flex items-center gap-2 bg-[rgba(9,13,17,0.8)] border border-[rgba(245,158,11,0.25)] rounded-lg px-4 py-2.5">
              <AlertTriangle className="w-4 h-4 text-[#f59e0b] shrink-0" />
              <p className="text-[11px] font-body text-[rgba(232,237,248,0.7)]">
                No street-level imagery at this location
              </p>
            </div>
            <p className="text-[10px] font-body text-[rgba(232,237,248,0.3)]">
              Showing satellite view instead
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6">
          <div className="w-12 h-12 rounded-full border border-[rgba(245,158,11,0.25)] flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-[rgba(245,158,11,0.6)]" />
          </div>
          <p className="text-sm font-body text-[rgba(232,237,248,0.55)] text-center leading-relaxed">
            No street-level imagery available at this location
          </p>
          <p className="text-[11px] font-body text-[rgba(232,237,248,0.3)] text-center">
            Street View coverage is limited in some areas
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface StreetViewPanelProps {
  coords: LatLon;
  onClose: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function StreetViewPanel({ coords, onClose }: StreetViewPanelProps) {
  const panoramaRef  = useRef<HTMLDivElement>(null);
  const [state, setState]     = useState<PanelState>("loading");
  const [address, setAddress] = useState<string | null>(null);
  const [panelWidth, setPanelWidth] = useState(DEFAULT_WIDTH);
  const isDragging = useRef(false);

  const onResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    document.body.style.cursor = "ew-resize";
    document.body.style.userSelect = "none";

    const onMouseMove = (ev: MouseEvent) => {
      if (!isDragging.current) return;
      const newWidth = window.innerWidth - ev.clientX;
      setPanelWidth(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, newWidth)));
    };

    const onMouseUp = () => {
      isDragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }, []);

  // Reverse geocode the coordinates for a human-readable header
  useEffect(() => {
    setAddress(null);
    reverseGeocode(coords).then(setAddress);
  }, [coords]);

  // Load Google Maps JS API and initialize Street View panorama
  const initStreetView = useCallback(async () => {
    if (!panoramaRef.current) return;

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.warn("[StreetViewPanel] NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not set");
      setState("error");
      return;
    }

    setState("loading");

    try {
      const { setOptions, importLibrary } = await import("@googlemaps/js-api-loader");
      setOptions({ key: apiKey, v: "weekly" });
      const { StreetViewPanorama, StreetViewService, StreetViewStatus } =
        await importLibrary("streetView") as google.maps.StreetViewLibrary;

      // Check coverage before rendering
      const svc = new StreetViewService();
      const result = await new Promise<google.maps.StreetViewPanoramaData | null>(
        (resolve, reject) => {
          svc.getPanorama(
            {
              location: { lat: coords.lat, lng: coords.lon },
              radius: 50,
              preference: google.maps.StreetViewPreference.NEAREST,
            },
            (data, status) => {
              if (status === StreetViewStatus.OK) resolve(data);
              else if (status === StreetViewStatus.ZERO_RESULTS) resolve(null);
              else reject(new Error(status));
            }
          );
        }
      );

      if (!result) {
        setState("no-coverage");
        return;
      }

      if (!panoramaRef.current) return;

      new StreetViewPanorama(panoramaRef.current, {
        position: { lat: coords.lat, lng: coords.lon },
        pov: { heading: 0, pitch: 0 },
        zoom: 1,
        addressControl: false,
        enableCloseButton: false,
        fullscreenControl: false,
        motionTracking: false,
        motionTrackingControl: false,
      });

      setState("ready");
    } catch (err) {
      console.error("[StreetViewPanel] Failed to load Street View", err);
      setState("error");
    }
  }, [coords]);

  useEffect(() => {
    initStreetView();
  }, [initStreetView]);

  return (
    <aside
      className="fixed right-0 top-14 bottom-0 z-[60] flex flex-col bg-[#090d11] border-l border-[rgba(255,255,255,0.08)] shadow-[-12px_0_40px_rgba(0,0,0,0.7)] panel-open overflow-hidden"
      style={{ width: panelWidth }}
    >
      {/* ── Resize handle ───────────────────────────────────────────────── */}
      <div
        onMouseDown={onResizeMouseDown}
        className="absolute left-0 top-0 bottom-0 w-1 z-10 group cursor-ew-resize"
        title="Drag to resize"
      >
        {/* visible grip strip */}
        <div className="absolute inset-y-0 left-0 w-1 bg-transparent group-hover:bg-[rgba(245,158,11,0.35)] transition-colors duration-150" />
        {/* wider invisible hit-area */}
        <div className="absolute inset-y-0 -left-1.5 w-4" />
        {/* centre drag pill */}
        <div className="absolute top-1/2 -translate-y-1/2 left-0 -translate-x-[1px] w-[3px] h-10 rounded-full bg-[rgba(245,158,11,0.0)] group-hover:bg-[rgba(245,158,11,0.55)] transition-all duration-150" />
      </div>
      {/* Amber accent stripe — distinct from teal Location Dossier stripe */}
      <div className="shrink-0 h-[2px] bg-gradient-to-r from-[#f59e0b] via-[#fbbf24] to-transparent" />

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="shrink-0 flex items-start justify-between px-5 py-4 border-b border-[rgba(255,255,255,0.07)]">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Eye className="w-3 h-3 text-[#f59e0b] shrink-0" />
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[rgba(245,158,11,0.65)] font-body">
              Street View
            </p>
          </div>
          {address ? (
            <p className="text-[13px] font-semibold text-[rgba(232,237,248,0.9)] font-body leading-snug truncate">
              {address}
            </p>
          ) : (
            <p className="text-[11px] font-body text-[rgba(232,237,248,0.4)] flex items-center gap-1.5">
              <MapPin className="w-3 h-3 text-[rgba(245,158,11,0.5)] shrink-0" />
              {formatCoords(coords)}
            </p>
          )}
          {address && (
            <p className="mt-0.5 text-[11px] font-body text-[rgba(232,237,248,0.35)] flex items-center gap-1.5">
              <Navigation className="w-2.5 h-2.5 shrink-0" />
              {formatCoords(coords)}
            </p>
          )}
        </div>
        <button
          onClick={onClose}
          aria-label="Close Street View"
          className="ml-3 shrink-0 w-7 h-7 rounded-md flex items-center justify-center text-[rgba(232,237,248,0.4)] hover:text-[rgba(232,237,248,0.85)] hover:bg-[rgba(255,255,255,0.06)] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* ── Panorama / state views ───────────────────────────────────────── */}
      <div className="flex-1 relative">
        {/* The panorama div — Google Maps SDK renders into this */}
        <div
          ref={panoramaRef}
          className="absolute inset-0"
          style={{ visibility: state === "ready" ? "visible" : "hidden" }}
        />

        {state === "loading"     && <SkeletonShimmer />}
        {state === "no-coverage" && <NoCoverageFallback coords={coords} />}
        {state === "error"       && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 bg-[#0a0d10]">
            <AlertTriangle className="w-8 h-8 text-[rgba(245,158,11,0.5)]" />
            <p className="text-sm font-body text-[rgba(232,237,248,0.5)] text-center">
              Could not load Street View
            </p>
            <p className="text-[11px] font-body text-[rgba(232,237,248,0.3)] text-center">
              Check that NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is configured with Maps JavaScript API enabled
            </p>
            <button
              onClick={initStreetView}
              className="mt-2 px-4 py-2 rounded-md bg-[rgba(245,158,11,0.1)] border border-[rgba(245,158,11,0.25)] text-[11px] font-body text-[rgba(245,158,11,0.8)] hover:bg-[rgba(245,158,11,0.15)] transition-colors"
            >
              Retry
            </button>
          </div>
        )}
      </div>

      {/* ── Footer hint ─────────────────────────────────────────────────── */}
      {state === "ready" && (
        <div className="shrink-0 px-4 py-2.5 border-t border-[rgba(255,255,255,0.06)] flex items-center gap-2">
          <Navigation className="w-3 h-3 text-[rgba(245,158,11,0.5)] shrink-0" />
          <p className="text-[10px] font-body text-[rgba(232,237,248,0.35)]">
            Drag to look around · Scroll to zoom · Click arrows to navigate
          </p>
        </div>
      )}

      <style>{`
        @keyframes sv-scan {
          0%   { top: 0%; }
          50%  { top: 100%; }
          100% { top: 0%; }
        }
      `}</style>
    </aside>
  );
}

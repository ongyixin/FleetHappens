/**
 * TripMap — Leaflet map with:
 *   • All vehicle trip routes shown as dim background polylines (overview mode)
 *   • Selected trip highlighted; breadcrumb polyline drawn when loaded
 *   • Clickable start/end stop markers on the selected trip
 *
 * Must be dynamically imported (no SSR) because Leaflet uses window.
 */

"use client";

import { useEffect, useRef, useState } from "react";
import type { TripSummary, BreadcrumbPoint, LogRecord, LatLon } from "@/types";

interface Props {
  trip: TripSummary | null;
  /** All trips for this vehicle — drawn as dim background routes. */
  allTrips?: TripSummary[];
  /** Accepts either pre-normalised breadcrumbs or raw LogRecords. */
  breadcrumbs?: BreadcrumbPoint[];
  logs?: LogRecord[];
  /** Either a LatLon or a numeric stop index can be used to highlight a stop. */
  selectedStop?: LatLon | null;
  selectedStopIndex?: number | null;
  loading?: boolean;
  onStopClick: (coords: LatLon, index: number) => void;
  /** Called when user clicks a point on the active trip's breadcrumb polyline. */
  onRouteClick?: (coords: LatLon) => void;
  /** Currently active street-view pin — shown as a distinct marker on the map. */
  streetViewCoords?: LatLon | null;
}

export default function TripMap({
  trip,
  allTrips,
  breadcrumbs: breadcrumbsProp,
  logs,
  selectedStop,
  selectedStopIndex,
  loading,
  onStopClick,
  onRouteClick,
  streetViewCoords,
}: Props) {
  const breadcrumbs: BreadcrumbPoint[] = breadcrumbsProp ?? (logs ?? []).map((l) => ({
    dateTime: l.dateTime,
    lat: l.latitude,
    lon: l.longitude,
    speedKmh: l.speed,
  }));

  void selectedStopIndex;
  void loading;

  const mapRef       = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const leafletRef   = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef2      = useRef<any>(null); // Leaflet map instance
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const roRef        = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bgLayersRef  = useRef<any[]>([]); // overview routes (all trips)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fgLayersRef  = useRef<any[]>([]); // selected-trip breadcrumb + stop markers
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const svPinRef     = useRef<any>(null); // street-view pin marker

  // Signals that Leaflet init is complete so downstream effects can draw.
  const [mapReady, setMapReady] = useState(false);

  // ── Initialize Leaflet once ──────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current) return;
    import("leaflet").then((L) => {
      leafletRef.current = L;
      if (mapRef2.current) return;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      });

      const map = L.map(mapRef.current!, {
        center: [39.5, -98.35],
        zoom: 4,
        zoomControl: true,
        attributionControl: false,
      });

      // Dark basemap — matches FleetRegionalMap aesthetic
      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        { attribution: "© OpenStreetMap contributors © CARTO", subdomains: "abcd", maxZoom: 19 }
      ).addTo(map);

      mapRef2.current = map;

      requestAnimationFrame(() => {
        if (mapRef2.current) mapRef2.current.invalidateSize();
      });

      if (mapRef.current) {
        roRef.current = new ResizeObserver(() => {
          if (mapRef2.current) mapRef2.current.invalidateSize();
        });
        roRef.current.observe(mapRef.current);
      }

      setMapReady(true);
    });

    return () => {
      roRef.current?.disconnect();
      roRef.current = null;
      mapRef2.current?.remove();
      mapRef2.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Background layer: all trip overview routes ───────────────────────────
  // Redraws whenever the trip list changes or the active selection changes.
  useEffect(() => {
    const L   = leafletRef.current;
    const map = mapRef2.current;
    if (!L || !map || !mapReady) return;

    bgLayersRef.current.forEach((l) => l.remove());
    bgLayersRef.current = [];

    const trips = allTrips ?? (trip ? [trip] : []);
    if (trips.length === 0) return;

    const allPoints: [number, number][] = [];

    for (const t of trips) {
      const isSelected = t.id === trip?.id;
      const from: [number, number] = [t.startPoint.lat, t.startPoint.lon];
      const to:   [number, number] = [t.endPoint.lat,   t.endPoint.lon];
      allPoints.push(from, to);

      if (isSelected) {
        // Selected trip background: amber glow (will be overlaid by breadcrumb line)
        const bg = L.polyline([from, to], { color: "#f5a623", weight: 10, opacity: 0.07 }).addTo(map);
        const fg = L.polyline([from, to], { color: "#f5a623", weight: 2,  opacity: 0.45, dashArray: "8 14" }).addTo(map);
        bgLayersRef.current.push(bg, fg);
      } else {
        // Unselected trip: dim cyan dashed — same double-layer style as fleet map
        const bg = L.polyline([from, to], { color: "#38bdf8", weight: 8,  opacity: 0.05 }).addTo(map);
        const fg = L.polyline([from, to], { color: "#38bdf8", weight: 1.5, opacity: 0.28, dashArray: "6 10" }).addTo(map);
        bgLayersRef.current.push(bg, fg);
      }

      // Tiny start dot for each trip
      const startDot = L.circleMarker(from, {
        radius: isSelected ? 4 : 3,
        fillColor: isSelected ? "#34d399" : "#38bdf8",
        fillOpacity: isSelected ? 0.85 : 0.35,
        color: "transparent",
        weight: 0,
      }).addTo(map);
      bgLayersRef.current.push(startDot);
    }

    // Pan/zoom to show all routes when no trip is selected
    if (!trip && allPoints.length >= 2) {
      try {
        map.fitBounds(L.latLngBounds(allPoints), { padding: [50, 50] });
      } catch { /* ignore edge-case bounds errors */ }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allTrips, trip?.id, mapReady]);

  // ── Foreground layer: selected trip breadcrumbs + stop markers ───────────
  useEffect(() => {
    const L   = leafletRef.current;
    const map = mapRef2.current;
    if (!L || !map || !mapReady) return;

    fgLayersRef.current.forEach((l) => l.remove());
    fgLayersRef.current = [];

    if (!trip) return;

    if (breadcrumbs.length > 1) {
      const latlngs = breadcrumbs.map((b) => [b.lat, b.lon] as [number, number]);

      // Double-layer route: glow + solid line
      const glow = L.polyline(latlngs, { color: "#38bdf8", weight: 10, opacity: 0.1 }).addTo(map);
      const line = L.polyline(latlngs, { color: "#38bdf8", weight: 2.5, opacity: 0.9 }).addTo(map);
      fgLayersRef.current.push(glow, line);

      // Invisible wide hit-area polyline for easy clicking — sits on top
      if (onRouteClick) {
        const hitArea = L.polyline(latlngs, {
          color: "transparent",
          weight: 20,
          opacity: 0,
          interactive: true,
        }).addTo(map);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        hitArea.on("mouseover", () => { (hitArea as any).setStyle({ opacity: 0.01 }); map.getContainer().style.cursor = "crosshair"; });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        hitArea.on("mouseout",  () => { (hitArea as any).setStyle({ opacity: 0 }); map.getContainer().style.cursor = ""; });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        hitArea.on("click", (e: any) => {
          onRouteClick({ lat: e.latlng.lat, lon: e.latlng.lng });
        });

        // Hover highlight: brighten the visible line on hover
        hitArea.on("mouseover", () => line.setStyle({ opacity: 1, weight: 3.5 }));
        hitArea.on("mouseout",  () => line.setStyle({ opacity: 0.9, weight: 2.5 }));

        fgLayersRef.current.push(hitArea);
      }

      map.fitBounds(line.getBounds(), { padding: [45, 45] });
    } else {
      // Breadcrumbs not loaded yet — fit to start→end extent
      const from: [number, number] = [trip.startPoint.lat, trip.startPoint.lon];
      const to:   [number, number] = [trip.endPoint.lat,   trip.endPoint.lon];
      try {
        map.fitBounds(L.latLngBounds([from, to]), { padding: [80, 80] });
      } catch { /* ignore */ }
    }

    // Start + end stop markers
    const stopPoints: Array<{ coords: LatLon; label: string }> = [
      { coords: trip.startPoint, label: "Start" },
      { coords: trip.endPoint,   label: "End"   },
    ];

    stopPoints.forEach(({ coords, label }, index) => {
      const isSelected =
        selectedStop &&
        Math.abs(selectedStop.lat - coords.lat) < 0.0001 &&
        Math.abs(selectedStop.lon - coords.lon) < 0.0001;

      const marker = L.circleMarker([coords.lat, coords.lon], {
        radius:      isSelected ? 12 : 8,
        color:       isSelected ? "#e3a008" : "#0e9f6e",
        fillColor:   isSelected ? "#e3a008" : "#0e9f6e",
        fillOpacity: 0.9,
        weight:      2,
      }).bindTooltip(label).addTo(map);

      marker.on("click", () => onStopClick(coords, index));
      fgLayersRef.current.push(marker);
    });
  }, [trip, breadcrumbs, selectedStop, onStopClick, onRouteClick, mapReady]);

  // ── Street-view pin: marks the currently open panorama location ──────────
  useEffect(() => {
    const L   = leafletRef.current;
    const map = mapRef2.current;
    if (!L || !map || !mapReady) return;

    if (svPinRef.current) {
      svPinRef.current.remove();
      svPinRef.current = null;
    }

    if (!streetViewCoords) return;

    // Pulsing amber ring to visually distinguish from stop markers
    const pin = L.circleMarker([streetViewCoords.lat, streetViewCoords.lon], {
      radius:      10,
      color:       "#f59e0b",
      fillColor:   "#f59e0b",
      fillOpacity: 0.25,
      weight:      2.5,
    }).bindTooltip("Street View", { permanent: false }).addTo(map);

    // Inner solid dot
    const dot = L.circleMarker([streetViewCoords.lat, streetViewCoords.lon], {
      radius:      4,
      color:       "#f59e0b",
      fillColor:   "#f59e0b",
      fillOpacity: 0.95,
      weight:      0,
    }).addTo(map);

    svPinRef.current = { remove: () => { pin.remove(); dot.remove(); } };
  }, [streetViewCoords, mapReady]);

  return (
    <div className="relative w-full h-full">
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css"
      />
      <div ref={mapRef} className="w-full h-full" />

      {/* Legend — only shown when routes are available */}
      {(allTrips ?? []).length > 0 && (
        <div className="absolute bottom-3 left-3 z-[400] bg-[rgba(9,9,14,0.85)] backdrop-blur-sm border border-[rgba(255,255,255,0.1)] rounded-lg px-3 py-2 flex items-center gap-3 text-sm shadow-lg pointer-events-none">
          <div className="flex items-center gap-1.5">
            <span
              className="inline-block w-5 h-0.5 rounded-full opacity-60"
              style={{ background: "repeating-linear-gradient(90deg,#38bdf8 0,#38bdf8 4px,transparent 4px,transparent 8px)" }}
            />
            <span className="text-[rgba(232,237,248,0.55)] font-body">All trips</span>
          </div>
          {trip && (
            <>
              <span className="w-px h-3 bg-[rgba(255,255,255,0.15)]" />
              <div className="flex items-center gap-1.5">
                <span className="inline-block w-5 h-0.5 rounded-full" style={{ backgroundColor: "#38bdf8" }} />
                <span className="text-[rgba(232,237,248,0.55)] font-body">Selected route</span>
              </div>
              {onRouteClick && (
                <>
                  <span className="w-px h-3 bg-[rgba(255,255,255,0.15)]" />
                  <div className="flex items-center gap-1.5">
                    <svg width="10" height="10" viewBox="0 0 10 10" className="opacity-70">
                      <circle cx="5" cy="5" r="4" stroke="#f59e0b" strokeWidth="1.5" fill="none" />
                      <circle cx="5" cy="5" r="2" fill="#f59e0b" />
                    </svg>
                    <span className="text-[rgba(232,237,248,0.55)] font-body">Click route → Street View</span>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* Prompt shown only when map has loaded but no trips exist */}
      {mapReady && (allTrips ?? []).length === 0 && !trip && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <p className="text-sm font-body text-[rgba(232,237,248,0.4)]">Select a trip to see its route</p>
            <p className="text-sm font-body text-[rgba(232,237,248,0.25)] mt-1">GPS breadcrumbs will appear here</p>
          </div>
        </div>
      )}
    </div>
  );
}

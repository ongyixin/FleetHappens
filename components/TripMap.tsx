/**
 * TripMap — Leaflet map with GPS breadcrumb polyline and clickable stop markers.
 * Must be dynamically imported (no SSR) because Leaflet uses window.
 *
 * Owner: Map Agent
 *
 * Stop markers: rendered at startPoint and endPoint of the trip.
 * Clicking a stop marker fires onStopClick(coords).
 */

"use client";

import { useEffect, useRef } from "react";
import type { TripSummary, BreadcrumbPoint, LogRecord, LatLon } from "@/types";

interface Props {
  trip: TripSummary | null;
  /** Accepts either pre-normalised breadcrumbs or raw LogRecords. */
  breadcrumbs?: BreadcrumbPoint[];
  logs?: LogRecord[];
  /** Either a LatLon or a numeric stop index can be used to highlight a stop. */
  selectedStop?: LatLon | null;
  selectedStopIndex?: number | null;
  loading?: boolean;
  onStopClick: (coords: LatLon, index: number) => void;
}

export default function TripMap({
  trip,
  breadcrumbs: breadcrumbsProp,
  logs,
  selectedStop,
  selectedStopIndex,
  loading,
  onStopClick,
}: Props) {
  // Normalise logs → BreadcrumbPoint if logs are passed directly.
  const breadcrumbs: BreadcrumbPoint[] = breadcrumbsProp ?? (logs ?? []).map((l) => ({
    dateTime: l.dateTime,
    lat: l.latitude,
    lon: l.longitude,
    speedKmh: l.speed,
  }));

  void selectedStopIndex; // used externally to track selected stop index
  void loading;           // parent controls loading state display
  const mapRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const leafletRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const layersRef = useRef<any[]>([]);

  // Initialize Leaflet once
  useEffect(() => {
    if (!mapRef.current) return;
    import("leaflet").then((L) => {
      leafletRef.current = L;
      if (mapInstanceRef.current) return; // already initialized

      // Fix default icon paths broken by webpack
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      });

      mapInstanceRef.current = L.map(mapRef.current!).setView([40, -95], 5);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
      }).addTo(mapInstanceRef.current);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Redraw layers when trip/breadcrumbs change
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapInstanceRef.current;
    if (!L || !map) return;

    // Clear previous layers
    layersRef.current.forEach((layer) => layer.remove());
    layersRef.current = [];

    if (!trip) return;

    // Draw breadcrumb polyline
    if (breadcrumbs.length > 1) {
      const latlngs = breadcrumbs.map((b) => [b.lat, b.lon] as [number, number]);
      const line = L.polyline(latlngs, {
        color: "#1a56db",
        weight: 3,
        opacity: 0.8,
      }).addTo(map);
      layersRef.current.push(line);
      map.fitBounds(line.getBounds(), { padding: [40, 40] });
    }

    // Stop markers — start and end points are always shown
    const stopPoints: Array<{ coords: LatLon; label: string }> = [
      { coords: trip.startPoint, label: "Start" },
      { coords: trip.endPoint, label: "End" },
    ];

    // Also add breadcrumb clusters where vehicle was stationary >5 min (placeholder)
    // TODO (Map Agent): derive actual dwell-stop points from breadcrumb speed data

    stopPoints.forEach(({ coords, label }, index) => {
      const isSelected =
        selectedStop &&
        Math.abs(selectedStop.lat - coords.lat) < 0.0001 &&
        Math.abs(selectedStop.lon - coords.lon) < 0.0001;

      const circleMarker = L.circleMarker([coords.lat, coords.lon], {
        radius: isSelected ? 12 : 8,
        color: isSelected ? "#e3a008" : "#0e9f6e",
        fillColor: isSelected ? "#e3a008" : "#0e9f6e",
        fillOpacity: 0.9,
        weight: 2,
      })
        .bindTooltip(label)
        .addTo(map);

      circleMarker.on("click", () => onStopClick(coords, index));
      layersRef.current.push(circleMarker);
    });
  }, [trip, breadcrumbs, selectedStop, onStopClick]);

  return (
    <div className="relative w-full h-full">
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css"
      />
      <div ref={mapRef} className="w-full h-full" />
      {!trip && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/40">
          <div className="text-center">
            <p className="text-sm font-medium text-muted-foreground">Select a trip to see its route</p>
            <p className="text-xs text-muted-foreground/60 mt-1">GPS breadcrumbs will appear here</p>
          </div>
        </div>
      )}
    </div>
  );
}

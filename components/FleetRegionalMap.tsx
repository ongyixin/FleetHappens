"use client";

import { useEffect, useRef } from "react";
import type { VehicleActivity, FleetGroup } from "@/types";

export interface HotspotPin {
  lat: number;
  lon: number;
  name: string;
  visits?: number;
}

interface FleetRegionalMapProps {
  vehicles: VehicleActivity[];
  groups: FleetGroup[];
  hotspots?: HotspotPin[];
  onVehicleClick?: (vehicleId: string) => void;
}

// Default center if no positions available (continental US)
const DEFAULT_CENTER: [number, number] = [39.5, -98.35];
const DEFAULT_ZOOM = 4;

export default function FleetRegionalMap({
  vehicles,
  groups,
  hotspots,
  onVehicleClick,
}: FleetRegionalMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);

  const groupColorById = new Map<string, string>(
    groups.map((g) => [g.id, g.color ?? "#1a56db"])
  );

  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapRef.current) return; // already initialized

    // Dynamically import Leaflet (browser-only)
    import("leaflet").then((L) => {
      if (!mapContainerRef.current || mapRef.current) return;

      // Fix default icon path for webpack
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      });

      // Determine map center from vehicle positions
      const positioned = vehicles.filter((v) => v.lastPosition);
      let center: [number, number] = DEFAULT_CENTER;
      let zoom = DEFAULT_ZOOM;

      if (positioned.length > 0) {
        const avgLat =
          positioned.reduce((s, v) => s + v.lastPosition!.lat, 0) /
          positioned.length;
        const avgLon =
          positioned.reduce((s, v) => s + v.lastPosition!.lon, 0) /
          positioned.length;
        center = [avgLat, avgLon];
        zoom = positioned.length === 1 ? 12 : 8;
      }

      const map = L.map(mapContainerRef.current, {
        center,
        zoom,
        zoomControl: true,
        attributionControl: false,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
      }).addTo(map);

      L.control.attribution({ prefix: false }).addTo(map);

      // Add vehicle markers
      const markerLatLngs: [number, number][] = [];

      for (const v of vehicles) {
        if (!v.lastPosition) continue;
        const { lat, lon } = v.lastPosition;
        markerLatLngs.push([lat, lon]);

        // Determine color based on group membership (first group wins)
        const color =
          v.vehicle.id
            ? groupColorById.values().next().value ?? "#1a56db"
            : "#1a56db";

        const statusColors: Record<string, string> = {
          active: "#059669",
          idle: "#f59e0b",
          offline: "#9ca3af",
        };
        const markerColor = statusColors[v.status] ?? "#9ca3af";

        // Circle marker colored by status
        const marker = L.circleMarker([lat, lon], {
          radius: 7,
          fillColor: markerColor,
          fillOpacity: 0.85,
          color: "white",
          weight: 2,
        });

        marker.bindTooltip(
          `<strong>${v.vehicle.name}</strong><br/>` +
            `Status: ${v.status}` +
            (v.distanceTodayKm ? `<br/>Today: ${v.distanceTodayKm} km` : ""),
          { direction: "top", offset: [0, -8] }
        );

        if (onVehicleClick) {
          marker.on("click", () => onVehicleClick(v.vehicle.id));
        }

        marker.addTo(map);
        // Store color reference for this vehicle's group
        void color;
      }

      // Fit bounds if we have multiple markers
      if (markerLatLngs.length > 1) {
        try {
          map.fitBounds(L.latLngBounds(markerLatLngs), { padding: [30, 30] });
        } catch {
          // ignore bounds errors on edge cases
        }
      }

      mapRef.current = map;
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
    // We only want to initialize once — deps are intentionally empty
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update markers when vehicles or hotspots change (after initial load)
  useEffect(() => {
    if (!mapRef.current) return;
    import("leaflet").then((L) => {
      const map = mapRef.current;
      if (!map) return;

      // Remove existing circle markers (vehicles + hotspots)
      map.eachLayer((layer: unknown) => {
        if (layer instanceof L.CircleMarker) map.removeLayer(layer);
      });

      const statusColors: Record<string, string> = {
        active: "#059669",
        idle: "#f59e0b",
        offline: "#9ca3af",
      };

      const markerLatLngs: [number, number][] = [];

      for (const v of vehicles) {
        if (!v.lastPosition) continue;
        const { lat, lon } = v.lastPosition;
        markerLatLngs.push([lat, lon]);

        const marker = L.circleMarker([lat, lon], {
          radius: 7,
          fillColor: statusColors[v.status] ?? "#9ca3af",
          fillOpacity: 0.85,
          color: "white",
          weight: 2,
        });

        marker.bindTooltip(
          `<strong>${v.vehicle.name}</strong><br/>Status: ${v.status}` +
            (v.distanceTodayKm ? `<br/>Today: ${v.distanceTodayKm} km` : ""),
          { direction: "top", offset: [0, -8] }
        );

        if (onVehicleClick) {
          marker.on("click", () => onVehicleClick(v.vehicle.id));
        }

        marker.addTo(map);
      }

      // Hotspot pins — larger, translucent orange circles behind vehicles
      for (const h of (hotspots ?? [])) {
        const marker = L.circleMarker([h.lat, h.lon], {
          radius: 11,
          fillColor: "#ea7c1e",
          fillOpacity: 0.45,
          color: "#c2620a",
          weight: 2,
        });
        marker.bindTooltip(
          `<strong>${h.name}</strong>` +
            (h.visits ? `<br/>${h.visits} visits` : ""),
          { direction: "top", offset: [0, -12] }
        );
        marker.addTo(map);
      }

      if (markerLatLngs.length > 1) {
        try {
          map.fitBounds(L.latLngBounds(markerLatLngs), { padding: [30, 30] });
        } catch {
          // ignore
        }
      }
    });
  }, [vehicles, onVehicleClick, hotspots]);

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden border border-border">
      <div ref={mapContainerRef} className="w-full h-full" />
      {/* Legend */}
      <div className="absolute bottom-3 left-3 z-[400] bg-white/90 backdrop-blur-sm border border-border rounded-lg px-3 py-2 flex items-center gap-3 text-xs shadow-sm">
        {[
          { label: "Active", color: "#059669" },
          { label: "Idle", color: "#f59e0b" },
          { label: "Offline", color: "#9ca3af" },
        ].map(({ label, color }) => (
          <div key={label} className="flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: color }}
            />
            <span className="text-muted-foreground">{label}</span>
          </div>
        ))}
        {(hotspots ?? []).length > 0 && (
          <>
            <span className="w-px h-3 bg-border" />
            <div className="flex items-center gap-1.5">
              <span
                className="h-3 w-3 rounded-full border-2 opacity-70"
                style={{ backgroundColor: "#ea7c1e", borderColor: "#c2620a" }}
              />
              <span className="text-muted-foreground">Stop hotspot</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

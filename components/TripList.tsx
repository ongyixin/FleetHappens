/**
 * TripList — scrollable sidebar list of trips.
 */

import type { TripSummary } from "@/types";
import { format } from "date-fns";
import { MapPin, Clock, Gauge, ArrowRight } from "lucide-react";

interface Props {
  trips: TripSummary[];
  loading: boolean;
  selectedTripId?: string | null;
  onSelect: (trip: TripSummary) => void;
}

export default function TripList({ trips, loading, selectedTripId, onSelect }: Props) {
  if (loading) {
    return (
      <div className="p-3 space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-[72px] rounded-lg bg-muted/60 animate-pulse"
            style={{ animationDelay: `${i * 60}ms` }}
          />
        ))}
      </div>
    );
  }

  if (trips.length === 0) {
    return (
      <div className="p-6 text-center">
        <p className="text-sm text-muted-foreground">No trips found for this vehicle.</p>
        <p className="text-xs text-muted-foreground/60 mt-1">
          Try a different date range or check back later.
        </p>
      </div>
    );
  }

  return (
    <div className="p-2 space-y-0.5">
      {trips.map((trip) => {
        const isSelected = trip.id === selectedTripId;
        return (
          <button
            key={trip.id}
            onClick={() => onSelect(trip)}
            className={[
              "w-full text-left px-3 py-3 rounded-lg transition-all duration-100 relative group",
              isSelected
                ? "bg-fleet-navy text-white shadow-sm"
                : "hover:bg-muted/60 text-foreground",
            ].join(" ")}
          >
            {/* Selected indicator bar */}
            {isSelected && (
              <div className="absolute left-0 top-2 bottom-2 w-[3px] bg-fleet-orange rounded-r-full" />
            )}

            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className={[
                  "text-[13px] font-semibold leading-snug",
                  isSelected ? "text-white" : "text-foreground",
                ].join(" ")}>
                  {format(new Date(trip.start), "EEE, MMM d")}
                </p>
                <p className={[
                  "text-[11px] mt-0.5",
                  isSelected ? "text-white/60" : "text-muted-foreground",
                ].join(" ")}>
                  {format(new Date(trip.start), "h:mm a")}
                </p>
              </div>
              <ArrowRight className={[
                "h-3.5 w-3.5 shrink-0 mt-0.5 transition-opacity",
                isSelected ? "text-white/50 opacity-100" : "text-muted-foreground opacity-0 group-hover:opacity-60",
              ].join(" ")} />
            </div>

            <div className={[
              "mt-2 flex items-center gap-3 text-[11px]",
              isSelected ? "text-white/70" : "text-muted-foreground",
            ].join(" ")}>
              <span className="flex items-center gap-1">
                <MapPin className="w-2.5 h-2.5" />
                {trip.distanceKm} km
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-2.5 h-2.5" />
                {trip.drivingDuration.slice(0, 5)}
              </span>
              <span className="flex items-center gap-1">
                <Gauge className="w-2.5 h-2.5" />
                {trip.averageSpeedKmh} km/h
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

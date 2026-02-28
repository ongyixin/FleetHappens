import type { TripSummary } from "@/types";
import { format } from "date-fns";
import { MapPin, Clock, Gauge } from "lucide-react";

interface Props {
  trips: TripSummary[];
  loading: boolean;
  selectedTripId?: string | null;
  onSelect: (trip: TripSummary) => void;
}

export default function TripList({ trips, loading, selectedTripId, onSelect }: Props) {
  if (loading) {
    return (
      <div className="p-2.5 space-y-1.5">
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            className="h-[68px] rounded-xl skeleton-shimmer"
            style={{ animationDelay: `${i * 50}ms` }}
          />
        ))}
      </div>
    );
  }

  if (trips.length === 0) {
    return (
      <div className="p-6 text-center">
        <p className="text-sm text-[rgba(232,237,248,0.4)] font-body">No trips found for this vehicle.</p>
        <p className="text-xs text-[rgba(232,237,248,0.25)] mt-1 font-body">Try a different date range or check back later.</p>
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
              "w-full text-left px-3.5 py-3 rounded-xl transition-all duration-150 relative group overflow-hidden",
              isSelected
                ? "bg-[rgba(245,166,35,0.1)] border border-[rgba(245,166,35,0.25)]"
                : "hover:bg-[rgba(255,255,255,0.04)] border border-transparent",
            ].join(" ")}
          >
            {/* Selected amber left bar */}
            {isSelected && (
              <div className="absolute left-0 top-3 bottom-3 w-[2.5px] bg-[#f5a623] rounded-r-full" />
            )}

            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className={["text-[13px] font-display font-bold leading-snug", isSelected ? "text-[#f5a623]" : "text-white"].join(" ")}>
                  {format(new Date(trip.start), "EEE, MMM d")}
                </p>
                <p className={["text-[11px] mt-0.5 font-data", isSelected ? "text-[rgba(245,166,35,0.6)]" : "text-[rgba(232,237,248,0.4)]"].join(" ")}>
                  {format(new Date(trip.start), "h:mm a")}
                </p>
              </div>
              <svg
                className={["h-3.5 w-3.5 shrink-0 mt-0.5 transition-all", isSelected ? "text-[#f5a623] opacity-100" : "text-[rgba(232,237,248,0.25)] opacity-0 group-hover:opacity-100"].join(" ")}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>

            <div className={["mt-2 flex items-center gap-3 text-[11px] font-data", isSelected ? "text-[rgba(245,166,35,0.55)]" : "text-[rgba(232,237,248,0.38)]"].join(" ")}>
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

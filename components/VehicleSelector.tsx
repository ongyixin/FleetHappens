/**
 * VehicleSelector — grid of vehicle cards for the landing page.
 */

import type { VehicleCard } from "@/types";
import { formatDistanceToNow } from "date-fns";
import { Truck, Car, Bus, MapPin, ChevronRight, Circle } from "lucide-react";

interface Props {
  vehicles: VehicleCard[];
  onSelect: (vehicle: VehicleCard) => void;
}

function VehicleIcon({ type }: { type?: string }) {
  const t = (type ?? "").toLowerCase();
  if (t.includes("truck")) return <Truck className="w-5 h-5" />;
  if (t.includes("bus") || t.includes("van")) return <Bus className="w-5 h-5" />;
  return <Car className="w-5 h-5" />;
}

export default function VehicleSelector({ vehicles, onSelect }: Props) {
  if (vehicles.length === 0) {
    return (
      <div className="py-16 text-center">
        <div className="inline-flex flex-col items-center gap-3">
          <div className="rounded-full bg-muted p-5">
            <Truck className="h-7 w-7 text-muted-foreground" />
          </div>
          <p className="font-semibold text-foreground">No vehicles found</p>
          <p className="text-sm text-muted-foreground max-w-xs">
            Your fleet is taking the day off. (Or the demo account is still warming up.)
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
      {vehicles.map((v) => (
        <button
          key={v.id}
          onClick={() => onSelect(v)}
          className="group relative flex flex-col gap-0 bg-white rounded-xl border border-border text-left transition-all duration-150 hover:border-fleet-blue/50 hover:shadow-[0_4px_16px_rgba(14,36,64,0.08)] overflow-hidden"
        >
          {/* Left accent bar — appears on hover */}
          <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-fleet-navy opacity-0 group-hover:opacity-100 transition-opacity duration-150 rounded-l-xl" />

          <div className="p-5">
            {/* Header row */}
            <div className="flex items-start justify-between mb-3.5">
              <div className="p-2.5 rounded-lg bg-fleet-navy/8 text-fleet-navy group-hover:bg-fleet-navy group-hover:text-white transition-all duration-150">
                <VehicleIcon type={v.deviceType} />
              </div>
              <div className="flex items-center gap-2">
                {v.currentPosition && (
                  <span className="flex items-center gap-1 text-xs font-medium text-fleet-teal">
                    <Circle className="w-2 h-2 fill-fleet-teal" />
                    Live
                  </span>
                )}
                <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-fleet-blue group-hover:translate-x-0.5 transition-all duration-150" />
              </div>
            </div>

            {/* Vehicle info */}
            <div>
              <h3 className="font-semibold text-foreground text-[15px] group-hover:text-fleet-navy transition-colors leading-snug">
                {v.name}
              </h3>
              {v.deviceType && (
                <p className="text-xs text-muted-foreground mt-0.5">{v.deviceType}</p>
              )}
            </div>
          </div>

          {/* Footer */}
          {v.lastCommunication && (
            <div className="px-5 py-2.5 border-t border-border bg-muted/30">
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <MapPin className="w-3 h-3 shrink-0" />
                Last seen{" "}
                {formatDistanceToNow(new Date(v.lastCommunication), { addSuffix: true })}
              </p>
            </div>
          )}
        </button>
      ))}
    </div>
  );
}

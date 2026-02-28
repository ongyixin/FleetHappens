import type { VehicleCard } from "@/types";
import { formatDistanceToNow } from "date-fns";
import { Truck, Car, Bus, Clock, Circle } from "lucide-react";

interface Props {
  vehicles: VehicleCard[];
  onSelect: (vehicle: VehicleCard) => void;
}

function VehicleIcon({ type }: { type?: string }) {
  const t = (type ?? "").toLowerCase();
  if (t.includes("truck")) return <Truck className="w-4.5 h-4.5" />;
  if (t.includes("bus") || t.includes("van")) return <Bus className="w-4.5 h-4.5" />;
  return <Car className="w-4.5 h-4.5" />;
}

export default function VehicleSelector({ vehicles, onSelect }: Props) {
  if (vehicles.length === 0) {
    return (
      <div className="py-20 text-center">
        <div className="inline-flex flex-col items-center gap-4">
          <div className="rounded-2xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] p-6">
            <Truck className="h-8 w-8 text-[rgba(232,237,248,0.25)]" />
          </div>
          <div>
            <p className="font-display font-bold text-white text-base">No vehicles found</p>
            <p className="text-sm text-[rgba(232,237,248,0.4)] mt-1 max-w-xs font-body">
              Your fleet is taking the day off. (Or the demo account is still warming up.)
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 stagger">
      {vehicles.map((v) => (
        <button
          key={v.id}
          onClick={() => onSelect(v)}
          className="group relative text-left animate-fade-up overflow-hidden rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#101318] hover:border-[rgba(245,166,35,0.35)] hover:bg-[rgba(245,166,35,0.04)] transition-all duration-200"
        >
          {/* Amber top accent — appears on hover */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#f5a623] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

          <div className="p-5">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="p-2.5 rounded-xl bg-[rgba(56,189,248,0.08)] text-[#38bdf8] group-hover:bg-[rgba(245,166,35,0.12)] group-hover:text-[#f5a623] transition-all duration-200">
                <VehicleIcon type={v.deviceType} />
              </div>
              <div className="flex items-center gap-2">
                {v.currentPosition && (
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-[#34d399] font-body">
                    <Circle className="w-1.5 h-1.5 fill-[#34d399]" />
                    Live
                  </span>
                )}
                <svg
                  className="w-4 h-4 text-[rgba(232,237,248,0.2)] group-hover:text-[#f5a623] group-hover:translate-x-0.5 transition-all duration-200"
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>

            {/* Vehicle info */}
            <div>
              <h3 className="font-display font-bold text-white text-base leading-snug group-hover:text-white">
                {v.name}
              </h3>
              {v.deviceType && (
                <p className="text-[11px] text-[rgba(232,237,248,0.4)] mt-0.5 font-body">{v.deviceType}</p>
              )}
            </div>
          </div>

          {/* Footer */}
          {v.lastCommunication && (
            <div className="px-5 py-3 border-t border-[rgba(255,255,255,0.06)] flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-[rgba(232,237,248,0.3)] shrink-0" />
              <p className="text-[11px] text-[rgba(232,237,248,0.4)] font-body">
                {formatDistanceToNow(new Date(v.lastCommunication), { addSuffix: true })}
              </p>
            </div>
          )}
        </button>
      ))}
    </div>
  );
}

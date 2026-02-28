import type { TripSummary } from "@/types";
import { MapPin, Clock, Gauge, Timer, TrendingUp } from "lucide-react";

interface Props { trip: TripSummary; loading?: boolean; }

interface StatProps { icon: React.ReactNode; label: string; value: string; highlight?: boolean; }

function Stat({ icon, label, value, highlight }: StatProps) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className={`rounded-lg p-1.5 shrink-0 ${highlight ? "bg-[rgba(251,146,60,0.1)] text-[#fb923c]" : "bg-[rgba(56,189,248,0.08)] text-[#38bdf8]"}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[rgba(232,237,248,0.35)] font-body">{label}</p>
        <p className="text-xs font-data font-semibold text-white leading-tight">{value}</p>
      </div>
    </div>
  );
}

export default function TripStatsCard({ trip, loading }: Props) {
  if (loading) {
    return (
      <div className="flex items-center gap-4 flex-wrap">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg skeleton-shimmer" />
            <div className="space-y-1">
              <div className="h-2 w-10 rounded skeleton-shimmer" />
              <div className="h-3 w-14 rounded skeleton-shimmer" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <Stat icon={<MapPin className="w-3 h-3" />}    label="Distance"  value={`${trip.distanceKm} km`} />
      <Stat icon={<Clock className="w-3 h-3" />}     label="Drive"     value={trip.drivingDuration.slice(0, 5)} />
      <Stat icon={<Timer className="w-3 h-3" />}     label="Idle"      value={trip.idlingDuration.slice(0, 5)} highlight />
      <Stat icon={<Gauge className="w-3 h-3" />}     label="Avg spd"   value={`${trip.averageSpeedKmh} km/h`} />
      <Stat icon={<TrendingUp className="w-3 h-3" />} label="Max spd"  value={`${trip.maxSpeedKmh} km/h`} highlight />
    </div>
  );
}

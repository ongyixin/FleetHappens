/**
 * TripStatsCard — metric strip showing key trip stats for the selected trip.
 */

import type { TripSummary } from "@/types";
import { MapPin, Clock, Gauge, Timer, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  trip: TripSummary;
  loading?: boolean;
}

interface StatProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: boolean;
}

function Stat({ icon, label, value, accent }: StatProps) {
  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <div className={cn(
        "rounded-md p-1.5 shrink-0",
        accent ? "bg-fleet-orange/10" : "bg-fleet-blue/8"
      )}>
        <span className={accent ? "text-fleet-orange" : "text-fleet-blue"}>
          {icon}
        </span>
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className="text-sm font-bold text-foreground leading-tight">{value}</p>
      </div>
    </div>
  );
}

export default function TripStatsCard({ trip, loading }: Props) {
  if (loading) {
    return (
      <div className="flex items-center gap-4 flex-wrap animate-pulse">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-muted" />
            <div className="space-y-1">
              <div className="h-2 w-12 bg-muted rounded" />
              <div className="h-3 w-16 bg-muted rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4 flex-wrap">
      <Stat
        icon={<MapPin className="w-3.5 h-3.5" />}
        label="Distance"
        value={`${trip.distanceKm} km`}
      />
      <Stat
        icon={<Clock className="w-3.5 h-3.5" />}
        label="Drive time"
        value={trip.drivingDuration.slice(0, 5)}
      />
      <Stat
        icon={<Timer className="w-3.5 h-3.5" />}
        label="Idle time"
        value={trip.idlingDuration.slice(0, 5)}
        accent
      />
      <Stat
        icon={<Gauge className="w-3.5 h-3.5" />}
        label="Avg speed"
        value={`${trip.averageSpeedKmh} km/h`}
      />
      <Stat
        icon={<TrendingUp className="w-3.5 h-3.5" />}
        label="Max speed"
        value={`${trip.maxSpeedKmh} km/h`}
        accent
      />
    </div>
  );
}

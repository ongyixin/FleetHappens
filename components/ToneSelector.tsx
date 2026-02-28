"use client";

import { BookOpen, Smile, Film } from "lucide-react";
import type { ComicTone } from "@/types";
import { cn } from "@/lib/utils";

interface ToneSelectorProps {
  value: ComicTone;
  onChange: (tone: ComicTone) => void;
  disabled?: boolean;
}

const TONES: Array<{
  id: ComicTone;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  sample: string;
  accentColor: string;
}> = [
  {
    id: "guidebook",
    label: "Guidebook",
    description: "Elegant & factual",
    icon: BookOpen,
    sample: "\"The 47.8 km route from SF to Oakland took 2h 24m at 62 km/h average.\"",
    accentColor: "fleet-blue",
  },
  {
    id: "playful",
    label: "Playful",
    description: "Warm & punchy",
    icon: Smile,
    sample: "\"Hit the road at 7:18 AM — someone's an early bird! 47 clicks later, the Bay appeared.\"",
    accentColor: "fleet-orange",
  },
  {
    id: "cinematic",
    label: "Cinematic",
    description: "Atmospheric",
    icon: Film,
    sample: "\"Dawn broke over the Bay Bridge. Steel and salt air stretched toward the East Bay hills.\"",
    accentColor: "fleet-teal",
  },
];

const ACTIVE_STYLES: Record<string, string> = {
  "fleet-blue":   "border-fleet-blue/50 bg-fleet-blue/10 text-fleet-blue",
  "fleet-orange": "border-fleet-orange/50 bg-fleet-orange/10 text-fleet-orange",
  "fleet-teal":   "border-fleet-teal/50 bg-fleet-teal/10 text-fleet-teal",
};

const ICON_ACTIVE: Record<string, string> = {
  "fleet-blue":   "text-fleet-blue",
  "fleet-orange": "text-fleet-orange",
  "fleet-teal":   "text-fleet-teal",
};

export default function ToneSelector({ value, onChange, disabled }: ToneSelectorProps) {
  const activeTone = TONES.find((t) => t.id === value);

  return (
    <div className="space-y-3">
      <p className="text-[10px] font-semibold text-white/40 uppercase tracking-[0.12em] px-0.5">
        Story Tone
      </p>
      <div className="grid grid-cols-3 gap-2">
        {TONES.map((tone) => {
          const Icon = tone.icon;
          const isActive = value === tone.id;
          return (
            <button
              key={tone.id}
              onClick={() => onChange(tone.id)}
              disabled={disabled}
              className={cn(
                "flex flex-col items-center gap-2 rounded-xl border p-3.5 text-center transition-all duration-150",
                isActive
                  ? ACTIVE_STYLES[tone.accentColor]
                  : "border-white/10 bg-white/5 text-white/40 hover:border-white/20 hover:bg-white/8 hover:text-white/60",
                disabled && "opacity-40 pointer-events-none"
              )}
            >
              <Icon className={cn(
                "h-4 w-4",
                isActive ? ICON_ACTIVE[tone.accentColor] : "text-white/40"
              )} />
              <div>
                <span className={cn(
                  "block text-xs font-bold",
                  isActive ? "" : "text-white/60"
                )}>
                  {tone.label}
                </span>
                <span className="block text-[10px] mt-0.5 text-white/30 leading-tight">
                  {tone.description}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Active tone sample */}
      {activeTone && (
        <div className="rounded-lg bg-white/5 border border-white/8 px-3.5 py-2.5">
          <p className="text-[11px] text-white/40 italic leading-relaxed">
            {activeTone.sample}
          </p>
        </div>
      )}
    </div>
  );
}

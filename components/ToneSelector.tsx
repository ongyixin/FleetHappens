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
  color: string;
  activeBg: string;
  activeBorder: string;
}> = [
  {
    id: "guidebook",
    label: "Guidebook",
    description: "Elegant & factual",
    icon: BookOpen,
    sample: "\"The 47.8 km route from SF to Oakland took 2h 24m at 62 km/h average.\"",
    color: "#38bdf8",
    activeBg: "rgba(56,189,248,0.1)",
    activeBorder: "rgba(56,189,248,0.3)",
  },
  {
    id: "playful",
    label: "Playful",
    description: "Warm & punchy",
    icon: Smile,
    sample: "\"Hit the road at 7:18 AM — someone's an early bird! 47 clicks later, the Bay appeared.\"",
    color: "#f5a623",
    activeBg: "rgba(245,166,35,0.1)",
    activeBorder: "rgba(245,166,35,0.35)",
  },
  {
    id: "cinematic",
    label: "Cinematic",
    description: "Atmospheric",
    icon: Film,
    sample: "\"Dawn broke over the Bay Bridge. Steel and salt air stretched toward the East Bay hills.\"",
    color: "#34d399",
    activeBg: "rgba(52,211,153,0.1)",
    activeBorder: "rgba(52,211,153,0.3)",
  },
];

export default function ToneSelector({ value, onChange, disabled }: ToneSelectorProps) {
  const activeTone = TONES.find((t) => t.id === value);

  return (
    <div className="space-y-3">
      <p className="text-[9px] font-bold text-[rgba(232,237,248,0.35)] uppercase tracking-[0.18em] font-body">
        Story Tone
      </p>
      <div className="grid grid-cols-3 gap-2">
        {TONES.map((tone) => {
          const Icon     = tone.icon;
          const isActive = value === tone.id;
          return (
            <button
              key={tone.id}
              onClick={() => onChange(tone.id)}
              disabled={disabled}
              className={cn(
                "flex flex-col items-center gap-2.5 rounded-xl border p-3.5 text-center transition-all duration-150",
                isActive
                  ? "border-opacity-100"
                  : "border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] text-[rgba(232,237,248,0.4)] hover:border-[rgba(255,255,255,0.15)] hover:bg-[rgba(255,255,255,0.06)] hover:text-[rgba(232,237,248,0.7)]",
                disabled && "opacity-40 pointer-events-none"
              )}
              style={isActive ? {
                background: tone.activeBg,
                borderColor: tone.activeBorder,
              } : {}}
            >
              <div style={{ color: isActive ? tone.color : undefined }}>
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <span className="block text-xs font-display font-bold" style={{ color: isActive ? tone.color : undefined }}>
                  {tone.label}
                </span>
                <span className="block text-[10px] mt-0.5 text-[rgba(232,237,248,0.35)] leading-tight font-body">
                  {tone.description}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {activeTone && (
        <div className="rounded-xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.07)] px-4 py-3">
          <p className="text-[11px] text-[rgba(232,237,248,0.45)] italic leading-relaxed font-body">
            {activeTone.sample}
          </p>
        </div>
      )}
    </div>
  );
}

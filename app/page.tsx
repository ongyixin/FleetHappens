"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import VehicleSelector from "@/components/VehicleSelector";
import type { VehicleCard, FleetGroup, ApiResponse } from "@/types";
import { MapPin, Brain, BookOpen, Zap } from "lucide-react";

const FEATURES = [
  {
    icon: MapPin,
    label: "Live GPS trip maps",
    desc: "Breadcrumbs + stop markers",
    href: "/features#live-gps",
    tooltip: "Watch every trip come alive on an interactive map. Real-time breadcrumb trails trace each route, stop markers reveal where vehicles paused, and coverage heat zones show your fleet's geographic footprint.",
  },
  {
    icon: Brain,
    label: "Ace fleet intelligence",
    desc: "Historical pattern mining",
    href: "/features#ace-intelligence",
    tooltip: "Geotab Ace digs through months of trip history to surface distance trends, utilization rates, outlier vehicles, and recurring patterns — so you can act on data, not instinct.",
  },
  {
    icon: BookOpen,
    label: "Comic trip recaps",
    desc: "LLM-narrated stories",
    href: "/features#comic-recaps",
    tooltip: "Every route becomes a story. An LLM weaves trip data into comic-panel narratives — naming neighbourhoods, calling out unusual stops, and giving each journey personality and context.",
  },
  {
    icon: Zap,
    label: "Fleet Pulse overview",
    desc: "Multi-fleet portfolio",
    href: "/features#fleet-pulse",
    tooltip: "A command-centre view across your entire vehicle portfolio. Compare fleet KPIs side-by-side, spot underperformers, and drill from company level down to a single vehicle in two clicks.",
  },
];

export default function HomePage() {
  const router = useRouter();
  const [vehicles, setVehicles]               = useState<VehicleCard[]>([]);
  const [groups, setGroups]                   = useState<FleetGroup[]>([]);
  const [loading, setLoading]                 = useState(true);
  const [error, setError]                     = useState<string | null>(null);
  const [showVehicleSelector, setShowVehicleSelector] = useState(false);
  const [pulseRoute, setPulseRoute] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        const [groupsRes, devicesRes] = await Promise.all([
          fetch("/api/geotab/groups"),
          fetch("/api/geotab/devices"),
        ]);
        const groupsData  = (await groupsRes.json())  as ApiResponse<FleetGroup[]>;
        const devicesData = (await devicesRes.json()) as ApiResponse<VehicleCard[]>;

        if (devicesData.ok) setVehicles(devicesData.data);

        if (groupsData.ok) {
          setGroups(groupsData.data);
          if (groupsData.data.length >= 1) { setPulseRoute("/pulse"); return; }
        }

        setShowVehicleSelector(true);
      } catch {
        setError("Network error");
        setShowVehicleSelector(true);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  function handleSelect(vehicle: VehicleCard) {
    router.push(`/dashboard?deviceId=${vehicle.id}&deviceName=${encodeURIComponent(vehicle.name)}`);
  }

  return (
    <div className="min-h-screen bg-[#09090e] overflow-x-hidden">
      {/* Background: subtle radial + grid */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0 atlas-grid-bg opacity-60" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-[radial-gradient(ellipse_at_top,rgba(245,166,35,0.06)_0%,transparent_65%)]" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[400px] bg-[radial-gradient(ellipse_at_bottom_right,rgba(56,189,248,0.04)_0%,transparent_60%)]" />
      </div>

      {/* Nav */}
      <nav className="relative z-10 border-b border-white/[0.06]">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#f5a623] flex items-center justify-center shadow-[0_2px_8px_rgba(245,166,35,0.4)]">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 7 C2 4 4 2 7 2 S12 4 12 7 L7 12 L2 7Z" fill="#09090e" />
              </svg>
            </div>
            <span className="font-display font-bold text-white tracking-tight text-sm">
              FleetHappens
            </span>
          </div>
          <span className="text-[11px] font-semibold text-[#f5a623] bg-[rgba(245,166,35,0.1)] border border-[rgba(245,166,35,0.2)] rounded-full px-3 py-1 font-body">
            Geotab Vibe Coding Challenge
          </span>
        </div>
      </nav>

      {/* Hero */}
      <div className="relative z-10 max-w-6xl mx-auto px-6 pt-20 pb-16">
        {/* Tag */}
        <div className="inline-flex items-center gap-2 mb-8 animate-fade-in">
          <div className="w-1.5 h-1.5 rounded-full bg-[#f5a623] animate-glow-pulse" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[rgba(232,237,248,0.5)] font-body">
            Fleet Route Intelligence
          </span>
        </div>

        {/* Headline */}
        <h1 className="font-display font-extrabold text-white leading-[0.96] tracking-[-0.03em] mb-6 animate-fade-up" style={{ animationDelay: "60ms" }}>
          <span className="block text-[clamp(3rem,8vw,6rem)]">Fleet data.</span>
          <span className="block text-[clamp(3rem,8vw,6rem)] text-[#f5a623]">Real stories.</span>
        </h1>

        <p className="font-body text-[rgba(232,237,248,0.55)] text-lg leading-relaxed max-w-lg mb-10 animate-fade-up" style={{ animationDelay: "120ms" }}>
          Turn raw Geotab trip data into contextual area briefings and
          comic-style route recaps — powered by Direct API and Ace.
        </p>

        {/* Feature chips */}
        <div className="flex flex-wrap gap-3 mb-12 stagger animate-fade-up" style={{ animationDelay: "180ms" }}>
          {FEATURES.map(({ icon: Icon, label, desc, href, tooltip }) => (
            <button
              key={label}
              onClick={() => router.push(href)}
              className="relative flex items-center gap-2.5 bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-xl px-4 py-2.5 hover:border-[rgba(245,166,35,0.3)] hover:bg-[rgba(245,166,35,0.05)] transition-all duration-200 group text-left cursor-pointer"
            >
              <div className="w-7 h-7 rounded-lg bg-[rgba(245,166,35,0.1)] flex items-center justify-center shrink-0 group-hover:bg-[rgba(245,166,35,0.18)] transition-colors">
                <Icon className="h-3.5 w-3.5 text-[#f5a623]" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-white font-body leading-none">{label}</p>
                <p className="text-[11px] text-[rgba(232,237,248,0.4)] mt-0.5 font-body">{desc}</p>
              </div>

              {/* Tooltip */}
              <div
                className="pointer-events-none absolute bottom-[calc(100%+10px)] left-1/2 -translate-x-1/2 w-60 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-y-1 group-hover:translate-y-0 z-50"
                role="tooltip"
              >
                <div className="bg-[#13131c] border border-[rgba(245,166,35,0.22)] rounded-2xl p-3.5 shadow-[0_16px_40px_rgba(0,0,0,0.7),0_0_0_1px_rgba(245,166,35,0.06)]">
                  <p className="text-[11.5px] text-[rgba(232,237,248,0.7)] leading-relaxed font-body">{tooltip}</p>
                  <p className="text-[10px] font-semibold text-[#f5a623] mt-2 font-body tracking-wide">View details →</p>
                </div>
                {/* Caret */}
                <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-[rgba(245,166,35,0.22)]" />
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-[-1px] w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[5px] border-t-[#13131c]" />
              </div>
            </button>
          ))}
        </div>

        {/* CTAs */}
        <div className="flex items-center gap-4 animate-fade-up" style={{ animationDelay: "240ms" }}>
          {loading && !pulseRoute && (
            <div className="inline-flex items-center gap-3 h-11 px-6 rounded-xl bg-[rgba(245,166,35,0.08)] border border-[rgba(245,166,35,0.2)] text-sm font-semibold text-[rgba(245,166,35,0.5)] font-body cursor-default select-none">
              <div className="relative w-4 h-4">
                <div className="absolute inset-0 rounded-full border-2 border-[rgba(245,166,35,0.2)]" />
                <div className="absolute inset-0 rounded-full border-2 border-t-[#f5a623] border-transparent animate-spin" />
              </div>
              Connecting to fleet…
            </div>
          )}

          {pulseRoute && (
            <button
              onClick={() => router.push(pulseRoute)}
              className="btn-amber inline-flex items-center gap-2 h-11 px-6 rounded-xl text-sm group relative overflow-hidden"
            >
              <Zap className="h-4 w-4 transition-transform group-hover:scale-110" />
              Enter Fleet Pulse
              <span className="absolute inset-0 rounded-xl ring-2 ring-[#f5a623]/0 group-hover:ring-[#f5a623]/30 transition-all duration-300" />
            </button>
          )}

          {!loading && !pulseRoute && (
            <button
              onClick={() => router.push("/pulse")}
              className="btn-amber inline-flex items-center gap-2 h-11 px-6 rounded-xl text-sm"
            >
              <Zap className="h-4 w-4" />
              Open Fleet Pulse
            </button>
          )}

          <button
            onClick={() => setShowVehicleSelector(true)}
            className="inline-flex items-center gap-2 h-11 px-6 rounded-xl text-sm font-semibold text-[rgba(232,237,248,0.6)] hover:text-white hover:bg-[rgba(255,255,255,0.06)] border border-transparent hover:border-[rgba(255,255,255,0.08)] transition-all font-body"
          >
            Pick a vehicle →
          </button>
        </div>
      </div>

      {/* Divider line */}
      {(showVehicleSelector || error) && (
        <div className="relative z-10 max-w-6xl mx-auto px-6">
          <div className="h-px bg-gradient-to-r from-transparent via-[rgba(255,255,255,0.08)] to-transparent mb-12" />

          <div className="mb-8">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[rgba(232,237,248,0.35)] mb-2 font-body">
              Fleet Vehicles
            </p>
            <h2 className="font-display font-bold text-2xl text-white">
              Choose a vehicle
            </h2>
            <p className="text-sm text-[rgba(232,237,248,0.5)] mt-1.5 font-body">
              Select a vehicle to explore its trips and generate route stories.
            </p>
          </div>

          {loading && (
            <div className="py-20 flex justify-center">
              <div className="flex flex-col items-center gap-4">
                <div className="relative w-10 h-10">
                  <div className="absolute inset-0 rounded-full border-2 border-[rgba(245,166,35,0.2)]" />
                  <div className="absolute inset-0 rounded-full border-2 border-t-[#f5a623] border-transparent animate-spin" />
                </div>
                <p className="text-sm text-[rgba(232,237,248,0.4)] font-body">Rounding up the vehicles…</p>
              </div>
            </div>
          )}

          {error && (
            <div className="py-20 flex justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="rounded-2xl bg-[rgba(248,113,113,0.08)] border border-[rgba(248,113,113,0.2)] p-5">
                  <MapPin className="h-7 w-7 text-[#f87171] mx-auto" />
                </div>
                <p className="text-sm font-semibold text-[#f87171] font-body">{error}</p>
                <p className="text-xs text-[rgba(232,237,248,0.4)] font-body">Check your Geotab credentials in .env.local</p>
              </div>
            </div>
          )}

          {!loading && !error && (
            <div className="pb-20">
              <VehicleSelector vehicles={vehicles} onSelect={handleSelect} />
            </div>
          )}
        </div>
      )}

      {/* Ready state: fleet found, waiting for user to click Enter */}
      {!loading && pulseRoute && (
        <div className="relative z-10 max-w-6xl mx-auto px-6 pb-20">
          <div className="h-px bg-gradient-to-r from-transparent via-[rgba(245,166,35,0.15)] to-transparent mb-12" />
          <div className="py-10 flex justify-center">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="w-2 h-2 rounded-full bg-[#f5a623] animate-glow-pulse" />
              <p className="text-sm text-[rgba(232,237,248,0.45)] font-body">
                Fleet data loaded — click <span className="text-[#f5a623] font-semibold">Enter Fleet Pulse</span> above to continue
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

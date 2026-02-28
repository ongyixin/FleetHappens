"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import VehicleSelector from "@/components/VehicleSelector";
import type { VehicleCard, FleetGroup, ApiResponse } from "@/types";
import { MapPin, Brain, BookOpen, Zap } from "lucide-react";

const FEATURES = [
  { icon: MapPin,   label: "Live GPS trip maps",           desc: "Breadcrumbs + stop markers" },
  { icon: Brain,    label: "Ace fleet intelligence",        desc: "Historical pattern mining" },
  { icon: BookOpen, label: "Comic trip recaps",             desc: "LLM-narrated stories" },
  { icon: Zap,      label: "Fleet Pulse overview",          desc: "Multi-fleet portfolio" },
];

export default function HomePage() {
  const router = useRouter();
  const [vehicles, setVehicles]               = useState<VehicleCard[]>([]);
  const [groups, setGroups]                   = useState<FleetGroup[]>([]);
  const [loading, setLoading]                 = useState(true);
  const [error, setError]                     = useState<string | null>(null);
  const [showVehicleSelector, setShowVehicleSelector] = useState(false);

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
          if (groupsData.data.length > 1) { router.replace("/pulse"); return; }
          if (groupsData.data.length === 1) { router.replace(`/pulse/${groupsData.data[0].id}`); return; }
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
  }, [router]);

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
          {FEATURES.map(({ icon: Icon, label, desc }) => (
            <div
              key={label}
              className="flex items-center gap-2.5 bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-xl px-4 py-2.5 hover:border-[rgba(245,166,35,0.3)] hover:bg-[rgba(245,166,35,0.05)] transition-all duration-200 group"
            >
              <div className="w-7 h-7 rounded-lg bg-[rgba(245,166,35,0.1)] flex items-center justify-center shrink-0 group-hover:bg-[rgba(245,166,35,0.18)] transition-colors">
                <Icon className="h-3.5 w-3.5 text-[#f5a623]" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-white font-body leading-none">{label}</p>
                <p className="text-[11px] text-[rgba(232,237,248,0.4)] mt-0.5 font-body">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* CTAs */}
        <div className="flex items-center gap-4 animate-fade-up" style={{ animationDelay: "240ms" }}>
          <button
            onClick={() => router.push("/pulse")}
            className="btn-amber inline-flex items-center gap-2 h-11 px-6 rounded-xl text-sm"
          >
            <Zap className="h-4 w-4" />
            Open Fleet Pulse
          </button>
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

          {!loading && !error && groups.length === 0 && (
            <div className="pb-20">
              <VehicleSelector vehicles={vehicles} onSelect={handleSelect} />
            </div>
          )}
        </div>
      )}

      {/* Loading splash while routing */}
      {loading && !showVehicleSelector && !error && (
        <div className="relative z-10 max-w-6xl mx-auto px-6 pb-20">
          <div className="h-px bg-gradient-to-r from-transparent via-[rgba(255,255,255,0.08)] to-transparent mb-12" />
          <div className="py-16 flex justify-center">
            <div className="flex flex-col items-center gap-4">
              <div className="relative w-10 h-10">
                <div className="absolute inset-0 rounded-full border-2 border-[rgba(245,166,35,0.2)]" />
                <div className="absolute inset-0 rounded-full border-2 border-t-[#f5a623] border-transparent animate-spin" />
              </div>
              <p className="text-sm text-[rgba(232,237,248,0.4)] font-body">Loading your fleet…</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

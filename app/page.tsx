/**
 * Landing Page
 *
 * Entry point for FleetHappens.
 * Shows a hero splash while checking whether to route to:
 *   - /pulse          (multiple fleet groups detected → company view)
 *   - /pulse/[id]     (single fleet group → fleet view)
 *   - vehicle selector fallback (no groups or group fetch failed)
 */

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import VehicleSelector from "@/components/VehicleSelector";
import type { VehicleCard, FleetGroup, ApiResponse } from "@/types";
import { MapPin, Brain, BookOpen, Route, Zap, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const FEATURES = [
  { icon: MapPin, label: "Live trip maps with GPS breadcrumbs" },
  { icon: Brain, label: "Fleet pattern insights via Ace API" },
  { icon: BookOpen, label: "Comic-style trip recaps" },
  { icon: Zap, label: "Fleet Pulse portfolio overview" },
];

export default function HomePage() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<VehicleCard[]>([]);
  const [groups, setGroups] = useState<FleetGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showVehicleSelector, setShowVehicleSelector] = useState(false);

  useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        // Fetch groups and devices in parallel
        const [groupsRes, devicesRes] = await Promise.all([
          fetch("/api/geotab/groups"),
          fetch("/api/geotab/devices"),
        ]);

        const groupsData =
          (await groupsRes.json()) as ApiResponse<FleetGroup[]>;
        const devicesData =
          (await devicesRes.json()) as ApiResponse<VehicleCard[]>;

        if (devicesData.ok) setVehicles(devicesData.data);

        if (groupsData.ok) {
          setGroups(groupsData.data);

          // Auto-redirect to Fleet Pulse
          if (groupsData.data.length > 1) {
            router.replace("/pulse");
            return;
          } else if (groupsData.data.length === 1) {
            router.replace(`/pulse/${groupsData.data[0].id}`);
            return;
          }
        }

        // No groups found — fall through to vehicle selector
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
    router.push(
      `/dashboard?deviceId=${vehicle.id}&deviceName=${encodeURIComponent(vehicle.name)}`
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top nav */}
      <nav className="bg-white border-b border-border sticky top-0 z-20 shadow-[0_1px_0_hsl(30,8%,90%)]">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-fleet-navy flex items-center justify-center shadow-sm">
              <Route className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="font-bold text-fleet-navy tracking-tight text-sm">
              FleetHappens
            </span>
          </div>
          <span className="text-xs font-medium text-fleet-amber bg-fleet-amber/10 border border-fleet-amber/25 rounded-full px-3 py-1">
            Geotab Vibe Coding Challenge
          </span>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6">
        {/* Hero */}
        <div className="pt-14 pb-12">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-fleet-blue bg-fleet-blue/8 border border-fleet-blue/20 rounded-full px-3 py-1 mb-6">
            <MapPin className="h-3 w-3" />
            Fleet Route Intelligence
          </div>

          <h1 className="text-5xl font-extrabold text-fleet-navy leading-[1.08] tracking-tight mb-5">
            Fleet intelligence,
            <br />
            <span className="text-fleet-orange">with a story.</span>
          </h1>

          <p className="text-lg text-muted-foreground max-w-xl leading-relaxed mb-8">
            Turn raw Geotab trip data into contextual area briefings and
            comic-style route recaps — powered by Direct API and Ace.
          </p>

          <div className="flex flex-wrap gap-2.5 mb-8">
            {FEATURES.map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-2 bg-white border border-border rounded-lg px-3.5 py-2 text-sm shadow-[0_1px_3px_rgba(14,36,64,0.04)]"
              >
                <Icon className="h-3.5 w-3.5 text-fleet-blue shrink-0" />
                <span className="text-foreground font-medium">{label}</span>
              </div>
            ))}
          </div>

          {/* Fleet Pulse CTA */}
          <div className="flex items-center gap-3">
            <Button
              variant="fleet"
              size="lg"
              onClick={() => router.push("/pulse")}
              className="gap-2 shadow-sm"
            >
              <Zap className="h-4 w-4" />
              Open Fleet Pulse
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="lg"
              onClick={() => setShowVehicleSelector(true)}
              className="text-muted-foreground"
            >
              Pick a vehicle →
            </Button>
          </div>
        </div>

        {/* Vehicle selector — shown when Fleet Pulse routing is skipped */}
        {(showVehicleSelector || error) && (
          <div className="border-t border-border pt-8 pb-16">
            <div className="mb-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                Quick Access
              </p>
              <h2 className="text-xl font-bold text-fleet-navy">
                Choose a vehicle
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Select a vehicle to explore its trips and generate route stories.
              </p>
            </div>

            {loading && (
              <div className="py-16 text-center">
                <div className="inline-flex flex-col items-center gap-3">
                  <div className="h-7 w-7 rounded-full border-2 border-fleet-blue border-t-transparent animate-spin" />
                  <p className="text-sm text-muted-foreground">
                    Rounding up the vehicles…
                  </p>
                </div>
              </div>
            )}

            {error && (
              <div className="py-16 text-center">
                <div className="inline-flex flex-col items-center gap-3">
                  <div className="rounded-full bg-destructive/10 p-4">
                    <Route className="h-6 w-6 text-destructive" />
                  </div>
                  <p className="text-sm font-medium text-destructive">
                    {error}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Check your Geotab credentials in .env.local
                  </p>
                </div>
              </div>
            )}

            {!loading && !error && groups.length === 0 && (
              <VehicleSelector vehicles={vehicles} onSelect={handleSelect} />
            )}
          </div>
        )}

        {/* Loading splash while redirecting */}
        {loading && !showVehicleSelector && !error && (
          <div className="border-t border-border pt-16 pb-16 text-center">
            <div className="inline-flex flex-col items-center gap-3">
              <div className="h-7 w-7 rounded-full border-2 border-fleet-blue border-t-transparent animate-spin" />
              <p className="text-sm text-muted-foreground">
                Loading your fleet…
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

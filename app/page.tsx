"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import VehicleSelector from "@/components/VehicleSelector";
import type { VehicleCard, FleetGroup, ApiResponse } from "@/types";
import { MapPin, Brain, BookOpen, Zap, Library } from "lucide-react";
import Link from "next/link";
import ConnectButton from "@/components/ConnectButton";

// ─── Demo mode banner ─────────────────────────────────────────────────────────

function DemoModeBanner() {
  const [isDemo, setIsDemo] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/geotab/auth")
      .then((r) => r.json())
      .then((d: ApiResponse<{ isDemo: boolean }>) => {
        if (d.ok && d.data) setIsDemo(d.data.isDemo);
      })
      .catch(() => {});
  }, []);

  if (!isDemo) return null;

  return (
    <div className="mb-8 animate-fade-up" style={{ animationDelay: "150ms" }}>
      <div className="inline-flex items-center gap-3 rounded-xl border border-[#f5a623]/20 bg-[#f5a623]/[0.06] px-4 py-3">
        <div className="w-1.5 h-1.5 rounded-full bg-[#f5a623]/60 shrink-0" />
        <p className="text-base font-body text-white/55 leading-snug">
          You&apos;re viewing <span className="text-[#f5a623]/80 font-semibold">demo data</span>.
        </p>
        <Link
          href="/connect"
          className="inline-flex items-center h-11 px-6 rounded-lg text-base font-semibold font-body text-[#f5a623] bg-[rgba(245,166,35,0.1)] border border-[rgba(245,166,35,0.3)] hover:bg-[rgba(245,166,35,0.15)] hover:border-[rgba(245,166,35,0.4)] hover:text-[#f9b93a] transition-all whitespace-nowrap"
        >
          Connect your own fleet →
        </Link>
      </div>
    </div>
  );
}

// ─── Road variations ──────────────────────────────────────────────────────────
// Each variation defines a unique winding road path + GPS breadcrumb dots + pin.
// A random one is picked on every page load.

type RoadDot = { cx: number; cy: number };
type RoadVariant = { path: string; dots: RoadDot[]; pin: RoadDot };

const ROADS: RoadVariant[] = [
  // 1. Bottom-centre → sweeping S-curve → upper-right
  {
    path: "M 340 1100 C 550 950, 480 780, 820 700 S 1300 620, 1180 440 S 960 260, 1480 180 Q 1880 110, 2380 30",
    dots: [
      { cx: 520,  cy: 1010 }, { cx: 640,  cy: 930  }, { cx: 740,  cy: 840  },
      { cx: 830,  cy: 755  }, { cx: 960,  cy: 700  }, { cx: 1090, cy: 650  },
      { cx: 1190, cy: 580  }, { cx: 1230, cy: 510  }, { cx: 1220, cy: 450  },
      { cx: 1180, cy: 390  }, { cx: 1120, cy: 330  }, { cx: 1130, cy: 275  },
      { cx: 1230, cy: 235  }, { cx: 1360, cy: 205  }, { cx: 1490, cy: 185  },
      { cx: 1650, cy: 160  }, { cx: 1820, cy: 135  },
    ],
    pin: { cx: 1980, cy: 118 },
  },
  // 2. Bottom-right → bows left toward centre → sweeps upper-right
  {
    path: "M 1980 1080 C 1750 900, 1380 870, 1180 730 S 950 550, 1100 380 S 1450 220, 1650 90 Q 1820 10, 2060 -30",
    dots: [
      { cx: 1880, cy: 1010 }, { cx: 1740, cy: 945  }, { cx: 1570, cy: 895  },
      { cx: 1410, cy: 855  }, { cx: 1260, cy: 810  }, { cx: 1180, cy: 770  },
      { cx: 1120, cy: 720  }, { cx: 1080, cy: 660  }, { cx: 1060, cy: 600  },
      { cx: 1060, cy: 540  }, { cx: 1080, cy: 480  }, { cx: 1120, cy: 430  },
      { cx: 1200, cy: 385  }, { cx: 1290, cy: 335  }, { cx: 1390, cy: 285  },
      { cx: 1510, cy: 235  }, { cx: 1600, cy: 175  },
    ],
    pin: { cx: 1720, cy: 120 },
  },
  // 3. Right-edge entry (mid) → dips down-right → climbs back up steeply
  {
    path: "M 2060 520 C 1820 610, 1540 690, 1320 650 S 970 520, 1040 355 S 1350 185, 1620 80 Q 1800 10, 2020 -30",
    dots: [
      { cx: 1960, cy: 545  }, { cx: 1830, cy: 580  }, { cx: 1690, cy: 625  },
      { cx: 1540, cy: 658  }, { cx: 1390, cy: 658  }, { cx: 1280, cy: 638  },
      { cx: 1190, cy: 602  }, { cx: 1120, cy: 555  }, { cx: 1080, cy: 495  },
      { cx: 1060, cy: 435  }, { cx: 1080, cy: 375  }, { cx: 1130, cy: 318  },
      { cx: 1210, cy: 270  }, { cx: 1320, cy: 228  }, { cx: 1445, cy: 188  },
      { cx: 1570, cy: 152  }, { cx: 1700, cy: 118  },
    ],
    pin: { cx: 1830, cy: 82 },
  },
  // 4. Bottom-right → wide flowing bends → upper-left area (horizontal mask hides any text overlap)
  {
    path: "M 1860 1100 C 1650 960, 1230 935, 1060 795 S 850 605, 1020 445 S 1380 315, 1290 140 Q 1190 20, 1720 -30",
    dots: [
      { cx: 1800, cy: 1040 }, { cx: 1680, cy: 975  }, { cx: 1540, cy: 928  },
      { cx: 1380, cy: 892  }, { cx: 1220, cy: 858  }, { cx: 1120, cy: 815  },
      { cx: 1055, cy: 760  }, { cx: 1010, cy: 695  }, { cx: 972,  cy: 625  },
      { cx: 960,  cy: 555  }, { cx: 990,  cy: 490  }, { cx: 1050, cy: 432  },
      { cx: 1145, cy: 382  }, { cx: 1230, cy: 335  }, { cx: 1285, cy: 278  },
      { cx: 1305, cy: 215  }, { cx: 1280, cy: 160  },
    ],
    pin: { cx: 1510, cy: 72 },
  },
  // 5. Right-edge hairpin — tight S-curves descending then looping back up
  {
    path: "M 1940 830 C 1730 768, 1480 782, 1325 668 S 1155 515, 1325 378 S 1645 268, 1490 112 Q 1350 12, 1790 -30",
    dots: [
      { cx: 1878, cy: 808  }, { cx: 1762, cy: 796  }, { cx: 1632, cy: 793  },
      { cx: 1510, cy: 788  }, { cx: 1402, cy: 772  }, { cx: 1322, cy: 748  },
      { cx: 1262, cy: 712  }, { cx: 1222, cy: 668  }, { cx: 1208, cy: 618  },
      { cx: 1218, cy: 568  }, { cx: 1258, cy: 518  }, { cx: 1322, cy: 472  },
      { cx: 1402, cy: 428  }, { cx: 1462, cy: 380  }, { cx: 1492, cy: 325  },
      { cx: 1502, cy: 265  }, { cx: 1498, cy: 205  },
    ],
    pin: { cx: 1490, cy: 152 },
  },
  // 6. Bottom-left → diagonal NE sweep with reverse S-bend → upper-right
  //    (mask fades the left portion naturally as the road crosses into the text zone)
  {
    path: "M -80 1050 C 280 930, 180 720, 620 660 S 1150 580, 1020 390 S 780 200, 1320 120 Q 1680 60, 1960 0",
    dots: [
      { cx: -80,  cy: 1050 }, { cx: 80,   cy: 985  }, { cx: 230,  cy: 920  },
      { cx: 370,  cy: 855  }, { cx: 495,  cy: 790  }, { cx: 600,  cy: 730  },
      { cx: 710,  cy: 680  }, { cx: 820,  cy: 645  }, { cx: 940,  cy: 620  },
      { cx: 1040, cy: 595  }, { cx: 1060, cy: 538  }, { cx: 1030, cy: 478  },
      { cx: 990,  cy: 418  }, { cx: 950,  cy: 358  }, { cx: 950,  cy: 298  },
      { cx: 1010, cy: 242  }, { cx: 1100, cy: 202  },
    ],
    pin: { cx: 1300, cy: 138 },
  },
  // 7. Left-edge mid-height entry → initial slight dip → sweeps up and right
  //    Creates a horizontal entry feel, unique among all variants
  {
    path: "M -60 580 C 200 618, 450 678, 680 638 S 1050 538, 1200 368 S 1380 188, 1680 108 Q 1860 58, 2050 8",
    dots: [
      { cx: -60,  cy: 580  }, { cx: 100,  cy: 600  }, { cx: 250,  cy: 624  },
      { cx: 400,  cy: 644  }, { cx: 540,  cy: 650  }, { cx: 660,  cy: 640  },
      { cx: 770,  cy: 620  }, { cx: 880,  cy: 588  }, { cx: 980,  cy: 550  },
      { cx: 1070, cy: 498  }, { cx: 1148, cy: 448  }, { cx: 1200, cy: 398  },
      { cx: 1228, cy: 342  }, { cx: 1258, cy: 288  }, { cx: 1328, cy: 242  },
      { cx: 1430, cy: 202  }, { cx: 1542, cy: 168  },
    ],
    pin: { cx: 1662, cy: 132 },
  },
];

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
  {
    icon: Library,
    label: "Fleet Storybook",
    desc: "Archived trip stories",
    href: "/storybook",
    tooltip: "Every generated story is preserved in the Fleet Storybook — a searchable archive of comic trip narratives. Filter by tone, browse past routes, and share highlight reels with clients or new drivers.",
  },
];

export default function HomePage() {
  const router = useRouter();
  const [roadIdx, setRoadIdx] = useState(() => Math.floor(Math.random() * ROADS.length));
  const [roadVisible, setRoadVisible] = useState(true);
  const [vehicles, setVehicles]               = useState<VehicleCard[]>([]);
  const [groups, setGroups]                   = useState<FleetGroup[]>([]);
  const [loading, setLoading]                 = useState(true);
  const [error, setError]                     = useState<string | null>(null);
  const [showVehicleSelector, setShowVehicleSelector] = useState(false);
  const [pulseRoute, setPulseRoute] = useState<string | null>(null);

  // Cycle through road variants: hold → fade out → swap → fade in → repeat
  useEffect(() => {
    const HOLD_MS = 8000;
    const FADE_MS = 2500;
    const id = setInterval(() => {
      setRoadVisible(false);
      setTimeout(() => {
        setRoadIdx(i => (i + 1) % ROADS.length);
        setRoadVisible(true);
      }, FADE_MS);
    }, HOLD_MS + FADE_MS);
    return () => clearInterval(id);
  }, []);

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

        {/* Windy road — random variant on each page load */}
        {(() => {
          const road = ROADS[roadIdx];
          return (
            <svg
              className="absolute inset-0 w-full h-full"
              viewBox="0 0 1920 1080"
              preserveAspectRatio="xMidYMid slice"
              aria-hidden="true"
              style={{
                opacity: roadVisible ? 1 : 0,
                transition: "opacity 2.5s ease-in-out",
              }}
            >
              <defs>
                <filter id="roadGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="6" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <filter id="dotGlow" x="-100%" y="-100%" width="300%" height="300%">
                  <feGaussianBlur stdDeviation="2.5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                {/* Vertical fade: bright at bottom, dim at top */}
                <linearGradient id="roadFade" x1="0%" y1="100%" x2="0%" y2="0%">
                  <stop offset="0%"   stopColor="rgba(245,166,35,1)"    />
                  <stop offset="55%"  stopColor="rgba(245,166,35,0.45)" />
                  <stop offset="100%" stopColor="rgba(245,166,35,0.08)" />
                </linearGradient>
                {/* Horizontal mask: invisible over text zone (left), opaque past centre */}
                <linearGradient id="roadMaskGrad" x1="0" y1="0" x2="900" y2="0" gradientUnits="userSpaceOnUse">
                  <stop offset="0%"   stopColor="white" stopOpacity="0"   />
                  <stop offset="40%"  stopColor="white" stopOpacity="0.12" />
                  <stop offset="100%" stopColor="white" stopOpacity="1"   />
                </linearGradient>
                <mask id="roadVisibility">
                  <rect x="0" y="0" width="1920" height="1080" fill="url(#roadMaskGrad)" />
                </mask>
              </defs>

              <g mask="url(#roadVisibility)">
                {/* Road body glow */}
                <path d={road.path} stroke="rgba(245,166,35,0.04)" strokeWidth="90"  fill="none" strokeLinecap="round" filter="url(#roadGlow)" />
                {/* Road surface */}
                <path d={road.path} stroke="rgba(245,166,35,0.04)" strokeWidth="52"  fill="none" strokeLinecap="round" />
                {/* Left edge */}
                <path d={road.path} stroke="url(#roadFade)" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.6"  style={{ transform: "translate(-26px, 14px)"  }} />
                {/* Right edge */}
                <path d={road.path} stroke="url(#roadFade)" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.6"  style={{ transform: "translate(26px, -14px)"  }} />
                {/* Centre dashes */}
                <path d={road.path} stroke="url(#roadFade)" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.4"  strokeDasharray="22 16" />

                {/* GPS breadcrumb dots */}
                {road.dots.map((pt, i) => (
                  <circle
                    key={i}
                    cx={pt.cx}
                    cy={pt.cy}
                    r="3.5"
                    fill="rgba(245,166,35,0.55)"
                    filter="url(#dotGlow)"
                    opacity={1 - i * 0.04}
                  />
                ))}

                {/* Destination pin */}
                <circle cx={road.pin.cx} cy={road.pin.cy} r="6"  fill="rgba(245,166,35,0.7)"  filter="url(#dotGlow)" />
                <circle cx={road.pin.cx} cy={road.pin.cy} r="11" fill="none" stroke="rgba(245,166,35,0.3)" strokeWidth="1.5" />
              </g>
            </svg>
          );
        })()}
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
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/storybook")}
              className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-semibold text-[rgba(232,237,248,0.5)] hover:text-white transition-colors font-body"
            >
              <Library className="h-3 w-3" />
              Storybook
            </button>
            <ConnectButton />
            <span className="text-[11px] font-semibold text-[#f5a623] bg-[rgba(245,166,35,0.1)] border border-[rgba(245,166,35,0.2)] rounded-full px-3 py-1 font-body">
              Geotab Vibe Coding Challenge
            </span>
          </div>
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

        <p className="relative z-10 font-body text-[rgba(232,237,248,0.55)] text-lg leading-relaxed max-w-lg mb-6 animate-fade-up" style={{ animationDelay: "120ms" }}>
          Turn raw Geotab trip data into contextual area briefings and
          comic-style route recaps — powered by Direct API and Ace.
        </p>

        {/* Connect your fleet CTA — shown only in demo mode */}
        <DemoModeBanner />

        {/* Feature chips */}
        <div className="relative z-10 flex flex-wrap gap-3 mb-12 stagger animate-fade-up" style={{ animationDelay: "180ms" }}>
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
        <div className="relative z-10 flex items-center gap-4 animate-fade-up" style={{ animationDelay: "240ms" }}>
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
              className="btn-amber inline-flex items-center gap-2.5 h-14 px-7 rounded-xl text-base"
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
            className="inline-flex items-center gap-2.5 h-14 px-7 rounded-xl text-base font-semibold text-[rgba(232,237,248,0.6)] hover:text-white hover:bg-[rgba(255,255,255,0.06)] border border-transparent hover:border-[rgba(255,255,255,0.08)] transition-all font-body"
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

"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  MapPin,
  Brain,
  BookOpen,
  Zap,
  ArrowRight,
  ChevronRight,
  Route,
  BarChart3,
  Layers,
  Navigation,
} from "lucide-react";

// ── Flow steps ──────────────────────────────────────────────────────────────

const FLOW_STEPS = [
  {
    step: "01",
    title: "Connect your fleet",
    summary: "Authenticate with Geotab via Direct API",
    icon: Layers,
  },
  {
    step: "02",
    title: "Fleet Pulse overview",
    summary: "Company-wide KPI dashboard loads",
    icon: Zap,
    href: "#fleet-pulse",
  },
  {
    step: "03",
    title: "Live GPS trip maps",
    summary: "Pick a vehicle, explore its routes",
    icon: MapPin,
    href: "#live-gps",
  },
  {
    step: "04",
    title: "Comic trip recaps",
    summary: "LLM turns raw trips into stories",
    icon: BookOpen,
    href: "#comic-recaps",
  },
  {
    step: "05",
    title: "Ace fleet intelligence",
    summary: "Historical patterns surface automatically",
    icon: Brain,
    href: "#ace-intelligence",
  },
];

// ── Feature sections ─────────────────────────────────────────────────────────

const FEATURES = [
  {
    id: "fleet-pulse",
    step: "Step 1",
    icon: Zap,
    label: "Fleet Pulse Overview",
    tagline: "The command centre for your entire vehicle portfolio",
    color: "#f5a623",
    colorDim: "rgba(245,166,35,0.12)",
    colorBorder: "rgba(245,166,35,0.25)",
    body: [
      "Fleet Pulse is where every session begins. The moment your Geotab credentials are verified, a company-wide dashboard assembles in real time — pulling live vehicle counts, total distance driven, active trip states, and group-level aggregates from the Geotab Direct API.",
      "The overview is split into two complementary layers: a KPI strip across the top surfaces the headline numbers at a glance, while a fleet grid below lets you compare groups side-by-side. Switch between a card layout for at-a-glance comparison or a ranked table to sort fleets by any metric.",
      "A regional map sits alongside the fleet grid, plotting every active vehicle's last known position. Click any pin to jump directly to that vehicle's trip dashboard. The whole page stays live — refresh triggers a fresh API pull so you're never looking at stale data.",
    ],
    highlights: [
      "Real-time KPI strip: total vehicles, distance, active trips",
      "Fleet card grid with per-group utilisation and distance metrics",
      "Ace-enriched distance data overlaid on each fleet card",
      "Interactive regional map with vehicle pins",
      "Toggle between card and ranked-table views",
    ],
    next: { label: "Live GPS trip maps", href: "#live-gps" },
    illustration: <FleetPulseIllustration />,
  },
  {
    id: "live-gps",
    step: "Step 2",
    icon: MapPin,
    label: "Live GPS Trip Maps",
    tagline: "Every route your fleet has ever taken, rendered on the map",
    color: "#38bdf8",
    colorDim: "rgba(56,189,248,0.1)",
    colorBorder: "rgba(56,189,248,0.22)",
    body: [
      "From the Fleet Pulse overview, click any fleet card to drill into that group's vehicle activity. Select an individual vehicle to open its trip dashboard — a timeline of every journey the vehicle has completed, ordered by date.",
      "Pick any trip and an interactive Leaflet map renders the full breadcrumb trail: a polyline following the vehicle's exact GPS coordinates, timestamped waypoints at every recorded interval, and distinct markers for the trip start and end points.",
      "Stop markers cluster automatically at zoom levels where individual pins would overlap, and clicking any marker surfaces the stop address, dwell duration, and timestamp. The map layers are OpenStreetMap tiles — no API keys required beyond your Geotab credentials.",
    ],
    highlights: [
      "Full GPS breadcrumb polyline for every trip",
      "Clustered stop markers with address and dwell time on click",
      "Trip timeline selector showing date, distance, and duration",
      "Animated line-draw on trip load",
      "Geofence and zone overlays where group data is available",
    ],
    next: { label: "Comic trip recaps", href: "#comic-recaps" },
    illustration: <GpsMapIllustration />,
  },
  {
    id: "comic-recaps",
    step: "Step 3",
    icon: BookOpen,
    label: "Comic Trip Recaps",
    tagline: "Raw GPS data narrated into a story worth reading",
    color: "#a78bfa",
    colorDim: "rgba(167,139,250,0.1)",
    colorBorder: "rgba(167,139,250,0.22)",
    body: [
      "Numbers and coordinates are precise — but they don't tell you what a trip felt like. The Comic Trip Recap feature passes each journey's structured data to a large language model and asks it to narrate the route as a short comic-panel story.",
      "The LLM receives the start address, end address, stop sequence, total distance, duration, and any zone names crossed. It weaves these facts into panel-by-panel narration: naming suburbs, calling out an unusual 40-minute stop, noting if the vehicle doubled back, and adding a final punchline about the journey.",
      "Each panel is styled as a comic strip tile — bold caption text, a contextual icon, and a short punchy sentence per stop or segment. The result is a trip recap that a fleet manager can scan in seconds and actually remember.",
    ],
    highlights: [
      "LLM-generated panel-by-panel comic narration",
      "Stop addresses resolved and named in natural language",
      "Unusual patterns (backtracking, long dwell, late-night trips) called out explicitly",
      "Comic-strip tile layout with icon, caption, and narrative text",
      "Generates in under 3 seconds via streaming response",
    ],
    next: { label: "Ace fleet intelligence", href: "#ace-intelligence" },
    illustration: <ComicIllustration />,
  },
  {
    id: "ace-intelligence",
    step: "Step 4",
    icon: Brain,
    label: "Ace Fleet Intelligence",
    tagline: "Months of trip history distilled into actionable patterns",
    color: "#4ade80",
    colorDim: "rgba(74,222,128,0.1)",
    colorBorder: "rgba(74,222,128,0.22)",
    body: [
      "Fleet Pulse and the trip dashboard show you what's happening now. Ace fleet intelligence shows you what's been happening for months — and what it means. Geotab Ace is a historical data mining engine: it aggregates trip records across your entire fleet and surfaces distance trends, utilisation outliers, and group-level ranking data.",
      "On the Fleet Pulse overview, each fleet card receives an Ace overlay: total kilometres driven in the period, a per-vehicle average, and a comparison badge showing whether the fleet is above or below the company median. The ranked table view sorts fleets by Ace-reported distance so you can immediately identify which groups are carrying the load.",
      "Drilling into a specific fleet surfaces a stop-hotspot card — a ranked list of locations visited most frequently by that group's vehicles, derived from Ace's aggregated stop data. Route pattern cards show which origin-destination pairs are most common, giving operations teams a data-backed view of actual route usage versus planned routes.",
    ],
    highlights: [
      "Historical distance trends per fleet group and vehicle",
      "Above/below-median comparison badges on fleet cards",
      "Stop-hotspot rankings for each fleet group",
      "Most-common route pattern (O-D pairs) surface automatically",
      "Ace data loaded in parallel with live data — no extra waiting",
    ],
    next: null,
    illustration: <AceIllustration />,
  },
];

// ── SVG Illustrations ────────────────────────────────────────────────────────

function FleetPulseIllustration() {
  return (
    <svg viewBox="0 0 400 260" fill="none" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      {/* KPI strip */}
      <rect x="20" y="20" width="360" height="48" rx="10" fill="rgba(245,166,35,0.07)" stroke="rgba(245,166,35,0.2)" strokeWidth="1" />
      {[0, 1, 2, 3].map((i) => (
        <g key={i} transform={`translate(${36 + i * 88}, 32)`}>
          <rect width="70" height="24" rx="6" fill="rgba(255,255,255,0.04)" />
          <rect x="8" y="6" width={20 + i * 6} height="4" rx="2" fill="rgba(245,166,35,0.5)" />
          <rect x="8" y="14" width={12 + i * 4} height="3" rx="1.5" fill="rgba(232,237,248,0.2)" />
        </g>
      ))}
      {/* Fleet cards */}
      {[0, 1, 2, 3].map((i) => (
        <g key={i} transform={`translate(${20 + (i % 2) * 186}, ${84 + Math.floor(i / 2) * 82})`}>
          <rect width="172" height="72" rx="10" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
          <rect x="12" y="12" width="28" height="28" rx="7" fill="rgba(245,166,35,0.12)" />
          <rect x="16" y="18" width="20" height="4" rx="2" fill="rgba(245,166,35,0.6)" />
          <rect x="16" y="26" width="12" height="3" rx="1.5" fill="rgba(245,166,35,0.3)" />
          <rect x="50" y="14" width="48" height="5" rx="2.5" fill="rgba(232,237,248,0.55)" />
          <rect x="50" y="24" width="32" height="3" rx="1.5" fill="rgba(232,237,248,0.2)" />
          <rect x="50" y="33" width="60" height="3" rx="1.5" fill="rgba(232,237,248,0.15)" />
          <rect x="12" y="50" width="148" height="1" fill="rgba(255,255,255,0.05)" />
          <rect x="12" y="57" width={40 + i * 12} height="4" rx="2" fill={`rgba(245,166,35,${0.3 + i * 0.1})`} />
        </g>
      ))}
      {/* Map panel */}
      <rect x="220" y="84" width="160" height="152" rx="10" fill="rgba(14,20,30,0.8)" stroke="rgba(56,189,248,0.15)" strokeWidth="1" />
      <circle cx="280" cy="140" r="3" fill="#38bdf8" opacity="0.8" />
      <circle cx="310" cy="160" r="3" fill="#38bdf8" opacity="0.6" />
      <circle cx="300" cy="120" r="3" fill="#f5a623" opacity="0.9" />
      <circle cx="340" cy="175" r="3" fill="#38bdf8" opacity="0.5" />
      <circle cx="250" cy="190" r="3" fill="#38bdf8" opacity="0.7" />
      {/* Grid lines on map */}
      {[110, 130, 150, 170, 190, 210].map((y) => (
        <line key={y} x1="222" y1={y} x2="378" y2={y} stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
      ))}
      {[240, 260, 280, 300, 320, 340, 360].map((x) => (
        <line key={x} x1={x} y1="86" x2={x} y2="234" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
      ))}
    </svg>
  );
}

function GpsMapIllustration() {
  const points = [
    [40, 200], [70, 175], [95, 155], [120, 168], [145, 148],
    [175, 120], [210, 105], [240, 118], [265, 98], [300, 80],
    [330, 95], [355, 75],
  ] as [number, number][];
  const polyline = points.map((p) => p.join(",")).join(" ");

  return (
    <svg viewBox="0 0 400 260" fill="none" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      {/* Map background */}
      <rect width="400" height="260" rx="12" fill="#0b1118" />
      {/* Grid */}
      {[40, 80, 120, 160, 200, 240].map((y) => (
        <line key={y} x1="0" y1={y} x2="400" y2={y} stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
      ))}
      {[50, 100, 150, 200, 250, 300, 350].map((x) => (
        <line key={x} x1={x} y1="0" x2={x} y2="260" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
      ))}
      {/* Road-like paths */}
      <path d="M20 220 Q80 200 120 210 T200 195 T320 205 T400 190" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
      <path d="M0 150 Q100 140 160 155 T300 140 T400 148" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
      {/* GPS Trail */}
      <polyline points={polyline} stroke="rgba(56,189,248,0.25)" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
      <polyline points={polyline} stroke="#38bdf8" strokeWidth="2" strokeDasharray="4 3" strokeLinejoin="round" strokeLinecap="round" />
      {/* Stop markers */}
      {[[120, 168], [210, 105], [265, 98]].map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="8" fill="rgba(245,166,35,0.15)" stroke="rgba(245,166,35,0.4)" strokeWidth="1.5" />
          <circle cx={x} cy={y} r="3" fill="#f5a623" />
        </g>
      ))}
      {/* Start pin */}
      <circle cx={40} cy={200} r="6" fill="rgba(74,222,128,0.2)" stroke="#4ade80" strokeWidth="1.5" />
      <circle cx={40} cy={200} r="2.5" fill="#4ade80" />
      {/* End pin */}
      <circle cx={355} cy={75} r="6" fill="rgba(248,113,113,0.2)" stroke="#f87171" strokeWidth="1.5" />
      <circle cx={355} cy={75} r="2.5" fill="#f87171" />
      {/* Waypoints */}
      {points.filter((_, i) => i !== 0 && i !== points.length - 1 && ![3, 6, 8].includes(i)).map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="2" fill="rgba(56,189,248,0.6)" />
      ))}
      {/* Info popup */}
      <rect x="240" y="115" width="100" height="52" rx="8" fill="#13131c" stroke="rgba(56,189,248,0.3)" strokeWidth="1" />
      <rect x="250" y="124" width="40" height="3" rx="1.5" fill="rgba(232,237,248,0.5)" />
      <rect x="250" y="132" width="60" height="2.5" rx="1.25" fill="rgba(232,237,248,0.2)" />
      <rect x="250" y="139" width="50" height="2.5" rx="1.25" fill="rgba(56,189,248,0.4)" />
      <rect x="250" y="152" width="36" height="8" rx="4" fill="rgba(245,166,35,0.2)" stroke="rgba(245,166,35,0.3)" strokeWidth="1" />
      <rect x="258" y="155" width="20" height="2.5" rx="1.25" fill="rgba(245,166,35,0.6)" />
    </svg>
  );
}

function ComicIllustration() {
  return (
    <svg viewBox="0 0 400 260" fill="none" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      {/* Panel 1 */}
      <rect x="12" y="12" width="112" height="112" rx="8" fill="#0f0f18" stroke="rgba(167,139,250,0.3)" strokeWidth="1.5" />
      <rect x="20" y="20" width="96" height="60" rx="5" fill="rgba(167,139,250,0.07)" />
      {/* Simple vehicle icon */}
      <rect x="36" y="46" width="64" height="20" rx="4" fill="rgba(167,139,250,0.2)" />
      <circle cx="46" cy="68" r="6" fill="rgba(167,139,250,0.4)" />
      <circle cx="84" cy="68" r="6" fill="rgba(167,139,250,0.4)" />
      <rect x="44" y="32" width="40" height="18" rx="3" fill="rgba(167,139,250,0.12)" stroke="rgba(167,139,250,0.2)" strokeWidth="1" />
      {/* Caption strip */}
      <rect x="20" y="90" width="96" height="26" rx="4" fill="rgba(167,139,250,0.1)" />
      <rect x="28" y="96" width="55" height="3" rx="1.5" fill="rgba(232,237,248,0.55)" />
      <rect x="28" y="103" width="70" height="2.5" rx="1.25" fill="rgba(232,237,248,0.25)" />
      <rect x="28" y="109" width="45" height="2.5" rx="1.25" fill="rgba(232,237,248,0.18)" />
      {/* Panel 2 */}
      <rect x="136" y="12" width="112" height="112" rx="8" fill="#0f0f18" stroke="rgba(167,139,250,0.3)" strokeWidth="1.5" />
      {/* Map scene */}
      <rect x="144" y="20" width="96" height="60" rx="5" fill="rgba(14,20,30,0.8)" />
      {/* Mini road */}
      <path d="M148 65 Q180 55 220 60 T236 50" stroke="rgba(255,255,255,0.08)" strokeWidth="5" />
      {/* Route line */}
      <path d="M152 68 L175 52 L200 58 L225 45 L234 50" stroke="#a78bfa" strokeWidth="2" strokeDasharray="3 2" />
      <circle cx="152" cy="68" r="3" fill="#4ade80" />
      <circle cx="234" cy="50" r="3" fill="#f87171" />
      {/* Stop badge */}
      <circle cx="200" cy="58" r="4" fill="rgba(245,166,35,0.15)" stroke="#f5a623" strokeWidth="1" />
      <circle cx="200" cy="58" r="1.5" fill="#f5a623" />
      {/* Caption */}
      <rect x="144" y="90" width="96" height="26" rx="4" fill="rgba(167,139,250,0.1)" />
      <rect x="152" y="96" width="48" height="3" rx="1.5" fill="rgba(245,166,35,0.7)" />
      <rect x="152" y="103" width="72" height="2.5" rx="1.25" fill="rgba(232,237,248,0.25)" />
      <rect x="152" y="109" width="55" height="2.5" rx="1.25" fill="rgba(232,237,248,0.18)" />
      {/* Panel 3 */}
      <rect x="260" y="12" width="128" height="112" rx="8" fill="#0f0f18" stroke="rgba(167,139,250,0.3)" strokeWidth="1.5" />
      <rect x="268" y="20" width="112" height="60" rx="5" fill="rgba(167,139,250,0.07)" />
      {/* Clock/time icon */}
      <circle cx="310" cy="48" r="18" stroke="rgba(167,139,250,0.3)" strokeWidth="1.5" fill="none" />
      <line x1="310" y1="34" x2="310" y2="48" stroke="rgba(167,139,250,0.6)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="310" y1="48" x2="322" y2="54" stroke="rgba(245,166,35,0.8)" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="310" cy="48" r="2" fill="rgba(167,139,250,0.8)" />
      {/* Caption */}
      <rect x="268" y="90" width="112" height="26" rx="4" fill="rgba(167,139,250,0.1)" />
      <rect x="276" y="96" width="62" height="3" rx="1.5" fill="rgba(232,237,248,0.55)" />
      <rect x="276" y="103" width="88" height="2.5" rx="1.25" fill="rgba(232,237,248,0.25)" />
      <rect x="276" y="109" width="64" height="2.5" rx="1.25" fill="rgba(232,237,248,0.18)" />
      {/* Bottom row */}
      {[0, 1, 2].map((i) => (
        <rect key={i} x={12 + i * 132} y="136" width="120" height="112" rx="8" fill="#0f0f18" stroke="rgba(167,139,250,0.2)" strokeWidth="1" />
      ))}
      <rect x="12" y="136" width="396" height="2" rx="1" fill="rgba(167,139,250,0.08)" />
      {/* Bottom panel content */}
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <rect x={22 + i * 132} y="148" width="100" height="36" rx="4" fill="rgba(167,139,250,0.06)" />
          <rect x={30 + i * 132} y="156" width={50 + i * 10} height="3" rx="1.5" fill="rgba(232,237,248,0.4)" />
          <rect x={30 + i * 132} y="163" width={64 + i * 5} height="2.5" rx="1.25" fill="rgba(232,237,248,0.18)" />
          <rect x={22 + i * 132} y="194" width="100" height="40" rx="4" fill="rgba(167,139,250,0.05)" />
          <rect x={30 + i * 132} y="202" width={40 + i * 8} height="3" rx="1.5" fill="rgba(167,139,250,0.5)" />
          <rect x={30 + i * 132} y="210" width={60 + i * 6} height="2.5" rx="1.25" fill="rgba(232,237,248,0.15)" />
          <rect x={30 + i * 132} y="217" width={45 + i * 4} height="2.5" rx="1.25" fill="rgba(232,237,248,0.1)" />
        </g>
      ))}
    </svg>
  );
}

function AceIllustration() {
  const bars = [0.45, 0.72, 0.58, 0.89, 0.63, 0.94, 0.71, 0.52, 0.83, 0.68];
  const linePoints = bars.map((v, i) => `${32 + i * 34},${200 - v * 120}`).join(" ");

  return (
    <svg viewBox="0 0 400 260" fill="none" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      {/* Background */}
      <rect width="400" height="260" rx="12" fill="#0a0f0a" />
      {/* Grid lines */}
      {[60, 100, 140, 180, 220].map((y) => (
        <line key={y} x1="20" y1={y} x2="380" y2={y} stroke="rgba(74,222,128,0.06)" strokeWidth="1" />
      ))}
      {/* Bars */}
      {bars.map((v, i) => (
        <g key={i}>
          <rect
            x={16 + i * 34}
            y={200 - v * 120}
            width="22"
            height={v * 120}
            rx="4"
            fill={`rgba(74,222,128,${0.12 + v * 0.14})`}
            stroke={`rgba(74,222,128,${0.2 + v * 0.2})`}
            strokeWidth="1"
          />
          {v > 0.85 && (
            <rect x={16 + i * 34} y={200 - v * 120} width="22" height="6" rx="3" fill="rgba(74,222,128,0.4)" />
          )}
        </g>
      ))}
      {/* Trend line */}
      <polyline points={linePoints} stroke="rgba(74,222,128,0.5)" strokeWidth="2" fill="none" strokeLinejoin="round" />
      <polyline points={linePoints} stroke="#4ade80" strokeWidth="1.5" fill="none" strokeLinejoin="round" strokeDasharray="3 2" />
      {/* Data points */}
      {bars.map((v, i) => (
        <circle key={i} cx={27 + i * 34} cy={200 - v * 120} r="3" fill="#4ade80" opacity="0.8" />
      ))}
      {/* Highlight the max */}
      <circle cx={27 + 5 * 34} cy={200 - 0.94 * 120} r="6" fill="rgba(74,222,128,0.2)" stroke="#4ade80" strokeWidth="1.5" />
      <circle cx={27 + 5 * 34} cy={200 - 0.94 * 120} r="2.5" fill="#4ade80" />
      {/* Insight callout */}
      <rect x="210" y="28" width="166" height="64" rx="10" fill="#0f180f" stroke="rgba(74,222,128,0.3)" strokeWidth="1" />
      <rect x="222" y="38" width="50" height="3" rx="1.5" fill="rgba(74,222,128,0.6)" />
      <rect x="222" y="46" width="130" height="2.5" rx="1.25" fill="rgba(232,237,248,0.35)" />
      <rect x="222" y="53" width="110" height="2.5" rx="1.25" fill="rgba(232,237,248,0.22)" />
      <rect x="222" y="60" width="120" height="2.5" rx="1.25" fill="rgba(232,237,248,0.16)" />
      <rect x="222" y="70" width="60" height="14" rx="7" fill="rgba(74,222,128,0.15)" stroke="rgba(74,222,128,0.3)" strokeWidth="1" />
      <rect x="232" y="75" width="40" height="3" rx="1.5" fill="rgba(74,222,128,0.6)" />
      {/* Side ranking */}
      <rect x="324" y="108" width="60" height="136" rx="8" fill="#0f180f" stroke="rgba(74,222,128,0.15)" strokeWidth="1" />
      {[0, 1, 2, 3, 4].map((i) => (
        <g key={i}>
          <rect x="332" y={116 + i * 24} width="44" height="16" rx="4" fill="rgba(74,222,128,0.05)" stroke="rgba(74,222,128,0.1)" strokeWidth="1" />
          <rect x="338" y={121 + i * 24} width={6 + i * 0} height="6" rx="3" fill={`rgba(74,222,128,${0.6 - i * 0.1})`} />
          <rect x="349" y={122 + i * 24} width={22 - i * 2} height="3" rx="1.5" fill="rgba(232,237,248,0.3)" />
          <rect x="349" y={128 + i * 24} width={14 - i * 1} height="2" rx="1" fill="rgba(74,222,128,0.3)" />
        </g>
      ))}
      {/* Y axis labels */}
      {[0, 1, 2].map((i) => (
        <rect key={i} x="1" y={80 + i * 60} width="14" height="2.5" rx="1.25" fill="rgba(74,222,128,0.2)" />
      ))}
      {/* X axis */}
      <line x1="16" y1="202" x2="316" y2="202" stroke="rgba(74,222,128,0.15)" strokeWidth="1" />
    </svg>
  );
}

// ── Scroll-to-hash helper ────────────────────────────────────────────────────

function ScrollToHash() {
  const searchParams = useSearchParams();
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash) return;
    const el = document.querySelector(hash);
    if (el) {
      setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
    }
  }, [searchParams]);
  return null;
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function FeaturesPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#09090e] overflow-x-hidden">
      {/* Background */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0 atlas-grid-bg opacity-40" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-[radial-gradient(ellipse_at_top,rgba(245,166,35,0.05)_0%,transparent_60%)]" />
      </div>

      <Suspense fallback={null}>
        <ScrollToHash />
      </Suspense>

      {/* Nav */}
      <nav className="sticky top-0 z-20 border-b border-white/[0.06] bg-[rgba(9,9,14,0.92)] backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center gap-3">
          <button onClick={() => router.push("/")} className="flex items-center gap-2 group shrink-0">
            <div className="w-7 h-7 rounded-lg bg-[#f5a623] flex items-center justify-center shadow-[0_2px_8px_rgba(245,166,35,0.3)] group-hover:shadow-[0_2px_12px_rgba(245,166,35,0.5)] transition-shadow">
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                <path d="M2 7 C2 4 4 2 7 2 S12 4 12 7 L7 12 L2 7Z" fill="#09090e" />
              </svg>
            </div>
            <span className="font-display font-bold text-white text-sm hidden sm:block">FleetHappens</span>
          </button>
          <div className="w-px h-4 bg-[rgba(255,255,255,0.1)]" />
          <div className="flex items-center gap-2">
            <Route className="h-3.5 w-3.5 text-[#f5a623]" />
            <span className="font-display font-bold text-white text-sm">How It Works</span>
          </div>
          <div className="ml-auto">
            <button
              onClick={() => router.push("/pulse")}
              className="inline-flex items-center gap-1.5 h-8 px-4 rounded-lg text-[12px] font-semibold font-body text-[rgba(232,237,248,0.7)] hover:text-white hover:bg-[rgba(255,255,255,0.06)] border border-transparent hover:border-[rgba(255,255,255,0.08)] transition-all"
            >
              Open Fleet Pulse <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <div className="relative z-10 max-w-5xl mx-auto px-6 pt-20 pb-16">
        <div className="inline-flex items-center gap-2 mb-7 animate-fade-in">
          <div className="w-1.5 h-1.5 rounded-full bg-[#f5a623] animate-glow-pulse" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[rgba(232,237,248,0.4)] font-body">
            End-to-End Guide
          </span>
        </div>

        <h1 className="font-display font-extrabold text-white leading-[0.95] tracking-[-0.03em] mb-5 animate-fade-up">
          <span className="block text-[clamp(2.5rem,6vw,4.5rem)]">The FleetHappens</span>
          <span className="block text-[clamp(2.5rem,6vw,4.5rem)] text-[#f5a623]">journey.</span>
        </h1>

        <p className="font-body text-[rgba(232,237,248,0.5)] text-lg leading-relaxed max-w-2xl mb-14 animate-fade-up" style={{ animationDelay: "60ms" }}>
          From a Geotab database connection to comic-strip trip stories and AI-surfaced fleet patterns — here's how every
          feature fits together into a single, continuous workflow.
        </p>

        {/* ── Flow pipeline ─────────────────────────────────────────────── */}
        <div className="animate-fade-up" style={{ animationDelay: "120ms" }}>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[rgba(232,237,248,0.3)] mb-5 font-body">
            User journey
          </p>
          <div className="flex flex-wrap gap-0 relative">
            {FLOW_STEPS.map(({ step, title, summary, icon: Icon, href }, i) => (
              <div key={step} className="flex items-center">
                {/* Node */}
                <button
                  onClick={() => href && document.querySelector(href)?.scrollIntoView({ behavior: "smooth" })}
                  className={`flex items-center gap-3 bg-[rgba(255,255,255,0.03)] border rounded-xl px-4 py-3 transition-all duration-200 group ${
                    href
                      ? "border-[rgba(255,255,255,0.08)] hover:border-[rgba(245,166,35,0.3)] hover:bg-[rgba(245,166,35,0.04)] cursor-pointer"
                      : "border-[rgba(255,255,255,0.06)] cursor-default"
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                      href
                        ? "bg-[rgba(245,166,35,0.1)] group-hover:bg-[rgba(245,166,35,0.18)]"
                        : "bg-[rgba(255,255,255,0.05)]"
                    }`}
                  >
                    <Icon className={`h-3.5 w-3.5 ${href ? "text-[#f5a623]" : "text-[rgba(232,237,248,0.3)]"}`} />
                  </div>
                  <div className="text-left">
                    <p className="text-[12px] font-semibold text-white font-body leading-none">{title}</p>
                    <p className="text-[10.5px] text-[rgba(232,237,248,0.35)] mt-0.5 font-body">{summary}</p>
                  </div>
                </button>

                {/* Connector */}
                {i < FLOW_STEPS.length - 1 && (
                  <div className="flex items-center px-1.5 shrink-0">
                    <div className="flex items-center gap-0.5">
                      <div className="w-3 h-px bg-[rgba(245,166,35,0.25)]" />
                      <ArrowRight className="h-3 w-3 text-[rgba(245,166,35,0.35)]" />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Feature sections ──────────────────────────────────────────────── */}
      <div className="relative z-10 max-w-5xl mx-auto px-6 pb-32 space-y-0">
        {FEATURES.map((feature, featureIdx) => {
          const Icon = feature.icon;
          const isEven = featureIdx % 2 === 0;
          return (
            <div key={feature.id}>
              {/* Section divider */}
              <div className="h-px bg-gradient-to-r from-transparent via-[rgba(255,255,255,0.07)] to-transparent my-0" />

              {/* Section */}
              <section
                id={feature.id}
                className="py-24 scroll-mt-20"
              >
                {/* Step label */}
                <div className="flex items-center gap-3 mb-8">
                  <div
                    className="h-px flex-1"
                    style={{ background: `linear-gradient(to right, transparent, ${feature.colorBorder})` }}
                  />
                  <span
                    className="text-[10px] font-bold uppercase tracking-[0.2em] font-body px-3 py-1.5 rounded-full border"
                    style={{ color: feature.color, borderColor: feature.colorBorder, background: feature.colorDim }}
                  >
                    {feature.step}
                  </span>
                  <div
                    className="h-px flex-1"
                    style={{ background: `linear-gradient(to left, transparent, ${feature.colorBorder})` }}
                  />
                </div>

                <div className={`grid grid-cols-1 lg:grid-cols-2 gap-12 items-start ${!isEven ? "lg:[&>*:first-child]:order-2" : ""}`}>
                  {/* Text side */}
                  <div>
                    {/* Icon + title */}
                    <div className="flex items-center gap-3 mb-5">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{ background: feature.colorDim, border: `1px solid ${feature.colorBorder}` }}
                      >
                        <Icon className="h-5 w-5" style={{ color: feature.color }} />
                      </div>
                      <div>
                        <p className="font-display font-extrabold text-2xl text-white leading-tight">{feature.label}</p>
                        <p className="text-[12px] font-body mt-0.5" style={{ color: feature.color, opacity: 0.8 }}>
                          {feature.tagline}
                        </p>
                      </div>
                    </div>

                    {/* Body paragraphs */}
                    <div className="space-y-4 mb-8">
                      {feature.body.map((para, i) => (
                        <p key={i} className="font-body text-[rgba(232,237,248,0.6)] text-[14.5px] leading-[1.75]">
                          {para}
                        </p>
                      ))}
                    </div>

                    {/* Highlights */}
                    <div
                      className="rounded-2xl p-5 mb-8"
                      style={{ background: feature.colorDim, border: `1px solid ${feature.colorBorder}` }}
                    >
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] font-body mb-3.5" style={{ color: feature.color }}>
                        Key capabilities
                      </p>
                      <ul className="space-y-2.5">
                        {feature.highlights.map((h, i) => (
                          <li key={i} className="flex items-start gap-2.5">
                            <div
                              className="mt-[5px] w-1.5 h-1.5 rounded-full shrink-0"
                              style={{ background: feature.color }}
                            />
                            <span className="font-body text-[13px] text-[rgba(232,237,248,0.65)] leading-relaxed">{h}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Next section link */}
                    {feature.next && (
                      <button
                        onClick={() =>
                          document.querySelector(feature.next!.href)?.scrollIntoView({ behavior: "smooth" })
                        }
                        className="inline-flex items-center gap-2 text-[12.5px] font-semibold font-body transition-all group"
                        style={{ color: `${feature.color}99` }}
                      >
                        <span className="group-hover:underline" style={{ color: feature.color }}>
                          Next: {feature.next.label}
                        </span>
                        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" style={{ color: feature.color }} />
                      </button>
                    )}

                    {/* Final CTA */}
                    {!feature.next && (
                      <button
                        onClick={() => router.push("/pulse")}
                        className="inline-flex items-center gap-2 h-10 px-5 rounded-xl text-[13px] font-semibold font-body btn-amber group"
                      >
                        <Zap className="h-3.5 w-3.5 transition-transform group-hover:scale-110" />
                        Open Fleet Pulse now
                      </button>
                    )}
                  </div>

                  {/* Illustration side */}
                  <div
                    className="rounded-2xl overflow-hidden aspect-[3/2]"
                    style={{ border: `1px solid ${feature.colorBorder}`, background: "rgba(255,255,255,0.02)" }}
                  >
                    {feature.illustration}
                  </div>
                </div>
              </section>
            </div>
          );
        })}
      </div>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <div className="relative z-10 border-t border-[rgba(255,255,255,0.06)]">
        <div className="max-w-5xl mx-auto px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-[#f5a623] flex items-center justify-center shadow-[0_2px_8px_rgba(245,166,35,0.4)]">
              <svg width="11" height="11" viewBox="0 0 14 14" fill="none">
                <path d="M2 7 C2 4 4 2 7 2 S12 4 12 7 L7 12 L2 7Z" fill="#09090e" />
              </svg>
            </div>
            <span className="font-display font-bold text-white text-sm">FleetHappens</span>
            <span className="text-[10px] font-semibold text-[rgba(232,237,248,0.3)] font-body">
              Geotab Vibe Coding Challenge
            </span>
          </div>
          <button
            onClick={() => router.push("/")}
            className="text-[12px] font-body text-[rgba(232,237,248,0.4)] hover:text-[rgba(232,237,248,0.7)] transition-colors"
          >
            ← Back to home
          </button>
        </div>
      </div>
    </div>
  );
}

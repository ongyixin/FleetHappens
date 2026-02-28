# FleetHappens — Orchestrator Document

**Role:** Tech Lead / Orchestrator Agent  
**Last updated:** 2026-02-28  
**Project:** FleetHappens — Fleet Route Intelligence, Context Narration & Trip Storytelling  
**Stack:** Next.js 14 App Router · TypeScript · Tailwind CSS · shadcn/ui · Leaflet · Geotab APIs · Claude/OpenAI

---

## 1. Repo Structure

```
fleethappens/
├── app/
│   ├── layout.tsx                        ← root layout, font, metadata
│   ├── globals.css                       ← Tailwind base + CSS vars + Leaflet fix
│   ├── page.tsx                          ← Screen 1: Vehicle Selector
│   ├── dashboard/
│   │   └── page.tsx                      ← Screen 2: Trip Dashboard
│   ├── story/
│   │   └── [tripId]/
│   │       └── page.tsx                  ← Screen 3: Comic Recap
│   └── api/
│       ├── geotab/
│       │   ├── auth/route.ts             ← POST: verify credentials
│       │   ├── devices/route.ts          ← GET: VehicleCard[]
│       │   ├── trips/route.ts            ← GET: TripSummary[]
│       │   ├── logs/route.ts             ← GET: BreadcrumbPoint[]
│       │   └── status/route.ts           ← GET: live device positions
│       ├── ace/
│       │   └── query/route.ts            ← POST: AceInsight (slow, async)
│       ├── context/
│       │   └── briefing/route.ts         ← POST: StopContext (two-phase)
│       ├── story/
│       │   └── generate/route.ts         ← POST: ComicStory
│       └── geocode/route.ts              ← GET: place name from lat/lon
├── components/
│   ├── VehicleSelector.tsx               ← Screen 1 grid
│   ├── TripList.tsx                      ← Screen 2 sidebar
│   ├── TripMap.tsx                       ← Leaflet map (no SSR)
│   ├── TripStatsCard.tsx                 ← stats strip
│   ├── StopContextPanel.tsx              ← slide-in briefing panel
│   ├── AceInsightCard.tsx                ← fleet analytics card
│   ├── ComicStoryRenderer.tsx            ← 4-panel grid
│   └── ComicPanelCard.tsx                ← single panel card
├── lib/
│   ├── geotab/
│   │   ├── client.ts                     ← Direct API auth + calls
│   │   └── normalize.ts                  ← raw → typed + coordinate fix
│   ├── ace/
│   │   ├── client.ts                     ← create-chat → send → poll
│   │   └── queries.ts                    ← preset question strings
│   ├── maps/
│   │   ├── geocode.ts                    ← Google → Nominatim fallback
│   │   └── places.ts                     ← Google Places → Overpass fallback
│   ├── llm/
│   │   ├── client.ts                     ← Claude → OpenAI fallback
│   │   └── prompts.ts                    ← all prompt templates
│   └── cache/
│       └── fallback.ts                   ← withFallback() + loadFallback()
├── types/
│   └── index.ts                          ← ALL shared interfaces (source of truth)
├── public/
│   └── fallback/                         ← pre-baked JSON for offline demo mode
│       ├── README.md
│       ├── devices.json
│       ├── trips-b1.json
│       ├── ace-top_vehicles_distance.json
│       ├── ace-idle_by_day.json
│       ├── ace-top_stop_locations.json
│       └── story-t1-playful.json
├── .env.example
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.ts
└── ORCHESTRATOR.md                       ← this file
```

---

## 2. Interface Contracts

All shared types live in `types/index.ts`. **Never redefine them locally.**

### TripSummary
Normalized per-trip data. Produced by `lib/geotab/normalize.ts`, consumed by every screen.
- Coordinates: `startPoint` and `endPoint` are `LatLon` (already `{ lat, lon }` — Geotab `x`/`y` swap is done in `normalize.ts`)
- Distances: `distanceMeters` (raw) + `distanceKm` (derived, pre-computed)
- Speeds: `km/h` — convert to mph in the UI if needed for US audience

### AceInsight
Result of one Ace fleet analytics query. Produced by `lib/ace/client.ts`.
- `rows` are `Record<string, string | number>[]` — first string column is usually the label, first number column is the chart value
- `fromCache: true` must be shown to users (display a "cached" badge)
- Never use `queriedAt` to claim the data is "current" — Ace lags 20 min–hours

### StopContext
Context briefing for a stop. Two-phase load:
- **Phase 1** (fast): `placeName` + `areaBriefing` + `nearbyAmenities` — return to client immediately
- **Phase 2** (Ace): `fleetVisitCount` + `fleetVisitSummary` — append to panel asynchronously
- `useInTripStory` is set by the user on `StopContextPanel`; must be passed to `/api/story/generate`

### ComicStory
LLM-generated story, always 4 panels. Produced by `/api/story/generate`.
- Every `mapAnchor` must come from real trip coordinates — LLM is instructed not to invent coordinates
- `fromCache: true` when loaded from `/public/fallback/story-{tripId}-{tone}.json`
- Story is **template-rendered**, not image-generated — `ComicPanelCard.tsx` owns the visual

---

## 3. Build Order (Three Milestones)

### Milestone 1 — Foundation: Geotab + Map (Demoable: Screen 1 + Screen 2 map)

**Work to complete:**
- [ ] `npm install` — install all dependencies
- [ ] Add real Geotab credentials to `.env` (copy `.env.example`)
- [ ] Verify `/api/geotab/auth` returns 200 with database name
- [ ] Verify `/api/geotab/devices` returns vehicle list (or loads fallback)
- [ ] Verify `/api/geotab/trips` returns trips for a device
- [ ] Verify `/api/geotab/logs` returns breadcrumbs for a trip
- [ ] Test `VehicleSelector` renders vehicle cards and navigates on click
- [ ] Test `TripMap` renders GPS polyline from breadcrumbs
- [ ] Test stop marker click fires `onStopClick`
- [ ] Save live API responses as `/public/fallback/devices.json` and `trips-{id}.json`
- [ ] Test offline mode (bad credentials → fallback loads)

**Demoable output:** Select vehicle → see trips list → click trip → breadcrumbs render on map → click stop marker

---

### Milestone 2 — Ace Insights (Demoable: Ace cards below map)

**Work to complete:**
- [ ] Verify `/api/ace/query` with `queryKey: "top_vehicles_distance"` returns data (allow 60s)
- [ ] Verify `customerData: true` is present in every Ace call (check `lib/ace/client.ts`)
- [ ] Run all 3 preset queries; save responses to `/public/fallback/ace-*.json`
- [ ] Test `AceInsightCard` renders bar chart from rows
- [ ] Test Ace cards appear in dashboard asynchronously (not blocking map or trip load)
- [ ] Add "cached" badge when `fromCache: true`

**Ace implementation note:** `lib/ace/client.ts` implements the full poll loop. The route handler at `app/api/ace/query/route.ts` wraps it with `withFallback()`. The dashboard kicks off all 3 Ace queries in a `useEffect` that doesn't block the main data load.

**Demoable output:** Fleet analytics cards appear below the trip map — top vehicles, idle by day, common stops — all from Ace

---

### Milestone 3 — Context Briefing + Comic Story + Polish (Demoable: full 4-minute demo)

**Context Briefing work:**
- [ ] Set `GOOGLE_MAPS_API_KEY` or confirm Nominatim fallback works
- [ ] Set `ANTHROPIC_API_KEY` or `OPENAI_API_KEY`
- [ ] Test `/api/context/briefing` with a real stop coordinate — expect place name + briefing in < 5s
- [ ] Test `StopContextPanel` slide-in animation
- [ ] Implement Ace Phase 2 enrichment in `app/api/context/briefing/route.ts` (marked TODO)
  - Add `fleet_visit_frequency` Ace query using stop coordinates
  - Append `fleetVisitCount` + `fleetVisitSummary` to `StopContext` response
- [ ] Pre-generate 3-4 context briefings for demo stops and save as fallback JSON
- [ ] Test "Use in Trip Story" toggle sets `useInTripStory: true` on context

**Comic Story work:**
- [ ] Test `/api/story/generate` with a trip + context briefing → expect 4 valid panels
- [ ] Verify panels parse as valid JSON (LLM sometimes wraps in markdown — guard in route handler)
- [ ] Test `ComicStoryRenderer` and `ComicPanelCard` render all 4 panels
- [ ] Test tone toggle regenerates the story
- [ ] Pre-generate stories for 3 demo trips in all 3 tones; save as fallback JSON
- [ ] Pass `stopContexts` from session/URL state through to story generate API

**Session state work:**
- [ ] Add `sessionStorage` or React context to persist `useInTripStory` stop contexts across navigation
- [ ] Pass `deviceId` through to `/story/[tripId]/page.tsx` (needed to re-fetch trip)

**Polish:**
- [ ] Loading skeletons on all async sections
- [ ] Error boundaries on TripMap and StopContextPanel
- [ ] Responsive layout test on 1280px and 1440px viewports
- [ ] Full offline demo test: all fallbacks load, no console errors
- [ ] Record backup demo video

**Demoable output:** Full 4-minute demo flow — vehicle → trip → stop context panel (wow moment) → Ace cards → comic story with tone toggle

---

## 4. Agent Task Assignments

### Agent A — Geotab Integration Agent
**Files owned:**
- `lib/geotab/client.ts`
- `lib/geotab/normalize.ts`
- `app/api/geotab/*/route.ts` (all 5 routes)

**Key tasks:**
1. Test and tune Geotab auth — confirm session caching works across multiple API calls
2. Verify coordinate normalization: `x` = longitude, `y` = latitude in all trip `stopPoint` objects
3. Implement breadcrumb decimation tuning — adjust `maxPoints` for map performance
4. Add pagination logic in `getLogRecords` if a trip exceeds 5,000 log records
5. Save real API response JSON to `/public/fallback/` for every route

**Interface contracts to respect:**
- Output of `getTrips` → `GeotabTrip[]` → `normalizeTrip()` → `TripSummary` (from `types/index.ts`)
- Output of `getLogRecords` → `GeotabLogRecord[]` → `normalizeLogRecord()` → `BreadcrumbPoint[]`
- All API route responses use `ApiResponse<T>` envelope

**Geotab pitfalls to guard against:**
- `stopPoint.x` is longitude, `stopPoint.y` is latitude — already handled in `normalize.ts`, never bypass
- Distances are meters — `distanceKm` is pre-computed in `normalizeTrip()`
- Session expiry: `client.ts` handles re-auth on `InvalidUserException`

---

### Agent B — Ace Analytics Agent
**Files owned:**
- `lib/ace/client.ts`
- `lib/ace/queries.ts`
- `app/api/ace/query/route.ts`
- `components/AceInsightCard.tsx`

**Key tasks:**
1. End-to-end test all 4 preset queries against a live Geotab demo database
2. Implement the `fleet_visit_frequency` query (currently a TODO in `briefing/route.ts`)
3. Tune `buildAceQuestion()` prompts — Ace performs better with explicit column names + units
4. Handle Ace empty responses (new demo accounts need ~1 day before data appears)
5. Save all 4 query results as fallback JSON

**Interface contracts to respect:**
- Output: `AceInsight` (from `types/index.ts`)
- `fromCache: true` must be preserved end-to-end — `AceInsightCard` displays a badge

**Ace pitfalls:**
- `customerData: true` is required in every call — already in `client.ts`, don't remove
- First poll: 8s delay; subsequent polls: 5s — already tuned in `client.ts`
- Max 30 polls → timeout error after ~2.5 min — always have fallback JSON ready

---

### Agent C — Context Briefing Agent
**Files owned:**
- `lib/maps/geocode.ts`
- `lib/maps/places.ts`
- `app/api/context/briefing/route.ts`
- `app/api/geocode/route.ts`
- `components/StopContextPanel.tsx`

**Key tasks:**
1. Test geocoding with 3-4 demo stop coordinates — verify place names are human-readable
2. Test nearby amenities — verify ≥ 3 results within 1.5 km for urban stops
3. Implement Phase 2 Ace enrichment in `briefing/route.ts` (marked TODO) — call Ace with `fleet_visit_frequency` query, append to StopContext
4. Tune the LLM briefing prompt in `lib/llm/prompts.ts` — iterate until briefings feel like a local guide
5. Save geocode + amenities + briefing fallback JSON for 3-4 demo stops

**Architecture rule:**
- Phase 1 must complete in < 5 seconds (geocode + amenities + LLM run in parallel where possible)
- Phase 2 (Ace) must NOT block Phase 1 — append `fleetVisitCount` to an already-returned response, or make it a second fetch from the UI
- LLM briefing must only narrate facts from geocode/places input — never invent coordinates or distances

**Interface contracts to respect:**
- Output: `StopContext` (from `types/index.ts`)
- `useInTripStory` flag is toggled by the user in `StopContextPanel` and must be passed to the story generator

---

### Agent D — LLM / Story Agent
**Files owned:**
- `lib/llm/client.ts`
- `lib/llm/prompts.ts`
- `app/api/story/generate/route.ts`
- `components/ComicStoryRenderer.tsx`
- `components/ComicPanelCard.tsx`
- `app/story/[tripId]/page.tsx`

**Key tasks:**
1. Test story generation end-to-end — verify LLM returns valid JSON array (not markdown-wrapped)
2. Add JSON extraction guard in `generate/route.ts` — strip ` ```json ``` ` wrappers if present
3. Tune `buildComicStoryPrompt()` for each tone (guidebook/playful/cinematic)
4. Verify all 4 panels have valid `mapAnchor` coordinates from trip data (not invented)
5. Test stops with context briefings produce richer panel 3 captions
6. Pre-generate story fallback JSON for 3 demo trips × 3 tones = 9 files

**Architecture rule:**
- LLM generates panel *text* only — no image generation
- `mapAnchor` values must come from `trip.startPoint`, `trip.endPoint`, or `stopContext.coordinates` — never from LLM output alone
- Validate panel count = 4 and `sceneType` values are valid before returning to client

---

### Agent E — UI Agent
**Files owned:**
- `app/page.tsx`
- `app/dashboard/page.tsx`
- `components/VehicleSelector.tsx`
- `components/TripList.tsx`
- `components/TripStatsCard.tsx`
- `app/globals.css`
- `tailwind.config.ts`

**Key tasks:**
1. Polish `VehicleSelector` — vehicle type icons, last-communication time
2. Polish `TripList` — date grouping, selected state, loading skeletons
3. Implement session storage for "flagged stop contexts" so they persist to the story page
4. Pass `deviceId` through to `/story/[tripId]` via URL search params
5. Add responsive layout testing — verify all panels visible at 1280px and 1440px
6. Add loading state for Ace cards (skeleton row while queries run)

---

### Agent F — Map Agent
**Files owned:**
- `components/TripMap.tsx`

**Key tasks:**
1. Improve stop marker logic — derive dwell-stop points from breadcrumb speed data (where `speed < 2 km/h` for > 2 consecutive records)
2. Add selected marker highlight (already partially implemented — verify the visual state)
3. Add map attribution and tile provider config
4. Test with large breadcrumb sets (500+ points) — verify decimation doesn't drop start/end markers
5. Add a mini-map or static tile inset to `ComicPanelCard` (stretch goal — only if time allows)

---

## 5. Integration Notes

### Data flow: Stop click → Context panel

```
TripMap.onStopClick(coords: LatLon)
  → dashboard/page.tsx handleStopClick()
    → POST /api/context/briefing { tripId, coordinates }
      → lib/maps/geocode.reverseGeocode(coords)            [parallel]
      → lib/maps/places.getNearbyAmenities(coords)         [parallel]
      → lib/llm/generateText(CONTEXT_BRIEFING_SYSTEM, ...) [after geocode]
      → returns Phase 1 StopContext (fast)
      → [TODO] POST /api/ace/query { fleet_visit_frequency } [async Phase 2]
    → StopContextPanel receives StopContext
    → fleet visits section shows "Loading..." until Phase 2 resolves
```

### Data flow: Create Trip Story

```
user clicks "Create Trip Story" button in dashboard header
  → router.push(/story/{tripId}?deviceId={id}&tone=playful)
story/[tripId]/page.tsx mounts
  → GET /api/geotab/trips?deviceId={id}  → finds trip by id
  → reads flagged stop contexts from sessionStorage (set by StopContextPanel "Use in Story")
  → POST /api/story/generate { trip, stopContexts, tone }
    → lib/maps/geocode.reverseGeocode(trip.startPoint)   [parallel]
    → lib/maps/geocode.reverseGeocode(trip.endPoint)     [parallel]
    → lib/llm/generateText(COMIC_STORY_SYSTEM, prompt)
    → parse JSON array → ComicStory
  → ComicStoryRenderer renders 4 × ComicPanelCard
  → tone buttons trigger regeneration
```

### Data flow: Ace insights (non-blocking)

```
dashboard/page.tsx mounts
  → useEffect fires 3 fetch() calls to /api/ace/query in parallel
  → each returns after 30-90s (or immediately from fallback cache)
  → setAceInsights((prev) => [...prev, newInsight]) as each completes
  → AceInsightCard renders in a horizontal scroll row below the map
```

### Module boundaries

| Boundary | Rule |
|----------|------|
| `types/index.ts` | Read-only for all agents. Orchestrator owns this file. No agent may add types without review. |
| `lib/geotab/` | Geotab Agent only. No other agent calls `client.ts` directly. |
| `lib/ace/` | Ace Agent only. Context Briefing Agent calls via the API route, not directly. |
| `lib/llm/prompts.ts` | LLM/Story Agent owns. Context Briefing Agent may add prompt functions here with sign-off. |
| `public/fallback/` | Every agent must add fallback files for their API routes. |

---

## 6. Risk Log

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Ace API empty data (new demo DB) | High | High | Create demo DB 2+ days before; fallback JSON covers all Ace cards |
| LLM returns markdown-wrapped JSON | High | Medium | JSON extraction guard in `generate/route.ts` — strip code fences before parse |
| Geotab session expiry mid-demo | Medium | High | Re-auth on `InvalidUserException` implemented in `client.ts`; test before demo |
| Leaflet SSR crash (window undefined) | Medium | High | `dynamic(() => import(...), { ssr: false })` on `TripMap` — already in place |
| Google Maps API key missing | Medium | Low | Nominatim (OSM) fallback in `geocode.ts`; Overpass fallback in `places.ts` |
| Ace Phase 2 blocks context panel | Medium | High | Phase 2 is async; panel returns Phase 1 immediately; Ace result appended later |
| LLM rate limit during demo | Low | High | Pre-generated story fallbacks for all 3 demo trips; `withFallback()` activates |
| Large LogRecord sets (>5,000) | Low | Medium | Decimation in `normalizeLogRecord()` caps at 500 points; add pagination if needed |
| Demo database expired | Low | High | Set expiry to 60 days; check credentials day before; keep backup `.env` file |
| Network down at venue | Low | Critical | Full offline mode: all fallbacks pre-populated; test cold-start with `GEOTAB_PASSWORD=wrong` |
| `x`/`y` coordinate swap reintroduced | Low | High | `normalize.ts` is the only place coordinates are converted; tests should verify lat > lon for US locations |

---

## 7. Pre-Demo Checklist

Run through this the evening before the demo:

- [ ] `npm run build` completes with no errors
- [ ] `npm start` — all 3 screens load in under 3s
- [ ] Geotab auth: `/api/geotab/auth` returns 200
- [ ] Devices: at least 4 vehicles appear on landing page
- [ ] Trip map: select a vehicle, pick a trip, GPS polyline renders
- [ ] Stop click: context panel slides in with place name and briefing within 5s
- [ ] Fleet visits: Ace Phase 2 enrichment appears (or fallback "cached" badge shows)
- [ ] Ace cards: at least 2 insight cards visible below map
- [ ] Story generate: click "Create Trip Story", 4 panels render, all have real coordinates
- [ ] Tone toggle: regenerate with Cinematic tone works
- [ ] Offline test: set bad credentials in `.env`, restart — all screens still load from fallback
- [ ] Record backup video of the full 4-minute demo

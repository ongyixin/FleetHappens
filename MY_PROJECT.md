# FleetHappens — Fleet Route Intelligence, Context Narration & Trip Storytelling

## How to Use This Document

This is the **single source of truth** for implementing FleetHappens in the Geotab Vibe Coding Challenge. Treat it as product spec + architecture brief + Cursor implementation prompt. When making tradeoffs, prioritize **working end-to-end functionality over polish**. Every design decision below is shaped by the hackathon judging rubric.

---

## Judging Criteria Alignment

| Criterion | What Judges Want | How FleetHappens Delivers |
|-----------|-----------------|----------------------|
| **Working Demo** | Does it actually work? | 3-minute live demo script with cached fallbacks; see [Demo Strategy](#10-demo-strategy) |
| **Problem-Solution Fit** | Solves a real fleet problem? | Turns raw trip data into actionable route insights and contextual area briefings for field-service and tourism fleets |
| **Use of Both APIs** | my.geotab.com + Ace | Direct API for live trips, GPS, and stop coordinates; Ace for historical patterns and fleet visit frequency; see [Dual-API Architecture](#4-dual-api-architecture) |
| **User Experience** | Intuitive and polished? | 3-screen flow: select vehicle, explore trip with tap-for-context, generate recap |
| **Innovation** | Unique approach? | Route Context Briefing (tap any stop for an LLM-narrated area guide) + comic-style trip recap — both grounded in real Geotab data |
| **Vibe Factor** | Effective AI-assisted dev? | Built with Cursor + Claude; see [Vibe Coding Methodology](#11-vibe-coding-methodology) |

---

## 1. The Fleet Problem

Fleet managers running field-service, sales, and tourism operations have **thousands of trips per week** flowing through Geotab — but no easy way to answer questions like:

- Where do our drivers stop most often, and are those stops productive?
- Which routes generate the best customer outcomes?
- What is noteworthy about the areas our vehicles visit — and how can we brief drivers or passengers about them?
- How can I share route highlights with clients, stakeholders, or new drivers?

The raw data exists (trips, GPS breadcrumbs, stop durations, historical patterns), but it is locked inside tables and maps. There is no layer that **interprets route behavior into insights**, **provides contextual awareness about stop locations**, or **transforms trips into shareable stories**.

**FleetHappens bridges this gap.** It reads Geotab trip and vehicle data, uses Ace to mine historical patterns, generates contextual area briefings for any stop along a route, and renders the results as route intelligence cards and comic-style trip recaps — turning logistics into meaning.

---

## 2. Solution Overview

FleetHappens has **four core features**, each demonstrating a different part of the Geotab platform:

### Feature 1: Live Trip Map (Direct API)

Select a vehicle and see its recent trips rendered on an interactive map with GPS breadcrumbs, stop markers, speed data, and trip metadata (distance, duration, idle time). This is the foundation — proof that the app connects to Geotab and understands vehicle context.

**Data used:** `Device`, `Trip`, `LogRecord`, `DeviceStatusInfo`

### Feature 2: Fleet Pattern Insights (Ace API)

Ask Ace questions about historical fleet behavior and display the results as insight cards:

- "Top 10 vehicles by distance this month"
- "Most common stop locations across the fleet"
- "Average idle time by day of week"
- "Which vehicles have the longest average trip duration?"

Ace handles the complex aggregation; FleetHappens renders the answers as clean data cards with charts.

**Data used:** Ace natural-language queries against `VehicleKPI_Daily`, `Trip`, `LatestVehicleMetadata`

### Feature 3: Route Context Briefing (Direct API + Ace + LLM)

The **travel-buddy feature**. When viewing a trip on the map, the user taps any stop marker to open a contextual area briefing. The system:

1. Takes the stop's GPS coordinates from the trip data (Direct API)
2. Reverse geocodes to get the place name, neighborhood, and nearby points of interest (Maps API)
3. Asks Ace: "How often has this fleet visited this area in the last 90 days?" — providing historical visit context
4. Sends the combined data to an LLM, which generates a short, narrated briefing about the location

The result is a rich context card that appears as a slide-out panel:
- **Place name and neighborhood** (geocoding)
- **Area description** — 2-3 sentences of LLM-generated context about what the area is known for, relevant landmarks, and practical notes
- **Fleet visit history** — "Your fleet has visited this area 14 times in the last 90 days, mostly on weekdays" (Ace)
- **Nearby amenities** — fuel, food, rest stops within a short radius (Places API)

This feature serves multiple fleet personas:
- **Tourism/shuttle operators**: provide passengers with on-route narration and area context
- **Field-service managers**: brief drivers about unfamiliar territory before dispatch
- **Sales fleet managers**: understand what's near client sites for trip planning
- **Driver trainers**: use area context in route walkthroughs for new drivers

**Data used:** Trip stop coordinates (Direct API) + reverse geocoding + Places API + Ace fleet visit query + LLM narration

### Feature 4: Comic-Style Trip Recap (LLM + Template)

After viewing a trip, the user clicks "Create Trip Story." An LLM receives the structured trip data (stops, distances, timestamps, nearby landmarks via geocoding, and any context briefings already generated for that trip) and produces a 3-5 panel story schema. The frontend renders it as a stylized comic with captions, map snippets, and speech bubbles.

The comic panels are **enriched by the context briefing data** — instead of generic captions, panels reference real place names, area character, and fleet visit patterns. A panel might read: "Panel 3 — The team's 14th visit to the Embarcadero this quarter. At this point, the baristas know the order."

This is the **innovation differentiator** — it transforms dry fleet data into a memorable, shareable artifact.

**Data used:** Trip + LogRecord (Direct API) + context briefings + reverse geocoding + LLM story generation

---

## 3. Primary Demo Scenario

A fleet manager opens FleetHappens, selects a vehicle from the demo fleet, and sees its last 7 days of trips on a map. They tap a long-distance trip to see the GPS breadcrumb trail, stop points, and trip stats. They tap a stop marker on the map — a context panel slides in with the place name, an LLM-narrated area description, and a note that the fleet has visited this area 14 times in the last 90 days (Ace). They scroll down to see Ace-powered fleet insight cards showing the most active vehicles and busiest routes. They click "Create Trip Story" and watch a comic-style recap appear with 4 panels: departure, highway stretch, the stop they just explored (with its area context woven into the caption), and arrival.

Total demo time: under 4 minutes. Every click shows real Geotab data. The context briefing is the "wow" moment — judges see trip data transformed into local knowledge in real time.

---

## 4. Dual-API Architecture

This table shows exactly which API powers each feature and why. Judges should see deliberate, informed usage of both APIs.

| Feature | API | Why This API |
|---------|-----|-------------|
| Vehicle list + device details | Direct API (`Get Device`) | Sub-second response, real-time accuracy |
| Current vehicle location | Direct API (`Get DeviceStatusInfo`) | Needs real-time position (<1s) |
| Recent trips for a vehicle | Direct API (`Get Trip`) | Fast, filterable by device + date range |
| GPS breadcrumbs for a trip | Direct API (`Get LogRecord`) | Real-time breadcrumb data with lat/lon/speed |
| Top vehicles by distance (monthly) | **Ace** | Complex aggregation across fleet; Ace queries `VehicleKPI_Daily` |
| Most common stop locations | **Ace** | Pattern mining across thousands of trips; would require extensive client-side code via API |
| Fleet idle time breakdown | **Ace** | Pre-aggregated daily stats; Ace joins multiple tables automatically |
| Average trip duration trends | **Ace** | Temporal aggregation with device-local timezone handling |
| Stop coordinates for context briefing | Direct API (`Get Trip` → `stopPoint`, `Get LogRecord`) | Precise lat/lon for the specific stop the user tapped |
| Fleet visit frequency for a location | **Ace** | "How many trips ended within 1 km of this location in the last 90 days?" — historical aggregation |
| Area description narration | LLM (Claude/GPT) | Generate a 2-3 sentence contextual briefing from geocoding + place data |
| Nearby amenities lookup | Maps Places API (Google/Mapbox) | Fuel, food, rest stops near stop coordinates |
| Trip data for comic generation | Direct API (`Get Trip` + `Get LogRecord`) | Needs precise per-trip data, not aggregated summaries |
| Comic story text generation | LLM (Claude/GPT) | Creative writing from structured inputs; enriched by context briefing data |
| Reverse geocoding for stop names | Maps API (Google/Mapbox) | Convert lat/lon to human-readable place names |

### Architectural Rule

Anything the user expects to respond in under 3 seconds uses **Direct API**. Anything that involves fleet-wide aggregation, historical trends, or "which/most/best" questions uses **Ace**. The LLM generates contextual narration (area briefings) and creative text (comic panels) from structured inputs — it is never the source of truth for geospatial facts or fleet data.

### Ace Integration Details

Ace queries are asynchronous and require a three-step flow:

```
1. create-chat       → get chat_id
2. send-prompt       → send question, get message_group_id
3. get-message-group → poll until status is "DONE"
```

All calls use `GetAceResults` with `serviceName: 'dna-planet-orchestration'`.

**Critical implementation notes:**
- Every `GetAceResults` call **must** include `customerData: true` or Ace returns empty data
- Ace returns only 10 rows in `preview_array`; use `download_url` for full results
- Rate limit: 8+ seconds between queries; first poll 8s after send-prompt, then every 5s
- Ace data lags 20 minutes to hours behind real-time — never use for "right now" queries
- New demo accounts need ~1 day before Ace has data; plan fallback content for fresh accounts
- Ace may apply implicit filters (e.g., `IsTracked = TRUE`) and auto-convert units

**Question phrasing best practices:**
```
Bad:  "What are the top vehicles by distance?"
Good: "What are the top 10 vehicles by distance in the last 30 days? Return columns: device_name, total_distance_km. Use UTC timezone."
```

---

## 5. Technical Stack

Chosen for hackathon speed, minimal moving parts, and demoability.

### Frontend
- **Next.js 14** (App Router) — full-stack framework, API routes eliminate a separate backend
- **TypeScript** — type safety for Geotab API responses
- **Tailwind CSS** + **shadcn/ui** — fast, polished UI primitives
- **Leaflet** or **Mapbox GL JS** — map rendering for trip routes and GPS breadcrumbs

### Backend (Next.js API Routes)
- All server-side logic lives in `app/api/` routes
- Geotab authentication and API calls happen server-side to protect credentials
- LLM calls for comic generation happen server-side

### Database
- **Supabase** (hosted Postgres) — user profiles, saved itineraries, comic stories
- If Supabase setup is too slow, fall back to **SQLite** via `better-sqlite3` for local-only hackathon mode

### External Services
- **Geotab Direct API** (`my.geotab.com/apiv1`) — real-time vehicle and trip data
- **Geotab Ace** (`GetAceResults`) — historical fleet analytics
- **Google Maps Platform** or **Mapbox** — reverse geocoding (coordinates → place names) + Places/POI search (nearby amenities for context briefings)
- **Claude API** or **OpenAI API** — generate area context briefings and comic panel text from structured trip data

### Why Not FastAPI / Separate Backend?
A separate Python backend adds deployment complexity, CORS configuration, and another server to keep running during a live demo. Next.js API routes handle everything in one process. If the team strongly prefers Python for data processing, FastAPI is acceptable — but keep it as a single service, not a microservice architecture.

---

## 6. Data Models

Three core models. Keep them flat and simple.

### TripSummary (from Direct API)

```ts
interface TripSummary {
  id: string;
  deviceId: string;
  deviceName: string;
  start: string;           // ISO 8601 UTC
  stop: string;
  distanceMeters: number;
  drivingDuration: string;  // "HH:MM:SS"
  idlingDuration: string;
  averageSpeedKmh: number;
  maxSpeedKmh: number;
  startPoint: { lat: number; lon: number };
  endPoint: { lat: number; lon: number };
}
```

### AceInsight (from Ace API)

```ts
interface AceInsight {
  id: string;
  question: string;
  columns: string[];
  rows: Record<string, string | number>[];
  reasoning?: string;       // Ace's AI explanation
  queriedAt: string;
  totalRowCount?: number;
  downloadUrl?: string;     // Full CSV for >10 rows
}
```

### StopContext (context briefing for a stop)

```ts
interface StopContext {
  id: string;
  tripId: string;
  coordinates: { lat: number; lon: number };
  placeName: string;
  neighborhood?: string;
  areaBriefing: string;          // LLM-generated 2-3 sentence description
  fleetVisitCount?: number;      // from Ace: visits in last 90 days
  fleetVisitSummary?: string;    // e.g. "14 visits, mostly weekdays"
  nearbyAmenities: Array<{
    name: string;
    category: string;            // fuel, food, rest, etc.
    distanceMeters: number;
  }>;
  generatedAt: string;
}
```

### ComicStory (generated by LLM)

```ts
interface ComicStory {
  id: string;
  tripId: string;
  title: string;
  tone: 'guidebook' | 'playful' | 'cinematic';
  panels: Array<{
    panelNumber: number;
    sceneType: 'opening' | 'journey' | 'highlight' | 'arrival';
    locationName: string;
    caption: string;
    speechBubble?: string;
    mapAnchor: { lat: number; lon: number };
  }>;
  createdAt: string;
}
```

---

## 7. System Architecture

```text
Next.js App (single deployment)
├── Pages
│   ├── /                    → Landing + vehicle selector
│   ├── /dashboard           → Trip list + map + Ace insight cards
│   └── /story/[tripId]      → Comic recap viewer
│
├── API Routes (server-side)
│   ├── /api/geotab/auth     → Authenticate, return session
│   ├── /api/geotab/devices  → Get Device list
│   ├── /api/geotab/trips    → Get Trips for device + date range
│   ├── /api/geotab/logs     → Get LogRecords (GPS breadcrumbs)
│   ├── /api/geotab/status   → Get DeviceStatusInfo (live position)
│   ├── /api/ace/query       → Send Ace question, poll, return results
│   ├── /api/context/briefing→ Generate context briefing for a stop (geocode + places + Ace + LLM)
│   ├── /api/story/generate  → LLM generates comic schema from trip data + context briefings
│   └── /api/geocode         → Reverse geocode coordinates
│
├── Components
│   ├── VehicleSelector      → Dropdown/card list of fleet vehicles
│   ├── TripMap              → Leaflet/Mapbox map with breadcrumbs + clickable stop markers
│   ├── TripStatsCard        → Distance, duration, idle, speed stats
│   ├── StopContextPanel     → Slide-out panel: area briefing, fleet visits, nearby amenities
│   ├── AceInsightCard       → Rendered Ace query result with chart
│   ├── ComicStoryRenderer   → 3-5 panel comic layout
│   └── ComicPanelCard       → Single panel: caption, bubble, map inset
│
└── External Integrations
    ├── Geotab Direct API
    ├── Geotab Ace
    ├── Maps/Geocoding API
    └── LLM Provider
```

---

## 8. User Flow

### Screen 1: Vehicle Selection (Landing)

1. App authenticates with Geotab using server-side credentials
2. Fetches device list via Direct API
3. Displays vehicles as selectable cards (name, type, last communication time)
4. User picks a vehicle → navigates to dashboard

### Screen 2: Trip Dashboard

1. Fetches recent trips (last 7 days) for the selected vehicle
2. Left panel: scrollable trip list with date, distance, duration
3. Right panel: interactive map showing selected trip's GPS breadcrumbs with **clickable stop markers**
4. Below map: trip stats card (distance, duration, idle time, max speed)
5. **Tap any stop marker** → `StopContextPanel` slides in from the right:
   - Place name and neighborhood (geocoding)
   - LLM-generated area briefing (2-3 sentences about the location)
   - Fleet visit history from Ace ("Your fleet has visited this area 14 times in the last 90 days")
   - Nearby amenities list (fuel, food, rest stops)
   - "Use in Trip Story" toggle — flags this stop for richer comic panel content
6. Bottom section: Ace Insight cards (pre-fetched fleet-wide queries)
   - "Top 5 vehicles by distance this week"
   - "Fleet average idle time percentage"
   - "Most active day of the week"
7. User selects a trip and clicks **"Create Trip Story"** (context briefings for explored stops are passed to the comic generator)

### Screen 3: Comic Trip Recap

1. Backend fetches full trip details + GPS breadcrumbs
2. Reverse geocodes start, end, and notable stop points
3. Includes any context briefings the user generated on Screen 2 (area descriptions, fleet visit history)
4. Sends structured data to LLM with prompt: generate a 4-panel comic story
5. Renders panels as styled cards with:
   - Panel frame with bold heading
   - Caption tied to real trip data (location name, distance, time)
   - Optional speech bubble with personality
   - Mini-map inset showing the route segment
   - Location badge and category icon
6. User can switch tone (Guidebook / Playful / Cinematic) and regenerate

---

## 9. Comic Story Design

The comic is the **innovation differentiator**. It must feel intentional, not bolted on.

### Design Principle

The comic is a **structured storytelling layer on top of real trip data**, not an image generation gimmick. The system generates a story schema first, then renders it with templates.

### Panel Structure

| Panel | Scene | Data Source |
|-------|-------|-------------|
| 1 — Departure | Where and when the trip started | Trip.start + reverse geocode of startPoint |
| 2 — Journey | The longest or fastest segment | LogRecord speed/distance analysis |
| 3 — Highlight | A notable stop, enriched with area context | Longest dwell time + StopContext briefing (if user explored this stop) |
| 4 — Arrival | Where and when the trip ended | Trip.stop + reverse geocode of endPoint |

When a stop has a context briefing attached, the panel caption incorporates the area description and fleet visit history. Example: instead of "Stopped for 22 minutes at 37.7749, -122.4194," the panel reads: "22 minutes near the Embarcadero — the team's 14th visit this quarter. The waterfront district buzzes with lunch spots and a view of the Bay Bridge."

### Tone Options

| Tone | Style | Example Caption |
|------|-------|----------------|
| **Guidebook** | Elegant, factual | "The 113 km route from Madrid to Valencia took 1h 28m at an average of 78 km/h." |
| **Playful** | Warm, punchy | "Hit the road at 5:18 AM — someone's an early bird! 113 clicks later, the coast appeared." |
| **Cinematic** | Atmospheric | "Dawn broke over the Meseta. Steel and asphalt stretched toward the Mediterranean." |

### Content Rules

Each panel must answer one of:
- What changed in the trip here?
- What made this moment notable?
- What does the data reveal about the driver's behavior?

Panels are tied to real coordinates and timestamps. The comic never generates generic content — every caption references actual trip data.

### Rendering Strategy (v1)

Use **template-driven rendering**, not AI image generation:
- Card background with gradient
- Bold heading with location name
- Caption block (1-2 sentences)
- Speech bubble (optional, short)
- Mini-map inset (Leaflet static image or small embedded map)
- Footer with trip metadata (time, distance, speed)

This gives reliable, fast output without depending on image generation APIs.

### LLM Prompt Template

```
You are a travel storytelling assistant. Given structured trip data and optional area context briefings, generate a 4-panel comic story.

Trip data:
- Start: {startLocation} at {startTime}
- End: {endLocation} at {endTime}
- Distance: {distanceKm} km
- Duration: {duration}
- Average speed: {avgSpeed} km/h
- Max speed: {maxSpeed} km/h
- Notable stops: {stops}

Context briefings (if available):
{contextBriefings}
- Each briefing has: placeName, areaBriefing, fleetVisitCount, fleetVisitSummary

Generate a JSON array of 4 panels. Each panel has:
- panelNumber (1-4)
- sceneType: "opening" | "journey" | "highlight" | "arrival"
- locationName: real place name from the data
- caption: 1-2 vivid sentences referencing real data. If a context briefing exists for this stop, weave in the area description and fleet visit history.
- speechBubble: optional, short, personality-driven
- mapAnchor: {lat, lon} from the trip data

Tone: {selectedTone}

Keep captions concise. Every panel must reference real trip data. Stops with context briefings should feel richer and more specific than stops without.
```

---

## 10. Demo Strategy

### Demo Script (4 minutes)

| Time | Action | What Judges See |
|------|--------|----------------|
| 0:00 | State the problem | "Fleet managers have trip data but no way to understand the areas their drivers visit, or share route stories." |
| 0:20 | Select a vehicle | Vehicle cards load from Geotab Direct API — proves live connection |
| 0:40 | Show trip on map | GPS breadcrumbs render on Leaflet map with stop markers — Direct API working |
| 1:10 | **Tap a stop marker** | Context panel slides in: place name, LLM area briefing, "14 fleet visits in 90 days" from Ace, nearby amenities — **the "wow" moment** |
| 1:50 | Show Ace insights | Fleet pattern cards appear (top vehicles, idle time) — Ace API working at fleet scale |
| 2:20 | Generate comic recap | Click "Create Trip Story" → 4-panel comic renders with real trip data, the explored stop's context woven into its panel |
| 3:00 | Switch tone + wrap up | Toggle to "Cinematic" tone, regenerate. "Here's what we'd build next." |

### Talking Points per Criterion

- **Working Demo**: "Everything you see uses live Geotab demo data. No mocks."
- **Problem-Solution Fit**: "Tourism and field-service fleet operators need to understand the areas their drivers visit — for passenger narration, driver briefings, and route optimization. FleetHappens gives them that context."
- **Both APIs**: "The trip map and stop coordinates come from the Direct API for speed. The fleet visit history for each stop — and the fleet-wide insight cards — come from Ace. The context briefing combines both APIs with LLM narration."
- **UX**: "Tap any stop on a trip and get instant area context. Then generate a comic story that weaves that context into the panels."
- **Innovation**: "The Route Context Briefing is like having a local guide powered by fleet data. The comic recap turns that into a shareable story. Both are grounded in real coordinates and timestamps."
- **Vibe Factor**: "The entire app was scaffolded with Cursor + Claude in [X] hours. AI wrote the initial components; we tuned the Geotab integration, context briefing prompts, and comic rendering by hand."

### Backup Plan

| Failure Mode | Mitigation |
|-------------|-----------|
| Geotab API down or slow | Pre-cached API responses in `/public/fallback/` loaded when API call fails |
| Ace takes too long (>60s) | Show a pre-computed Ace result set; display "cached insight" badge |
| LLM rate-limited | Pre-generated context briefings and comic stories for 2-3 demo trips stored in local JSON |
| Demo database expired | Create a new 60-day demo database the day before; keep credentials in `.env` |
| Network issues at venue | Full offline mode: all API responses cached, comic stories pre-generated |
| Live demo crashes | Pre-recorded 3-minute video as final fallback |

### Recommended Demo Database

Create a demo with these settings for the richest data:
- **Vocation**: Long Distance (longer trips → better comic stories)
- **Location**: USA (familiar geography for most judges)
- **Vehicle Type**: Vans and Trucks (more realistic fleet scenario)
- **Fleet Size**: 50 vehicles (maximum data)
- **Expiration**: 60 days

Wait at least 1 day after creation before relying on Ace queries.

---

## 11. Vibe Coding Methodology

This section documents how AI-assisted development was used. Judges score "Vibe Factor" — show them the receipts.

### Tools Used

| Tool | Role |
|------|------|
| **Cursor** (with Claude) | Primary IDE; used for scaffolding, component generation, API integration |
| **Claude** (direct) | Architecture decisions, prompt engineering for comic generation |
| **Geotab Add-In Architect Gem** | Explored for MyGeotab Add-In prototyping |

### What Was AI-Scaffolded

- Next.js project structure and routing
- Tailwind + shadcn/ui component boilerplate
- Geotab API authentication wrapper
- Leaflet map component with breadcrumb rendering
- Stop context panel layout and slide-in animation
- Comic panel card layout and styling
- TypeScript interfaces for all data models
- API route handlers for Geotab proxy calls

### What Was Hand-Tuned

- Ace polling logic with retry and timeout handling
- Context briefing prompt engineering (iterated on narration quality and factual grounding)
- Comic story prompt engineering (iterated on tone and data grounding, context briefing integration)
- GPS breadcrumb rendering performance (decimation for large LogRecord sets)
- Trip-to-panel mapping logic (which segments become which comic panels)
- Fallback/caching strategy for demo resilience
- Geotab API edge cases (coordinate format: `x` = longitude, `y` = latitude; distances in meters; speeds in km/h)

### Key Prompts Used

**Scaffolding prompt (Cursor):**
```
Create a Next.js 14 App Router project with TypeScript and Tailwind CSS.
Add API routes that proxy to the Geotab API using credentials from .env.
Build a dashboard page with a vehicle selector, trip list, and Leaflet map
showing GPS breadcrumbs for a selected trip.
```

**Context briefing prompt (Claude):**
```
Given this location data (place name, neighborhood, nearby POIs, and
fleet visit count from Geotab Ace), generate a 2-3 sentence area
briefing suitable for a fleet driver or tour passenger. Mention what
the area is known for, one practical note, and the fleet visit context.
Keep it conversational and specific to the place.
```

**Comic generation prompt (Claude):**
```
Given this trip data from the Geotab API and optional context briefings
for stops, generate a 4-panel comic story in JSON format. Each panel
must reference real coordinates and timestamps. Stops with context
briefings should have richer, more specific captions. Use a playful
tone. Keep captions under 2 sentences.
```

**Ace integration prompt (Cursor):**
```
Implement a server-side function that sends a natural language question
to Geotab Ace using the GetAceResults API. Handle the async create-chat →
send-prompt → poll flow. Include customerData: true in every call.
Return the preview_array rows and reasoning text.
```

---

## 12. Geotab Ecosystem Fit

### Pillar Alignment

FleetHappens maps to two of Geotab's six core pillars:

| Pillar | How FleetHappens Contributes |
|--------|--------------------------|
| **Productivity** | Surfaces route patterns that help managers optimize field operations, identify productive stops, and understand driver behavior |
| **Optimization** | Ace-powered insights reveal fleet-wide trends (busiest routes, idle hotspots, distance leaders) that drive data-driven decisions |

### Target Fleet Personas

| Persona | Pain Point | FleetHappens Value |
|---------|-----------|----------------|
| **Tourism/shuttle fleet operator** | Wants to provide passengers with on-route narration and area context; needs shareable trip highlights | Context briefings power real-time area narration; comic recaps become shareable marketing assets |
| **Field-service fleet manager** | Needs to brief drivers on unfamiliar areas and understand stop efficiency | Context briefings prep drivers before dispatch; trip map + Ace insights show which routes are productive |
| **Sales fleet manager** | Tracks territory coverage and wants area intel near client sites | Context briefings surface what's near client stops; Ace queries show visit frequency |
| **Driver trainer** | Needs engaging, location-specific trip reviews for coaching | Context-enriched comic recaps make trip debriefs memorable and grounded in real places |

### Marketplace Potential

FleetHappens could grow from a hackathon prototype into a Geotab Marketplace solution. The path follows the same trajectory as GoAnalytics (started as simple dashboards, now an Order Now partner) and Whip Around (started with inspection forms in 2016, now a Premier Partner).

**Growth path:**
1. **Hackathon**: Working demo with 4 core features (trip map, Ace insights, context briefings, comic recaps)
2. **Post-hackathon**: Add audio narration for context briefings (voice tour guide), preference learning, multi-vehicle comparison
3. **Marketplace Basic**: Package as a MyGeotab Add-In — context briefings and trip recaps embedded in the fleet dashboard
4. **Marketplace Standard**: Add live narration mode (real-time briefings as vehicle moves), scheduled recap emails, multi-language support, customer-facing exports

The 430+ solutions in the Marketplace today prove there is demand. Tourism, shuttle, and field-service fleets are underserved categories relative to safety and maintenance tools — and the context briefing feature has no direct equivalent in the current Marketplace.

---

## 13. Implementation Plan

Three milestones. Each produces a demoable increment.

### Milestone 1: Foundation (Geotab + Map)

**Goal:** Vehicle selection and trip visualization with live Geotab data.

- [ ] Scaffold Next.js project with TypeScript, Tailwind, shadcn/ui
- [ ] Create `.env` with Geotab credentials; add `.env` to `.gitignore`
- [ ] Build `/api/geotab/auth` route — authenticate and cache credentials server-side
- [ ] Build `/api/geotab/devices` route — fetch device list
- [ ] Build `/api/geotab/trips` route — fetch trips for a device + date range
- [ ] Build `/api/geotab/logs` route — fetch LogRecords for GPS breadcrumbs
- [ ] Build `/api/geotab/status` route — fetch DeviceStatusInfo for live position
- [ ] Build `VehicleSelector` component — card list from device data
- [ ] Build `TripMap` component — Leaflet map rendering GPS breadcrumbs
- [ ] Build `TripStatsCard` component — distance, duration, idle, speed
- [ ] Wire up landing page: select vehicle → see trips → see map
- [ ] Add fallback JSON files in `/public/fallback/` for offline mode

**Demoable output:** "I can select a vehicle, see its recent trips, and view GPS breadcrumbs on a map — all from live Geotab data."

### Milestone 2: Ace Insights

**Goal:** Fleet-wide analytics powered by Geotab Ace.

- [ ] Build `/api/ace/query` route — implement create-chat → send-prompt → poll flow
- [ ] Handle Ace edge cases: `customerData: true`, 8s rate limit, timeout after 30 polls
- [ ] Parse Ace responses: extract `preview_array`, `columns`, `reasoning`, `download_url`
- [ ] Build `AceInsightCard` component — render a single Ace result with bar/line chart
- [ ] Create 3-4 pre-defined Ace questions:
  - "Top 10 vehicles by total distance in the last 14 days"
  - "Average idle time percentage by day of the week"
  - "Top 5 most common trip end locations"
  - "Fleet average trip duration this month"
- [ ] Add Ace insight cards to the dashboard below the trip map
- [ ] Cache Ace responses in-memory or localStorage to avoid repeated slow queries
- [ ] Add loading states and "cached result" indicators

**Demoable output:** "Below the trip map, you can see fleet-wide insights powered by Geotab Ace — top vehicles by distance, idle time patterns, busiest locations."

### Milestone 3: Context Briefing + Comic Story + Polish

**Goal:** Route Context Briefing, comic trip recap generation, and demo readiness.

**Context Briefing:**
- [ ] Build `/api/geocode` route — reverse geocode coordinates to place names
- [ ] Build `/api/context/briefing` route — orchestrate geocoding + Places API + Ace visit query + LLM narration
- [ ] Build `StopContextPanel` component — slide-out panel with area briefing, fleet visits, amenities
- [ ] Make stop markers on TripMap clickable — tap triggers context briefing fetch
- [ ] Add "Use in Trip Story" toggle on StopContextPanel
- [ ] Pre-generate context briefings for 3-4 demo trip stops (cached fallback)

**Comic Story:**
- [ ] Build `/api/story/generate` route — send trip data + context briefings to LLM, return panel schema
- [ ] Build `ComicStoryRenderer` component — 3-5 panel comic layout
- [ ] Build `ComicPanelCard` component — caption, speech bubble, map inset, metadata footer
- [ ] Add tone selector (Guidebook / Playful / Cinematic) with regeneration
- [ ] Build `/story/[tripId]` page — full-screen comic viewer
- [ ] Pre-generate 2-3 comic stories for demo trips (cached fallback)

**Polish:**
- [ ] Loading animations and error states for context panel and comic generation
- [ ] Responsive layout for all screens
- [ ] Test full demo flow end-to-end with recommended demo database
- [ ] Record backup demo video

**Demoable output:** "Tap any stop on the map — an area briefing appears with local context and fleet visit history. Click 'Create Trip Story' — a comic recap uses that context to generate richer panels grounded in real Geotab data."

---

## 14. Stretch Goals

Everything below was cut from the MVP to keep scope tight. Build these only after the three milestones are complete and demo-stable.

| Feature | Description | API |
|---------|-------------|-----|
| **Audio narration** | TTS reads context briefings and comic captions aloud — turn FleetHappens into a voice tour guide | Google TTS / ElevenLabs |
| **Voice input** | "What am I near?" triggers context briefing; "Tell me about this area" for hands-free use | Whisper STT |
| **Live context mode** | Stream context briefings as the vehicle moves — auto-trigger when entering a new area | Direct API (DeviceStatusInfo polling) + geocoding + LLM |
| **Preference learning** | Track which area types / stops users explore most; personalize briefings and recommendations | Direct API + local storage |
| **Itinerary planner** | Recommend 2-4 stops along a route based on context briefings and nearby POIs | Maps Places API + LLM |
| **MyGeotab Add-In** | Embed context briefing + comic recap as a MyGeotab page | Geotab Add-In SDK |
| **Zone write-back** | Detect frequent stop clusters from Ace and create Geotab Zones | Direct API (`Add Zone`) |
| **MCP server** | Expose FleetHappens tools (briefings, stories) for conversational access via Claude Desktop | MCP protocol |
| **Multi-vehicle comparison** | Compare trip patterns and stop contexts across 2-3 vehicles side by side | Direct API + Ace |
| **Scheduled recaps** | Auto-generate weekly comic summaries with context highlights and email them | Cron + LLM + SendGrid |
| **Multi-language briefings** | Generate context briefings in the driver's or passenger's preferred language | LLM translation |

---

## 15. Acceptance Criteria

The project is a successful hackathon submission if all six criteria are met:

1. **Live data flows**: User selects a vehicle and sees real Geotab trip data on a map (Direct API working).
2. **Context briefing works**: User taps a stop marker and sees a contextual area briefing with place name, LLM narration, fleet visit history (Ace), and nearby amenities.
3. **Ace delivers insights**: At least 2 Ace-powered insight cards display fleet-wide analytics with real data.
4. **Comic recap generates**: User clicks "Create Trip Story" and sees a 3-5 panel comic with captions tied to real trip data, enriched by context briefings for explored stops.
5. **Both APIs demonstrated**: The demo clearly shows Direct API (fast, per-vehicle, per-stop) and Ace (fleet-wide patterns, visit frequency) used for their strengths.
6. **Demo runs reliably**: The full flow completes in under 4 minutes with fallback data available if any API call fails.

---

## 16. Critical Implementation Rules

Follow these to avoid common Geotab API pitfalls:

1. **Never hardcode credentials.** Use `.env` with `dotenv`. Add `.env` to `.gitignore`.
2. **Test authentication once before loops.** Failed auth locks the account for 15-30 minutes.
3. **Ace needs `customerData: true`.** Every `GetAceResults` call must include this or you get empty data.
4. **Ace is slow.** 30-90 seconds per query. Never put it in a user-blocking path without a loading state.
5. **Coordinate format.** Geotab uses `x` for longitude, `y` for latitude in `stopPoint` objects. Don't swap them.
6. **Distances are meters.** Convert to km for display (`distance / 1000`).
7. **Speeds are km/h.** Convert to mph only if targeting US audience.
8. **API result caps.** Direct API returns max 5,000 results per call. Paginate for large date ranges.
9. **Ace row limit.** `preview_array` has max 10 rows. Ask for "top N" to fit, or use `download_url` for full data.
10. **Fallback data.** Always have cached responses ready. The demo must work even if the network fails.

---

## 17. Cursor Implementation Prompt

> Use this as the initial prompt when starting the build in Cursor.

Build a full-stack web application called **FleetHappens** for the Geotab Vibe Coding Challenge.

**Stack:** Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui, Leaflet for maps.

**What it does:**
1. Connects to Geotab Direct API to fetch vehicles, trips, and GPS breadcrumbs
2. Displays trip routes on an interactive map with clickable stop markers
3. Generates contextual area briefings when a user taps a stop — combining geocoding, nearby POIs, Ace fleet visit history, and LLM narration
4. Queries Geotab Ace for fleet-wide insights (top vehicles, idle patterns, common stops)
5. Generates comic-style trip recaps using an LLM — 4 structured panels enriched by context briefings

**API routes needed:**
- `/api/geotab/auth` — authenticate with Geotab, cache credentials
- `/api/geotab/devices` — get vehicle list
- `/api/geotab/trips` — get trips for device + date range
- `/api/geotab/logs` — get GPS breadcrumbs (LogRecords)
- `/api/geotab/status` — get current vehicle position
- `/api/ace/query` — send Ace question, poll for results, return data
- `/api/context/briefing` — generate area context briefing (geocode + places + Ace visit query + LLM)
- `/api/story/generate` — LLM generates comic panel schema from trip data + context briefings
- `/api/geocode` — reverse geocode coordinates

**Pages:**
- `/` — vehicle selector
- `/dashboard` — trip list + map + Ace insight cards
- `/story/[tripId]` — comic recap viewer

**Critical Geotab rules:**
- Credentials from `.env` (GEOTAB_DATABASE, GEOTAB_USERNAME, GEOTAB_PASSWORD, GEOTAB_SERVER)
- Ace calls need `customerData: true`
- Coordinates: `x` = longitude, `y` = latitude
- Distances in meters, speeds in km/h
- Add fallback JSON in `/public/fallback/` for all API calls

Start with the Geotab authentication and device listing, then trip map with clickable stops, then Ace integration, then context briefing generation, then comic story generation. The context briefing is the "wow" feature — prioritize it over comic polish. Keep it hackathon-ready — working demo over polish.

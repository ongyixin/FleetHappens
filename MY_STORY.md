# My Vibe Coding Journey: FleetHappens

> *Built for the Geotab Vibe Coding Competition, Feb–Mar 2026.*
> *From a blank idea doc to a production-deployed fleet intelligence app!*

---

## The Starting Point

It began with a blank Markdown file — `MY_PROJECT.md` — and a question: *what if fleet data could tell stories?*

Geotab gives you trips, GPS breadcrumbs, and raw telemetry. What it doesn't give you is *meaning*. A driver stops at a location 14 times in 90 days, and no one notices. A fleet manager wants to brief a driver about an unfamiliar area, and there's nothing to reach for. A tourism operator wants to share a route with passengers, and the best they have is a spreadsheet.

That observation became the kernel. The idea: **FleetHappens** — a full-stack web app that reads Geotab data and layers on context, intelligence, and narrative. Think of it as giving a fleet a voice.

---

## The Vibe Coding Approach

This wasn't built line by line. It was built *with* AI, using a deliberate multi-agent architecture inside Cursor.

The process started with a Technical Writer + Solution Architect agent that read every competition resource and sharpened the project spec. That spec became the single source of truth. From there, a Tech Lead / Orchestrator Agent broke the work into parallel tracks and assigned them to specialist agents:

- **Frontend / UX Agent** — Next.js pages, Tailwind layouts, component shells
- **Geotab Direct API Agent** — auth, devices, trips, GPS breadcrumbs, device status
- **Ace Integration Agent** — the async create-chat → send-prompt → poll loop
- **Context Briefing Agent** — geocoding, Places API, LLM narration
- **Story Generation Agent** — LLM comic generation, tone system, PDF export

Each agent had its own prompt, its own file ownership boundaries, and a clear set of deliverables. The orchestrator kept them coherent. I acted as the human in the loop — tuning prompts, reviewing outputs, and enforcing quality.

---

## The Build Timeline

**Stage 1:** Scaffolded the entire project from scratch. Vehicle selector, trip map with GPS breadcrumbs, Geotab Direct API integration, basic dashboard. Got to a working "select a vehicle, see its trips on a map" in a single day. Committed as v1, v2, then v3 after wiring in Google Cloud for deployment.

**Stage 2:** Upgraded story generation, integrated Ace with proper polling and retry logic, set up BigQuery for caching Ace results and storing comic stories. Added per-user Geotab authentication (users enter their own credentials). By end of day the app was running on Google Cloud Run.

**Stage 3:** Added the Fleet Pulse dashboard — company-wide KPI strips, fleet group drill-down, regional vehicle maps, fleet daily AI digest. Added vehicle intelligence cards (trip profile, route fingerprint, driving behavior, anomaly detection) computed entirely client-side. Added next-stop prediction, location dossiers, Street View, text-to-speech narration, PDF export, and a natural-language AI assistant (`Cmd+K`).

Zero from scratch in a matter of days.

---

## What Got Built

The final app has five layers, each grounded in real Geotab data:

### 1. Fleet Pulse
Company-wide KPI dashboard. Ace powers the ranked vehicle table and fleet-wide insights. A daily AI digest generates headline observations, anomaly alerts, and next-week predictions. Groups are drillable — click into any fleet group for its own set of outliers, hotspots, and route patterns.

### 2. Route Context Briefing
The original "wow moment." Tap any stop marker on a trip map. Within seconds: a reverse-geocoded place name, a 2–3 sentence LLM-narrated area guide, nearby amenities, and (asynchronously, from Ace) the fleet's visit history for that location. A two-phase design kept the fast path fast and the slow Ace enrichment non-blocking.

### 3. Vehicle Intelligence
Per-vehicle analytics cards computed client-side from trip history. No extra API calls. Trip profile (distance trends, day-of-week patterns), route fingerprint (recurring origin-destination corridors), driving behavior (speed, idle, departure patterns), and statistical anomaly detection using z-scores.

### 4. Comic Trip Recap
The differentiator. Click "Create Trip Story" on any trip. An LLM receives structured trip data — start/end coordinates, GPS breadcrumbs, stop durations, and any context briefings generated for that trip — and produces a 4-panel comic schema. The frontend renders it with styled cards, place photos, map insets, and speech bubbles. Three tones: Guidebook, Playful, Cinematic. Stories cached in BigQuery. Exportable as PDF.

### 5. AI Fleet Assistant
A `Cmd+K` command palette that classifies natural-language queries and routes them to the right API — Geotab Direct, Ace, context briefings, or predictions. Intent classification first, then API call, then grounded response.

---

## The Technical Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Framework | Next.js 14 (App Router) | Full-stack in one process; API routes for Geotab proxy |
| Language | TypeScript | Type safety for Geotab's `x`/`y` coordinate quirks |
| UI | Tailwind CSS + shadcn/ui | Fast, polished without fighting the framework |
| Maps | Leaflet | Reliable, SSR-safe with `dynamic(..., { ssr: false })` |
| LLM chain | Vertex AI Gemini → Claude → OpenAI | Graceful degradation; one `generateText()` interface |
| Storage | BigQuery | Ace cache, story library, fleet snapshots, location dossiers |
| Deployment | Google Cloud Run via Cloud Build | Container-based, scales to zero, Secret Manager for credentials |
| Offline mode | `withFallback()` wrapping every API route | Demo survives network failure; 79 fallback JSON files |

---

## What Vibe Coding Actually Felt Like

There's a version of vibe coding that's just autocomplete. This wasn't that.

The meaningful parts were the decisions that *couldn't* be delegated:

- Recognizing that Ace's 30–90 second latency would kill the stop-click experience — and designing a two-phase briefing that makes Phase 1 feel instant
- Figuring out that Geotab uses `x` for longitude and `y` for latitude, and centralizing that normalization before it could infect every component
- Deciding that the LLM is *never* the source of truth for coordinates, distances, or fleet data — it only generates narrative from structured inputs
- Choosing `withFallback()` as a universal wrapper so the demo could survive a network outage at the presentation

The agents wrote the code. I wrote the architecture, the constraints, the prompt engineering, and the integration rules. The interesting part of the journey wasn't the typing — it was the thinking.

---

## What I'd Tell Someone Starting Now

**1. Start with a spec, not a scaffold.**
The time spent on `MY_PROJECT.md` before writing a line of code paid back tenfold. The orchestrator agent needed a real brief, not a vague direction.

**2. Design for demo reliability first.**
Every API route wrapped with a fallback. Ace queries cached in BigQuery. Two pre-generated comic stories and context briefings ready to go. The live demo can fail gracefully without anyone noticing.

**3. Treat the AI like a junior engineer, not a magic box.**
The agents were fast and capable, but they needed boundaries: file ownership, interface contracts, explicit rules about which APIs handle which data. Without that, they'd have reinvented the same utility five different ways.

**4. The "wow moment" is worth protecting.**
The stop-click → context briefing flow was the single interaction worth fighting for. Everything else in the app was built to set it up or follow from it. When scope creep threatened the timeline, asking "does this protect the wow moment?" was the right filter.

**5. Vibe coding doesn't mean low standards.**
It means high velocity. The code still needs to be correct, the architecture still needs to be sound, and the demo still needs to work. The AI handles the boilerplate so you can spend your limited time on the parts that actually matter.

---

## The Numbers

| Metric | Value |
|--------|-------|
| Days of active building | ~3 |
| Git commits | 8 (v1 → v8) |
| Pages | 8 |
| API routes | 22+ |
| Components | 40+ |
| Fallback JSON files | 79 |
| LLM providers chained | 3 (Gemini → Claude → OpenAI) |
| External services integrated | 8 (Geotab Direct, Ace, Maps Geocoding, Places, Vertex AI, Cloud TTS, BigQuery, Cloud Run) |
| Lines of production TypeScript | ~10,000+ |

---

*FleetHappens was built for the Geotab Vibe Coding Competition. The real product was the process.*

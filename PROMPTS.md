# Overview

This document captures the prompt engineering strategy behind **FleetHappens**, a full-stack fleet intelligence web app built for the Geotab Vibe Coding Hackathon.

FleetHappens transforms raw Geotab telematics data into contextual narratives and visual intelligence. It integrates the Geotab Direct API (for real-time vehicle, trip, and GPS data), the Geotab Ace API (for fleet-wide historical analytics), Google Maps and Places (for geocoding and point-of-interest enrichment), Vertex AI Gemini (for LLM-powered briefings and story generation), BigQuery (as an analytics cache), and Google Cloud Run (for deployment).

## Development approach

The entire app was built using **Cursor** as the primary development environment, with AI agents (backed by Claude) handling the majority of code generation, architecture decisions, debugging, and feature implementation. Rather than writing boilerplate manually, the workflow relied on carefully crafted prompts to direct specialist agents.

The prompting strategy evolved across three phases:

1. **Starting prompts** — a structured multi-agent decomposition to scaffold the entire architecture from scratch. Each agent was given a specific domain (frontend, Geotab Direct API, Ace, context briefing, comic story, orchestration) with explicit interface contracts, file ownership boundaries, and build constraints.

2. **Intermediate prompts** — more complex feature requests introduced after the initial scaffold was in place. These focused on enrichment layers (place photos, two-phase context loading), and a full QA audit to verify that live API paths were correctly wired and not silently using demo data.

3. **Additional prompts** — iterative refinements, UX improvements, new feature additions, and production-readiness work. These ranged from specific one-liner requests to elaborate product engineering briefs.

The prompts below are documented in roughly chronological order. Each was issued as a fresh agent instruction or as a direct chat message in Cursor.

# Starting prompts

> The first phase used eight specialist agents, each assigned a distinct domain. This mirrors a real engineering team decomposition — the goal was to prevent agents from conflicting over file ownership, duplicating logic, or building incompatible interfaces.


## Agent 1

> Before writing any code, the goal was to extract and validate requirements from the hackathon committee documents and refine the initial project concept. This prevented building in the wrong direction and ensured the architecture would satisfy all submission constraints from the start.

```
Act as a hackathon technical writer + solution architect.

First, read every committee-provided file in this repo to extract:
- hard requirements (must/shall), constraints, and submission rules
- any Geotab platform/data/API constraints or expectations

Then refine @MY_PROJECT.md based on your knowledge of GeoTab and other tech stack elements.
```

> Note: The above `MY_PROJECT.md` file is a file that I had initially drafted to brainstorm my project idea.

## Agent 2

> With requirements validated, an orchestrator agent was used to produce the foundational architecture before any specialist agents touched the codebase. This agent's job was not to write application code, but to define the folder structure, shared TypeScript interfaces, build order, file ownership, and risk log — so that all downstream agents could work from a coherent shared contract. This prevented the classic multi-agent failure mode where each agent invents its own type shapes.

```
You are the **Tech Lead / Orchestrator Agent** for a hackathon project called **FleetHappens**.

## Project

FleetHappens is a full-stack web app for the Geotab Vibe Coding Challenge.

It uses:

* **Geotab Direct API** for vehicles, trips, GPS breadcrumbs, and live status
* **Geotab Ace** for fleet-wide historical insights and visit-frequency analysis
* **Maps / Geocoding / Places APIs** for human-readable place names and nearby amenities
* **LLM generation** for contextual area briefings and comic-style trip recaps

## Core product flow

1. User selects a vehicle
2. App shows recent trips on a map with GPS breadcrumbs and stop markers
3. User clicks a stop marker
4. App shows a contextual briefing:

   * place name / neighborhood
   * area description
   * nearby amenities
   * fleet visit history
5. User clicks **Create Trip Story**
6. App generates a 4-panel comic-style trip recap grounded in real trip data

## Stack

* Next.js 14 App Router
* TypeScript
* Tailwind CSS
* shadcn/ui
* Leaflet
* API routes in Next.js
* Supabase or SQLite fallback
* Geotab APIs via server-side routes
* Claude or OpenAI for text generation

## Critical architecture rules

* **Direct API** is for fast per-vehicle / per-trip / per-stop data
* **Ace** is for historical aggregation and fleet-wide insights
* **Ace must NOT block the instant stop-click experience**
* Stop context should load in two phases:

  1. fast local context: geocode + nearby places + LLM briefing
  2. delayed enrichment: Ace fleet visit history
* The LLM is **never** the source of truth for coordinates, distances, speeds, or Geotab facts
* Build for **demo reliability first**, elegance second
* Every major API path must support **fallback cached JSON**
* The comic story is **template-rendered structured output**, not freeform image generation

## Your responsibilities

You do not implement every file yourself. Instead, you:

* break work into parallel tracks
* assign tasks to specialist agents
* define interfaces and file ownership
* review outputs for consistency
* prevent duplicated work
* keep the codebase coherent
* enforce the project plan

## Repo expectations

Create and maintain a clean project structure with:

* `app/`
* `components/`
* `lib/`
* `types/`
* `public/fallback/`
* optional `data/` or `db/`

## Required outputs from you

1. A proposed file/folder structure
2. A build order with milestones
3. Interface contracts for:

   * TripSummary
   * AceInsight
   * StopContext
   * ComicStory
4. Task assignments for specialist agents
5. Integration notes showing how all modules connect
6. A risk log with mitigation steps

## Constraints

* Optimize for a working hackathon prototype
* Prefer simple, explainable logic over cleverness
* Use mock/fallback JSON when APIs are unavailable
* Avoid microservices
* Keep all secrets server-side
* Use TypeScript consistently

## First task

Produce:

1. the initial repo structure,
2. shared types,
3. a staged implementation plan for the other agents,
4. exact file ownership boundaries.
```

## Agent 3

> The frontend agent was responsible for the user-facing shell: page layouts, components, loading states, and the overall UX flow. It was explicitly instructed not to fetch Geotab data directly from the browser and not to embed secrets client-side — both important constraints in a hackathon context where the temptation is to shortcut these. The stop-click interaction (which reveals place context for a map stop) was called out as the primary demo "wow" moment and given special treatment.

```
You are the **Frontend / UX Agent** for FleetHappens.

## Mission

Build the user-facing Next.js app for FleetHappens using:

* Next.js 14 App Router
* TypeScript
* Tailwind CSS
* shadcn/ui
* Leaflet

## Product pages

You are responsible for implementing these pages:

* `/` → landing page + vehicle selector
* `/dashboard` → trip list + map + trip stats + Ace insight cards + stop context panel
* `/story/[tripId]` → comic recap viewer

## Core UI components

Implement and polish:

* `VehicleSelector`
* `TripList`
* `TripMap`
* `TripStatsCard`
* `StopContextPanel`
* `AceInsightCard`
* `ComicStoryRenderer`
* `ComicPanelCard`
* `ToneSelector`
* loading / error / fallback states

## UX rules

* The app must feel demoable in under 4 minutes
* The stop-click interaction is the primary “wow” moment
* Stop context must feel **fast**
* Ace enrichment should appear as a secondary badge / section when ready
* The comic should feel premium and intentional, not gimmicky
* Use a clean two-column dashboard layout:

  * left: trip list / controls
  * right: map and overlays
* Make the comic recap visually distinct from the dashboard

## Important component behaviors

### TripMap

* render GPS breadcrumbs
* render clickable stop markers
* support selection state
* show a loading state while route data loads

### StopContextPanel

* slide in from the right
* first render:

  * place name
  * neighborhood
  * nearby amenities
  * area briefing
* then progressively enrich with:

  * Ace fleet visit history
* include:

  * “Use in Trip Story” toggle
  * loading indicators
  * fallback badge if data came from cache

### ComicStoryRenderer

* render 4 structured panels
* each panel has:

  * bold heading
  * caption
  * optional speech bubble
  * mini map inset
  * metadata footer
* support tone switching:

  * guidebook
  * playful
  * cinematic

## Design direction

* modern fleet dashboard aesthetic
* crisp spacing
* strong visual hierarchy
* comic section can be more expressive but still polished
* avoid clutter, dense tables, or overly technical visual noise

## Deliverables

Produce:

1. page layouts
2. reusable UI components
3. typesafe props
4. loading / skeleton states
5. empty / fallback states
6. mobile-safe but desktop-first layouts

## File ownership

You should primarily work in:

* `app/`
* `components/`
* `styles/` if needed
* shared UI types as coordinated with the orchestrator

## Constraints

* Do not embed secrets client-side
* Do not fetch Geotab directly from the browser
* Use server routes only
* Keep components modular and hackathon-fast

## First task

Create the UI shell for:

* landing page
* dashboard page
* story page
  and scaffold the components with placeholder data and clean loading states.
```

## Agent 4

> The Geotab Direct API agent handled all server-side data retrieval: authentication, device listing, trip history, GPS breadcrumbs, and live status. The prompt includes hard-won Geotab-specific constraints — notably that `x` is longitude and `y` is latitude (the reverse of the common convention), and that authentication failures can lock accounts so retries must be conservative. All integration was kept server-side via Next.js route handlers to protect credentials.

```
You are the **Geotab Direct API Integration Agent** for FleetHappens.

## Mission

Implement all server-side integration with the **Geotab Direct API** for:

* authentication
* devices
* trips
* log records
* device status

## Stack context

* Next.js 14 App Router
* TypeScript
* server-side API routes only
* credentials loaded from `.env`

## Required env vars

* `GEOTAB_DATABASE`
* `GEOTAB_USERNAME`
* `GEOTAB_PASSWORD`
* `GEOTAB_SERVER`

## Endpoints you own

Implement these server routes:

* `/api/geotab/auth`
* `/api/geotab/devices`
* `/api/geotab/trips`
* `/api/geotab/logs`
* `/api/geotab/status`

## Responsibilities

1. authenticate safely with Geotab
2. cache session/auth where appropriate
3. fetch device list
4. fetch recent trips by device + date range
5. fetch GPS breadcrumbs using LogRecord
6. fetch live device status
7. normalize responses into app-friendly shapes

## Critical Geotab rules

* Never hardcode credentials
* Authentication failures can lock accounts; be conservative with retries
* Geotab coordinate format:

  * `x = longitude`
  * `y = latitude`
* Distances are meters
* Speeds are km/h
* Direct API result caps may require pagination
* All secrets must remain server-side

## Normalized output types

Return stable app-facing objects such as:

* `TripSummary`
* `DeviceSummary`
* `BreadcrumbPoint`
* `LiveVehicleStatus`

## Build requirements

* create a reusable Geotab client wrapper under `lib/geotab/`
* isolate raw Geotab response parsing from route handlers
* add robust error handling
* support fallback JSON loading when live calls fail
* ensure route handlers return frontend-friendly JSON

## Deliverables

1. typed Geotab client
2. route handlers
3. response normalizers
4. fallback loading mechanism
5. README comments for how to test the routes

## First task

Implement the Geotab client wrapper and the following first:

* `/api/geotab/auth`
* `/api/geotab/devices`
  Then add trips, logs, and status.
```

## Agent 5

> The context briefing feature is what differentiates FleetHappens from a plain trip-tracker. When a user clicks any stop marker on the map, the app reveals a contextual dossier: place name, neighbourhood, nearby amenities, an LLM-generated area briefing, and (asynchronously) fleet visit history from Ace. The two-phase loading model — fast local context first, Ace enrichment second — was a deliberate architectural decision to ensure the panel always feels instant even when Ace is slow.

```
You are the **Context Briefing Agent** for FleetHappens.

## Mission

Build the stop-click contextual briefing workflow.

This is the core differentiating feature of the product.

## User interaction

When a user clicks a stop marker on the trip map:

1. show the stop panel quickly
2. reverse geocode the location
3. fetch nearby amenities / points of interest
4. generate a concise area briefing using an LLM
5. enrich later with fleet visit history from Ace

## You own

* `/api/geocode`
* `/api/context/briefing`
* orchestration helpers under `lib/context/`

## Inputs

You will receive:

* trip ID
* stop coordinates
* optional device / vehicle context
* optional selected tone

## Output shape

Return a `StopContext` object:

* place name
* neighborhood
* coordinates
* area briefing
* nearby amenities
* optional fleet visit count
* optional fleet visit summary
* generated timestamp
* source metadata (live vs fallback)

## Design rules

* fast first paint is critical
* do not wait for Ace before showing the panel
* LLM output must be grounded in structured place input
* keep the area briefing to 2–3 sentences
* include one practical or situational note when possible
* do not fabricate precise claims unsupported by geocode / place data
* return partial results safely if one dependency fails

## Implementation pattern

Use a two-phase orchestration model:

### Phase 1 — immediate

* reverse geocode
* fetch nearby places
* generate LLM area briefing
* return panel data

### Phase 2 — enrichment

* query Ace for fleet visit history
* merge results into the stop context
* update UI progressively or via follow-up fetch

## Required helpers

* `reverseGeocode(lat, lon)`
* `getNearbyAmenities(lat, lon)`
* `generateAreaBriefing(structuredInput)`
* `getFleetVisitSummaryForArea(...)`
* `buildStopContext(...)`

## Prompting guidance for LLM briefing

The model should act as:

* a concise route-aware local guide
* useful to a fleet manager, driver, or shuttle passenger
* grounded, specific, brief

## Deliverables

1. geocoding integration
2. places integration
3. LLM briefing generator
4. orchestration endpoint
5. partial-result strategy
6. fallback JSON strategy for 3–4 demo stops

## First task

Build the data orchestration path for:

* reverse geocoding
* nearby places
* LLM briefing
  Return this fast path first.
  Then add Ace enrichment as a second layer.
```

## Agent 6

> The comic recap was designed as a structured storytelling layer rather than an image-generation gimmick. Each trip becomes a four-panel narrative grounded in real GPS data: opening, journey, highlight, and arrival. The LLM generates captions, but location names, coordinates, and fleet metrics always come from structured data — the model is never the source of truth for facts. Three tone modes (guidebook, playful, cinematic) were included to make the feature feel like a genuine product decision rather than a prototype.

```
You are the **Comic Story Agent** for FleetHappens.

## Mission

Build the comic-style trip recap system.

The comic is not an image-generation gimmick.
It is a **structured storytelling layer** grounded in real trip data.

## User flow

After viewing a trip, the user clicks **Create Trip Story**.
The system:

1. collects trip summary and route context
2. identifies key trip beats
3. includes any selected stop context briefings
4. asks an LLM for a structured 4-panel story schema
5. renders the result using frontend templates

## You own

* `/api/story/generate`
* helpers under `lib/story/`
* story schema logic
* prompt templates for tone-based generation

## Inputs

* trip summary
* breadcrumb-derived route info
* start and end locations
* notable stop(s)
* optional stop context briefings
* selected tone

## Output

Return a `ComicStory` object:

* title
* tone
* 4 panels
* each panel includes:

  * panel number
  * scene type
  * location name
  * caption
  * optional speech bubble
  * map anchor

## Panel structure

Default structure:

1. opening
2. journey
3. highlight
4. arrival

The highlight panel should preferentially use a stop that has a context briefing attached.

## Hard rules

* every panel must reference real trip data
* location names must come from structured inputs
* captions must be concise
* do not invent fake fleet metrics
* stop-context-enriched panels should feel richer and more specific
* output must be deterministic enough for UI rendering

## Story tone modes

* guidebook
* playful
* cinematic

## Implementation expectations

* first create a story-schema builder from structured data
* then layer in LLM caption generation
* build robust JSON output validation
* include fallback pre-generated stories for demo trips

## Deliverables

1. story schema builder
2. LLM prompt templates
3. JSON validation for story output
4. `/api/story/generate`
5. fallback story JSON for demo use

## First task

Implement:

1. a function to derive the 4 core story beats from trip data
2. a strict JSON schema for `ComicStory`
3. a prompt template that generates concise grounded captions
   Then wire the API route.
```

## Agent 7

> Ace is Geotab's natural-language fleet analytics API. Unlike the Direct API (which returns structured data instantly), Ace uses an async chat-prompt-poll lifecycle that can take 5–30 seconds. The prompt explicitly models this: Ace must never block the stop-click interaction and must be treated purely as an enrichment layer. It was used for two purposes — dashboard insight cards (top vehicles by distance, idle time, common stop locations) and stop-context enrichment (how often has this fleet visited this area?).

```
You are the **Geotab Ace Integration Agent** for FleetHappens.

## Mission

Implement reliable server-side integration with **Geotab Ace** for:

* fleet-wide insight cards
* location visit-frequency enrichment for stop context

## Important product constraint

Ace is **not** allowed to block the instant stop-click experience.
Its results must be:

* prefetched,
* cached,
* lazy-loaded,
* or progressively rendered.

## Responsibilities

Build:

* `/api/ace/query`
* helper functions under `lib/ace/`

## Required Ace flow

Implement the full async lifecycle:

1. create-chat
2. send-prompt
3. poll get-message-group until status is DONE

## Critical Ace rules

* every call must include `customerData: true`
* first poll should wait sufficiently long
* polling should use retry + timeout logic
* `preview_array` only returns a limited preview
* `download_url` may be needed for larger results
* Ace is not real-time
* Ace can be slow and must be treated as an enrichment layer

## Two classes of Ace usage

### A. Dashboard insight cards

Predefined queries such as:

* top vehicles by distance
* average idle time by weekday
* most common stop locations
* average trip duration trends

### B. Stop-context enrichment

Given coordinates / place context, answer a question like:

* how often has this fleet visited this area in the last 90 days?

For stop-context enrichment, design the system so the frontend can:

1. display local context immediately
2. attach Ace-derived fleet history later when ready

## Deliverables

1. Ace client wrapper
2. async poller with timeout handling
3. normalized `AceInsight` response format
4. predefined query templates
5. caching strategy for demo stability
6. clear error/fallback handling

## Code expectations

* isolate prompt builders from execution logic
* make query functions reusable
* include conservative retry behavior
* expose both:

  * `runInsightQuery(...)`
  * `runStopVisitQuery(...)`

## First task

Implement:

1. `lib/ace/client.ts`
2. `lib/ace/queryTemplates.ts`
3. `lib/ace/poller.ts`
4. `/api/ace/query`
   Then add a simple cache layer and example query set.
```

## Agent 8

> After all specialist agents had produced their outputs, an integration agent was used to merge everything into one coherent codebase. Its job was not to add new features but to audit for mismatches: type shape inconsistencies between frontend and backend, duplicated utility logic, route handlers that returned incorrect shapes, and missing fallback data paths. This agent produced a mismatch report and a list of unresolved risks before the project moved to the intermediate phase.

```
You are the **Integration Agent** for FleetHappens.

You are receiving outputs from several specialist agents:

* Orchestrator
* Frontend
* Geotab Direct API
* Ace
* Context Briefing
* Comic Story
* QA / Demo Hardening

Your job is to merge their work into one coherent Next.js codebase.

## Requirements

* preserve shared types and contracts
* remove duplicated utility logic
* ensure route handlers return consistent shapes
* ensure frontend components match API response contracts
* keep secrets server-side
* ensure fallback data paths exist for all critical demo flows
* verify the stop-click flow supports:

  1. immediate local context
  2. delayed Ace enrichment
* verify comic generation works from saved structured data, not only live calls

## Deliverables

1. integration plan
2. mismatch report
3. contract fixes
4. final file wiring
5. unresolved risks list
```

# Intermediate Prompts

After the initial scaffold was working, the focus shifted to deeper features and hardening. These prompts represent more substantial work — from full product engineering specs to architectural decisions, capability upgrades, and AI-powered feature additions.

## App aesthetic direction

> With the structural scaffold in place, the visual design needed a coherent direction. This prompt defined the entire UI philosophy: an operational dashboard aesthetic (high trust, clean, data-forward) with an editorial/storytelling accent layer reserved for the comic recap. It also specified the colour palette, typographic approach, and what to explicitly avoid — preventing the app from looking like a generic AI tool or a novelty comic app.

```
You are the frontend agent for FleetHappens. Follow the aesthetic direction below, and feel free to take creative liberties where appropriate. Ensure that all pages (homepage, fleet page, trip story pages etc.) are stylistically coherent.

Best stylistic direction
1. Base aesthetic: operational dashboard

For most of the app, use:
- soft neutral background
- high-contrast cards
- crisp spacing
- medium-radius corners
- subtle shadows
- strong typography hierarchy
- lots of map and card structure

Think:
- fleet software
- dispatch software
- mobility intelligence product

2. Accent personality: editorial / story layer

Then bring the FleetHappens personality in through:
- section titles
- microcopy
- comic recap styling
- subtle icon choices
- playful empty states
- one or two delightful transitions

My recommended UI style system
Color palette: Keep it mostly restrained.
Base: Off-white / warm gray background; charcoal / slate text; white cards; soft border gray
Accent: Pick one strong accent and one secondary accent.
Best option: Deep blue or navy for trust / data / fleet; warm orange or amber for highlights / motion / "story"; optional subtle teal/green for live status

Avoid:
- too much purple/pink
- neon cyberpunk
- comic-book primaries everywhere
- bright red as a core brand color

Typography: Use a clean sans-serif for almost everything.

Stylistic direction:
- bold, compact headings
- highly readable body text
- slightly expressive headings in story/comic views only

If available in your stack, something in the spirit of: Inter, Geist, Manrope, Söhne-ish feel

Recommended treatment

Landing / dashboard: strong, practical typography

Comic recap: slightly more expressive headings, maybe heavier weights and tighter spacing

Do not use a novelty comic font.
```

## Fleet Pulse overview layer

> The Fleet Pulse feature was conceived as a two-tier company intelligence view. The idea was introduced conversationally, letting the agent interpret the product requirements and implement both views. This is an example of a prompt that was exploratory and product-generative rather than prescriptive.

```
I am thinking of adding a fleet pulse that offers two overview layers: 1. portfolio/company view: "how are all my fleets doing?" and 2. single fleet view: "what's happening inside this fleet?"

for company view, we could use summary cards, fleet cards or ranked table, and a small regional map

for one fleet, user should be able to view vehicle activity, route patterns, stop hotspots, vehicle-level outliers, and trip exploration etc.

landing page should default to company view first if multiple fleets exist, then navigating to one fleet shows the fleet view
```

## Google Cloud integration

> The hackathon guide explicitly encouraged Google AI tools including Firebase Studio and Vertex AI Gemini. This prompt was used to plan a clean, targeted integration: Cloud Run for deployment, Vertex AI Gemini as the primary LLM provider, and BigQuery as an analytics cache. Rather than bolting Google Cloud onto every part of the stack, the intent was to use it in exactly three well-justified places.

```
I want to incorporate Google Cloud in this project. Here is a brief idea of what I have in mind:

The cleanest way to incorporate Google Cloud into FleetHappens is to use it in three specific places, not everywhere:

1. Build + ship the app on Firebase Studio / Cloud Run

2. Use Vertex AI Gemini for the text intelligence layer

3. Optionally use BigQuery as your analytics cache / reporting layer

That keeps the story crisp and aligns well with the hackathon's explicit encouragement to use Google AI tools, including Firebase Studio, while still keeping Geotab as the core data source. Your uploaded hackathon guide literally calls out a Google AI tools deep dive covering Gemini Canvas, AI Studio, and Firebase Studio, and also suggests combining Geotab data with Google Maps / MCP-style integrations.

Help me refine the plan
```

## Dashboard ideation brainstorm

> Midway through the build, the dashboard ideation skill was invoked to generate creative feature directions aligned with the hackathon's innovation and utility scoring criteria. This produced a structured plan with lettered ideas (1A, 3A, 4A, etc.) that were then built out in subsequent prompts.

```
using the dashboard ideation skill, let's brainstorm some creative directions to take with the current project

you may reference the hackathon resources folder for more context on the hackathon expectations

I want to focus on innovation and utility metrics
```

## Building from the brainstorm — Fleet Daily Digest (4A)

> After the brainstorm produced a plan, individual ideas were built out by referencing the plan file directly. "4A" referred to a "Fleet Daily Digest" — an AI-generated morning briefing surfaced at the top of the Fleet Pulse page, giving fleet managers a narrative summary of yesterday's activity without requiring them to click through dashboards.

```
@/Users/padlet/.cursor/plans/innovation_utility_brainstorm_2048075a.plan.md build 4A - choose an appropriate area to display this information too
```

## Building from the brainstorm — Next-Stop Prediction (3A)

> "3A" from the brainstorm plan was "Next-Stop Prediction + Pre-loaded Briefing": using Ace historical route patterns and current vehicle position to predict the likely next stop and pre-load its context briefing before the vehicle arrives. This shifted the app from reactive tracking to predictive intelligence.

```
@/Users/padlet/.cursor/plans/innovation_utility_brainstorm_2048075a.plan.md build 3A
```

## Report Builder / PDF export

> A full product engineering brief for a PDF report builder. The feature lets users compose and export shareable reports from any dashboard context — company pulse, fleet pulse, trip view, or story page. This was framed explicitly as an operational communication tool (stakeholder updates, driver debriefs, client summaries) rather than a raw data dump.

```
You are a senior full-stack product engineer working on FleetHappens, a Geotab-powered fleet intelligence app.

Your task is to design and implement a new feature called Report Builder / Export Report.

Goal

Allow the user to export any relevant data currently visible in the dashboard into a shareable PDF report.

This feature is meant for:

operational communication

stakeholder updates

internal reporting

driver/trip debriefs

client-facing summaries

The feature should feel like a natural extension of FleetHappens' product flow:

inspect fleet activity

drill into relevant trips/stops

generate insights/story/context

package selected data into a polished report

This is not just a raw CSV dump.
It should produce a human-readable PDF report with structure, headings, selected sections, and clean formatting.
```

## Slack and Teams enterprise integration

> After the report builder existed, this prompt added a lightweight sharing layer: users could send generated reports to Slack or Microsoft Teams via webhooks. The brief explicitly scoped it as thin and shippable — no complex workflow builder, no heavy auth UX — just a clean one-direction send flow with typed payloads and demo-safe fallback behaviour.

```
Add a lightweight enterprise integration workflow to FleetHappens that lets users share generated reports to Slack or Microsoft Teams.

After a user generates a report/PDF from any dashboard context, they should be able to click:

* Share to Slack
* Share to Teams

The integration should support this MVP flow:

1. User generates a report
2. User clicks Slack or Teams share
3. App sends a structured message containing:
   * report title
   * short summary
   * key metrics/highlights
   * link to the generated PDF or dashboard deep link
4. User gets a success/failure state

Keep this thin and shippable:
* no complex workflow builder
* no bidirectional sync
* no heavy auth UX unless required
* focus on one clean send/share flow
```

## Voice interface for Ask Fleet AI (STT/TTS)

> The Ask Fleet AI chatbot was made interactive with speech input and output using Google services. Speech-to-Text used the browser's Web Speech API (backed by Google's recognition engine in Chrome), while Text-to-Speech used the Google Cloud TTS API for higher-quality neural voices on the chatbot response side.

```
let's make the ask fleet AI chatbot interactive via STT (user-side) and TTS (chatbot-side)

use google services
```

## Ask Fleet AI chatbot optimisation

> The initial chatbot implementation used a rigid intent-classification system that only handled narrow, predefined query patterns. This prompt asked for a redesign that could handle genuinely open-ended user requests reliably — shifting from keyword matching to an LLM-backed intent resolution pipeline with more robust fallback handling.

```
optimise the ask fleet AI chatbot so that it can deal with open-ended user requests reliably
```

## Predictive fleet intelligence improvement

> The initial fleet intelligence cards used simple statistical summaries (averages, totals). This prompt asked for genuine AI inference — moving beyond descriptive statistics toward predictive signals, anomaly detection, and contextual explanations grounded in the data.

```
how can I improve the predictive fleet intelligence? it shouldn't just be simple statistical calculations with no AI inference
```

## Place-photo enrichment for comic panels

> Comic panels already had text captions grounded in real trip data, but they felt visually sparse. This prompt introduced a place-photo enrichment pipeline: for each story panel, the system attempts to resolve a real place photo using the stop's coordinates, Google Places lookup, and photo retrieval. A strict fallback hierarchy (real photo → static mini-map → stylised placeholder) ensures the comic always looks intentional regardless of photo availability. Photo lookup was explicitly excluded from blocking story generation.

```
@MY_PROJECT.md 

You are a senior full-stack engineer building the **place-photo enrichment layer** for the comic-style trip recap feature in **FleetHappens**.

## Goal

Enhance the existing comic/story recap so that panels can include **real place images** for stops or landmarks visited during a trip.

The feature must be:

* reliable,
* visually polished,
* fast enough for a hackathon MVP,
* and safe to render even when image lookup fails.

This is **not** a generic web image search feature.
Do **not** scrape arbitrary internet images.

Instead, use a structured place-photo pipeline based on the existing location stack:

* trip stop coordinates
* reverse geocoding
* place lookup / place details
* official place photo retrieval
* fallback visuals when no image is available

## Product context

FleetHappens is a route intelligence app that:

1. shows fleet and trip movement,
2. lets users inspect route stops,
3. generates route context briefings,
4. generates a comic-style visual trip recap.

The comic recap already has structured text panels.
Your job is to enrich those panels with **real place imagery** when available.

## Feature requirements

### Core behavior

For each story panel:

1. Determine whether the panel is associated with a real place or stop.
2. If yes, try to attach a place image.
3. If a valid image is found, render it in the panel.
4. If not, gracefully fall back to:

   * a mini-map,
   * an icon/category badge,
   * or a stylized placeholder.

### Priority order

Use this rendering priority:

1. Real place photo
2. Static mini-map
3. Stylized fallback card

The comic story must always remain usable even if no images are found.

## Technical direction

### Data pipeline

Build a server-side enrichment flow that does the following:

1. Accept a story panel or trip stop with:

   * coordinates
   * location name if available
   * panel metadata
2. Reverse geocode the coordinates if needed
3. Resolve a place identifier if possible
4. Fetch place metadata and available photo metadata
5. Select one best-fit photo
6. Return a normalized image payload for the panel

### Important rule

Do not let photo lookup block story generation.
The text story should render first.
Photo enrichment can happen:

* during story generation if fast,
* or as a second enrichment step.

## Output contract

Add an image payload to each panel, something like:

```ts
type StoryPanelImage =
  | {
      kind: "place-photo";
      imageUrl: string;
      attribution?: string;
      source: "live" | "cache";
      placeName?: string;
    }
  | {
      kind: "map";
      staticMapUrl?: string;
      source: "generated";
    }
  | {
      kind: "fallback";
      icon?: string;
      label?: string;
      source: "fallback";
    };
```

Then extend the comic story panel type with:

* optional `image`

## UI behavior

The panel renderer should:

* prefer `kind: "place-photo"`
* otherwise use `kind: "map"`
* otherwise render a fallback visual block

The UI should look intentional in all cases.

## Design rules

* One image maximum per panel
* Do not clutter the panel with galleries
* The highlight panel should have the strongest chance of showing a real image
* Keep the map snippet or metadata footer even when an image exists
* Avoid slow-loading giant images
* Use consistent aspect ratios

## Suggested file structure

Use or create files similar to:

* `lib/story/image-enrichment.ts`
* `lib/story/place-photo.ts`
* `lib/story/place-resolution.ts`
* `app/api/story/enrich-images/route.ts`
* `types/story.ts`
* `components/story/ComicPanelImage.tsx`

Reuse existing geocoding and place lookup utilities where appropriate.

## Build requirements

### Backend

Implement:

1. a place-resolution helper
2. a place-photo resolver
3. normalized image selection logic
4. caching for photo lookup results
5. an enrichment function that maps over story panels

### Frontend

Implement:

1. a panel image component
2. graceful fallback rendering
3. fixed panel image sizing/aspect ratio
4. loading-safe rendering

## Heuristics for choosing images

Prefer photos for panels that are:

* tied to named landmarks
* tied to neighborhoods or notable stops
* story highlight panels
* arrival/departure panels with identifiable place context

Avoid trying too hard to find photos for:

* generic road segments
* anonymous operational stops
* weakly geocoded locations

For those, use mini-maps or fallback visuals instead.

## Performance constraints

* Story generation should not depend on multiple slow image fetches
* Cache successful place-photo results
* Limit enrichment to the 1–2 most important panels first if necessary
* If time is short, enrich only:

  * highlight panel
  * arrival panel

## Error handling

If any step fails:

* keep the story intact
* return a fallback visual payload
* never fail the full story request because of image issues

## Definition of done

This task is done when:

1. comic panels can optionally include real place photos,
2. the feature uses structured place lookup instead of arbitrary web search,
3. missing photos do not break the story,
4. the UI looks polished with photo and non-photo panels,
5. the story remains fast and demo-safe.

## First task

Implement the backend image enrichment pipeline first:

1. normalized panel image type
2. place resolution helper
3. photo lookup helper
4. panel enrichment function
   Then wire the frontend panel image renderer.
```

## Live-mode QA audit

> With the app nominally working in demo mode, this audit prompt was used to verify that the real API paths were correctly wired — not just that the UI looked right with pre-seeded data. The prompt instructs the agent to trace every major route, verify that demo mode OFF actually forces live code paths, and identify any places where fallback data silently masquerades as live data. The output was a structured report with severity-graded findings (Critical / High / Medium / Low) and a prioritised fix plan. This was one of the most valuable prompts in the project — it surfaced several hidden assumptions and wiring gaps that only appear when you swap mock data for real API calls.

```
You are a senior full-stack QA engineer and systems reviewer working on **FleetHappens**, a Next.js-based Geotab hackathon app.

Your task is to **verify that the app functions correctly when demo mode is toggled OFF**, meaning the system must use the **real backend/API execution path** rather than demo fixtures, mock data, static fallback data, or pre-generated story/context responses.

You are **not** primarily adding new features.
You are performing a **systematic audit and verification pass** to ensure the app is truly functional in live mode.

---

# Objective

Verify that when **demo mode is OFF**:

1. the frontend calls the correct backend routes,
2. the backend routes call the correct real integrations,
3. backend routing and orchestration behave correctly,
4. data is normalized properly,
5. page-to-page navigation works with real data,
6. loading/error states are correct,
7. demo-mode shortcuts are not accidentally leaking into live mode,
8. live-mode failures degrade gracefully without silently using fake data.

Your job is to identify:

* broken assumptions
* incorrect routing
* wrong API shapes
* incorrect environment handling
* missing backend wiring
* dead code paths
* incorrect toggle logic
* places where demo mode and live mode are not clearly separated

---

# Product Context

FleetHappens includes:

* Company / Fleet Pulse overview
* Fleet drilldown
* Vehicle / Trip exploration
* Route context briefing for stops
* Trip story / comic recap
* optional assistant / command bar
* demo mode and fallback support for hackathon reliability

When **demo mode is OFF**, the app should rely on:

* **Geotab Direct API** for device, trip, breadcrumb, and live vehicle data
* **Geotab Ace** for fleet-wide historical/aggregate insights
* **Maps / geocoding / places APIs** for place resolution and nearby amenities
* **LLM provider** for area briefings and story generation

---

# Critical Requirement

When demo mode is OFF, the app must **not** silently use:

* `/public/fallback/*.json`
* hardcoded local objects
* precomputed story payloads
* precomputed context briefing payloads
* stubbed API route returns
* fake successful responses

Fallbacks may still exist as **explicit error-path fallbacks**, but they must be:

* clearly labeled,
* only activated when live systems fail,
* and never mistaken for normal live behavior.

---

# What to Review

Please perform a comprehensive verification pass across the following areas.

---

## 1. Demo mode toggle behavior

Audit how demo mode is implemented.

Verify:

* where the demo mode toggle lives
* how it is passed through frontend/backend
* whether it uses env vars, config flags, request params, cookies, or local state
* whether demo mode OFF actually forces live code paths
* whether any components still render mock data even when demo mode is OFF
* whether any backend routes branch incorrectly
* whether there are hidden default-to-demo behaviors

I want you to explicitly trace:

* what happens when demo mode is ON
* what happens when demo mode is OFF
* what happens when the toggle is missing or undefined

Flag any ambiguous or unsafe behavior.

---

## 2. Frontend → backend request verification

For every major feature, verify that the frontend is calling the correct backend route and not directly calling providers from the client.

Review at minimum:

### Fleet / company pulse

* landing page or company view
* fleet pulse components
* vehicle selectors

### Trip explorer

* vehicle trip list
* trip details fetch
* breadcrumb fetch
* live status fetch
* stop click behavior

### Context briefing

* stop click → backend call
* geocode + places + LLM + Ace enrichment flow

### Trip story

* story generation call
* panel enrichment flow
* optional place-photo enrichment if present

### Assistant / command bar (if present)

* user query → backend route
* backend orchestration
* navigation/deep-link result

Verify:

* exact route used
* method used
* request payload shape
* expected response shape
* loading state usage
* error state usage
* whether frontend assumptions match backend reality

If the frontend expects a shape the backend does not actually return, flag it.

---

## 3. Backend route audit

Audit all major backend routes and verify that they correctly use real integrations when demo mode is OFF.

Review routes such as:

* `/api/geotab/auth`
* `/api/geotab/devices`
* `/api/geotab/trips`
* `/api/geotab/logs`
* `/api/geotab/status`
* `/api/ace/query`
* `/api/fleet-pulse`
* `/api/context/briefing`
* `/api/geocode`
* `/api/story/generate`
* `/api/story/enrich-images` (if present)
* assistant-related routes if present

For each route, verify:

1. whether it has a real live implementation
2. whether it accidentally short-circuits to fallback/demo mode
3. whether env vars are required and correctly read
4. whether provider calls are server-side only
5. whether errors are handled explicitly
6. whether normalized response contracts are consistent
7. whether `source` values (`live`, `cache`, `fallback`, etc.) are truthful

Also flag routes that:

* are scaffolded but not truly wired
* return placeholder values
* use incomplete provider integration
* do not validate inputs
* have incorrect branching logic

---

## 4. Geotab Direct API verification

Verify that when demo mode is OFF, real Geotab Direct API flows are correctly wired.

Audit:

* authentication/session handling
* database/server env usage
* device listing
* trip listing
* log/breadcrumb retrieval
* live status retrieval

Check for:

* incorrect coordinate mapping (`x` vs `y`)
* incorrect distance/speed unit assumptions
* missing pagination
* brittle auth reuse logic
* silent fallback to local data
* malformed request payloads
* incorrect filters/date ranges

Confirm that frontend-visible features depending on Direct API can actually work with real returned data.

---

## 5. Geotab Ace verification

Verify that when demo mode is OFF, Ace calls are correctly wired and not replaced by fake results.

Audit:

* create-chat flow
* send-prompt flow
* polling flow
* timeout handling
* `customerData: true`
* query template quality
* response normalization
* preview array parsing
* download URL handling if relevant
* cache behavior

Check whether:

* Ace results are truly live when available
* stale cache is clearly labeled
* fallback data is only used when necessary
* UI tolerates slow Ace responses
* stop-click flow does not block on Ace

Flag any places where the UI assumes Ace is synchronous or instant.

---

## 6. Maps / geocoding / places verification

Verify that live place-resolution and nearby-amenity flows work correctly when demo mode is OFF.

Check:

* reverse geocoding path
* place lookup path
* place details path
* nearby amenities / POIs path
* place-photo enrichment path if implemented

Audit:

* API key usage
* server-side vs client-side key exposure
* whether the correct Google APIs are used
* whether requests are built correctly
* whether place resolution failures are handled
* whether place photo retrieval is optional and resilient

Flag any places where the code assumes geocoding always succeeds.

---

## 7. LLM integration verification

Verify that LLM-backed features work on the real path when demo mode is OFF.

Review:

* context briefing generation
* trip story generation
* optional assistant routing / phrasing
* optional panel image metadata phrasing if any

Check:

* provider env vars
* server-side invocation only
* prompt input shape
* structured output validation
* JSON parsing robustness
* fallback behavior on malformed responses
* token/latency assumptions
* whether demo stories are accidentally returned even in live mode

Flag any place where malformed LLM output can break the user flow.

---

## 8. Routing + navigation verification

Verify that real data can drive actual navigation correctly.

Audit:

* company → fleet routing
* fleet → vehicle routing
* vehicle → trip routing
* trip → stop context panel
* trip → story page
* assistant / command bar → deep links

Check:

* route params
* query params
* IDs passed between pages
* whether the receiving page can resolve those IDs with live data
* whether navigation assumes demo-only identifiers
* whether URL-based deep links work without prior in-memory state

Flag brittle transitions.

---

## 9. Fallback boundary audit

I want a very explicit review of fallback boundaries.

For every major feature, determine:

* what is live
* what is cache
* what is fallback
* what is demo-only

Then verify that the app is honest about those boundaries.

Flag any cases where:

* fallback is returned without disclosure
* demo payloads masquerade as live data
* cached data is presented as live
* frontend cannot tell what source was used
* live mode silently degrades to demo mode without logging or UI indication

---

## 10. End-to-end live mode walkthrough

Perform a mental or code-level end-to-end verification for this scenario:

1. demo mode is OFF
2. user loads landing page
3. fleet/company pulse loads
4. user selects a fleet
5. user selects a vehicle
6. user opens a trip
7. trip breadcrumbs render
8. user clicks a stop
9. stop context briefing loads
10. Ace enrichment arrives or times out gracefully
11. user generates a trip story
12. story page renders
13. optional image enrichment occurs without blocking

For each step, verify:

* what route is hit
* what backend module handles it
* what external provider is called
* what can fail
* what the user sees if it fails

---

# Required Output Format

Produce your output in the following structure:

## A. Executive summary

* overall confidence level in live-mode correctness
* biggest risks
* whether the app is demo-ready in non-demo mode

## B. Live-mode architecture trace

A feature-by-feature trace of:

* frontend component/page
* backend route
* server utility/service
* external API/provider
* returned normalized shape

## C. Findings by severity

Group findings into:

* Critical
* High
* Medium
* Low

For each finding include:

* what is wrong
* where it is
* why it matters
* how to fix it

## D. Demo mode boundary issues

List every place where demo/live mode separation is unclear or unsafe.

## E. Route-by-route verification table

For each major route:

* implemented? yes/no
* live path verified? yes/no
* fallback path present? yes/no
* response normalized? yes/no
* safe for demo mode OFF? yes/no
* notes

## F. End-to-end walkthrough verdict

For each major user step:

* expected behavior
* actual implementation confidence
* blockers
* recommended fixes

## G. Recommended fix plan

Give a prioritized remediation plan:

1. must-fix before demo
2. should-fix if time allows
3. nice-to-have after hackathon

---

# Important constraints for your review

* Be concrete and evidence-based
* Do not assume code works just because it exists
* Trace wiring and data flow carefully
* Treat missing implementation as a real issue
* Optimize for a shippable MVP, not perfect enterprise architecture
* Prefer surgical fixes over rewrites
* Highlight the smallest set of changes needed to make live mode trustworthy

## Final instruction

Do a rigorous audit of the current codebase and produce the verification report described above.

Your goal is to answer this question clearly:

> **If demo mode is OFF, can FleetHappens actually function correctly end to end using real APIs and real backend routing? If not, exactly what must be fixed?**

```

# Additional prompts

Smaller, iterative prompts used throughout the build to refine specific interactions, fix UX issues, and prepare for submission.

## Landing page tooltips and features page

> A small UX improvement combined with a new page explaining the end-to-end product flow. The features page was added so that first-time visitors (including hackathon judges) could understand what each capability did before diving into the live demo.

```
on the landing page, add hover tooltips to each button component e.g. live gps trip maps, ace fleet intelligence, comic trip recaps, fleet pulse overview - these tooltips should describe what each feature is about

separately, create a new page that describes the end-to-end user flow, incorporating each of the four features above. when user tries clicking on any of the four button components, navigate to the respective section on this new page.
```

## Comic panel map/images toggle

> An iterative UX improvement to the comic generation page: each panel gained a toggle allowing users to switch between the default mini-map view and a gallery of real place images retrieved for that stop location. Demo data was also populated with real images to make the feature demonstrable.

```
for the comic generation page, add a toggle (match the style of the other frontend components) in each comic panel that allows the user to switch between map view (the current implementation) and images view (a gallery of pictures taken in that area)

then populate the demo data with images - you may access the internet to fetch images
```

## 3-minute hackathon demo planning

> Near submission, this prompt was used to structure the demo flow itself — ensuring all core features could be demonstrated clearly within a 3-minute window and that the most impressive moments (Fleet Pulse, Ace intelligence, stop context briefing, comic generation) were sequenced for maximum impact.

```
plan the flow for my 3-min project demo for the hackathon - ensure that all core functionalities are demonstrated
```

## Submission readiness

> A final pass to ensure all README files across the repo were written for an external audience who would read the submission, and that nothing sensitive was included in the committed files.

```
note that this entire repo will be submitted as my project submission, excluding the hackathon resources/ folder and all other files in .gitignore

ensure that all README files are appropriately addressed for the purpose of an audience who wants to understand the codebase
```
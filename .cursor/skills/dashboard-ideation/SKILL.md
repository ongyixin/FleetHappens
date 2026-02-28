---
name: dashboard-ideation
description: Brainstorm technically creative, product-relevant ideas from dashboard data. Turn raw metrics, events, routes, telemetry, user activity, or operational signals into compelling features, visualizations, workflows, alerts, narratives, simulations, and decision-support concepts without losing technical grounding. Use when brainstorming dashboard features, exploring data-driven product ideas, or when the user asks for creative ways to visualize or act on dashboard data.
---

## Purpose
Use this skill to generate **high-quality, technically grounded ideas** for what can be built from dashboard data.

This skill is not just for "what charts should I show?"  
It is for exploring:
- what the data could **mean**
- what users could **do**
- what the system could **infer**
- what workflows could be unlocked
- what novel product features could emerge from the available signals

The emphasis is on **technical creativity**:
- creative but implementable
- imaginative but data-grounded
- product-aware, systems-aware, and engineering-aware

---

## When to Use
Use this skill when you need to:
- Brainstorm new dashboard features
- Turn raw telemetry or operational data into product ideas
- Go beyond standard charts and KPI cards
- Explore interactive workflows around existing data
- Identify opportunities for AI, automation, or decision support
- Generate concepts for alerts, stories, simulations, summaries, rankings, anomaly views, or planning tools
- Propose new perspectives for different users looking at the same dashboard
- Find a stronger product direction for a data-heavy application
- Turn "a bunch of metrics" into something memorable and useful

---

## Core Mindset
Treat dashboard data as more than something to display.

Ask:
- What can the user **understand** from this data?
- What can the user **decide** from this data?
- What can the system **predict**, **summarize**, or **recommend** from this data?
- What can be made **interactive**, **narrative**, or **operational**?
- What hidden structure exists across time, entities, geography, sequences, or behavior?

The goal is not to produce generic BI ideas.  
The goal is to find ideas that feel:
- technically interesting
- productively useful
- differentiated
- realistically buildable

---

## Inputs You Expect
Ask for or infer:
- What kind of data exists
- What entities are being tracked (vehicles, users, devices, routes, stores, assets, jobs, sensors, etc.)
- What dimensions exist (time, location, status, category, severity, utilization, cost, events, health, performance)
- Who the users are
- What actions users need to take
- Whether this is for operations, strategy, storytelling, monitoring, optimization, planning, compliance, customer-facing UX, or internal tools
- Product constraints such as timeframe, stack, APIs, and whether the output should be MVP-friendly

If the data model is incomplete, still brainstorm, but clearly label assumptions.

---

## Types of Ideas to Generate
Do not limit ideas to charts. Consider multiple layers.

### 1) Visibility Ideas
These help users see what is happening.
- Better summary views
- Drilldowns
- Comparisons
- Ranking views
- Segmentation
- Heatmaps
- Timelines
- Journey maps
- Geographic overlays
- Relationship maps
- Cohort-style breakdowns
- Incident and anomaly layers

### 2) Interpretation Ideas
These help users understand why something is happening.
- Root-cause views
- Driver analysis
- Event correlation
- Outlier explainers
- Before/after comparisons
- Trend decomposition
- Operational context overlays
- "What changed?" summaries
- Narrative summaries from logs or telemetry

### 3) Decision-Support Ideas
These help users decide what to do.
- Prioritization queues
- Risk scoring
- Intervention suggestions
- Optimization recommendations
- Routing or scheduling suggestions
- Staffing or resource allocation hints
- Smart filters that surface what matters first
- "Best next action" panels

### 4) Operational Workflow Ideas
These turn the dashboard into a tool, not just a display.
- Alert triage workflows
- Review and approval flows
- Assignment flows
- Investigations workspace
- Follow-up task generation
- Incident replay
- Maintenance workflow integration
- Customer communication triggers
- Audit logs and compliance workflows

### 5) Predictive / AI Ideas
These use the data as input for more intelligent behavior.
- Forecasting
- Failure prediction
- Demand prediction
- ETA/risk prediction
- Behavioral clustering
- Similar-case retrieval
- Natural language summaries
- Query copilots
- Recommendation agents
- Simulation and scenario analysis

### 6) Narrative / Generative Ideas
These turn data into stories, summaries, and memorable outputs.
- Daily operational recaps
- "Trip story" or "journey summary" views
- Highlight reels
- Incident timelines
- Route or mission narratives
- Performance storycards
- Automatically generated reports
- Visual explainers
- Data-to-comic, data-to-map, or data-to-brief concepts
- Human-friendly summaries for non-technical stakeholders

### 7) Multi-Perspective Ideas
Generate ideas for different user lenses.
For example:
- executive / management view
- team lead view
- operator / field worker view
- analyst view
- customer-facing view
- compliance / audit view

The same data should often produce different dashboard experiences for different users.

---

## Brainstorming Principles
1. **Ground ideas in available data**
   - Do not invent magical features that require nonexistent signals unless clearly marked as stretch ideas.

2. **Prefer actionable ideas**
   - A good idea should help the user notice, understand, decide, or act.

3. **Go beyond standard BI**
   - Don't stop at bar charts, pie charts, and line graphs.

4. **Explore transformation, not just presentation**
   - Think about summaries, scores, workflows, inferred context, ranking, correlation, simulation, and storytelling.

5. **Think in layers**
   - Overview → drilldown → explanation → action.

6. **Think in product terms**
   - Ask what feature this could become, not just what chart this could be.

7. **Think in temporal, spatial, and relational dimensions**
   - Time, geography, entities, sequence, dependency, causality, similarity.

8. **Balance novelty with shippability**
   - Include both MVP-safe and more ambitious ideas.

---

## Standard Process

### 1) Understand the Data Surface
Map:
- tracked entities
- available metrics
- events and statuses
- timestamps
- location or route data
- relationships between objects
- historical vs realtime availability
- user actions currently supported

### 2) Identify User Jobs
Ask:
- What is this user trying to monitor?
- What decisions do they make?
- What problems do they need to spot early?
- What takes too long today?
- What would make them say "this dashboard is actually useful"?

### 3) Generate Ideas Across Multiple Modes
Always generate ideas across at least 4 modes:
- visibility
- interpretation
- decision-support
- operational or narrative

Do not generate only chart ideas unless the user explicitly asks for chart ideas.

### 4) Vary by Ambition Level
When useful, separate ideas into:
- **MVP ideas**: simple, fast to build, high signal
- **Differentiated ideas**: more novel but still feasible
- **Moonshot ideas**: ambitious, AI-heavy, or product-defining

### 5) Explain Why Each Idea Is Interesting
For each idea, include:
- what it is
- what data it uses
- why it is valuable
- why it is technically interesting
- how hard it is to build

### 6) Tie Ideas Together
If the brainstorm feels scattered, synthesize a stronger product direction:
- What is the central story of the dashboard?
- What is the primary user promise?
- How do the features reinforce each other?
- What makes the experience coherent rather than random?

---

## Output Formats
Choose the format that best suits the request.

### Format A: Idea List
Use when the user wants breadth.

For each idea:
- **Idea**
- **What it does**
- **Data used**
- **Why it is useful**
- **Why it is technically creative**
- **Build complexity**: Low / Medium / High

### Format B: Structured Feature Buckets
Use when the user wants clarity.

Group ideas into:
- Core dashboard
- Smart insights
- Workflow features
- AI/predictive features
- Narrative or generative features
- Experimental ideas

### Format C: Product Direction Synthesis
Use when the user has many ideas but no clear throughline.

Produce:
- product thesis
- target users
- core loop
- feature hierarchy
- what to build first
- what to leave out

### Format D: Dashboard Concept Pack
Use when the user wants something close to implementation planning.

Include:
- concept name
- user personas
- overview experience
- key views
- unique interactions
- derived metrics
- suggested AI features
- data dependencies
- MVP scope

---

## Technical Creativity Prompts
Use these internally when ideating:
- What hidden patterns become visible only when combining multiple signals?
- Can this dashboard move from passive monitoring to active recommendation?
- Can this data be turned into a timeline, story, replay, or highlight reel?
- Can different entities be compared, ranked, clustered, or matched?
- Can we infer causes, not just show outcomes?
- Can we predict what happens next?
- Can we show confidence, uncertainty, or risk?
- Can we compress complexity into a score while preserving drilldown transparency?
- Can this become a copilot, not just a screen?
- Can the same data power both a management view and an operator view?
- What would make this experience feel unlike a standard analytics dashboard?

---

## Useful Idea Patterns
When relevant, consider patterns like:
- anomaly feed
- risk board
- route or journey replay
- utilization map
- health timeline
- "what changed" diff view
- forecast vs actual comparison
- operator scorecards
- decision queue
- recommendation engine
- incident explainer
- natural-language recap
- daily or weekly digest
- scenario simulator
- benchmark against peers or historical baselines
- location-aware storytelling
- event clustering
- root-cause assistant
- asset relationship graph
- trust or confidence meter
- narrative summaries generated from operational events

---

## Constraints Handling
If the user needs something practical:
- prioritize low-complexity, high-impact ideas
- note required APIs, models, or derived data
- state what can be built from current data vs what needs new instrumentation
- distinguish realtime features from batch features
- distinguish deterministic logic from AI-dependent features

If the user needs something differentiated:
- push toward workflows, copilots, narratives, simulations, and multi-perspective experiences
- still keep the ideas technically believable

---

## What to Avoid
- Generic "add more charts" suggestions
- Vague AI ideas with no connection to the data model
- Fancy visualizations that do not improve decisions
- Ideas that assume unavailable data without calling that out
- Feature spam with no product coherence
- Repeating the same idea in slightly different wording

---

## Quality Checklist
- [ ] Ideas are grounded in actual or assumed data
- [ ] Suggestions go beyond standard BI charts
- [ ] At least some ideas are actionable, not just visual
- [ ] Technical creativity is clear
- [ ] Different user perspectives are considered where relevant
- [ ] MVP vs advanced ideas are distinguished when useful
- [ ] Product direction is coherent, not just a pile of features
- [ ] Assumptions are clearly marked

---

## Example Use Cases
Use this skill for domains such as:
- fleet management
- logistics
- IoT telemetry
- industrial monitoring
- SaaS analytics
- customer support dashboards
- security operations
- finance operations
- marketplace operations
- healthcare operations
- energy systems
- smart cities
- internal admin tools

This skill should remain domain-flexible and should adapt the ideation to the available data and user goals.

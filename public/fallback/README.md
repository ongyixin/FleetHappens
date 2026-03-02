# Fallback JSON Files

These files are loaded automatically when any live API call fails — due to network errors, invalid credentials, Geotab API downtime, or rate limits. They keep the app functional even when no live Geotab, Ace, or LLM API is available.

The loading logic lives in `lib/cache/fallback.ts`. Every API route wraps its external call with `withFallback(key, fn)`: if `fn()` throws, `withFallback` loads `public/fallback/{key}.json` and returns it instead.

## File Naming Convention

| Pattern | Route that uses it |
|---|---|
| `devices.json` | `/api/geotab/devices` |
| `trips-{deviceId}.json` | `/api/geotab/trips` |
| `logs-{deviceId}.json` | `/api/geotab/logs` |
| `status.json` | `/api/geotab/status` |
| `groups.json` | `/api/geotab/groups` |
| `ace-{queryKey}.json` | `/api/ace/query` |
| `geocode-{lat3}-{lon3}.json` | `/api/geocode` |
| `amenities-{lat3}-{lon3}.json` | context briefing — places phase |
| `briefing-{lat3}-{lon3}.json` | context briefing — LLM output |
| `story-{tripId}-{tone}.json` | `/api/story/generate` |
| `pulse-summary.json` | `/api/pulse/summary` |
| `pulse-fleet-{groupId}.json` | `/api/pulse/fleet/[groupId]` |

`{lat3}` and `{lon3}` are the coordinate values rounded to 3 decimal places, used as a cache key (e.g. `geocode-37.774-122.419.json`).

## Populating Fallback Files

Run the app against a live Geotab account and save the API responses as fallback files. The `scripts/gen-demo-trips.mjs` script can assist with generating trip data.

To verify offline mode works correctly:

```bash
# Set an invalid password, then start the dev server
GEOTAB_PASSWORD=wrong npm run dev
```

Every screen should load from fallback JSON with no console errors. The UI shows a "demo data" banner when operating in fallback mode.

## What to Pre-populate

At minimum, populate:

- `devices.json` — vehicle list for the home page
- `trips-{deviceId}.json` — trips for each vehicle you want to demo
- `logs-{deviceId}.json` — GPS breadcrumbs for key trips
- `ace-top_vehicles_distance.json`, `ace-idle_by_day.json`, `ace-top_stop_locations.json` — Ace insight cards
- `story-{tripId}-playful.json`, `story-{tripId}-guidebook.json`, `story-{tripId}-cinematic.json` — pre-generated comic stories for all three tones
- `briefing-{lat3}-{lon3}.json` — context briefings for key stops on demo trips

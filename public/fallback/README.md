# Fallback JSON Files

These files are loaded automatically when any live API call fails.
They keep the demo running even if Geotab, Ace, or LLM APIs are unavailable.

## Naming convention

| Pattern | Used by |
|---------|---------|
| `devices.json` | `/api/geotab/devices` |
| `trips-{deviceId}.json` | `/api/geotab/trips` |
| `logs-{deviceId}.json` | `/api/geotab/logs` |
| `status.json` | `/api/geotab/status` |
| `ace-{queryKey}.json` | `/api/ace/query` |
| `geocode-{lat3}-{lon3}.json` | `/api/geocode` |
| `amenities-{lat3}-{lon3}.json` | context briefing places |
| `briefing-{lat3}-{lon3}.json` | context briefing LLM output |
| `story-{tripId}-{tone}.json` | `/api/story/generate` |

## Before demo day

1. Run a full live session and save the API responses as these files.
2. Test offline mode: set `GEOTAB_PASSWORD=wrong` and verify every screen still loads.
3. Pre-generate story fallbacks for the 3 demo trips in all 3 tones.

import type { GeotabDevice, TripSummary, LogRecord, AceInsight, StopContext, ComicStory } from "@/types";

export async function loadFallbackDevices(): Promise<GeotabDevice[]> {
  const res = await fetch("/fallback/devices.json");
  const data = await res.json();
  return data.devices;
}

export async function loadFallbackTrips(deviceId?: string): Promise<TripSummary[]> {
  const res = await fetch("/fallback/trips.json");
  const data = await res.json();
  if (deviceId) {
    return data.trips.filter((t: TripSummary) => t.deviceId === deviceId);
  }
  return data.trips;
}

export async function loadFallbackLogs(): Promise<LogRecord[]> {
  const res = await fetch("/fallback/logs.json");
  const data = await res.json();
  return data.records;
}

export async function loadFallbackAceInsights(): Promise<AceInsight[]> {
  const res = await fetch("/fallback/ace-insights.json");
  const data = await res.json();
  return data.insights;
}

export async function loadFallbackStopContext(tripId?: string): Promise<StopContext[]> {
  const res = await fetch("/fallback/stop-context.json");
  const data = await res.json();
  if (tripId) {
    return data.contexts.filter((c: StopContext) => c.tripId === tripId);
  }
  return data.contexts;
}

export async function loadFallbackComicStory(tripId?: string): Promise<ComicStory | null> {
  const res = await fetch("/fallback/comic-story.json");
  const data = await res.json();
  if (!tripId || data.story.tripId === tripId) {
    return data.story;
  }
  return null;
}

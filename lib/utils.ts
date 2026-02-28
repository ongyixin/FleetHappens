import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDistance(meters: number): string {
  const km = meters / 1000;
  return km >= 1 ? `${km.toFixed(1)} km` : `${meters} m`;
}

export function formatDuration(hhmmss: string): string {
  const parts = hhmmss.split(":").map(Number);
  const [h, m] = parts;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function formatDateShort(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    weekday: "short",
  });
}

export function formatTimeOnly(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function formatSpeed(kmh: number): string {
  return `${Math.round(kmh)} km/h`;
}

export function formatDurationFromSeconds(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function clampCoords(
  coords: Array<[number, number]>,
  maxPoints = 500
): Array<[number, number]> {
  if (coords.length <= maxPoints) return coords;
  const step = Math.ceil(coords.length / maxPoints);
  return coords.filter((_, i) => i % step === 0);
}

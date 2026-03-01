/**
 * Generates public/fallback/trips-{vehicleId}.json for all 33 demo vehicles.
 *
 * Each vehicle gets a unique set of trips within its regional geography.
 * Trip count and total distance are calibrated to match the vehicle's
 * distanceTodayKm and tripCountToday in the pulse mock data.
 *
 * Run: node scripts/gen-demo-trips.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "../public/fallback");

// ─── Regional anchor locations ────────────────────────────────────────────────

const NORTH = {
  "Oakland DC":        { lat: 37.8044, lon: -122.2712 },
  "Berkeley SC":       { lat: 37.8716, lon: -122.2727 },
  "Emeryville Hub":    { lat: 37.8317, lon: -122.2911 },
  "Alameda Terminal":  { lat: 37.7738, lon: -122.2519 },
  "Richmond Depot":    { lat: 37.9358, lon: -122.3477 },
  "San Leandro WH":    { lat: 37.7238, lon: -122.1561 },
  "Castro Valley":     { lat: 37.6909, lon: -122.0857 },
  "Piedmont Yard":     { lat: 37.8239, lon: -122.2320 },
};

const SOUTH = {
  "SJ Tech Campus":    { lat: 37.3382, lon: -121.8863 },
  "Milpitas Storage":  { lat: 37.4323, lon: -121.8996 },
  "Santa Clara Depot": { lat: 37.3541, lon: -121.9552 },
  "Sunnyvale SC":      { lat: 37.3688, lon: -121.9250 },
  "Palo Alto Office":  { lat: 37.4419, lon: -122.1430 },
  "Campbell Hub":      { lat: 37.2871, lon: -121.9520 },
  "Los Gatos Ctr":     { lat: 37.2358, lon: -121.9624 },
  "Morgan Hill":       { lat: 37.1305, lon: -121.6544 },
};

const EAST = {
  "Fremont WH":        { lat: 37.5485, lon: -121.9886 },
  "Union City Depot":  { lat: 37.5840, lon: -122.0342 },
  "Hayward Logistics": { lat: 37.6688, lon: -122.0808 },
  "Newark Distrib":    { lat: 37.5200, lon: -122.0400 },
  "Castro Valley Hub": { lat: 37.6909, lon: -122.0857 },
  "Dublin Distrib":    { lat: 37.7016, lon: -121.9358 },
  "Pleasanton Ctr":    { lat: 37.6624, lon: -121.8747 },
  "Livermore Park":    { lat: 37.6819, lon: -121.7681 },
};

const WEST = {
  "SF Embarcadero":    { lat: 37.7956, lon: -122.3933 },
  "SFO Cargo":         { lat: 37.6213, lon: -122.3789 },
  "South SF Depot":    { lat: 37.6547, lon: -122.4077 },
  "Daly City Hub":     { lat: 37.6879, lon: -122.4702 },
  "Mission District":  { lat: 37.7599, lon: -122.4148 },
  "Potrero Hill":      { lat: 37.7633, lon: -122.4010 },
  "Bayview Depot":     { lat: 37.7311, lon: -122.3892 },
  "Visitacion Valley": { lat: 37.7124, lon: -122.4036 },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function haversineKm(a, b) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const s = Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

function pad2(n) { return String(n).padStart(2, "0"); }

function addMinutes(isoStr, mins) {
  return new Date(new Date(isoStr).getTime() + mins * 60_000).toISOString();
}

/** Format ms duration as HH:MM:SS */
function fmtDur(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${pad2(h)}:${pad2(m)}:00`;
}

/**
 * Build a trip object (TripSummary format) between two named anchor points.
 * `daysAgo` shifts the trip's date back N days from 2026-02-28.
 * `startHour` is the UTC hour of the trip start.
 */
function makeTrip(id, deviceId, deviceName, fromName, from, toName, to, daysAgo, startHour, idleMins = 5) {
  const distKm = Math.round(haversineKm(from, to) * 1.35 * 10) / 10; // road factor
  const avgSpeed = 42 + Math.round(Math.random() * 18); // 42–60 km/h
  const driveMins = Math.round((distKm / avgSpeed) * 60);
  const totalMins = driveMins + idleMins;
  const maxSpeed  = avgSpeed + 30 + Math.round(Math.random() * 20);

  const baseDate = new Date("2026-02-28T00:00:00Z");
  baseDate.setUTCDate(baseDate.getUTCDate() - daysAgo);
  baseDate.setUTCHours(startHour, Math.floor(Math.random() * 60), 0, 0);
  const startISO = baseDate.toISOString();
  const stopISO  = addMinutes(startISO, totalMins);

  return {
    id,
    deviceId,
    deviceName,
    start: startISO,
    stop:  stopISO,
    distanceMeters: Math.round(distKm * 1000),
    distanceKm: distKm,
    drivingDuration: fmtDur(driveMins),
    idlingDuration:  fmtDur(idleMins),
    averageSpeedKmh: avgSpeed,
    maxSpeedKmh:     maxSpeed,
    startPoint: { lat: from.lat, lon: from.lon },
    endPoint:   { lat: to.lat,   lon: to.lon   },
  };
}

/**
 * Build a vehicle's full trip history.
 *
 * `schedule` is an array of: { from, to, daysAgo, startHour }
 * All anchor names are keys in the `anchors` object.
 */
function buildVehicleTrips(vehicleId, vehicleName, anchors, schedule) {
  const trips = [];
  for (let i = 0; i < schedule.length; i++) {
    const { from, to, daysAgo = 0, startHour = 8, idleMins = 5 } = schedule[i];
    trips.push(makeTrip(
      `${vehicleId}-t${i + 1}`,
      vehicleId,
      vehicleName,
      from, anchors[from],
      to,   anchors[to],
      daysAgo,
      startHour,
      idleMins,
    ));
  }
  return trips;
}

function write(vehicleId, trips) {
  const out = path.join(OUT_DIR, `trips-${vehicleId}.json`);
  fs.writeFileSync(out, JSON.stringify(trips, null, 2));
  console.log(`  ✓ trips-${vehicleId}.json  (${trips.length} trips)`);
}

// ─── North Region vehicles ────────────────────────────────────────────────────

// n1  Truck 04 — Patel  |  9 trips today, 318 km
write("n1", buildVehicleTrips("n1", "Truck 04 — Patel", NORTH, [
  { from: "Oakland DC",       to: "Richmond Depot",   daysAgo: 0, startHour:  7, idleMins: 12 },
  { from: "Richmond Depot",   to: "Berkeley SC",      daysAgo: 0, startHour:  8, idleMins:  4 },
  { from: "Berkeley SC",      to: "Emeryville Hub",   daysAgo: 0, startHour:  9, idleMins:  6 },
  { from: "Emeryville Hub",   to: "Oakland DC",       daysAgo: 0, startHour: 10, idleMins:  3 },
  { from: "Oakland DC",       to: "Alameda Terminal", daysAgo: 0, startHour: 11, idleMins:  8 },
  { from: "Alameda Terminal", to: "San Leandro WH",   daysAgo: 0, startHour: 12, idleMins:  5 },
  { from: "San Leandro WH",   to: "Castro Valley",    daysAgo: 0, startHour: 13, idleMins:  9 },
  { from: "Castro Valley",    to: "Oakland DC",       daysAgo: 0, startHour: 14, idleMins:  4 },
  { from: "Oakland DC",       to: "Piedmont Yard",    daysAgo: 0, startHour: 15, idleMins:  6 },
  // Yesterday
  { from: "Piedmont Yard",    to: "Berkeley SC",      daysAgo: 1, startHour:  8, idleMins:  5 },
  { from: "Berkeley SC",      to: "Richmond Depot",   daysAgo: 1, startHour: 10, idleMins:  7 },
  { from: "Richmond Depot",   to: "Oakland DC",       daysAgo: 1, startHour: 14, idleMins:  3 },
]));

// n2  Van 01 — Martinez  |  7 trips today, 247 km
write("n2", buildVehicleTrips("n2", "Van 01 — Martinez", NORTH, [
  { from: "Emeryville Hub",   to: "Oakland DC",       daysAgo: 0, startHour:  7, idleMins:  5 },
  { from: "Oakland DC",       to: "San Leandro WH",   daysAgo: 0, startHour:  8, idleMins:  9 },
  { from: "San Leandro WH",   to: "Alameda Terminal", daysAgo: 0, startHour:  9, idleMins:  6 },
  { from: "Alameda Terminal", to: "Emeryville Hub",   daysAgo: 0, startHour: 10, idleMins:  4 },
  { from: "Emeryville Hub",   to: "Castro Valley",    daysAgo: 0, startHour: 11, idleMins: 11 },
  { from: "Castro Valley",    to: "San Leandro WH",   daysAgo: 0, startHour: 13, idleMins:  7 },
  { from: "San Leandro WH",   to: "Oakland DC",       daysAgo: 0, startHour: 15, idleMins:  4 },
  // Yesterday
  { from: "Oakland DC",       to: "Piedmont Yard",    daysAgo: 1, startHour:  9, idleMins:  6 },
  { from: "Piedmont Yard",    to: "Emeryville Hub",   daysAgo: 1, startHour: 13, idleMins:  4 },
]));

// n3  Truck 02 — Chen  |  6 trips today, 203 km
write("n3", buildVehicleTrips("n3", "Truck 02 — Chen", NORTH, [
  { from: "Berkeley SC",      to: "Richmond Depot",   daysAgo: 0, startHour:  7, idleMins: 14 },
  { from: "Richmond Depot",   to: "Piedmont Yard",    daysAgo: 0, startHour:  9, idleMins:  5 },
  { from: "Piedmont Yard",    to: "Oakland DC",       daysAgo: 0, startHour: 10, idleMins:  6 },
  { from: "Oakland DC",       to: "Emeryville Hub",   daysAgo: 0, startHour: 11, idleMins:  8 },
  { from: "Emeryville Hub",   to: "Berkeley SC",      daysAgo: 0, startHour: 12, idleMins:  3 },
  { from: "Berkeley SC",      to: "Richmond Depot",   daysAgo: 0, startHour: 14, idleMins:  7 },
  // Yesterday
  { from: "Richmond Depot",   to: "Oakland DC",       daysAgo: 1, startHour:  8, idleMins:  5 },
  { from: "Oakland DC",       to: "Castro Valley",    daysAgo: 1, startHour: 12, idleMins:  9 },
]));

// n4  Van 05 — Nguyen  |  8 trips today, 179 km
write("n4", buildVehicleTrips("n4", "Van 05 — Nguyen", NORTH, [
  { from: "Alameda Terminal", to: "Oakland DC",       daysAgo: 0, startHour:  6, idleMins:  4 },
  { from: "Oakland DC",       to: "Castro Valley",    daysAgo: 0, startHour:  7, idleMins:  7 },
  { from: "Castro Valley",    to: "San Leandro WH",   daysAgo: 0, startHour:  8, idleMins:  5 },
  { from: "San Leandro WH",   to: "Alameda Terminal", daysAgo: 0, startHour:  9, idleMins:  3 },
  { from: "Alameda Terminal", to: "Emeryville Hub",   daysAgo: 0, startHour: 10, idleMins:  6 },
  { from: "Emeryville Hub",   to: "Oakland DC",       daysAgo: 0, startHour: 11, idleMins:  4 },
  { from: "Oakland DC",       to: "Piedmont Yard",    daysAgo: 0, startHour: 13, idleMins:  8 },
  { from: "Piedmont Yard",    to: "Alameda Terminal", daysAgo: 0, startHour: 15, idleMins:  5 },
  // Yesterday
  { from: "Alameda Terminal", to: "Castro Valley",    daysAgo: 1, startHour: 10, idleMins:  6 },
]));

// n5  Truck 06 — Robinson  |  5 trips today, 156 km
write("n5", buildVehicleTrips("n5", "Truck 06 — Robinson", NORTH, [
  { from: "Piedmont Yard",    to: "Berkeley SC",      daysAgo: 0, startHour:  8, idleMins: 18 },
  { from: "Berkeley SC",      to: "Oakland DC",       daysAgo: 0, startHour: 10, idleMins:  6 },
  { from: "Oakland DC",       to: "Richmond Depot",   daysAgo: 0, startHour: 11, idleMins: 22 },
  { from: "Richmond Depot",   to: "Emeryville Hub",   daysAgo: 0, startHour: 13, idleMins:  9 },
  { from: "Emeryville Hub",   to: "Piedmont Yard",    daysAgo: 0, startHour: 14, idleMins:  7 },
  { from: "Piedmont Yard",    to: "Oakland DC",       daysAgo: 1, startHour:  9, idleMins:  5 },
  { from: "Oakland DC",       to: "Berkeley SC",      daysAgo: 1, startHour: 13, idleMins:  8 },
]));

// n6  Van 03 — Okafor  |  4 trips today, 134 km
write("n6", buildVehicleTrips("n6", "Van 03 — Okafor", NORTH, [
  { from: "San Leandro WH",   to: "Castro Valley",    daysAgo: 0, startHour:  8, idleMins:  8 },
  { from: "Castro Valley",    to: "Oakland DC",       daysAgo: 0, startHour: 10, idleMins:  5 },
  { from: "Oakland DC",       to: "Alameda Terminal", daysAgo: 0, startHour: 11, idleMins: 10 },
  { from: "Alameda Terminal", to: "San Leandro WH",   daysAgo: 0, startHour: 13, idleMins:  6 },
  { from: "San Leandro WH",   to: "Piedmont Yard",    daysAgo: 1, startHour:  9, idleMins:  5 },
  { from: "Piedmont Yard",    to: "Emeryville Hub",   daysAgo: 1, startHour: 13, idleMins:  4 },
]));

// n7  Truck 08 — Larson  |  4 trips today, 108 km
write("n7", buildVehicleTrips("n7", "Truck 08 — Larson", NORTH, [
  { from: "Richmond Depot",   to: "Berkeley SC",      daysAgo: 0, startHour:  8, idleMins:  6 },
  { from: "Berkeley SC",      to: "Emeryville Hub",   daysAgo: 0, startHour:  9, idleMins:  8 },
  { from: "Emeryville Hub",   to: "Richmond Depot",   daysAgo: 0, startHour: 11, idleMins:  5 },
  { from: "Richmond Depot",   to: "Piedmont Yard",    daysAgo: 0, startHour: 13, idleMins: 11 },
  { from: "Piedmont Yard",    to: "Oakland DC",       daysAgo: 1, startHour: 10, idleMins:  6 },
]));

// n8  Van 07 — Kim  |  3 trips today, 79 km
write("n8", buildVehicleTrips("n8", "Van 07 — Kim", NORTH, [
  { from: "Oakland DC",       to: "San Leandro WH",   daysAgo: 0, startHour:  9, idleMins:  7 },
  { from: "San Leandro WH",   to: "Castro Valley",    daysAgo: 0, startHour: 11, idleMins:  5 },
  { from: "Castro Valley",    to: "Oakland DC",       daysAgo: 0, startHour: 13, idleMins:  9 },
  { from: "Oakland DC",       to: "Alameda Terminal", daysAgo: 1, startHour: 11, idleMins:  4 },
]));

// n9  Truck 10 — Walsh  |  2 trips today, 62 km  (idle)
write("n9", buildVehicleTrips("n9", "Truck 10 — Walsh", NORTH, [
  { from: "Emeryville Hub",   to: "Oakland DC",       daysAgo: 0, startHour:  8, idleMins:  6 },
  { from: "Oakland DC",       to: "Piedmont Yard",    daysAgo: 0, startHour: 10, idleMins: 13 },
  { from: "Piedmont Yard",    to: "Berkeley SC",      daysAgo: 1, startHour:  9, idleMins:  5 },
]));

// n10 Van 09 — Diallo  |  1 trip today, 38 km  (idle)
write("n10", buildVehicleTrips("n10", "Van 09 — Diallo", NORTH, [
  { from: "Castro Valley",    to: "Oakland DC",       daysAgo: 0, startHour:  8, idleMins:  7 },
  { from: "Oakland DC",       to: "San Leandro WH",   daysAgo: 1, startHour: 10, idleMins:  5 },
  { from: "San Leandro WH",   to: "Alameda Terminal", daysAgo: 2, startHour: 11, idleMins:  6 },
]));

// n11 Truck 12 — Fernandez  |  1 trip today, 17 km  (idle)
write("n11", buildVehicleTrips("n11", "Truck 12 — Fernandez", NORTH, [
  { from: "Alameda Terminal", to: "Oakland DC",       daysAgo: 0, startHour:  9, idleMins:  8 },
  { from: "Oakland DC",       to: "Emeryville Hub",   daysAgo: 1, startHour: 11, idleMins:  6 },
]));

// n12 Van 11 — Johansson  |  0 trips today  (offline since yesterday)
write("n12", buildVehicleTrips("n12", "Van 11 — Johansson", NORTH, [
  { from: "Berkeley SC",      to: "Oakland DC",       daysAgo: 1, startHour: 13, idleMins:  5 },
  { from: "Oakland DC",       to: "Richmond Depot",   daysAgo: 3, startHour: 10, idleMins:  7 },
]));

// ─── South Region vehicles ────────────────────────────────────────────────────

// s1  Truck 14 — Ahmed  |  8 trips today, 284 km
write("s1", buildVehicleTrips("s1", "Truck 14 — Ahmed", SOUTH, [
  { from: "SJ Tech Campus",   to: "Santa Clara Depot",daysAgo: 0, startHour:  7, idleMins:  8 },
  { from: "Santa Clara Depot",to: "Sunnyvale SC",     daysAgo: 0, startHour:  8, idleMins:  5 },
  { from: "Sunnyvale SC",     to: "Milpitas Storage", daysAgo: 0, startHour:  9, idleMins: 10 },
  { from: "Milpitas Storage", to: "SJ Tech Campus",   daysAgo: 0, startHour: 10, idleMins:  6 },
  { from: "SJ Tech Campus",   to: "Campbell Hub",     daysAgo: 0, startHour: 11, idleMins:  9 },
  { from: "Campbell Hub",     to: "Palo Alto Office", daysAgo: 0, startHour: 12, idleMins:  7 },
  { from: "Palo Alto Office", to: "Milpitas Storage", daysAgo: 0, startHour: 14, idleMins:  5 },
  { from: "Milpitas Storage", to: "SJ Tech Campus",   daysAgo: 0, startHour: 15, idleMins:  4 },
  { from: "SJ Tech Campus",   to: "Santa Clara Depot",daysAgo: 1, startHour:  9, idleMins:  6 },
  { from: "Santa Clara Depot",to: "Campbell Hub",     daysAgo: 1, startHour: 13, idleMins:  5 },
]));

// s2  Van 13 — Santos  |  7 trips today, 221 km
write("s2", buildVehicleTrips("s2", "Van 13 — Santos", SOUTH, [
  { from: "Santa Clara Depot",to: "SJ Tech Campus",   daysAgo: 0, startHour:  7, idleMins:  5 },
  { from: "SJ Tech Campus",   to: "Palo Alto Office", daysAgo: 0, startHour:  8, idleMins: 11 },
  { from: "Palo Alto Office", to: "Sunnyvale SC",     daysAgo: 0, startHour: 10, idleMins:  6 },
  { from: "Sunnyvale SC",     to: "Santa Clara Depot",daysAgo: 0, startHour: 11, idleMins:  4 },
  { from: "Santa Clara Depot",to: "Campbell Hub",     daysAgo: 0, startHour: 12, idleMins:  8 },
  { from: "Campbell Hub",     to: "Los Gatos Ctr",    daysAgo: 0, startHour: 13, idleMins:  6 },
  { from: "Los Gatos Ctr",    to: "SJ Tech Campus",   daysAgo: 0, startHour: 15, idleMins:  5 },
  { from: "SJ Tech Campus",   to: "Milpitas Storage", daysAgo: 1, startHour: 10, idleMins:  7 },
]));

// s3  Truck 16 — Park  |  5 trips today, 168 km
write("s3", buildVehicleTrips("s3", "Truck 16 — Park", SOUTH, [
  { from: "Milpitas Storage", to: "Palo Alto Office", daysAgo: 0, startHour:  8, idleMins: 15 },
  { from: "Palo Alto Office", to: "SJ Tech Campus",   daysAgo: 0, startHour: 10, idleMins:  7 },
  { from: "SJ Tech Campus",   to: "Sunnyvale SC",     daysAgo: 0, startHour: 11, idleMins:  5 },
  { from: "Sunnyvale SC",     to: "Campbell Hub",     daysAgo: 0, startHour: 12, idleMins:  9 },
  { from: "Campbell Hub",     to: "Milpitas Storage", daysAgo: 0, startHour: 14, idleMins:  6 },
  { from: "Milpitas Storage", to: "SJ Tech Campus",   daysAgo: 1, startHour:  9, idleMins:  5 },
  { from: "SJ Tech Campus",   to: "Los Gatos Ctr",    daysAgo: 1, startHour: 13, idleMins:  8 },
]));

// s4  Van 15 — Williams  |  5 trips today, 143 km
write("s4", buildVehicleTrips("s4", "Van 15 — Williams", SOUTH, [
  { from: "Sunnyvale SC",     to: "Campbell Hub",     daysAgo: 0, startHour:  8, idleMins:  7 },
  { from: "Campbell Hub",     to: "SJ Tech Campus",   daysAgo: 0, startHour:  9, idleMins:  5 },
  { from: "SJ Tech Campus",   to: "Santa Clara Depot",daysAgo: 0, startHour: 10, idleMins:  6 },
  { from: "Santa Clara Depot",to: "Palo Alto Office", daysAgo: 0, startHour: 11, idleMins: 10 },
  { from: "Palo Alto Office", to: "Sunnyvale SC",     daysAgo: 0, startHour: 13, idleMins:  5 },
  { from: "Sunnyvale SC",     to: "Milpitas Storage", daysAgo: 1, startHour: 10, idleMins:  6 },
]));

// s5  Truck 18 — Hassan  |  4 trips today, 112 km  (high idle)
write("s5", buildVehicleTrips("s5", "Truck 18 — Hassan", SOUTH, [
  { from: "Los Gatos Ctr",    to: "Campbell Hub",     daysAgo: 0, startHour:  8, idleMins: 28 },
  { from: "Campbell Hub",     to: "SJ Tech Campus",   daysAgo: 0, startHour: 10, idleMins: 19 },
  { from: "SJ Tech Campus",   to: "Santa Clara Depot",daysAgo: 0, startHour: 11, idleMins: 15 },
  { from: "Santa Clara Depot",to: "Los Gatos Ctr",    daysAgo: 0, startHour: 13, idleMins: 22 },
  { from: "Los Gatos Ctr",    to: "Campbell Hub",     daysAgo: 1, startHour:  9, idleMins: 16 },
]));

// s6  Van 17 — Reyes  |  3 trips today, 76 km
write("s6", buildVehicleTrips("s6", "Van 17 — Reyes", SOUTH, [
  { from: "Sunnyvale SC",     to: "Milpitas Storage", daysAgo: 0, startHour:  9, idleMins:  6 },
  { from: "Milpitas Storage", to: "SJ Tech Campus",   daysAgo: 0, startHour: 11, idleMins:  8 },
  { from: "SJ Tech Campus",   to: "Sunnyvale SC",     daysAgo: 0, startHour: 13, idleMins:  4 },
  { from: "Sunnyvale SC",     to: "Palo Alto Office", daysAgo: 1, startHour: 10, idleMins:  5 },
]));

// s7  Truck 20 — Tanaka  |  2 trips today, 44 km  (idle)
write("s7", buildVehicleTrips("s7", "Truck 20 — Tanaka", SOUTH, [
  { from: "Campbell Hub",     to: "SJ Tech Campus",   daysAgo: 0, startHour:  8, idleMins:  9 },
  { from: "SJ Tech Campus",   to: "Campbell Hub",     daysAgo: 0, startHour: 10, idleMins:  6 },
  { from: "Campbell Hub",     to: "Los Gatos Ctr",    daysAgo: 1, startHour: 11, idleMins:  7 },
]));

// s8  Van 19 — Miller  |  1 trip today, 23 km  (idle)
write("s8", buildVehicleTrips("s8", "Van 19 — Miller", SOUTH, [
  { from: "Palo Alto Office", to: "Sunnyvale SC",     daysAgo: 0, startHour:  9, idleMins:  5 },
  { from: "Sunnyvale SC",     to: "Santa Clara Depot",daysAgo: 1, startHour: 11, idleMins:  6 },
]));

// s9  Truck 22 — Kovacs  |  0 trips today  (offline since yesterday)
write("s9", buildVehicleTrips("s9", "Truck 22 — Kovacs", SOUTH, [
  { from: "Milpitas Storage", to: "SJ Tech Campus",   daysAgo: 1, startHour: 14, idleMins:  7 },
  { from: "SJ Tech Campus",   to: "Santa Clara Depot",daysAgo: 3, startHour:  9, idleMins:  5 },
]));

// ─── East Region vehicles ─────────────────────────────────────────────────────

// e1  Truck 24 — Thompson  |  7 trips today, 259 km
write("e1", buildVehicleTrips("e1", "Truck 24 — Thompson", EAST, [
  { from: "Fremont WH",       to: "Dublin Distrib",   daysAgo: 0, startHour:  7, idleMins:  8 },
  { from: "Dublin Distrib",   to: "Pleasanton Ctr",   daysAgo: 0, startHour:  8, idleMins:  6 },
  { from: "Pleasanton Ctr",   to: "Livermore Park",   daysAgo: 0, startHour:  9, idleMins: 11 },
  { from: "Livermore Park",   to: "Fremont WH",       daysAgo: 0, startHour: 10, idleMins:  5 },
  { from: "Fremont WH",       to: "Hayward Logistics", daysAgo: 0, startHour: 11, idleMins:  7 },
  { from: "Hayward Logistics",to: "Union City Depot", daysAgo: 0, startHour: 12, idleMins:  4 },
  { from: "Union City Depot", to: "Fremont WH",       daysAgo: 0, startHour: 13, idleMins:  6 },
  { from: "Fremont WH",       to: "Castro Valley Hub",daysAgo: 1, startHour:  9, idleMins:  5 },
  { from: "Castro Valley Hub",to: "Dublin Distrib",   daysAgo: 1, startHour: 13, idleMins:  7 },
]));

// e2  Van 23 — Gonzalez  |  6 trips today, 196 km
write("e2", buildVehicleTrips("e2", "Van 23 — Gonzalez", EAST, [
  { from: "Hayward Logistics",to: "Castro Valley Hub",daysAgo: 0, startHour:  8, idleMins:  6 },
  { from: "Castro Valley Hub",to: "Union City Depot", daysAgo: 0, startHour:  9, idleMins:  8 },
  { from: "Union City Depot", to: "Newark Distrib",   daysAgo: 0, startHour: 10, idleMins:  5 },
  { from: "Newark Distrib",   to: "Fremont WH",       daysAgo: 0, startHour: 11, idleMins:  6 },
  { from: "Fremont WH",       to: "Dublin Distrib",   daysAgo: 0, startHour: 12, idleMins:  9 },
  { from: "Dublin Distrib",   to: "Hayward Logistics",daysAgo: 0, startHour: 14, idleMins:  4 },
  { from: "Hayward Logistics",to: "Newark Distrib",   daysAgo: 1, startHour: 10, idleMins:  5 },
]));

// e3  Truck 26 — Andersen  |  4 trips today, 151 km  (high idle)
write("e3", buildVehicleTrips("e3", "Truck 26 — Andersen", EAST, [
  { from: "Dublin Distrib",   to: "Pleasanton Ctr",   daysAgo: 0, startHour:  8, idleMins: 20 },
  { from: "Pleasanton Ctr",   to: "Livermore Park",   daysAgo: 0, startHour: 10, idleMins: 25 },
  { from: "Livermore Park",   to: "Dublin Distrib",   daysAgo: 0, startHour: 12, idleMins: 18 },
  { from: "Dublin Distrib",   to: "Fremont WH",       daysAgo: 0, startHour: 14, idleMins: 22 },
  { from: "Fremont WH",       to: "Pleasanton Ctr",   daysAgo: 1, startHour:  9, idleMins: 17 },
]));

// e4  Van 25 — Ibrahim  |  5 trips today, 118 km
write("e4", buildVehicleTrips("e4", "Van 25 — Ibrahim", EAST, [
  { from: "Union City Depot", to: "Castro Valley Hub",daysAgo: 0, startHour:  8, idleMins:  6 },
  { from: "Castro Valley Hub",to: "Hayward Logistics",daysAgo: 0, startHour:  9, idleMins:  7 },
  { from: "Hayward Logistics",to: "Newark Distrib",   daysAgo: 0, startHour: 11, idleMins:  5 },
  { from: "Newark Distrib",   to: "Union City Depot", daysAgo: 0, startHour: 12, idleMins:  8 },
  { from: "Union City Depot", to: "Fremont WH",       daysAgo: 0, startHour: 14, idleMins:  4 },
  { from: "Fremont WH",       to: "Dublin Distrib",   daysAgo: 1, startHour: 10, idleMins:  6 },
]));

// e5  Truck 28 — Murphy  |  2 trips today, 69 km  (idle)
write("e5", buildVehicleTrips("e5", "Truck 28 — Murphy", EAST, [
  { from: "Livermore Park",   to: "Pleasanton Ctr",   daysAgo: 0, startHour:  8, idleMins:  7 },
  { from: "Pleasanton Ctr",   to: "Dublin Distrib",   daysAgo: 0, startHour: 10, idleMins:  5 },
  { from: "Dublin Distrib",   to: "Fremont WH",       daysAgo: 1, startHour: 11, idleMins:  6 },
]));

// e6  Van 27 — Petrov  |  1 trip today, 31 km  (idle)
write("e6", buildVehicleTrips("e6", "Van 27 — Petrov", EAST, [
  { from: "Newark Distrib",   to: "Union City Depot", daysAgo: 0, startHour:  9, idleMins:  6 },
  { from: "Union City Depot", to: "Hayward Logistics",daysAgo: 1, startHour: 11, idleMins:  5 },
]));

// e7  Truck 30 — Chowdhury  |  0 trips today  (offline)
write("e7", buildVehicleTrips("e7", "Truck 30 — Chowdhury", EAST, [
  { from: "Fremont WH",       to: "Newark Distrib",   daysAgo: 1, startHour: 15, idleMins:  7 },
  { from: "Dublin Distrib",   to: "Hayward Logistics",daysAgo: 3, startHour: 10, idleMins:  5 },
]));

// ─── West Region vehicles ─────────────────────────────────────────────────────

// w1  Truck 32 — Nakamura  |  6 trips today, 214 km
write("w1", buildVehicleTrips("w1", "Truck 32 — Nakamura", WEST, [
  { from: "SF Embarcadero",   to: "Potrero Hill",     daysAgo: 0, startHour:  7, idleMins:  6 },
  { from: "Potrero Hill",     to: "Mission District", daysAgo: 0, startHour:  8, idleMins:  4 },
  { from: "Mission District", to: "Bayview Depot",    daysAgo: 0, startHour:  9, idleMins:  8 },
  { from: "Bayview Depot",    to: "South SF Depot",   daysAgo: 0, startHour: 10, idleMins:  7 },
  { from: "South SF Depot",   to: "Daly City Hub",    daysAgo: 0, startHour: 11, idleMins:  5 },
  { from: "Daly City Hub",    to: "SF Embarcadero",   daysAgo: 0, startHour: 13, idleMins:  6 },
  { from: "SF Embarcadero",   to: "SFO Cargo",        daysAgo: 1, startHour:  9, idleMins:  9 },
  { from: "SFO Cargo",        to: "South SF Depot",   daysAgo: 1, startHour: 13, idleMins:  5 },
]));

// w2  Van 31 — Oliveira  |  5 trips today, 162 km
write("w2", buildVehicleTrips("w2", "Van 31 — Oliveira", WEST, [
  { from: "South SF Depot",   to: "SFO Cargo",        daysAgo: 0, startHour:  8, idleMins:  7 },
  { from: "SFO Cargo",        to: "Daly City Hub",    daysAgo: 0, startHour:  9, idleMins:  5 },
  { from: "Daly City Hub",    to: "Visitacion Valley",daysAgo: 0, startHour: 10, idleMins:  6 },
  { from: "Visitacion Valley",to: "Bayview Depot",    daysAgo: 0, startHour: 11, idleMins:  4 },
  { from: "Bayview Depot",    to: "South SF Depot",   daysAgo: 0, startHour: 13, idleMins:  8 },
  { from: "South SF Depot",   to: "Mission District", daysAgo: 1, startHour: 10, idleMins:  6 },
]));

// w3  Truck 34 — Schreiber  |  3 trips today, 97 km
write("w3", buildVehicleTrips("w3", "Truck 34 — Schreiber", WEST, [
  { from: "Daly City Hub",    to: "SFO Cargo",        daysAgo: 0, startHour:  8, idleMins: 12 },
  { from: "SFO Cargo",        to: "South SF Depot",   daysAgo: 0, startHour: 10, idleMins:  9 },
  { from: "South SF Depot",   to: "Visitacion Valley",daysAgo: 0, startHour: 12, idleMins:  8 },
  { from: "Visitacion Valley",to: "Daly City Hub",    daysAgo: 1, startHour:  9, idleMins:  7 },
]));

// w4  Van 33 — Osei  |  2 trips today, 53 km  (idle)
write("w4", buildVehicleTrips("w4", "Van 33 — Osei", WEST, [
  { from: "Mission District", to: "Potrero Hill",     daysAgo: 0, startHour:  9, idleMins:  6 },
  { from: "Potrero Hill",     to: "SF Embarcadero",   daysAgo: 0, startHour: 11, idleMins:  8 },
  { from: "SF Embarcadero",   to: "Mission District", daysAgo: 1, startHour: 12, idleMins:  5 },
]));

// w5  Truck 36 — Volkov  |  1 trip today, 28 km  (idle)
write("w5", buildVehicleTrips("w5", "Truck 36 — Volkov", WEST, [
  { from: "Bayview Depot",    to: "South SF Depot",   daysAgo: 0, startHour:  9, idleMins:  7 },
  { from: "South SF Depot",   to: "SFO Cargo",        daysAgo: 1, startHour: 11, idleMins:  5 },
]));

console.log("\nDone — 33 per-vehicle trip files generated.");

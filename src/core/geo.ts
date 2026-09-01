import { ZONES } from './types';
import type { LatLng, Zone } from './types';

const EARTH_RADIUS_KM = 6371;

const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance. Never used directly for planning — see roadDistanceKm. */
export function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/**
 * Circuity factors: how much longer the real road is than the straight line.
 *
 * Straight-line distance is structurally wrong for this network (docs/01 §7.3): two
 * points 8 km apart as the crow flies can be a 40 km drive when the direct road is not
 * available to the vehicle. Planning on haversine clusters stops that cannot practically
 * be served together.
 *
 * In production these numbers are replaced wholesale by an OSRM road-network matrix.
 * They exist so the demo is honest about the shape of the problem rather than pretending
 * the terrain is flat and open.
 */
const BASE_CIRCUITY = 1.38;

const ZONE_PAIR_CIRCUITY: Record<string, number> = {
  'north|central': 1.5,
  'central|south': 1.55,
  'north|south': 1.6,
  'central|jordan_valley': 1.45,
  'north|jordan_valley': 1.7,
  'south|jordan_valley': 1.8,
  // Movement in and out of the Jerusalem access regime follows a small number of
  // permitted routes, so the drive is far longer than the map suggests.
  'central|jerusalem': 1.9,
  'south|jerusalem': 1.85,
  'north|jerusalem': 2.0,
  'jerusalem|jordan_valley': 1.9,
};

/**
 * Canonical key for an unordered zone pair.
 *
 * Ordered by ZONES — the geographic order the tables below are written in — and NOT by
 * Array.prototype.sort(), which is lexicographic. The two disagree for five of the ten
 * pairs ('central' < 'jerusalem' < 'jordan_valley' < 'north' < 'south' is not the
 * north-to-south order anyone writes a crossing table in), and a key that misses its
 * table falls through to the default without saying so. Exported because travel.ts keys
 * its crossing table the same way and the two must not drift apart again.
 */
export function zonePairKey(a: Zone, b: Zone): string {
  return ZONES.indexOf(a) <= ZONES.indexOf(b) ? `${a}|${b}` : `${b}|${a}`;
}

export function circuityFactor(fromZone: Zone, toZone: Zone): number {
  if (fromZone === toZone) return BASE_CIRCUITY;
  return ZONE_PAIR_CIRCUITY[zonePairKey(fromZone, toZone)] ?? 1.6;
}

/** Road distance estimate: straight line scaled by the circuity of the zone pair. */
export function roadDistanceKm(a: LatLng, aZone: Zone, b: LatLng, bZone: Zone): number {
  return haversineKm(a, b) * circuityFactor(aZone, bZone);
}

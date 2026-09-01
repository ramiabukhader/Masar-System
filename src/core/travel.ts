import { roadDistanceKm, zonePairKey } from './geo';
import { ZONES } from './types';
import type { LatLng, Zone } from './types';

export interface TravelLeg {
  km: number;
  minutes: number;
  /** Portion of `minutes` attributable to junction/crossing queueing, not driving. */
  crossingMinutes: number;
}

export interface TravelPoint {
  location: LatLng;
  zone: Zone;
}

/**
 * Travel time is time-of-day dependent and not symmetric in this network.
 *
 * A static distance matrix is not merely imprecise here — it is the wrong model
 * (docs/01 §7.1). Every query therefore carries a departure time, and the provider
 * is free to return a different duration for the same arc at a different hour.
 */
export interface TravelTimeProvider {
  leg(from: TravelPoint, to: TravelPoint, departAt: Date): TravelLeg;
}

/** Free-flow speeds by trip character. Corridor runs are faster than urban crawling. */
const INTERCITY_KMH = 52;
const URBAN_KMH = 26;
/** Below this, the trip is treated as urban rather than corridor driving. */
const URBAN_THRESHOLD_KM = 7;

/**
 * Hourly congestion multipliers applied to driving time. Morning school/work peak and
 * the late-afternoon return peak are the two that actually break delivery plans.
 */
const HOUR_MULTIPLIER: number[] = [
  1.0, 1.0, 1.0, 1.0, 1.0, 1.05, // 00-05
  1.2, 1.45, 1.5, 1.3, 1.15, 1.1, // 06-11
  1.15, 1.2, 1.25, 1.4, 1.45, 1.35, // 12-17
  1.2, 1.1, 1.05, 1.0, 1.0, 1.0, // 18-23
];

/**
 * Expected queueing minutes when a leg crosses between access regimes, by hour.
 * These are the single largest source of plan variance in this geography, which is why
 * they are modelled explicitly instead of being buried in an average speed.
 */
const CROSSING_BASE_MINUTES: Record<string, number> = {
  'north|central': 12,
  'central|south': 14,
  'north|south': 22,
  'central|jordan_valley': 10,
  'north|jordan_valley': 16,
  'south|jordan_valley': 18,
  'central|jerusalem': 30,
  'south|jerusalem': 28,
  'north|jerusalem': 38,
  'jerusalem|jordan_valley': 32,
};

const CROSSING_HOUR_MULTIPLIER: number[] = [
  0.4, 0.4, 0.4, 0.5, 0.6, 0.9, // 00-05
  1.6, 2.0, 1.9, 1.4, 1.1, 1.0, // 06-11
  1.0, 1.1, 1.2, 1.6, 1.8, 1.5, // 12-17
  1.1, 0.8, 0.6, 0.5, 0.4, 0.4, // 18-23
];

// Shared with geo.ts so the crossing table and the circuity table can never be keyed
// two different ways. See zonePairKey for why Array.prototype.sort() is wrong here.
const pairKey = zonePairKey;

export interface TravelOptions {
  /**
   * Arcs the dispatcher has flagged closed or degraded. Closures are routine here and
   * must be a first-class planning input, not a phone call to the ops manager.
   * Key is a zone-pair key; value is a multiplier on crossing time (Infinity = closed).
   */
  degradedCrossings?: Record<string, number>;
  /** Global slowdown factor, e.g. weather or a network-wide disruption. */
  networkFactor?: number;
}

export class TimeDependentTravelProvider implements TravelTimeProvider {
  /** Closure keys normalised to canonical order, so a caller may write either spelling. */
  private readonly degraded: Record<string, number>;

  constructor(private readonly options: TravelOptions = {}) {
    this.degraded = {};
    for (const [key, value] of Object.entries(options.degradedCrossings ?? {})) {
      const [a, b] = key.split('|') as [Zone, Zone];
      this.degraded[ZONES.includes(a) && ZONES.includes(b) ? pairKey(a, b) : key] = value;
    }
  }

  leg(from: TravelPoint, to: TravelPoint, departAt: Date): TravelLeg {
    const km = roadDistanceKm(from.location, from.zone, to.location, to.zone);
    const hour = departAt.getHours();
    const speed = km < URBAN_THRESHOLD_KM ? URBAN_KMH : INTERCITY_KMH;

    const congestion = HOUR_MULTIPLIER[hour] ?? 1;
    const network = this.options.networkFactor ?? 1;
    const driveMinutes = (km / speed) * 60 * congestion * network;

    let crossingMinutes = 0;
    if (from.zone !== to.zone) {
      const key = pairKey(from.zone, to.zone);
      const base = CROSSING_BASE_MINUTES[key] ?? 15;
      const degraded = this.degraded[key] ?? 1;
      if (!Number.isFinite(degraded)) {
        return { km, minutes: Number.POSITIVE_INFINITY, crossingMinutes: Number.POSITIVE_INFINITY };
      }
      crossingMinutes = base * (CROSSING_HOUR_MULTIPLIER[hour] ?? 1) * degraded;
    }

    return {
      km,
      minutes: driveMinutes + crossingMinutes,
      crossingMinutes,
    };
  }
}

/**
 * Cache wrapper. The solver evaluates the same arc thousands of times; without this the
 * local search spends its budget recomputing trigonometry. Bucketed to 30 minutes so the
 * time-dependence survives caching.
 */
export class CachedTravelProvider implements TravelTimeProvider {
  private readonly cache = new Map<string, TravelLeg>();

  constructor(private readonly inner: TravelTimeProvider) {}

  leg(from: TravelPoint, to: TravelPoint, departAt: Date): TravelLeg {
    const bucket = Math.floor((departAt.getHours() * 60 + departAt.getMinutes()) / 30);
    const key = `${from.location.lat.toFixed(4)},${from.location.lng.toFixed(4)}|${to.location.lat.toFixed(4)},${to.location.lng.toFixed(4)}|${bucket}`;
    const hit = this.cache.get(key);
    if (hit) return hit;
    const value = this.inner.leg(from, to, departAt);
    this.cache.set(key, value);
    return value;
  }

  clear(): void {
    this.cache.clear();
  }
}

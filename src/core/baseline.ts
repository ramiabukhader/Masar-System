import type { TravelTimeProvider } from './travel';
import { haversineKm } from './geo';
import type { Node, Shipment } from './types';

/**
 * Models how the network runs TODAY, so the optimised plan has something to be measured
 * against: each branch dispatches its own sales to its own customers, in the order they
 * were taken, in whatever van is free, with no cross-branch consolidation, no cube
 * planning and no arrival windows.
 *
 * IMPORTANT: this is a MODELLED counterfactual, not a measurement. It is here to make the
 * shape of the saving visible in a demo. In Phase 1 it is replaced by the real baseline
 * computed from their own historical data (docs/02 §6) — and that measured number, not
 * this one, is what the programme is judged against.
 */

/** A representative branch van: what a showroom actually has available. */
const BRANCH_VAN = {
  capacityM3: 9,
  capacityKg: 1200,
  costPerKm: 1.8,
  costPerHour: 62,
  fixedCost: 210,
};

/** Branch dispatch tends to send a van out once it has roughly this many drops. */
const TYPICAL_DROPS_PER_TRIP = 6;

const SHIFT_START_MIN = 7 * 60;

export interface BaselineRoute {
  branchId: string;
  branchName: string;
  stops: { shipmentId: string; arriveMin: number }[];
  distanceKm: number;
  driveMinutes: number;
  serviceMinutes: number;
  totalMinutes: number;
  loadM3: number;
  cubeUtilisation: number;
  cost: number;
  lateStops: number;
  /** Stops the van could not reach at all, e.g. behind a closed crossing. */
  undeliveredShipmentIds: string[];
}

export interface BaselineResult {
  routes: BaselineRoute[];
  totalDistanceKm: number;
  totalCost: number;
  costPerDrop: number;
  avgCubeUtilisation: number;
  routeCount: number;
  dropCount: number;
  lateCount: number;
  totalDriveMinutes: number;
  /** Drops the modelled current state could not serve at all. Counted, never priced. */
  undeliverableCount: number;
}

export function planBaseline(input: {
  shipments: Shipment[];
  nodes: Map<string, Node>;
  planDate: Date;
  travel: TravelTimeProvider;
}): BaselineResult {
  const { shipments, nodes, planDate, travel } = input;

  // Branch-siloed: grouped by who sold it, not by where it is going.
  const byBranch = new Map<string, Shipment[]>();
  for (const shipment of shipments) {
    const list = byBranch.get(shipment.sellingBranchId) ?? [];
    list.push(shipment);
    byBranch.set(shipment.sellingBranchId, list);
  }

  const routes: BaselineRoute[] = [];

  for (const [branchId, branchShipments] of byBranch) {
    const branch = nodes.get(branchId);
    if (!branch) continue;

    // Batched by urgency day, then loosely by direction. A branch dispatcher without a
    // system still groups "everything going south today" onto one van — giving the
    // baseline that credit keeps the comparison honest. What it cannot do is consolidate
    // across branches, plan by cube, or sequence against time-dependent travel.
    const queue = [...branchShipments].sort((a, b) => {
      const dayA = Math.floor(a.dueAt.getTime() / 86_400_000);
      const dayB = Math.floor(b.dueAt.getTime() / 86_400_000);
      if (dayA !== dayB) return dayA - dayB;
      return (
        haversineKm(branch.location, a.destination) - haversineKm(branch.location, b.destination)
      );
    });

    while (queue.length > 0) {
      const trip: Shipment[] = [];
      let cube = 0;
      let weight = 0;

      while (
        queue.length > 0 &&
        trip.length < TYPICAL_DROPS_PER_TRIP &&
        cube + queue[0].totalCubeM3 <= BRANCH_VAN.capacityM3 &&
        weight + queue[0].totalWeightKg <= BRANCH_VAN.capacityKg
      ) {
        const next = queue.shift()!;
        trip.push(next);
        cube += next.totalCubeM3;
        weight += next.totalWeightKg;
      }

      // A single oversized shipment still has to go out on its own.
      if (trip.length === 0 && queue.length > 0) {
        const oversized = queue.shift()!;
        trip.push(oversized);
        cube = oversized.totalCubeM3;
      }

      routes.push(simulateTrip(branch, trip, planDate, travel));
    }
  }

  const dropCount = routes.reduce((sum, r) => sum + r.stops.length, 0);
  const totalCost = routes.reduce((sum, r) => sum + r.cost, 0);

  return {
    routes,
    routeCount: routes.length,
    dropCount,
    totalDistanceKm: Number(routes.reduce((sum, r) => sum + r.distanceKm, 0).toFixed(1)),
    totalCost: Number(totalCost.toFixed(2)),
    costPerDrop: Number((totalCost / Math.max(dropCount, 1)).toFixed(2)),
    avgCubeUtilisation: routes.length
      ? Number((routes.reduce((sum, r) => sum + r.cubeUtilisation, 0) / routes.length).toFixed(3))
      : 0,
    lateCount: routes.reduce((sum, r) => sum + r.lateStops, 0),
    totalDriveMinutes: routes.reduce((sum, r) => sum + r.driveMinutes, 0),
    undeliverableCount: routes.reduce((sum, r) => sum + r.undeliveredShipmentIds.length, 0),
  };
}

/**
 * Nearest-neighbour sequencing — a fair model of what a driver does with a paper list
 * and local knowledge. Notably it has no view of time windows or SLA, so lateness is
 * counted rather than prevented.
 */
function simulateTrip(
  branch: Node,
  trip: Shipment[],
  planDate: Date,
  travel: TravelTimeProvider,
): BaselineRoute {
  let cursor = SHIFT_START_MIN;
  let position = { location: branch.location, zone: branch.zone };
  const remaining = [...trip];
  const stops: BaselineRoute['stops'] = [];

  let distanceKm = 0;
  let driveMinutes = 0;
  let serviceMinutes = 0;
  let lateStops = 0;
  const undeliveredShipmentIds: string[] = [];

  while (remaining.length > 0) {
    let bestIndex = -1;
    let bestMinutes = Number.POSITIVE_INFINITY;

    for (let i = 0; i < remaining.length; i++) {
      const leg = travel.leg(
        position,
        { location: remaining[i].destination, zone: remaining[i].zone },
        new Date(planDate.getTime() + cursor * 60_000),
      );
      // An impassable crossing is not merely a slow leg: `Infinity` here must never be
      // added to a running total, or one blocked stop turns every headline number into
      // `Infinity`. The driver cannot take this leg, so it is not a candidate.
      if (!Number.isFinite(leg.minutes)) continue;
      if (leg.minutes < bestMinutes) {
        bestMinutes = leg.minutes;
        bestIndex = i;
      }
    }

    if (bestIndex === -1) {
      // Nothing left on the list is reachable from here. Without a system the branch
      // finds this out at the checkpoint, so the van turns back and those customers
      // simply do not get their delivery today. Counted, not priced.
      undeliveredShipmentIds.push(...remaining.map((s) => s.id));
      break;
    }

    const next = remaining.splice(bestIndex, 1)[0];
    const leg = travel.leg(
      position,
      { location: next.destination, zone: next.zone },
      new Date(planDate.getTime() + cursor * 60_000),
    );

    distanceKm += leg.km;
    driveMinutes += leg.minutes;
    cursor += leg.minutes;

    const dueMin = (next.dueAt.getTime() - planDate.getTime()) / 60_000;
    if (cursor > dueMin) lateStops++;

    stops.push({ shipmentId: next.id, arriveMin: cursor });
    cursor += next.serviceMinutes;
    serviceMinutes += next.serviceMinutes;
    position = { location: next.destination, zone: next.zone };
  }

  const returnLeg = travel.leg(
    position,
    { location: branch.location, zone: branch.zone },
    new Date(planDate.getTime() + cursor * 60_000),
  );
  // Crossing costs are symmetric in this model, so a van that got here can get back;
  // the guard is here so a future asymmetric provider cannot reintroduce `Infinity`.
  if (Number.isFinite(returnLeg.minutes)) {
    distanceKm += returnLeg.km;
    driveMinutes += returnLeg.minutes;
    cursor += returnLeg.minutes;
  }

  const totalMinutes = cursor - SHIFT_START_MIN;
  const loadM3 = trip.reduce((sum, s) => sum + s.totalCubeM3, 0);

  return {
    branchId: branch.id,
    branchName: branch.nameEn,
    stops,
    distanceKm: Number(distanceKm.toFixed(1)),
    driveMinutes: Math.round(driveMinutes),
    serviceMinutes: Math.round(serviceMinutes),
    totalMinutes: Math.round(totalMinutes),
    loadM3: Number(loadM3.toFixed(2)),
    cubeUtilisation: Number((loadM3 / BRANCH_VAN.capacityM3).toFixed(3)),
    cost: Number(
      (
        BRANCH_VAN.fixedCost +
        BRANCH_VAN.costPerKm * distanceKm +
        BRANCH_VAN.costPerHour * (totalMinutes / 60)
      ).toFixed(2),
    ),
    lateStops,
    undeliveredShipmentIds,
  };
}

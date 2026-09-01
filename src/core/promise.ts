import type { DeliveryPlan, Shipment, Vehicle, Zone } from './types';

/**
 * Delivery promise engine — a preview of the capability the benchmarks say matters most
 * (docs/09 §4.1).
 *
 * John Lewis books the delivery slot AT THE POINT OF SALE, in real time, against slots the
 * network can actually serve. That removes the whole "customer never answered the
 * confirmation message" failure mode, because the customer agreed to the slot while they
 * were still standing in the showroom.
 *
 * In production this runs the same feasibility check the wave optimiser performs, for one
 * prospective order instead of a whole day. What is implemented here is the honest
 * demo-scale version: it reads the CURRENT plan to see how loaded each slot already is in
 * the customer's zone, and scores the marginal cost of adding one more stop to it.
 */

export interface SlotDefinition {
  id: string;
  startMin: number;
  endMin: number;
}

/** Three working slots. Matches the three-hour window in the target operating model. */
export const SLOTS: SlotDefinition[] = [
  { id: 'morning', startMin: 9 * 60, endMin: 12 * 60 },
  { id: 'midday', startMin: 12 * 60, endMin: 15 * 60 },
  { id: 'afternoon', startMin: 15 * 60, endMin: 18 * 60 },
];

export interface SlotOffer extends SlotDefinition {
  zone: Zone;
  /** Stops already planned into this slot in this zone. */
  plannedStops: number;
  /** How many stops the eligible fleet can serve in the slot. */
  capacityStops: number;
  utilisation: number;
  /** False when the slot is full — it is then never offered to the customer. */
  deliverable: boolean;
  /**
   * Relative marginal cost of adding one more stop, 0 (cheapest) to 1 (dearest).
   * Not currency: a comparison between the slots on offer.
   */
  marginalCost: number;
  /** The cheapest deliverable slot. Labelling it is free demand-shaping (docs/09 §4.3). */
  recommended: boolean;
}

/** A crew serving major appliances completes roughly this many stops per hour. */
const STOPS_PER_VEHICLE_HOUR = 1.4;
/** Above this utilisation the slot is treated as full and is not offered. */
const FULL_AT = 0.92;

export interface PromiseInput {
  plan: DeliveryPlan;
  shipments: Shipment[];
  vehicles: Vehicle[];
  planDate: Date;
  zone: Zone;
}

export function offerSlots(input: PromiseInput): SlotOffer[] {
  const { plan, shipments, vehicles, planDate, zone } = input;
  const shipmentZone = new Map(shipments.map((s) => [s.id, s.zone]));

  const eligibleVehicles = vehicles.filter((vehicle) => vehicle.eligibleZones.includes(zone));

  const offers = SLOTS.map((slot) => {
    let plannedStops = 0;
    for (const route of plan.routes) {
      for (const stop of route.stops) {
        if (shipmentZone.get(stop.shipmentId) !== zone) continue;
        const arriveMin = (stop.arriveAt.getTime() - planDate.getTime()) / 60_000;
        if (arriveMin >= slot.startMin && arriveMin < slot.endMin) plannedStops++;
      }
    }

    const hours = (slot.endMin - slot.startMin) / 60;

    /**
     * A vehicle eligible for four zones is still one vehicle, and it can only be in one
     * of them during a given slot. Counting the whole eligible sub-fleet per zone sold
     * VEH-T1 as 16 morning stops against a physical 4, and the fleet as 121 against 55 —
     * so `utilisation` was a fraction of a denominator that did not exist, never reached
     * FULL_AT, and `deliverable` could not go false however loaded the network was.
     *
     * Each vehicle therefore contributes its slot capacity split across the zones it may
     * enter. That is still an approximation — it assumes demand is spread evenly over a
     * vehicle's zones rather than solving where it will actually be — but it is bounded
     * by the real fleet, which is what makes the fullness test mean anything.
     */
    const vehicleStops = eligibleVehicles.reduce(
      (sum, vehicle) => sum + 1 / Math.max(vehicle.eligibleZones.length, 1),
      0,
    );
    const capacityStops = Math.max(1, Math.round(vehicleStops * hours * STOPS_PER_VEHICLE_HOUR));
    const utilisation = plannedStops / capacityStops;

    /**
     * Marginal cost is U-shaped, which is the part people find counter-intuitive.
     * An EMPTY slot is expensive — a vehicle has to make a trip into the zone for one
     * stop. A FULL slot is expensive too — it needs another vehicle. The cheapest place
     * to add a delivery is a slot that already has a route passing through with room on it.
     */
    const emptiness = 1 / (1 + plannedStops);
    const congestion = Math.max(0, utilisation - 0.6) / 0.4;
    const marginalCost = Math.min(1, emptiness * 0.7 + congestion * 0.8);

    return {
      ...slot,
      zone,
      plannedStops,
      capacityStops,
      utilisation: Number(utilisation.toFixed(2)),
      deliverable: utilisation < FULL_AT,
      marginalCost: Number(marginalCost.toFixed(2)),
      recommended: false,
    };
  });

  const cheapest = offers
    .filter((offer) => offer.deliverable)
    .sort((a, b) => a.marginalCost - b.marginalCost)[0];
  if (cheapest) cheapest.recommended = true;

  return offers;
}

import { describe, expect, it } from 'vitest';
import { buildLoadPlan, evaluateRoute, DEFAULT_CONFIG } from './optimizer';
import { TimeDependentTravelProvider } from './travel';
import { accessMinutes, serviceMinutesFor } from './shipments';
import { runDemoWave } from '../data/scenario';
import { PRODUCT_MAP } from '../data/catalog';
import { NODE_MAP } from '../data/gazetteer';
import { VEHICLE_MAP, DRIVER_MAP } from '../data/fleet';
import type { AccessSurvey, Shipment, ShipmentUnit } from './types';

const PLAN_DATE = new Date(2026, 8, 15);
const travel = new TimeDependentTravelProvider();

function at(hours: number, minutes = 0): Date {
  return new Date(PLAN_DATE.getTime() + (hours * 60 + minutes) * 60_000);
}

function unit(sku: string, quantity = 1): ShipmentUnit {
  const product = PRODUCT_MAP.get(sku)!;
  return {
    sku,
    quantity,
    cubeM3: product.cubeM3 * quantity,
    weightKg: product.weightKg * quantity,
    fragile: product.fragile,
    stackable: product.stackable,
    productClass: product.productClass,
    installType: product.installType,
  };
}

function shipment(overrides: Partial<Shipment> & Pick<Shipment, 'id'>): Shipment {
  const units = overrides.units ?? [unit('SAM-WM-8KG')];
  return {
    orderId: `ORD-${overrides.id}`,
    customerId: `CUST-${overrides.id}`,
    sellingBranchId: 'BR-RAM',
    destination: { lat: 31.9038, lng: 35.2034 },
    localityId: 'LOC-RAM',
    zone: 'central',
    units,
    totalCubeM3: units.reduce((s, u) => s + u.cubeM3, 0),
    totalWeightKg: units.reduce((s, u) => s + u.weightKg, 0),
    dueAt: at(20),
    serviceMinutes: 25,
    requiresCrew: 2,
    requiresSkills: ['plumbing'],
    containsFragile: false,
    stagingOptions: [{ nodeId: 'DC-CENTRAL', readyAt: at(6), transferCost: 0 }],
    paymentType: 'cash',
    amountDue: 2000,
    priority: 0,
    ...overrides,
  };
}

const assignment = {
  vehicle: VEHICLE_MAP.get('VEH-T1')!,
  driver: DRIVER_MAP.get('DRV-01')!,
  originNode: NODE_MAP.get('DC-CENTRAL')!,
};

describe('service time model', () => {
  it('charges stair time per major appliance when there is no usable elevator', () => {
    const noLift: AccessSurvey = { floor: 4, hasElevator: false, elevatorFitsAppliance: false, narrowStairs: false, parkingDifficult: false, surveyed: true };
    const withLift: AccessSurvey = { ...noLift, hasElevator: true, elevatorFitsAppliance: true };

    expect(accessMinutes(noLift, 2)).toBeGreaterThan(accessMinutes(withLift, 2));
    // 4 floors x 4 min x 2 appliances
    expect(accessMinutes(noLift, 2)).toBe(32);
  });

  it('penalises narrow stairs', () => {
    const base: AccessSurvey = { floor: 3, hasElevator: false, elevatorFitsAppliance: false, narrowStairs: false, parkingDifficult: false, surveyed: true };
    expect(accessMinutes({ ...base, narrowStairs: true }, 1)).toBeGreaterThan(accessMinutes(base, 1));
  });

  it('assumes a floor when the survey was never taken, rather than assuming ground level', () => {
    const unsurveyed: AccessSurvey = { floor: 0, hasElevator: false, elevatorFitsAppliance: false, narrowStairs: false, parkingDifficult: false, surveyed: false };
    expect(accessMinutes(unsurveyed, 1)).toBeGreaterThan(0);
  });

  it('makes an installed appliance take materially longer than a boxed one', () => {
    const access: AccessSurvey = { floor: 0, hasElevator: false, elevatorFitsAppliance: false, narrowStairs: false, parkingDifficult: false, surveyed: true };
    const installed = serviceMinutesFor([unit('LOF-CK-90')], PRODUCT_MAP, access, false);
    const boxed = serviceMinutesFor([unit('SAM-RF-TM-390')], PRODUCT_MAP, access, false);
    expect(installed).toBeGreaterThan(boxed);
  });
});

describe('route evaluation — hard constraints', () => {
  it('refuses a Jerusalem stop on a vehicle without Jerusalem eligibility', () => {
    const result = evaluateRoute(
      assignment,
      [shipment({ id: 'S1', zone: 'jerusalem', destination: { lat: 31.7887, lng: 35.229 } })],
      PLAN_DATE,
      travel,
      DEFAULT_CONFIG,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('zone_ineligible_vehicle');
  });

  it('refuses a 2-crew appliance on a single-crew van', () => {
    const result = evaluateRoute(
      { ...assignment, vehicle: VEHICLE_MAP.get('VEH-S1')!, driver: DRIVER_MAP.get('DRV-08')! },
      [shipment({ id: 'S2' })],
      PLAN_DATE,
      travel,
      DEFAULT_CONFIG,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(['crew_too_small', 'vehicle_cannot_carry_class_a']).toContain(result.reason);
  });

  it('refuses a gas installation for a crew without the gas skill', () => {
    const result = evaluateRoute(
      { ...assignment, driver: DRIVER_MAP.get('DRV-02')! },
      [shipment({ id: 'S3', units: [unit('LOF-CK-90')], requiresSkills: ['gas'] })],
      PLAN_DATE,
      travel,
      DEFAULT_CONFIG,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('missing_install_skill');
  });

  it('refuses a load over the vehicle cube even when it is under the weight limit', () => {
    const fridges = Array.from({ length: 4 }, () => unit('SAM-RF-SBS-620'));
    const bulky = shipment({ id: 'S4', units: [...fridges, ...fridges, ...fridges, ...fridges, ...fridges] });
    const result = evaluateRoute(assignment, [bulky], PLAN_DATE, travel, DEFAULT_CONFIG);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('over_cube');
  });

  it('refuses a stop that cannot be loaded at the route origin', () => {
    const result = evaluateRoute(
      assignment,
      [shipment({ id: 'S5', stagingOptions: [{ nodeId: 'BR-NAB', readyAt: at(6), transferCost: 0 }] })],
      PLAN_DATE,
      travel,
      DEFAULT_CONFIG,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('not_stageable_at_origin');
  });

  it('refuses an SLA breach', () => {
    const result = evaluateRoute(
      assignment,
      [shipment({ id: 'S6', dueAt: at(7, 5) })],
      PLAN_DATE,
      travel,
      DEFAULT_CONFIG,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('sla_breach');
  });

  it('refuses a route that would run past the shift plus allowed overtime', () => {
    // dueAt pushed into the following day so the shift, not the SLA, is what binds.
    const many = Array.from({ length: 22 }, (_, i) =>
      shipment({ id: `S7-${i}`, destination: { lat: 31.53 + i * 0.01, lng: 35.1 }, zone: 'south', serviceMinutes: 45, dueAt: at(34), units: [unit('SAM-WM-8KG')] }),
    );
    const result = evaluateRoute(assignment, many, PLAN_DATE, travel, DEFAULT_CONFIG);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('shift_exceeded');
  });

  it('accepts a feasible route and prices it', () => {
    const result = evaluateRoute(assignment, [shipment({ id: 'S8' })], PLAN_DATE, travel, DEFAULT_CONFIG);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.cost).toBeGreaterThan(0);
      expect(result.value.distanceKm).toBeGreaterThan(0);
      // The return leg to the depot must be counted.
      expect(result.value.endMin).toBeGreaterThan(result.value.timings[0].departMin);
    }
  });

  it('cannot start before the cross-dock transfer has landed', () => {
    const late = evaluateRoute(
      assignment,
      [shipment({ id: 'S9', stagingOptions: [{ nodeId: 'DC-CENTRAL', readyAt: at(11), transferCost: 40 }] })],
      PLAN_DATE,
      travel,
      DEFAULT_CONFIG,
    );
    expect(late.ok).toBe(true);
    if (late.ok) expect(late.value.startMin).toBe(11 * 60);
  });
});

describe('time-dependent travel', () => {
  it('returns a longer duration for the same arc in the morning peak than at midday', () => {
    const from = { location: { lat: 31.9038, lng: 35.2034 }, zone: 'central' as const };
    const to = { location: { lat: 32.2211, lng: 35.2544 }, zone: 'north' as const };
    const peak = travel.leg(from, to, at(7, 30));
    const midday = travel.leg(from, to, at(11, 30));
    expect(peak.minutes).toBeGreaterThan(midday.minutes);
    expect(peak.km).toBeCloseTo(midday.km, 5);
  });

  it('charges crossing time only when the leg changes zone', () => {
    const a = { location: { lat: 31.9038, lng: 35.2034 }, zone: 'central' as const };
    const b = { location: { lat: 31.9073, lng: 35.2158 }, zone: 'central' as const };
    const c = { location: { lat: 31.7887, lng: 35.229 }, zone: 'jerusalem' as const };
    expect(travel.leg(a, b, at(9)).crossingMinutes).toBe(0);
    expect(travel.leg(a, c, at(9)).crossingMinutes).toBeGreaterThan(0);
  });

  it('treats a closed crossing as impassable rather than merely expensive', () => {
    const closed = new TimeDependentTravelProvider({ degradedCrossings: { 'central|jerusalem': Infinity } });
    const leg = closed.leg(
      { location: { lat: 31.9038, lng: 35.2034 }, zone: 'central' },
      { location: { lat: 31.7887, lng: 35.229 }, zone: 'jerusalem' },
      at(9),
    );
    expect(Number.isFinite(leg.minutes)).toBe(false);
  });
});

describe('load plan', () => {
  it('loads in reverse delivery order so every drop is at the rear door', () => {
    const sequence = [shipment({ id: 'A' }), shipment({ id: 'B' }), shipment({ id: 'C' })];
    const plan = buildLoadPlan(sequence);
    expect(plan[0].deliverySeq).toBe(3);
    expect(plan[plan.length - 1].deliverySeq).toBe(1);
  });

  it('never puts fragile non-stackable goods on the floor under an appliance', () => {
    const mixed = shipment({ id: 'M', units: [unit('SAM-RF-SBS-620'), unit('LUM-DS-44')] });
    const plan = buildLoadPlan([mixed]);
    const glass = plan.find((line) => line.sku === 'LUM-DS-44')!;
    expect(glass.zoneInVehicle).toBe('top_shelf');
    // Heavy goes down first, fragile after it.
    expect(plan.findIndex((l) => l.sku === 'SAM-RF-SBS-620')).toBeLessThan(
      plan.findIndex((l) => l.sku === 'LUM-DS-44'),
    );
  });
});

describe('full wave', () => {
  it('produces a feasible plan that respects every hard constraint', async () => {
    const { plan, shipments, held } = await runDemoWave({ planDate: PLAN_DATE, orderCount: 78 });

    expect(plan.routes.length).toBeGreaterThan(0);
    expect(plan.metrics.assignedCount).toBeGreaterThan(0);
    expect(plan.metrics.assignedCount + plan.metrics.unassignedCount).toBe(shipments.length);
    // Orders stopped at a data gate must never silently vanish.
    expect(held.length).toBeGreaterThan(0);

    const shipmentMap = new Map(shipments.map((s) => [s.id, s]));

    for (const route of plan.routes) {
      const vehicle = VEHICLE_MAP.get(route.vehicleId)!;
      const driver = DRIVER_MAP.get(route.driverId)!;

      expect(route.metrics.loadM3).toBeLessThanOrEqual(vehicle.capacityM3 + 1e-6);
      expect(route.metrics.loadKg).toBeLessThanOrEqual(vehicle.capacityKg + 1e-6);

      for (const stop of route.stops) {
        const s = shipmentMap.get(stop.shipmentId)!;
        expect(vehicle.eligibleZones).toContain(s.zone);
        expect(driver.eligibleZones).toContain(s.zone);
        expect(vehicle.crewSize).toBeGreaterThanOrEqual(s.requiresCrew);
        for (const skill of s.requiresSkills) expect(driver.skills).toContain(skill);
        // SLA holds with the configured buffer.
        expect(stop.arriveAt.getTime()).toBeLessThanOrEqual(
          s.dueAt.getTime() - DEFAULT_CONFIG.slaBufferMinutes * 60_000,
        );
        // The promised window must actually contain the planned arrival.
        expect(stop.arriveAt.getTime()).toBeGreaterThanOrEqual(stop.promisedWindow.earliest.getTime());
        expect(stop.arriveAt.getTime()).toBeLessThanOrEqual(stop.promisedWindow.latest.getTime());
      }

      // Stops must be in chronological order.
      for (let i = 1; i < route.stops.length; i++) {
        expect(route.stops[i].arriveAt.getTime()).toBeGreaterThanOrEqual(
          route.stops[i - 1].departAt.getTime(),
        );
      }

      // Every unit on the truck appears exactly once in the load plan.
      const plannedUnits = route.stops.reduce(
        (sum, stop) => sum + shipmentMap.get(stop.shipmentId)!.units.length,
        0,
      );
      expect(route.loadPlan.length).toBe(plannedUnits);
    }
  });

  it('explains every unassigned shipment with an actionable reason', async () => {
    const { plan } = await runDemoWave({ planDate: PLAN_DATE, orderCount: 78 });
    for (const item of plan.unassigned) {
      expect(item.reason).toBeTruthy();
      expect(item.detail.length).toBeGreaterThan(10);
    }
  });

  it('improves on the construction cost during local search', async () => {
    const { plan } = await runDemoWave({ planDate: PLAN_DATE, orderCount: 78 });
    const constructed = plan.solverLog.find((e) => e.phase === 'construct' && e.cost !== undefined);
    const improved = plan.solverLog.find((e) => e.phase === 'improve' && e.cost !== undefined);
    expect(constructed?.cost).toBeDefined();
    expect(improved?.cost).toBeDefined();
    expect(improved!.cost!).toBeLessThanOrEqual(constructed!.cost!);
  });

  it('reroutes rather than breaking when a crossing closes', async () => {
    const open = await runDemoWave({ planDate: PLAN_DATE, orderCount: 78 });
    const closed = await runDemoWave({
      planDate: PLAN_DATE,
      orderCount: 78,
      travelOptions: { degradedCrossings: { 'central|jerusalem': Infinity, 'south|jerusalem': Infinity, 'north|jerusalem': Infinity } },
    });
    // Jerusalem is served by its own sub-fleet homed inside the zone, so closing the
    // crossings must not strand those stops.
    expect(closed.plan.metrics.assignedCount).toBeGreaterThan(0);
    expect(closed.plan.metrics.assignedCount).toBeLessThanOrEqual(open.plan.metrics.assignedCount + 2);
  });
});

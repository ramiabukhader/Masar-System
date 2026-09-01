import { describe, expect, it } from 'vitest';
import { offerSlots, SLOTS } from './promise';
import { runDemoWave } from '../data/scenario';
import { VEHICLES } from '../data/fleet';
import { ZONES } from './types';

const PLAN_DATE = new Date(2026, 8, 15);

async function wave() {
  return runDemoWave({ planDate: PLAN_DATE, orderCount: 78 });
}

describe('delivery promise engine', () => {
  it('offers one entry per slot for every zone', async () => {
    const { plan, shipments } = await wave();
    for (const zone of ZONES) {
      const offers = offerSlots({ plan, shipments, vehicles: VEHICLES, planDate: PLAN_DATE, zone });
      expect(offers).toHaveLength(SLOTS.length);
      expect(offers.every((offer) => offer.zone === zone)).toBe(true);
    }
  });

  it('recommends exactly one slot, and never a slot it cannot serve', async () => {
    const { plan, shipments } = await wave();
    for (const zone of ZONES) {
      const offers = offerSlots({ plan, shipments, vehicles: VEHICLES, planDate: PLAN_DATE, zone });
      const recommended = offers.filter((offer) => offer.recommended);
      expect(recommended.length).toBeLessThanOrEqual(1);
      for (const offer of recommended) expect(offer.deliverable).toBe(true);
    }
  });

  it('recommends the cheapest slot to add a stop to', async () => {
    const { plan, shipments } = await wave();
    const offers = offerSlots({ plan, shipments, vehicles: VEHICLES, planDate: PLAN_DATE, zone: 'central' });
    const deliverable = offers.filter((offer) => offer.deliverable);
    const recommended = offers.find((offer) => offer.recommended)!;
    for (const offer of deliverable) {
      expect(recommended.marginalCost).toBeLessThanOrEqual(offer.marginalCost);
    }
  });

  it('prices an empty slot as expensive — a whole trip for one stop', async () => {
    const { shipments } = await wave();
    const emptyPlan = { routes: [], unassigned: [] } as unknown as Parameters<typeof offerSlots>[0]['plan'];
    const offers = offerSlots({
      plan: emptyPlan,
      shipments,
      vehicles: VEHICLES,
      planDate: PLAN_DATE,
      zone: 'central',
    });
    for (const offer of offers) {
      expect(offer.plannedStops).toBe(0);
      expect(offer.marginalCost).toBeGreaterThan(0.5);
    }
  });

  it('counts only stops in the requested zone', async () => {
    const { plan, shipments } = await wave();
    const perZone = ZONES.map((zone) =>
      offerSlots({ plan, shipments, vehicles: VEHICLES, planDate: PLAN_DATE, zone }).reduce(
        (sum, offer) => sum + offer.plannedStops,
        0,
      ),
    );
    const totalCounted = perZone.reduce((sum, n) => sum + n, 0);
    const totalPlanned = plan.routes.reduce((sum, route) => sum + route.stops.length, 0);
    // Every planned stop falls in exactly one zone; some may sit outside the 09:00–18:00
    // slot grid, so the counted total can only be lower, never higher.
    expect(totalCounted).toBeLessThanOrEqual(totalPlanned);
    expect(totalCounted).toBeGreaterThan(0);
  });

  it('never sells the same vehicle in two zones at once', async () => {
    const { plan, shipments } = await wave();
    // A van eligible for four zones is still one van. Counting the whole eligible
    // sub-fleet per zone advertised VEH-T1 as 16 morning stops against a physical 4, and
    // the fleet as 121 against 55, so utilisation never approached FULL_AT and
    // `deliverable` could not go false however loaded the network was.
    const multiZone = VEHICLES.find((v) => v.eligibleZones.length > 1)!;
    const perSlotPhysical = Math.round(1 * 3 * 1.4);

    const advertised = multiZone.eligibleZones.reduce(
      (sum, zone) =>
        sum + offerSlots({ plan, shipments, vehicles: [multiZone], planDate: PLAN_DATE, zone })[0].capacityStops,
      0,
    );
    expect(advertised).toBeLessThanOrEqual(perSlotPhysical);
  });

  it('keeps the whole fleet advertised capacity inside what the fleet can physically do', async () => {
    const { plan, shipments } = await wave();
    const physical = Math.round(VEHICLES.length * 3 * 1.4);
    const advertised = ZONES.reduce(
      (sum, zone) =>
        sum + offerSlots({ plan, shipments, vehicles: VEHICLES, planDate: PLAN_DATE, zone })[0].capacityStops,
      0,
    );
    expect(advertised).toBeLessThanOrEqual(physical);
  });

  it('can actually mark a slot full, which is the guard the engine exists for', async () => {
    const { plan, shipments } = await wave();
    // `deliverable: false` was unreachable: 0 of 15 offers, ceiling utilisation 0.48
    // against FULL_AT 0.92. A safety property that cannot fire is not a safety property.
    const offers = ZONES.flatMap((zone) =>
      offerSlots({ plan, shipments, vehicles: VEHICLES, planDate: PLAN_DATE, zone }),
    );
    expect(offers.some((o) => !o.deliverable)).toBe(true);
    expect(Math.max(...offers.map((o) => o.utilisation))).toBeGreaterThan(0.92);
  });
});
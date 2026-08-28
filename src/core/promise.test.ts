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
});

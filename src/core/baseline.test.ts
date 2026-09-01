import { describe, expect, it } from 'vitest';
import { planBaseline } from './baseline';
import { CachedTravelProvider, TimeDependentTravelProvider } from './travel';
import { runDemoWave } from '../data/scenario';
import { NODE_MAP } from '../data/gazetteer';

const PLAN_DATE = new Date(2026, 8, 15);

/** Every crossing into and out of the Jerusalem access regime, shut. */
const JERUSALEM_CLOSED: Record<string, number> = {
  'central|jerusalem': Infinity,
  'north|jerusalem': Infinity,
  'south|jerusalem': Infinity,
  'jerusalem|jordan_valley': Infinity,
};

function baselineWith(degradedCrossings: Record<string, number>, shipments: Awaited<ReturnType<typeof runDemoWave>>['shipments']) {
  return planBaseline({
    shipments,
    nodes: NODE_MAP,
    planDate: PLAN_DATE,
    travel: new CachedTravelProvider(new TimeDependentTravelProvider({ degradedCrossings })),
  });
}

describe('baseline under disruption', () => {
  it('keeps every headline number finite when a crossing is shut', async () => {
    const { shipments } = await runDemoWave({ planDate: PLAN_DATE, orderCount: 78 });
    const result = baselineWith(JERUSALEM_CLOSED, shipments);

    // One unreachable leg used to turn all of these into Infinity, which the Control
    // Tower then rendered as "∞" and as a -Infinity% delta.
    expect(Number.isFinite(result.totalCost)).toBe(true);
    expect(Number.isFinite(result.costPerDrop)).toBe(true);
    expect(Number.isFinite(result.totalDistanceKm)).toBe(true);
    expect(Number.isFinite(result.totalDriveMinutes)).toBe(true);
    for (const route of result.routes) {
      expect(Number.isFinite(route.cost)).toBe(true);
      expect(Number.isFinite(route.driveMinutes)).toBe(true);
      expect(Number.isFinite(route.totalMinutes)).toBe(true);
    }
  });

  it('reports the drops it could not serve rather than quietly dropping them', async () => {
    const { shipments } = await runDemoWave({ planDate: PLAN_DATE, orderCount: 78 });
    const result = baselineWith(JERUSALEM_CLOSED, shipments);

    expect(result.undeliverableCount).toBeGreaterThan(0);
    // Nothing may vanish: every shipment is either delivered or explicitly undelivered.
    expect(result.dropCount + result.undeliverableCount).toBe(shipments.length);
  });

  it('serves everything when no crossing is shut', async () => {
    const { shipments } = await runDemoWave({ planDate: PLAN_DATE, orderCount: 78 });
    const result = baselineWith({}, shipments);

    expect(result.undeliverableCount).toBe(0);
    expect(result.dropCount).toBe(shipments.length);
    expect(Number.isFinite(result.totalCost)).toBe(true);
  });

  it('costs more to run once the network slows down', async () => {
    const { shipments } = await runDemoWave({ planDate: PLAN_DATE, orderCount: 78 });
    const calm = baselineWith({}, shipments);
    const congested = baselineWith({ 'north|central': 3.2, 'north|south': 3.2 }, shipments);

    // The baseline has to feel a disruption too, or comparing it against a disrupted
    // plan is not a comparison at all.
    expect(congested.totalCost).toBeGreaterThan(calm.totalCost);
    expect(congested.totalDriveMinutes).toBeGreaterThan(calm.totalDriveMinutes);
  });
});

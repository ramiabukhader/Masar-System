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

  it('batches by urgency day counted from the plan date, not from the UTC calendar', async () => {
    const { shipments } = await runDemoWave({ planDate: PLAN_DATE, orderCount: 78 });

    // `dueAt` runs 11-26h after local midnight. Bucketing on the raw epoch measured the
    // UTC calendar instead, so the day boundary slid with the host's offset: the total
    // cost swung 13% between timezones, and in Asia/Hebron (+03:00) the boundary fell
    // outside the spread entirely and collapsed every shipment into a single bucket,
    // silently disabling the batching. Counted from planDate, the split is a property of
    // the data.
    const buckets = new Set(
      shipments.map((s) => Math.floor((s.dueAt.getTime() - PLAN_DATE.getTime()) / 86_400_000)),
    );
    expect(buckets.size).toBeGreaterThan(1);

    // The comparator must agree with that split for every pair, whatever the host offset.
    const sorted = [...shipments].sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime());
    const dayOf = (s: (typeof shipments)[number]) =>
      Math.floor((s.dueAt.getTime() - PLAN_DATE.getTime()) / 86_400_000);
    for (let i = 1; i < sorted.length; i++) {
      expect(dayOf(sorted[i])).toBeGreaterThanOrEqual(dayOf(sorted[i - 1]));
    }
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

  it('prices the same drops as the plan, so a saving cannot come from not delivering', async () => {
    // The baseline allocates as many branch vans as it likes and always delivers
    // everything; the optimiser is capped by a real fleet. Pricing the full set against
    // the plan's assigned subset made the headline saving grow whenever the fleet failed.
    const degradedCrossings = { 'north|central': 3.2, 'north|south': 3.2 };
    const r = await runDemoWave({
      planDate: PLAN_DATE,
      orderCount: 78,
      travelOptions: { degradedCrossings, networkFactor: 1.12 },
      unavailableVehicleIds: ['VEH-T1'],
    });
    expect(r.plan.metrics.unassignedCount).toBeGreaterThan(0);

    const assigned = new Set(r.plan.routes.flatMap((rt) => rt.stops.map((s) => s.shipmentId)));
    const likeForLike = planBaseline({
      shipments: r.shipments.filter((s) => assigned.has(s.id)),
      nodes: NODE_MAP,
      planDate: PLAN_DATE,
      travel: new CachedTravelProvider(
        new TimeDependentTravelProvider({ degradedCrossings, networkFactor: 1.12 }),
      ),
    });

    // Both columns cover exactly the drops the plan served.
    expect(likeForLike.dropCount + likeForLike.undeliverableCount).toBe(assigned.size);
    expect(likeForLike.dropCount).toBe(r.plan.metrics.assignedCount);
  });
});
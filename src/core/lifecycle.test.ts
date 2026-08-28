import { describe, expect, it } from 'vitest';
import { buildOrderTracks, MILESTONES, summarise, type OrderTrack } from './lifecycle';
import { runDemoWave } from '../data/scenario';
import type { DeliveryPlan, Order, Shipment } from './types';

const PLAN_DATE = new Date(2026, 8, 15);

interface Wave {
  plan: DeliveryPlan;
  shipments: Shipment[];
  orders: Order[];
  customers: Map<string, import('./types').Customer>;
  held: { orderId: string; reason: string; detail: string }[];
}

let cached: Wave | null = null;

async function wave(): Promise<Wave> {
  if (cached) return cached;
  const result = await runDemoWave({ planDate: PLAN_DATE, orderCount: 78 });
  cached = {
    plan: result.plan,
    shipments: result.shipments,
    orders: result.orders,
    customers: new Map(result.customers.map((c) => [c.id, c])),
    held: result.held,
  };
  return cached;
}

async function tracksAt(nowMinutes: number): Promise<OrderTrack[]> {
  const w = await wave();
  return buildOrderTracks({
    planDate: PLAN_DATE,
    nowMinutes,
    plan: w.plan,
    orders: w.orders,
    customers: w.customers,
    shipments: w.shipments,
    held: w.held,
  });
}

describe('order lifecycle', () => {
  it('produces exactly one track per order, whatever the hour', async () => {
    const w = await wave();
    for (const hour of [7, 11, 17]) {
      const tracks = await tracksAt(hour * 60);
      expect(tracks).toHaveLength(w.orders.length);
      expect(new Set(tracks.map((t) => t.orderId)).size).toBe(w.orders.length);
    }
  });

  it('holds every order that failed a data gate, and never puts it on a route', async () => {
    const w = await wave();
    const tracks = await tracksAt(11 * 60);
    const held = tracks.filter((t) => t.state === 'held');

    expect(held.length).toBe(w.held.length);
    for (const track of held) {
      expect(track.blocker).toBeDefined();
      expect(track.routeId).toBeUndefined();
      // A held order has passed only the first milestone.
      expect(track.reachedCount).toBe(1);
    }
  });

  it('never reports a blocked or held order as delivered, however late the clock', async () => {
    const tracks = await tracksAt(23 * 60);
    for (const track of tracks) {
      if (track.blocker) expect(track.state).not.toBe('delivered');
    }
  });

  it('advances monotonically as the day progresses', async () => {
    const early = await tracksAt(7 * 60 + 30);
    const late = await tracksAt(17 * 60);
    const lateById = new Map(late.map((t) => [t.orderId, t]));

    for (const track of early) {
      const later = lateById.get(track.orderId)!;
      expect(later.reachedCount).toBeGreaterThanOrEqual(track.reachedCount);
    }
    expect(late.filter((t) => t.state === 'delivered').length).toBeGreaterThan(
      early.filter((t) => t.state === 'delivered').length,
    );
  });

  it('has nothing delivered before the trucks leave', async () => {
    const tracks = await tracksAt(6 * 60);
    expect(tracks.filter((t) => t.state === 'delivered')).toHaveLength(0);
  });

  it('marks a stop delivered once the clock passes its departure, and not before', async () => {
    const w = await wave();
    const route = w.plan.routes[0];
    const stop = route.stops[0];
    const departMin = (stop.departAt.getTime() - PLAN_DATE.getTime()) / 60_000;
    const shipment = w.shipments.find((s) => s.id === stop.shipmentId)!;

    const before = (await tracksAt(departMin - 5)).find((t) => t.orderId === shipment.orderId)!;
    const after = (await tracksAt(departMin + 5)).find((t) => t.orderId === shipment.orderId)!;

    expect(before.state).not.toBe('delivered');
    expect(after.state).toBe('delivered');
    expect(after.reachedCount).toBe(MILESTONES.length);
  });

  it('carries the plan assignment and promised window onto the track', async () => {
    const tracks = await tracksAt(11 * 60);
    const scheduled = tracks.filter((t) => t.routeId);
    expect(scheduled.length).toBeGreaterThan(0);

    for (const track of scheduled) {
      expect(track.vehicleId).toBeTruthy();
      expect(track.driverId).toBeTruthy();
      expect(track.promisedWindow).toBeDefined();
      expect(track.plannedArrival!.getTime()).toBeGreaterThanOrEqual(
        track.promisedWindow!.earliest.getTime(),
      );
    }
  });

  it('does not call an order overdue while its deadline is still ahead', async () => {
    const tracks = await tracksAt(11 * 60);
    for (const track of tracks) {
      const dueMin = (track.order.dueAt.getTime() - PLAN_DATE.getTime()) / 60_000;
      if (dueMin - 11 * 60 > 120 && track.state !== 'delivered') {
        expect(track.slaRisk).not.toBe('breach');
      }
    }
  });

  it('summarises into counts that account for every order', async () => {
    const tracks = await tracksAt(13 * 60);
    const s = summarise(tracks, PLAN_DATE);
    expect(s.held + s.blocked + s.scheduled + s.active + s.delivered).toBe(s.total);
    expect(s.total).toBe(tracks.length);
    expect(s.cashToCollect).toBeGreaterThanOrEqual(0);
  });
});

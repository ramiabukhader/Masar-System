import type {
  Customer,
  DeliveryPlan,
  Order,
  Route,
  Shipment,
  TimeWindow,
} from './types';

/**
 * The order lifecycle as the business sees it — eight milestones from the sale to the
 * signed proof. This is the "where is my order" model: it sits above shipments and routes
 * and is what the orders board, the order page and the customer notification all read.
 */
export type MilestoneId =
  | 'placed'
  | 'validated'
  | 'sourced'
  | 'planned'
  | 'window_confirmed'
  | 'loaded'
  | 'out_for_delivery'
  | 'delivered';

/**
 * Order matters and follows the real sequence in docs/06: the wave plans the order and
 * confirms the window the afternoon before, and only then is the stock staged and loaded
 * on the morning of delivery. Staging before planning would be backwards.
 */
export const MILESTONES: MilestoneId[] = [
  'placed',
  'validated',
  'planned',
  'window_confirmed',
  'sourced',
  'loaded',
  'out_for_delivery',
  'delivered',
];

/**
 * `held`      — stopped at a data-quality gate. Work for a person, not for a truck.
 * `blocked`   — passed the gates but the wave could not assign it. Work for the planner.
 * `scheduled` — on a route, not yet dispatched.
 * `active`    — the crew is on the way or at the door.
 * `delivered` — done and proven.
 */
export type OrderState = 'held' | 'blocked' | 'scheduled' | 'active' | 'delivered';

export type SlaRisk = 'ok' | 'tight' | 'breach';

export interface MilestoneEvent {
  milestone: MilestoneId;
  /** null when the milestone has not been reached yet. */
  at: Date | null;
  reached: boolean;
}

export interface OrderTrack {
  orderId: string;
  order: Order;
  customer?: Customer;
  shipment?: Shipment;
  state: OrderState;
  currentMilestone: MilestoneId;
  /** How many of the eight milestones are behind us — drives the progress bar. */
  reachedCount: number;
  events: MilestoneEvent[];
  /** Present for held and blocked orders: what stopped it, and what to do. */
  blocker?: { reason: string; detail: string };
  routeId?: string;
  vehicleId?: string;
  driverId?: string;
  originNodeId?: string;
  stopSeq?: number;
  promisedWindow?: TimeWindow;
  plannedArrival?: Date;
  /** Minutes between planned arrival and the SLA deadline. */
  slackMinutes?: number;
  slaRisk: SlaRisk;
}

export interface TrackInput {
  planDate: Date;
  /** Simulated clock, in minutes from planDate midnight. Drives the whole board. */
  nowMinutes: number;
  plan: DeliveryPlan;
  orders: Order[];
  customers: Map<string, Customer>;
  shipments: Shipment[];
  held: { orderId: string; reason: string; detail: string }[];
}

const MS_PER_MIN = 60_000;

/** The wave runs at 16:00 the day before delivery. */
const PLANNING_OFFSET_MIN = -8 * 60;
/** Window confirmations go out half an hour after the plan is approved. */
const CONFIRM_OFFSET_MIN = PLANNING_OFFSET_MIN + 30;
/** Loading finishes shortly before the route departs. */
const LOADED_BEFORE_DEPART_MIN = 20;
/** Stock is staged on the dock before the crews arrive. */
const SOURCED_BEFORE_DEPART_MIN = 75;

function at(planDate: Date, minutes: number): Date {
  return new Date(planDate.getTime() + minutes * MS_PER_MIN);
}

function minutesOf(planDate: Date, date: Date): number {
  return (date.getTime() - planDate.getTime()) / MS_PER_MIN;
}

function riskOf(slackMinutes: number | undefined): SlaRisk {
  if (slackMinutes === undefined) return 'breach';
  if (slackMinutes < 0) return 'breach';
  if (slackMinutes < 90) return 'tight';
  return 'ok';
}

/**
 * Builds one track per order for the given moment in the day.
 *
 * Milestone times are derived from the plan rather than stored, so scrubbing the clock
 * replays the real day: at 07:20 the trucks have left and nothing is delivered; by 15:00
 * most stops are closed and the ones still open are the ones worth looking at.
 */
export function buildOrderTracks(input: TrackInput): OrderTrack[] {
  const { planDate, nowMinutes, plan, orders, customers, shipments, held } = input;

  const heldByOrder = new Map(held.map((h) => [h.orderId, h]));
  const shipmentByOrder = new Map(shipments.map((s) => [s.orderId, s]));
  const unassignedByShipment = new Map(plan.unassigned.map((u) => [u.shipmentId, u]));

  // Where each shipment sits in the plan.
  const placement = new Map<string, { route: Route; stopIndex: number }>();
  for (const route of plan.routes) {
    route.stops.forEach((stop, stopIndex) => {
      placement.set(stop.shipmentId, { route, stopIndex });
    });
  }

  return orders.map((order) => {
    const customer = customers.get(order.customerId);
    const shipment = shipmentByOrder.get(order.id);
    const heldRecord = heldByOrder.get(order.id);

    const placedAt = order.confirmedAt;
    const dueMin = minutesOf(planDate, order.dueAt);

    // --- Held at a data gate: never reaches a truck --------------------------
    if (heldRecord) {
      return {
        orderId: order.id,
        order,
        customer,
        state: 'held' as const,
        currentMilestone: 'placed' as const,
        reachedCount: 1,
        events: buildEvents({ placed: placedAt }, nowMinutes, planDate),
        blocker: { reason: heldRecord.reason, detail: heldRecord.detail },
        // A held order has no planned arrival, so its risk is measured against the clock:
        // how long is left before the promise is broken.
        slaRisk: riskOf(dueMin - nowMinutes),
      };
    }

    const validatedAt = new Date(placedAt.getTime() + 30 * MS_PER_MIN);
    const spot = shipment ? placement.get(shipment.id) : undefined;

    // --- Passed the gates but the wave could not place it --------------------
    if (!spot) {
      const unassigned = shipment ? unassignedByShipment.get(shipment.id) : undefined;
      return {
        orderId: order.id,
        order,
        customer,
        shipment,
        state: 'blocked' as const,
        currentMilestone: 'validated' as const,
        reachedCount: 2,
        events: buildEvents({ placed: placedAt, validated: validatedAt }, nowMinutes, planDate),
        blocker: unassigned
          ? { reason: unassigned.reason, detail: unassigned.detail }
          : { reason: 'not_planned', detail: 'Not included in the current wave.' },
        slaRisk: riskOf(dueMin - nowMinutes),
      };
    }

    const { route, stopIndex } = spot;
    const stop = route.stops[stopIndex];
    const departMin = minutesOf(planDate, route.startAt);

    const times: Partial<Record<MilestoneId, Date>> = {
      placed: placedAt,
      validated: validatedAt,
      sourced: at(planDate, departMin - SOURCED_BEFORE_DEPART_MIN),
      planned: at(planDate, PLANNING_OFFSET_MIN),
      window_confirmed: at(planDate, CONFIRM_OFFSET_MIN),
      loaded: at(planDate, departMin - LOADED_BEFORE_DEPART_MIN),
      out_for_delivery: route.startAt,
      delivered: stop.departAt,
    };

    const events = buildEvents(times, nowMinutes, planDate);
    const reachedCount = events.filter((e) => e.reached).length;
    const currentMilestone = MILESTONES[Math.max(0, reachedCount - 1)];

    const state: OrderState =
      reachedCount >= MILESTONES.length
        ? 'delivered'
        : events.find((e) => e.milestone === 'out_for_delivery')?.reached
          ? 'active'
          : 'scheduled';

    return {
      orderId: order.id,
      order,
      customer,
      shipment,
      state,
      currentMilestone,
      reachedCount,
      events,
      routeId: route.id,
      vehicleId: route.vehicleId,
      driverId: route.driverId,
      originNodeId: route.originNodeId,
      stopSeq: stop.seq,
      promisedWindow: stop.promisedWindow,
      plannedArrival: stop.arriveAt,
      slackMinutes: stop.slackMinutes,
      slaRisk: riskOf(stop.slackMinutes),
    };
  });
}

/**
 * A milestone counts as reached only if every milestone before it is too. Treating them
 * independently would let a late-running step leave a gap in the middle of the progress
 * bar, which reads as a bug to anyone looking at the board.
 */
function buildEvents(
  times: Partial<Record<MilestoneId, Date>>,
  nowMinutes: number,
  planDate: Date,
): MilestoneEvent[] {
  let stillReached = true;
  return MILESTONES.map((milestone) => {
    const time = times[milestone];
    const due = time !== undefined && minutesOf(planDate, time) <= nowMinutes;
    stillReached = stillReached && due;
    return { milestone, at: time ?? null, reached: stillReached };
  });
}

/**
 * Triage order for the board: work needing a person first, then live work by how close
 * it is to breaking its promise, then what is already done.
 *
 * Lives here rather than inline in the sort because it is a statement about the domain,
 * and because a comparator that silently mishandles one member of an enum is exactly the
 * kind of thing that needs a test of its own. SlaRisk has three values and all three are
 * scored: an earlier version tested only for 'tight', which put 'breach' — the worst —
 * in the same bucket as 'ok'.
 */
export function triageRank(track: OrderTrack): number {
  switch (track.state) {
    case 'held':
      return 0;
    case 'blocked':
      return 1;
    case 'delivered':
      // Finished work sinks: it cannot need anything, whatever its risk was on the day.
      return 5;
    case 'scheduled':
    case 'active':
      return track.slaRisk === 'breach' ? 2 : track.slaRisk === 'tight' ? 3 : 4;
  }
}

export interface BoardSummary {
  total: number;
  held: number;
  blocked: number;
  scheduled: number;
  active: number;
  delivered: number;
  atRisk: number;
  dueToday: number;
  cashToCollect: number;
}

export function summarise(tracks: OrderTrack[], planDate: Date): BoardSummary {
  const endOfDay = planDate.getTime() + 24 * 60 * MS_PER_MIN;
  return {
    total: tracks.length,
    held: tracks.filter((t) => t.state === 'held').length,
    blocked: tracks.filter((t) => t.state === 'blocked').length,
    scheduled: tracks.filter((t) => t.state === 'scheduled').length,
    active: tracks.filter((t) => t.state === 'active').length,
    delivered: tracks.filter((t) => t.state === 'delivered').length,
    atRisk: tracks.filter((t) => t.slaRisk !== 'ok' && t.state !== 'delivered').length,
    dueToday: tracks.filter((t) => t.order.dueAt.getTime() <= endOfDay).length,
    cashToCollect: tracks
      .filter((t) => t.state !== 'delivered' && t.state !== 'held')
      .reduce((sum, t) => sum + t.order.amountDue, 0),
  };
}

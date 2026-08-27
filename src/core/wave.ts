import { buildShipments } from './shipments';
import { planWave, type PlannerConfig } from './optimizer';
import { CachedTravelProvider, TimeDependentTravelProvider, type TravelOptions } from './travel';
import type { OrderSource } from './adapters';
import type { DeliveryPlan, Locality, Node, Shipment } from './types';

export interface WaveRequest {
  waveName: string;
  /** Local midnight of the delivery day. */
  planDate: Date;
  /** How far ahead to sweep for due orders. 24h for a daily wave. */
  horizonHours: number;
  localities: Map<string, Locality>;
  nodes: Map<string, Node>;
  hubNodeIds: string[];
  /** When the overnight inter-branch shuttle lands at the hubs. */
  shuttleArrivalHour: number;
  transferCostPerM3: number;
  geocodeGate: number;
  vehicles: import('./types').Vehicle[];
  drivers: import('./types').Driver[];
  config?: Partial<PlannerConfig>;
  travelOptions?: TravelOptions;
}

export interface WaveResult {
  plan: DeliveryPlan;
  shipments: Shipment[];
  /** Orders stopped at a data-quality gate — work for people, not for the truck. */
  held: { orderId: string; reason: string; detail: string }[];
}

/**
 * End-to-end wave: pull orders, turn them into shipments, optimise, return the plan.
 * This is the function the 16:00 wave job calls in production and the Control Tower
 * calls in the demo — same code path either way.
 */
export async function runWave(source: OrderSource, request: WaveRequest): Promise<WaveResult> {
  const horizon = {
    from: request.planDate,
    to: new Date(request.planDate.getTime() + request.horizonHours * 3_600_000),
  };

  const orders = await source.fetchPendingOrders(horizon);
  const customers = await source.fetchCustomers(orders.map((o) => o.customerId));
  const skus = [...new Set(orders.flatMap((o) => o.lines.map((l) => l.sku)))];
  const products = await source.fetchProducts(skus);
  const inventory = await source.fetchInventory(skus);

  const { shipments, held } = buildShipments({
    orders,
    customers: new Map(customers.map((c) => [c.id, c])),
    products: new Map(products.map((p) => [p.sku, p])),
    inventory,
    nodes: request.nodes,
    localities: request.localities,
    hubNodeIds: request.hubNodeIds,
    shuttleArrival: new Date(
      request.planDate.getTime() + request.shuttleArrivalHour * 3_600_000,
    ),
    transferCostPerM3: request.transferCostPerM3,
    geocodeGate: request.geocodeGate,
  });

  const travel = new CachedTravelProvider(
    new TimeDependentTravelProvider(request.travelOptions ?? {}),
  );

  const plan = planWave({
    waveName: request.waveName,
    planDate: request.planDate,
    shipments,
    vehicles: request.vehicles,
    drivers: request.drivers,
    nodes: request.nodes,
    travel,
    config: request.config,
  });

  return { plan, shipments, held };
}

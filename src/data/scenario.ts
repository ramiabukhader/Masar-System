import { MockOrderSource } from '../core/adapters';
import { runWave, type WaveRequest, type WaveResult } from '../core/wave';
import { PRODUCTS } from './catalog';
import { DRIVERS, VEHICLES } from './fleet';
import { generateWaveData } from './generate';
import { HUB_NODE_IDS, LOCALITY_MAP, NODES, NODE_MAP } from './gazetteer';
import type { TravelOptions } from '../core/travel';
import type { PlannerConfig } from '../core/optimizer';

/** Local midnight of the demo delivery day. */
export function demoPlanDate(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
}

export interface ScenarioOptions {
  planDate?: Date;
  orderCount?: number;
  seed?: number;
  slaHours?: number;
  config?: Partial<PlannerConfig>;
  travelOptions?: TravelOptions;
  /** Vehicle ids withdrawn from service — used to demo a breakdown. */
  unavailableVehicleIds?: string[];
}

export function buildScenario(options: ScenarioOptions = {}) {
  const planDate = options.planDate ?? demoPlanDate();
  const generated = generateWaveData({
    planDate,
    orderCount: options.orderCount,
    seed: options.seed,
    slaHours: options.slaHours,
  });

  const source = new MockOrderSource({
    orders: generated.orders,
    customers: generated.customers,
    products: PRODUCTS,
    branches: NODES,
    inventory: generated.inventory,
  });

  const unavailable = new Set(options.unavailableVehicleIds ?? []);

  const request: WaveRequest = {
    waveName: 'daily',
    planDate,
    horizonHours: 26,
    localities: LOCALITY_MAP,
    nodes: NODE_MAP,
    hubNodeIds: HUB_NODE_IDS,
    // Overnight shuttle lands before the shift starts, so consolidated stock is on the
    // dock when the crews arrive.
    shuttleArrivalHour: 6,
    transferCostPerM3: 12,
    geocodeGate: 0.6,
    vehicles: VEHICLES.filter((v) => !unavailable.has(v.id)),
    drivers: DRIVERS,
    config: options.config,
    travelOptions: options.travelOptions,
  };

  return { source, request, generated };
}

export async function runDemoWave(options: ScenarioOptions = {}): Promise<
  WaveResult & { customers: ReturnType<typeof generateWaveData>['customers']; orders: ReturnType<typeof generateWaveData>['orders'] }
> {
  const { source, request, generated } = buildScenario(options);
  const result = await runWave(source, request);
  return { ...result, customers: generated.customers, orders: generated.orders };
}

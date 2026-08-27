import { useEffect, useMemo, useState } from 'react';
import { planBaseline, type BaselineResult } from '../core/baseline';
import { CachedTravelProvider, TimeDependentTravelProvider } from '../core/travel';
import { runDemoWave } from '../data/scenario';
import { NODE_MAP } from '../data/gazetteer';
import type { Customer, DeliveryPlan, Order, Shipment } from '../core/types';

export interface Disruptions {
  jerusalemClosed: boolean;
  northCongested: boolean;
  truckDown: boolean;
}

export const NO_DISRUPTIONS: Disruptions = {
  jerusalemClosed: false,
  northCongested: false,
  truckDown: false,
};

export interface PlanState {
  loading: boolean;
  plan?: DeliveryPlan;
  baseline?: BaselineResult;
  shipments: Shipment[];
  shipmentMap: Map<string, Shipment>;
  customerMap: Map<string, Customer>;
  orderMap: Map<string, Order>;
  held: { orderId: string; reason: string; detail: string }[];
}

const PLAN_DATE = new Date(2026, 8, 15);

/**
 * Runs a full wave in the browser. This is the real planner — the same `runWave` the
 * production job calls — not a canned result, so every toggle genuinely re-optimises.
 */
export function usePlan(disruptions: Disruptions): PlanState {
  const [state, setState] = useState<PlanState>({
    loading: true,
    shipments: [],
    shipmentMap: new Map(),
    customerMap: new Map(),
    orderMap: new Map(),
    held: [],
  });

  const key = useMemo(
    () => `${disruptions.jerusalemClosed}|${disruptions.northCongested}|${disruptions.truckDown}`,
    [disruptions],
  );

  useEffect(() => {
    let cancelled = false;
    setState((prev) => ({ ...prev, loading: true }));

    // Yield to the browser so the "re-planning" state paints before the solver blocks.
    const handle = window.setTimeout(async () => {
      const degradedCrossings: Record<string, number> = {};
      if (disruptions.jerusalemClosed) {
        degradedCrossings['central|jerusalem'] = Infinity;
        degradedCrossings['north|jerusalem'] = Infinity;
        degradedCrossings['south|jerusalem'] = Infinity;
        degradedCrossings['jerusalem|jordan_valley'] = Infinity;
      }
      if (disruptions.northCongested) {
        degradedCrossings['north|central'] = 3.2;
        degradedCrossings['north|south'] = 3.2;
      }

      const result = await runDemoWave({
        planDate: PLAN_DATE,
        orderCount: 78,
        travelOptions: {
          degradedCrossings,
          networkFactor: disruptions.northCongested ? 1.12 : 1,
        },
        unavailableVehicleIds: disruptions.truckDown ? ['VEH-T1'] : [],
      });

      if (cancelled) return;

      const baseline = planBaseline({
        shipments: result.shipments,
        nodes: NODE_MAP,
        planDate: PLAN_DATE,
        travel: new CachedTravelProvider(new TimeDependentTravelProvider()),
      });

      setState({
        loading: false,
        plan: result.plan,
        baseline,
        shipments: result.shipments,
        shipmentMap: new Map(result.shipments.map((s) => [s.id, s])),
        customerMap: new Map(result.customers.map((c) => [c.id, c])),
        orderMap: new Map(result.orders.map((o) => [o.id, o])),
        held: result.held,
      });
    }, 30);

    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return state;
}

export function fmtTime(date: Date): string {
  return date.toTimeString().slice(0, 5);
}

export function fmtNum(value: number, digits = 0): string {
  return value.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

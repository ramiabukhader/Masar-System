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

/** The demo delivery day. Fixed so the seeded scenario is reproducible. */
export const PLAN_DATE = new Date(2026, 8, 15);

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

/** Formats minutes-from-midnight as HH:MM. */
export function fmtClock(minutes: number): string {
  const m = ((Math.round(minutes) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

export function fmtDay(date: Date, lang: 'ar' | 'en'): string {
  return date.toLocaleDateString(lang === 'ar' ? 'ar' : 'en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

/**
 * Arabic counts days with a dual form: one day is يوم, two is يومان, three to ten take the
 * plural أيام, and eleven upwards goes back to the singular accusative يوماً. Writing
 * "قبل 2 أيام" is the kind of thing that tells a native speaker immediately that nobody
 * who speaks the language looked at the screen.
 */
function arabicDays(count: number): string {
  if (count === 1) return 'يوم';
  if (count === 2) return 'يومين';
  if (count <= 10) return `${count} أيام`;
  return `${count} يوماً`;
}

/**
 * Timestamp with a day marker when it is not the delivery day itself. Milestones like
 * "scheduled in the wave" happen the afternoon before, and a bare "16:00" next to a
 * "06:40" reads as out of order without it.
 */
export function fmtStamp(date: Date, planDate: Date, lang: 'ar' | 'en'): string {
  const dayDelta = Math.floor((date.getTime() - planDate.getTime()) / 86_400_000);
  const time = fmtTime(date);
  if (dayDelta === 0) return time;
  if (dayDelta === -1) return `${lang === 'ar' ? 'أمس' : 'yesterday'} ${time}`;
  if (dayDelta === 1) return `${lang === 'ar' ? 'غداً' : 'tomorrow'} ${time}`;
  const days = Math.abs(dayDelta);
  if (lang === 'en') return dayDelta < 0 ? `${days}d ago ${time}` : `in ${days}d ${time}`;
  return dayDelta < 0 ? `قبل ${arabicDays(days)} ${time}` : `بعد ${arabicDays(days)} ${time}`;
}

/** Relative day label for a due date, e.g. "today 18:00" / "tomorrow 09:00". */
export function fmtDue(due: Date, planDate: Date, lang: 'ar' | 'en'): string {
  const dayDelta = Math.floor((due.getTime() - planDate.getTime()) / 86_400_000);
  const time = fmtTime(due);
  const label =
    dayDelta <= 0
      ? lang === 'ar' ? 'اليوم' : 'today'
      : dayDelta === 1
        ? lang === 'ar' ? 'غداً' : 'tomorrow'
        : lang === 'ar' ? `بعد ${arabicDays(dayDelta)}` : `in ${dayDelta} days`;
  return `${label} ${time}`;
}

export function fmtNum(value: number, digits = 0): string {
  return value.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

/**
 * Volumes, at a precision that never lies. A hair dryer is 0.004 m³, and at the
 * fixed two decimals this used to use it rendered as "0.00" — which reads as
 * missing data rather than as a small box. Anything that would round away to
 * zero gets the decimals it needs to stay a number.
 */
export function fmtCube(value: number): string {
  if (value === 0) return '0';
  return fmtNum(value, value < 0.01 ? 3 : 2);
}

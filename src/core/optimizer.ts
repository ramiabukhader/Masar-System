import type { TravelTimeProvider } from './travel';
import type {
  DeliveryPlan,
  Driver,
  LoadLine,
  Node,
  PlanMetrics,
  PlannedStop,
  Route,
  RouteMetrics,
  Shipment,
  SolverLogEntry,
  UnassignedShipment,
  Vehicle,
} from './types';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export interface PlannerConfig {
  /** Length of the arrival window promised to the customer, in minutes. */
  windowLengthMinutes: number;
  /** Planned arrival must beat dueAt by at least this, to absorb the day's variance. */
  slaBufferMinutes: number;
  /** Overtime a driver may be asked to work beyond shift end, in minutes. */
  maxOvertimeMinutes: number;
  overtimeCostPerHour: number;
  /**
   * Cost of leaving a shipment unplanned. Must dominate any routing saving, or the
   * solver will "optimise" by simply not delivering the expensive stops.
   */
  unassignedPenalty: number;
  /** Local-search passes over the full neighbourhood. */
  improvementPasses: number;
  /** Wall-clock ceiling for the whole solve. */
  timeBudgetMs: number;
}

export const DEFAULT_CONFIG: PlannerConfig = {
  windowLengthMinutes: 180,
  slaBufferMinutes: 60,
  maxOvertimeMinutes: 60,
  overtimeCostPerHour: 45,
  unassignedPenalty: 100_000,
  improvementPasses: 30,
  timeBudgetMs: 4_000,
};

export interface PlannerInput {
  waveName: string;
  /** Local midnight of the delivery day. All internal times are minutes from here. */
  planDate: Date;
  shipments: Shipment[];
  vehicles: Vehicle[];
  drivers: Driver[];
  nodes: Map<string, Node>;
  travel: TravelTimeProvider;
  config?: Partial<PlannerConfig>;
}

// ---------------------------------------------------------------------------
// Time helpers — the solver works in minutes-from-plan-midnight
// ---------------------------------------------------------------------------

const MS_PER_MIN = 60_000;

function toMinutes(planDate: Date, at: Date): number {
  return (at.getTime() - planDate.getTime()) / MS_PER_MIN;
}

function toDate(planDate: Date, minutes: number): Date {
  return new Date(planDate.getTime() + minutes * MS_PER_MIN);
}

const round15 = (minutes: number) => Math.floor(minutes / 15) * 15;

// ---------------------------------------------------------------------------
// Route evaluation
// ---------------------------------------------------------------------------

interface Assignment {
  vehicle: Vehicle;
  driver: Driver;
  originNode: Node;
}

interface StopTiming {
  shipmentId: string;
  arriveMin: number;
  departMin: number;
  waitMinutes: number;
  travelKm: number;
  travelMinutes: number;
}

interface RouteEvaluation {
  timings: StopTiming[];
  startMin: number;
  endMin: number;
  distanceKm: number;
  driveMinutes: number;
  serviceMinutes: number;
  waitMinutes: number;
  loadM3: number;
  loadKg: number;
  transferCost: number;
  cost: number;
}

type EvalResult =
  | { ok: true; value: RouteEvaluation }
  | { ok: false; reason: string; detail: string };

/**
 * Hard-constraint screen. Runs before the timeline simulation because it is cheap and
 * rejects most infeasible combinations outright.
 *
 * Zone eligibility is checked here rather than being priced as a penalty: a vehicle that
 * may not enter a zone cannot serve a stop there at any cost (docs/03 §4).
 */
function screenHardConstraints(
  assignment: Assignment,
  shipments: Shipment[],
): { ok: true } | { ok: false; reason: string; detail: string } {
  const { vehicle, driver, originNode } = assignment;

  let cube = 0;
  let weight = 0;

  for (const shipment of shipments) {
    cube += shipment.totalCubeM3;
    weight += shipment.totalWeightKg;

    if (!vehicle.eligibleZones.includes(shipment.zone)) {
      return {
        ok: false,
        reason: 'zone_ineligible_vehicle',
        detail: `${vehicle.plate} is not eligible for zone ${shipment.zone}`,
      };
    }
    if (!driver.eligibleZones.includes(shipment.zone)) {
      return {
        ok: false,
        reason: 'zone_ineligible_driver',
        detail: `${driver.name} is not eligible for zone ${shipment.zone}`,
      };
    }
    if (shipment.requiresCrew > vehicle.crewSize) {
      return {
        ok: false,
        reason: 'crew_too_small',
        detail: `${shipment.id} needs ${shipment.requiresCrew} crew, vehicle carries ${vehicle.crewSize}`,
      };
    }
    if (shipment.units.some((u) => u.productClass === 'A') && !vehicle.canCarryClassA) {
      return {
        ok: false,
        reason: 'vehicle_cannot_carry_class_a',
        detail: `${vehicle.plate} cannot carry major appliances`,
      };
    }
    for (const skill of shipment.requiresSkills) {
      if (!driver.skills.includes(skill)) {
        return {
          ok: false,
          reason: 'missing_install_skill',
          detail: `${driver.name} lacks ${skill} for ${shipment.id}`,
        };
      }
    }
    if (!shipment.stagingOptions.some((option) => option.nodeId === originNode.id)) {
      return {
        ok: false,
        reason: 'not_stageable_at_origin',
        detail: `${shipment.id} cannot be loaded at ${originNode.nameEn}`,
      };
    }
  }

  if (cube > vehicle.capacityM3) {
    return {
      ok: false,
      reason: 'over_cube',
      detail: `${cube.toFixed(2)} m3 exceeds ${vehicle.capacityM3} m3`,
    };
  }
  if (weight > vehicle.capacityKg) {
    return {
      ok: false,
      reason: 'over_weight',
      detail: `${weight.toFixed(0)} kg exceeds ${vehicle.capacityKg} kg`,
    };
  }

  return { ok: true };
}

/**
 * Simulates the route minute by minute against a time-dependent travel model, and prices
 * it. Every arc is queried with its actual departure time, so a route that only works at
 * 06:00 is correctly rejected when it would depart at 08:00.
 */
export function evaluateRoute(
  assignment: Assignment,
  shipments: Shipment[],
  planDate: Date,
  travel: TravelTimeProvider,
  config: PlannerConfig,
): EvalResult {
  if (shipments.length === 0) {
    return {
      ok: true,
      value: {
        timings: [],
        startMin: assignment.driver.shiftStartMin,
        endMin: assignment.driver.shiftStartMin,
        distanceKm: 0,
        driveMinutes: 0,
        serviceMinutes: 0,
        waitMinutes: 0,
        loadM3: 0,
        loadKg: 0,
        transferCost: 0,
        cost: 0,
      },
    };
  }

  const screen = screenHardConstraints(assignment, shipments);
  if (!screen.ok) return screen;

  const { vehicle, driver, originNode } = assignment;

  // The route cannot depart before every shipment on it is physically staged at the
  // origin. A cross-dock transfer that lands at 06:00 gates the whole truck.
  let startMin = driver.shiftStartMin;
  let transferCost = 0;
  for (const shipment of shipments) {
    const option = shipment.stagingOptions.find((o) => o.nodeId === originNode.id)!;
    const readyMin = toMinutes(planDate, option.readyAt);
    if (readyMin > startMin) startMin = readyMin;
    transferCost += option.transferCost;
  }

  let cursor = startMin;
  let position = { location: originNode.location, zone: originNode.zone };
  let distanceKm = 0;
  let driveMinutes = 0;
  let serviceMinutes = 0;
  let waitMinutes = 0;
  let loadM3 = 0;
  let loadKg = 0;
  const timings: StopTiming[] = [];

  for (const shipment of shipments) {
    const destination = { location: shipment.destination, zone: shipment.zone };
    const leg = travel.leg(position, destination, toDate(planDate, cursor));

    if (!Number.isFinite(leg.minutes)) {
      return {
        ok: false,
        reason: 'route_blocked',
        detail: `No available crossing to ${shipment.zone} at this time`,
      };
    }

    let arrive = cursor + leg.minutes;
    let wait = 0;

    if (shipment.window) {
      const earliest = toMinutes(planDate, shipment.window.earliest);
      const latest = toMinutes(planDate, shipment.window.latest);
      if (arrive < earliest) {
        wait = earliest - arrive;
        arrive = earliest;
      }
      if (arrive > latest) {
        return {
          ok: false,
          reason: 'window_violated',
          detail: `${shipment.id} arrival ${fmt(arrive)} after window close ${fmt(latest)}`,
        };
      }
    }

    const dueMin = toMinutes(planDate, shipment.dueAt);
    if (arrive > dueMin - config.slaBufferMinutes) {
      return {
        ok: false,
        reason: 'sla_breach',
        detail: `${shipment.id} arrival ${fmt(arrive)} misses ${fmt(dueMin)} SLA (buffer ${config.slaBufferMinutes}m)`,
      };
    }

    const depart = arrive + shipment.serviceMinutes;

    timings.push({
      shipmentId: shipment.id,
      arriveMin: arrive,
      departMin: depart,
      waitMinutes: wait,
      travelKm: leg.km,
      travelMinutes: leg.minutes,
    });

    distanceKm += leg.km;
    driveMinutes += leg.minutes;
    waitMinutes += wait;
    serviceMinutes += shipment.serviceMinutes;
    loadM3 += shipment.totalCubeM3;
    loadKg += shipment.totalWeightKg;

    cursor = depart;
    position = destination;
  }

  // The vehicle has to come back. Ignoring the return leg understates every route.
  const returnLeg = travel.leg(
    position,
    { location: originNode.location, zone: originNode.zone },
    toDate(planDate, cursor),
  );
  if (!Number.isFinite(returnLeg.minutes)) {
    return { ok: false, reason: 'route_blocked', detail: 'No return path to origin' };
  }

  distanceKm += returnLeg.km;
  driveMinutes += returnLeg.minutes;
  const endMin = cursor + returnLeg.minutes;

  const overtime = Math.max(0, endMin - driver.shiftEndMin);
  if (overtime > config.maxOvertimeMinutes) {
    return {
      ok: false,
      reason: 'shift_exceeded',
      detail: `Route ends ${fmt(endMin)}, shift ends ${fmt(driver.shiftEndMin)} (+${config.maxOvertimeMinutes}m allowed)`,
    };
  }

  const totalMinutes = endMin - startMin;
  const cost =
    vehicle.fixedCost +
    vehicle.costPerKm * distanceKm +
    vehicle.costPerHour * (totalMinutes / 60) +
    config.overtimeCostPerHour * (overtime / 60) +
    transferCost;

  return {
    ok: true,
    value: {
      timings,
      startMin,
      endMin,
      distanceKm,
      driveMinutes,
      serviceMinutes,
      waitMinutes,
      loadM3,
      loadKg,
      transferCost,
      cost,
    },
  };
}

function fmt(minutes: number): string {
  const m = ((Math.round(minutes) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// Working state
// ---------------------------------------------------------------------------

interface WorkingRoute {
  id: string;
  assignment: Assignment;
  shipments: Shipment[];
  evaluation: RouteEvaluation;
}

interface InsertionCandidate {
  routeId: string;
  position: number;
  deltaCost: number;
}

export { fmt as formatMinutes };

// ---------------------------------------------------------------------------
// The solver
// ---------------------------------------------------------------------------

export class WavePlanner {
  private readonly config: PlannerConfig;
  private readonly log: SolverLogEntry[] = [];
  private readonly startedAt = Date.now();

  private routes: WorkingRoute[] = [];
  private unassigned: UnassignedShipment[] = [];
  /** Vehicles not yet put on the road, cheapest-to-run first. */
  private idleAssignments: Assignment[] = [];

  constructor(private readonly input: PlannerInput) {
    this.config = { ...DEFAULT_CONFIG, ...input.config };
  }

  plan(): DeliveryPlan {
    this.buildAssignmentPool();
    this.construct();
    this.improve();
    return this.finalise();
  }

  // -- setup ----------------------------------------------------------------

  /**
   * Pair every vehicle with a driver. A vehicle without an eligible, skilled driver is
   * not a resource — it is a parked truck, and the plan must know that up front.
   */
  private buildAssignmentPool(): void {
    const usedDrivers = new Set<string>();
    const pool: Assignment[] = [];

    for (const vehicle of this.input.vehicles) {
      const originNode = this.input.nodes.get(vehicle.homeNodeId);
      if (!originNode) continue;

      const driver =
        this.input.drivers.find(
          (d) =>
            !usedDrivers.has(d.id) &&
            d.defaultVehicleId === vehicle.id &&
            vehicle.eligibleZones.some((z) => d.eligibleZones.includes(z)),
        ) ??
        this.input.drivers.find(
          (d) =>
            !usedDrivers.has(d.id) &&
            vehicle.eligibleZones.some((z) => d.eligibleZones.includes(z)),
        );

      if (!driver) continue;
      usedDrivers.add(driver.id);
      pool.push({ vehicle, driver, originNode });
    }

    // Cheapest vehicles are opened first, so consolidation prefers the small van over
    // the 3-ton truck whenever the load allows it.
    pool.sort((a, b) => a.vehicle.fixedCost - b.vehicle.fixedCost);
    this.idleAssignments = pool;

    this.trace('setup', `${pool.length} vehicle/driver pairs available`);
  }

  // -- construction ---------------------------------------------------------

  /**
   * Regret-2 insertion. Plain greedy insertion is myopic: it happily fills the easy
   * stops first and strands the awkward ones (tight SLA, remote locality, single
   * eligible vehicle) with nowhere left to go. Regret asks instead "which shipment will
   * hurt most if I do not place it now?" and places that one.
   */
  private construct(): void {
    const pending = [...this.input.shipments].sort(
      (a, b) => a.dueAt.getTime() - b.dueAt.getTime() || b.totalCubeM3 - a.totalCubeM3,
    );

    const cache = new Map<string, { best: InsertionCandidate | null; regret: number }>();
    let dirtyAll = true;
    let dirtyRoute: string | null = null;

    while (pending.length > 0) {
      if (Date.now() - this.startedAt > this.config.timeBudgetMs) {
        this.trace('construct', `time budget reached, ${pending.length} shipment(s) unplaced`);
        break;
      }

      for (const shipment of pending) {
        const cached = cache.get(shipment.id);
        const stale =
          dirtyAll ||
          !cached ||
          cached.best === null ||
          cached.best.routeId === dirtyRoute;
        if (!stale) continue;
        cache.set(shipment.id, this.scoreInsertions(shipment));
      }
      dirtyAll = false;
      dirtyRoute = null;

      // Pick the shipment with the most to lose, among those we can still place.
      let chosenIndex = -1;
      let chosenRegret = -Infinity;
      for (let i = 0; i < pending.length; i++) {
        const scored = cache.get(pending[i].id)!;
        if (!scored.best) continue;
        if (scored.regret > chosenRegret) {
          chosenRegret = scored.regret;
          chosenIndex = i;
        }
      }

      if (chosenIndex === -1) {
        // Nothing left can be placed on the road as it stands. Try opening vehicles.
        const opened = this.openNewRoute(pending);
        if (opened) {
          dirtyAll = true;
          continue;
        }
        for (const shipment of pending) {
          this.unassigned.push(this.explainUnassignable(shipment));
        }
        break;
      }

      const [shipment] = pending.splice(chosenIndex, 1);
      const candidate = cache.get(shipment.id)!.best!;
      this.applyInsertion(candidate, shipment);
      cache.delete(shipment.id);
      dirtyRoute = candidate.routeId;
    }

    this.trace(
      'construct',
      `${this.routes.length} routes, cost ${this.routeCost().toFixed(0)}` +
        (this.unassigned.length ? ` (+${this.unassigned.length} unplaced)` : ''),
      this.routeCost(),
    );
  }

  /** Best and second-best insertion cost for one shipment across all open routes. */
  private scoreInsertions(shipment: Shipment): { best: InsertionCandidate | null; regret: number } {
    let best: InsertionCandidate | null = null;
    let second = Number.POSITIVE_INFINITY;

    for (const route of this.routes) {
      const found = this.bestInsertionInRoute(route, shipment);
      if (!found) continue;
      if (!best || found.deltaCost < best.deltaCost) {
        if (best) second = best.deltaCost;
        best = found;
      } else if (found.deltaCost < second) {
        second = found.deltaCost;
      }
    }

    // With only one feasible route the regret is effectively infinite — that shipment
    // must be placed now or it will be stranded.
    const regret = best ? (Number.isFinite(second) ? second - best.deltaCost : this.config.unassignedPenalty) : 0;
    return { best, regret };
  }

  private bestInsertionInRoute(route: WorkingRoute, shipment: Shipment): InsertionCandidate | null {
    const baseline = route.evaluation.cost;
    let best: InsertionCandidate | null = null;

    for (let position = 0; position <= route.shipments.length; position++) {
      const sequence = [...route.shipments];
      sequence.splice(position, 0, shipment);
      const result = this.evaluate(route.assignment, sequence);
      if (!result.ok) continue;
      const deltaCost = result.value.cost - baseline;
      if (!best || deltaCost < best.deltaCost) {
        best = { routeId: route.id, position, deltaCost };
      }
    }

    return best;
  }

  /**
   * Put another vehicle on the road, seeded with whichever pending shipment it can
   * actually serve. Returns false when no idle vehicle can take anything — which is the
   * honest signal that the fleet, not the algorithm, is the binding constraint.
   */
  private openNewRoute(pending: Shipment[]): boolean {
    for (let i = 0; i < this.idleAssignments.length; i++) {
      const assignment = this.idleAssignments[i];
      const seed = pending.find((shipment) => this.evaluate(assignment, [shipment]).ok);
      if (!seed) continue;

      const evaluation = this.evaluate(assignment, [seed]);
      if (!evaluation.ok) continue;

      this.idleAssignments.splice(i, 1);
      const route: WorkingRoute = {
        id: `RT-${this.routes.length + 1}`,
        assignment,
        shipments: [seed],
        evaluation: evaluation.value,
      };
      this.routes.push(route);
      pending.splice(pending.indexOf(seed), 1);
      this.trace('construct', `opened ${route.id} on ${assignment.vehicle.plate} from ${assignment.originNode.nameEn}`);
      return true;
    }
    return false;
  }

  private applyInsertion(candidate: InsertionCandidate, shipment: Shipment): void {
    const route = this.routes.find((r) => r.id === candidate.routeId)!;
    route.shipments.splice(candidate.position, 0, shipment);
    const result = this.evaluate(route.assignment, route.shipments);
    if (!result.ok) throw new Error(`Insertion produced an infeasible route: ${result.detail}`);
    route.evaluation = result.value;
  }

  /** Turns "could not plan it" into a reason a human can act on. */
  private explainUnassignable(shipment: Shipment): UnassignedShipment {
    const reasons = new Map<string, string>();
    const pool = [...this.routes.map((r) => r.assignment), ...this.idleAssignments];

    for (const assignment of pool) {
      const result = this.evaluate(assignment, [shipment]);
      if (result.ok) {
        return {
          shipmentId: shipment.id,
          reason: 'no_capacity_left',
          detail: 'Serviceable in principle, but every eligible vehicle is already full or out of hours. Fleet capacity is the constraint.',
        };
      }
      reasons.set(result.reason, result.detail);
    }

    const [reason, detail] = [...reasons.entries()][0] ?? [
      'no_eligible_vehicle',
      'No vehicle/driver pair can serve this stop',
    ];
    return { shipmentId: shipment.id, reason, detail };
  }

  // -- local search ---------------------------------------------------------

  /**
   * Improvement phase. Construction gets a feasible plan; this is where the cost
   * actually comes down. Three neighbourhoods, applied until nothing improves or the
   * time budget runs out.
   */
  private improve(): void {
    let pass = 0;
    let improvedTotal = 0;
    const costBefore = this.routeCost();

    while (pass < this.config.improvementPasses) {
      if (Date.now() - this.startedAt > this.config.timeBudgetMs) {
        this.trace('improve', `time budget reached after ${pass} pass(es)`);
        break;
      }
      pass++;
      let improvedThisPass = 0;

      improvedThisPass += this.intraRouteReorder();
      improvedThisPass += this.relocateBetweenRoutes();
      improvedThisPass += this.swapBetweenRoutes();
      improvedThisPass += this.eliminateRoutes();

      improvedTotal += improvedThisPass;
      if (improvedThisPass === 0) break;
    }

    // A route emptied by relocation is a vehicle we no longer pay for.
    const emptied = this.routes.filter((r) => r.shipments.length === 0);
    for (const route of emptied) {
      this.idleAssignments.push(route.assignment);
    }
    this.routes = this.routes.filter((r) => r.shipments.length > 0);

    const costAfter = this.routeCost();
    this.trace(
      'improve',
      `${pass} pass(es), ${improvedTotal} improving move(s), cost ${costBefore.toFixed(0)} -> ${costAfter.toFixed(0)} (${(((costBefore - costAfter) / Math.max(costBefore, 1)) * 100).toFixed(1)}% saved)`,
      costAfter,
    );
  }

  /** Or-opt (move a segment of 1-3 stops) and 2-opt (reverse a segment), within a route. */
  private intraRouteReorder(): number {
    let improvements = 0;

    for (const route of this.routes) {
      let improved = true;
      while (improved) {
        improved = false;
        const n = route.shipments.length;
        if (n < 3) break;

        for (let segLength = 1; segLength <= 3 && !improved; segLength++) {
          for (let from = 0; from + segLength <= n && !improved; from++) {
            for (let to = 0; to <= n - segLength && !improved; to++) {
              if (to === from) continue;
              const sequence = [...route.shipments];
              const segment = sequence.splice(from, segLength);
              sequence.splice(to, 0, ...segment);
              if (this.tryReplace(route, sequence)) improved = true;
            }
          }
        }

        for (let i = 0; i < route.shipments.length - 1 && !improved; i++) {
          for (let j = i + 2; j <= route.shipments.length && !improved; j++) {
            const sequence = [...route.shipments];
            const segment = sequence.slice(i, j).reverse();
            sequence.splice(i, j - i, ...segment);
            if (this.tryReplace(route, sequence)) improved = true;
          }
        }

        if (improved) improvements++;
      }
    }

    return improvements;
  }

  /** Move one stop from any route to its best position in any other route. */
  private relocateBetweenRoutes(): number {
    let improvements = 0;

    for (const source of this.routes) {
      for (let index = source.shipments.length - 1; index >= 0; index--) {
        const shipment = source.shipments[index];
        const remainder = source.shipments.filter((_, i) => i !== index);
        const withoutResult = this.evaluate(source.assignment, remainder);
        if (!withoutResult.ok) continue;

        const saving = source.evaluation.cost - withoutResult.value.cost;

        let best: { route: WorkingRoute; sequence: Shipment[]; delta: number } | null = null;
        for (const target of this.routes) {
          if (target.id === source.id) continue;
          const candidate = this.bestInsertionInRoute(target, shipment);
          if (!candidate) continue;
          if (!best || candidate.deltaCost < best.delta) {
            const sequence = [...target.shipments];
            sequence.splice(candidate.position, 0, shipment);
            best = { route: target, sequence, delta: candidate.deltaCost };
          }
        }

        if (best && best.delta < saving - 1e-6) {
          const targetResult = this.evaluate(best.route.assignment, best.sequence);
          if (!targetResult.ok) continue;
          source.shipments = remainder;
          source.evaluation = withoutResult.value;
          best.route.shipments = best.sequence;
          best.route.evaluation = targetResult.value;
          improvements++;
        }
      }
    }

    return improvements;
  }

  /** Exchange a pair of stops between two routes. Escapes local optima relocate cannot. */
  private swapBetweenRoutes(): number {
    let improvements = 0;

    for (let a = 0; a < this.routes.length; a++) {
      for (let b = a + 1; b < this.routes.length; b++) {
        const routeA = this.routes[a];
        const routeB = this.routes[b];

        for (let i = 0; i < routeA.shipments.length; i++) {
          for (let j = 0; j < routeB.shipments.length; j++) {
            const before = routeA.evaluation.cost + routeB.evaluation.cost;

            const sequenceA = [...routeA.shipments];
            const sequenceB = [...routeB.shipments];
            const shipmentA = sequenceA[i];
            const shipmentB = sequenceB[j];
            sequenceA[i] = shipmentB;
            sequenceB[j] = shipmentA;

            const resultA = this.evaluate(routeA.assignment, sequenceA);
            if (!resultA.ok) continue;
            const resultB = this.evaluate(routeB.assignment, sequenceB);
            if (!resultB.ok) continue;

            if (resultA.value.cost + resultB.value.cost < before - 1e-6) {
              routeA.shipments = sequenceA;
              routeA.evaluation = resultA.value;
              routeB.shipments = sequenceB;
              routeB.evaluation = resultB.value;
              improvements++;
            }
          }
        }
      }
    }

    return improvements;
  }

  /**
   * Route elimination. Single-stop relocation will not by itself close a route, because
   * moving any one stop out of a lightly-loaded van looks like a loss until the LAST one
   * leaves and the vehicle's fixed cost disappears. This move evaluates emptying a whole
   * route at once, which is where the fleet-size saving actually comes from.
   */
  private eliminateRoutes(): number {
    let improvements = 0;
    const candidates = [...this.routes].sort((a, b) => a.shipments.length - b.shipments.length);

    for (const victim of candidates) {
      if (victim.shipments.length === 0) continue;
      const others = this.routes.filter((r) => r.id !== victim.id && r.shipments.length > 0);
      if (others.length === 0) continue;

      // Work on trial copies so a partial failure never corrupts the live plan.
      const trial = new Map(
        others.map((route) => [route.id, { sequence: [...route.shipments], evaluation: route.evaluation }]),
      );

      let addedCost = 0;
      let allPlaced = true;

      for (const shipment of victim.shipments) {
        let best: { routeId: string; sequence: Shipment[]; evaluation: RouteEvaluation; delta: number } | null = null;

        for (const other of others) {
          const state = trial.get(other.id)!;
          for (let position = 0; position <= state.sequence.length; position++) {
            const candidate = [...state.sequence];
            candidate.splice(position, 0, shipment);
            const result = this.evaluate(other.assignment, candidate);
            if (!result.ok) continue;
            const delta = result.value.cost - state.evaluation.cost;
            if (!best || delta < best.delta) {
              best = { routeId: other.id, sequence: candidate, evaluation: result.value, delta };
            }
          }
        }

        if (!best) {
          allPlaced = false;
          break;
        }
        trial.set(best.routeId, { sequence: best.sequence, evaluation: best.evaluation });
        addedCost += best.delta;
      }

      if (!allPlaced || addedCost >= victim.evaluation.cost - 1e-6) continue;

      for (const other of others) {
        const state = trial.get(other.id)!;
        other.shipments = state.sequence;
        other.evaluation = state.evaluation;
      }
      const emptied = this.evaluate(victim.assignment, []);
      if (emptied.ok) victim.evaluation = emptied.value;
      victim.shipments = [];
      improvements++;
    }

    return improvements;
  }

  private tryReplace(route: WorkingRoute, sequence: Shipment[]): boolean {
    const result = this.evaluate(route.assignment, sequence);
    if (!result.ok) return false;
    if (result.value.cost >= route.evaluation.cost - 1e-6) return false;
    route.shipments = sequence;
    route.evaluation = result.value;
    return true;
  }

  private evaluate(assignment: Assignment, shipments: Shipment[]): EvalResult {
    return evaluateRoute(assignment, shipments, this.input.planDate, this.input.travel, this.config);
  }

  /** Routing cost only. What the day actually costs to drive. */
  private routeCost(): number {
    return this.routes.reduce((sum, route) => sum + route.evaluation.cost, 0);
  }

  /**
   * Objective value: routing cost plus the penalty for anything left unplanned. The
   * penalty has to dominate any routing saving, or "optimising" would mean quietly
   * refusing to deliver the expensive stops.
   */
  private totalCost(): number {
    return this.routeCost() + this.unassigned.length * this.config.unassignedPenalty;
  }

  private trace(phase: string, message: string, cost?: number): void {
    this.log.push({ phase, message, cost, elapsedMs: Date.now() - this.startedAt });
  }

  // -- output ---------------------------------------------------------------

  private finalise(): DeliveryPlan {
    const { planDate } = this.input;
    const routes: Route[] = this.routes.map((working) => {
      const { assignment, evaluation } = working;

      const stops: PlannedStop[] = working.shipments.map((shipment, index) => {
        const timing = evaluation.timings[index];
        const dueMin = toMinutes(planDate, shipment.dueAt);
        const window = this.promisedWindow(timing.arriveMin, dueMin, assignment);

        return {
          seq: index + 1,
          shipmentId: shipment.id,
          arriveAt: toDate(planDate, timing.arriveMin),
          departAt: toDate(planDate, timing.departMin),
          waitMinutes: Math.round(timing.waitMinutes),
          travelKmFromPrev: Number(timing.travelKm.toFixed(2)),
          travelMinutesFromPrev: Math.round(timing.travelMinutes),
          serviceMinutes: shipment.serviceMinutes,
          promisedWindow: {
            earliest: toDate(planDate, window.earliest),
            latest: toDate(planDate, window.latest),
          },
          slackMinutes: Math.round(dueMin - timing.arriveMin),
          status: 'planned',
        };
      });

      const totalMinutes = evaluation.endMin - evaluation.startMin;
      const metrics: RouteMetrics = {
        distanceKm: Number(evaluation.distanceKm.toFixed(1)),
        driveMinutes: Math.round(evaluation.driveMinutes),
        serviceMinutes: Math.round(evaluation.serviceMinutes),
        waitMinutes: Math.round(evaluation.waitMinutes),
        totalMinutes: Math.round(totalMinutes),
        loadM3: Number(evaluation.loadM3.toFixed(2)),
        loadKg: Math.round(evaluation.loadKg),
        cubeUtilisation: Number((evaluation.loadM3 / assignment.vehicle.capacityM3).toFixed(3)),
        weightUtilisation: Number((evaluation.loadKg / assignment.vehicle.capacityKg).toFixed(3)),
        cost: Number(evaluation.cost.toFixed(2)),
        costPerDrop: Number((evaluation.cost / Math.max(working.shipments.length, 1)).toFixed(2)),
        stopCount: working.shipments.length,
      };

      return {
        id: working.id,
        vehicleId: assignment.vehicle.id,
        driverId: assignment.driver.id,
        originNodeId: assignment.originNode.id,
        startAt: toDate(planDate, evaluation.startMin),
        endAt: toDate(planDate, evaluation.endMin),
        stops,
        loadPlan: buildLoadPlan(working.shipments),
        metrics,
      };
    });

    const assignedCount = routes.reduce((sum, route) => sum + route.stops.length, 0);
    const totalCost = routes.reduce((sum, route) => sum + route.metrics.cost, 0);
    const totalDistanceKm = routes.reduce((sum, route) => sum + route.metrics.distanceKm, 0);
    const slaAtRiskCount = routes.reduce(
      (sum, route) => sum + route.stops.filter((stop) => stop.slackMinutes < 90).length,
      0,
    );

    const metrics: PlanMetrics = {
      routeCount: routes.length,
      shipmentCount: this.input.shipments.length,
      assignedCount,
      unassignedCount: this.unassigned.length,
      totalDistanceKm: Number(totalDistanceKm.toFixed(1)),
      totalCost: Number(totalCost.toFixed(2)),
      costPerDrop: Number((totalCost / Math.max(assignedCount, 1)).toFixed(2)),
      avgCubeUtilisation: routes.length
        ? Number(
            (routes.reduce((sum, r) => sum + r.metrics.cubeUtilisation, 0) / routes.length).toFixed(3),
          )
        : 0,
      totalDriveMinutes: routes.reduce((sum, route) => sum + route.metrics.driveMinutes, 0),
      totalServiceMinutes: routes.reduce((sum, route) => sum + route.metrics.serviceMinutes, 0),
      slaAtRiskCount,
    };

    this.trace(
      'finalise',
      `${routes.length} routes, ${assignedCount} drops, ${this.unassigned.length} unassigned` +
        ` — objective ${this.totalCost().toFixed(0)}`,
    );

    return {
      id: `PLAN-${planDate.toISOString().slice(0, 10)}-${this.input.waveName}`,
      waveName: this.input.waveName,
      generatedAt: new Date(),
      routes,
      unassigned: this.unassigned,
      metrics,
      solverLog: this.log,
    };
  }

  /**
   * The window the customer is actually told. It sits around the planned arrival with
   * more slack after than before — arriving early to a closed door helps nobody, and the
   * day's variance runs late far more often than it runs early.
   */
  private promisedWindow(
    arriveMin: number,
    dueMin: number,
    assignment: Assignment,
  ): { earliest: number; latest: number } {
    const length = this.config.windowLengthMinutes;
    let earliest = round15(arriveMin - length / 3);
    let latest = earliest + length;

    if (latest > dueMin) {
      latest = round15(dueMin);
      earliest = latest - length;
    }
    if (earliest < assignment.driver.shiftStartMin) {
      earliest = assignment.driver.shiftStartMin;
      latest = earliest + length;
    }
    return { earliest, latest };
  }
}

// ---------------------------------------------------------------------------
// Load planning
// ---------------------------------------------------------------------------

/**
 * Loading manifest in LIFO order: the LAST stop is loaded FIRST, so every drop is at the
 * rear door when the crew opens it. Without this the crew unloads half the truck at each
 * stop, which is where both the lost time and most of the damage come from.
 *
 * Fragile, non-stackable goods (Pyrex, Luminarc, Cristal d'Arques) go on the top shelf
 * regardless of sequence — never underneath a refrigerator.
 */
export function buildLoadPlan(deliverySequence: Shipment[]): LoadLine[] {
  const lines: LoadLine[] = [];
  let loadSeq = 1;

  for (let i = deliverySequence.length - 1; i >= 0; i--) {
    const shipment = deliverySequence[i];
    const deliverySeq = i + 1;

    // Heavy and stackable first onto the floor, fragile last onto the shelf.
    const ordered = [...shipment.units].sort((a, b) => {
      if (a.fragile !== b.fragile) return a.fragile ? 1 : -1;
      return b.cubeM3 - a.cubeM3;
    });

    for (const unit of ordered) {
      const positionRatio = (loadSeq - 1) / Math.max(deliverySequence.length, 1);
      const zoneInVehicle: LoadLine['zoneInVehicle'] =
        unit.fragile && !unit.stackable
          ? 'top_shelf'
          : positionRatio < 0.34
            ? 'floor_front'
            : positionRatio < 0.67
              ? 'floor_mid'
              : 'floor_rear';

      lines.push({
        loadSeq: loadSeq++,
        shipmentId: shipment.id,
        deliverySeq,
        sku: unit.sku,
        quantity: unit.quantity,
        cubeM3: Number(unit.cubeM3.toFixed(3)),
        fragile: unit.fragile,
        productClass: unit.productClass,
        zoneInVehicle,
      });
    }
  }

  return lines;
}

/** Convenience entry point. */
export function planWave(input: PlannerInput): DeliveryPlan {
  return new WavePlanner(input).plan();
}

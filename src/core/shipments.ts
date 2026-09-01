import type {
  AccessSurvey,
  Customer,
  InstallType,
  InventoryRecord,
  Locality,
  Node,
  Order,
  Product,
  Shipment,
  ShipmentUnit,
  StagingOption,
} from './types';

/** Park, find the apartment, greet, paperwork. Incurred once per stop regardless of load. */
const STOP_OVERHEAD_MIN = 6;
/** Per floor, per major appliance, carried by hand. */
const STAIR_MIN_PER_FLOOR_CLASS_A = 4;
/** Per floor when a working elevator takes the appliance. */
const ELEVATOR_MIN_PER_FLOOR = 0.5;
const NARROW_STAIRS_MULTIPLIER = 1.5;
const DIFFICULT_PARKING_MIN = 5;
/** Counting cash or completing instalment paperwork at the door. */
const PAYMENT_MIN = 3;
/** Assumed when access was never surveyed — optimistic assumptions hide real risk. */
const UNSURVEYED_ASSUMED_FLOOR = 2;

export interface ShipmentBuildInput {
  orders: Order[];
  customers: Map<string, Customer>;
  products: Map<string, Product>;
  inventory: InventoryRecord[];
  nodes: Map<string, Node>;
  /** Gazetteer — supplies the destination zone, which drives vehicle eligibility. */
  localities: Map<string, Locality>;
  /** Corridor hubs shipments can be transferred to overnight for consolidation. */
  hubNodeIds: string[];
  /** When the overnight inter-branch shuttle lands at a hub. */
  shuttleArrival: Date;
  /** Cost of moving one m³ onto the shuttle to a hub. */
  transferCostPerM3: number;
  /** Below this geocode confidence an order is held for human confirmation. */
  geocodeGate: number;
}

export interface ShipmentBuildResult {
  shipments: Shipment[];
  /** Orders that failed a data-quality gate and must never reach a truck (docs/04 §5). */
  held: { orderId: string; reason: string; detail: string }[];
}

/**
 * Floor/stair time for the major appliances in a shipment. This is the part of service
 * time that a naive planner ignores entirely and that routinely doubles a stop.
 */
export function accessMinutes(access: AccessSurvey, classAUnits: number): number {
  if (classAUnits === 0) return access.parkingDifficult ? DIFFICULT_PARKING_MIN : 0;

  // Nothing on an unsurveyed record is a fact — not the floor, and not the lift. Reading
  // `hasElevator` off a survey nobody took priced the carry at 0.5 min/floor instead of
  // 4, making an address we know nothing about CHEAPER than one we have been to. That is
  // the inversion `surveyed` exists to prevent: "planned as a risk, not as a fact".
  const floor = access.surveyed ? access.floor : UNSURVEYED_ASSUMED_FLOOR;
  const usableElevator = access.surveyed && access.hasElevator && access.elevatorFitsAppliance;

  let perFloor = usableElevator ? ELEVATOR_MIN_PER_FLOOR : STAIR_MIN_PER_FLOOR_CLASS_A;
  // An unsurveyed stairwell is not a known-wide one either, so it carries the same
  // penalty rather than being quietly assumed clear.
  if (!usableElevator && (access.narrowStairs || !access.surveyed)) {
    perFloor *= NARROW_STAIRS_MULTIPLIER;
  }

  const carry = floor * perFloor * classAUnits;
  return carry + (access.parkingDifficult ? DIFFICULT_PARKING_MIN : 0);
}

/**
 * Minutes at the door. Handling + installation + access + payment.
 * Getting this wrong is why plans collapse before midday (docs/01 §5).
 */
export function serviceMinutesFor(
  units: ShipmentUnit[],
  products: Map<string, Product>,
  access: AccessSurvey,
  needsPaymentAtDoor: boolean,
): number {
  let handling = 0;
  let install = 0;
  let classAUnits = 0;

  for (const unit of units) {
    const product = products.get(unit.sku);
    if (!product) continue;
    handling += product.handlingMinutes * unit.quantity;
    if (product.installType !== 'none') {
      // Installing two identical appliances is not twice the work of one, but it is
      // not the same either — the second gets a reduced rate.
      install += product.installMinutes + product.installMinutes * 0.6 * (unit.quantity - 1);
    }
    if (product.productClass === 'A') classAUnits += unit.quantity;
  }

  return (
    STOP_OVERHEAD_MIN +
    handling +
    install +
    accessMinutes(access, classAUnits) +
    (needsPaymentAtDoor ? PAYMENT_MIN : 0)
  );
}

function stockNodesFor(
  lines: { sku: string; quantity: number }[],
  inventory: InventoryRecord[],
): string[] {
  // Nodes that can cover every line of the order on their own. Preferring a single
  // node keeps the order as one shipment, which is always cheaper than splitting it.
  const byNode = new Map<string, Map<string, number>>();
  for (const record of inventory) {
    if (!byNode.has(record.nodeId)) byNode.set(record.nodeId, new Map());
    byNode.get(record.nodeId)!.set(record.sku, record.quantityOnHand);
  }
  const complete: string[] = [];
  for (const [nodeId, stock] of byNode) {
    if (lines.every((line) => (stock.get(line.sku) ?? 0) >= line.quantity)) {
      complete.push(nodeId);
    }
  }
  return complete;
}

/**
 * Orders -> shipments. This is where a commerce record ("1 x Samsung RT38") becomes a
 * delivery record ("0.98 m3, 74 kg, 2-crew, plumbing install, non-stackable").
 */
export function buildShipments(input: ShipmentBuildInput): ShipmentBuildResult {
  const shipments: Shipment[] = [];
  const held: ShipmentBuildResult['held'] = [];

  for (const order of input.orders) {
    const customer = input.customers.get(order.customerId);
    if (!customer) {
      held.push({ orderId: order.id, reason: 'customer_missing', detail: order.customerId });
      continue;
    }

    // --- Data-quality gates: these keep bad data off the truck ------------------
    if (customer.geocodeConfidence < input.geocodeGate) {
      held.push({
        orderId: order.id,
        reason: 'address_unresolved',
        detail: `Geocode confidence ${customer.geocodeConfidence.toFixed(2)} below gate ${input.geocodeGate}. Needs human confirmation.`,
      });
      continue;
    }
    if (order.paymentType === 'bank_instalment' && !order.paymentCleared) {
      held.push({
        orderId: order.id,
        reason: 'payment_not_cleared',
        detail: 'Bank instalment paperwork incomplete — the crew could not release the goods.',
      });
      continue;
    }

    const units: ShipmentUnit[] = [];
    let missingProduct: string | null = null;

    for (const line of order.lines) {
      const product = input.products.get(line.sku);
      if (!product) {
        missingProduct = line.sku;
        break;
      }
      units.push({
        sku: product.sku,
        quantity: line.quantity,
        cubeM3: product.cubeM3 * line.quantity,
        weightKg: product.weightKg * line.quantity,
        fragile: product.fragile,
        stackable: product.stackable,
        productClass: product.productClass,
        installType: product.installType,
      });
    }

    if (missingProduct) {
      held.push({ orderId: order.id, reason: 'product_missing', detail: missingProduct });
      continue;
    }

    const totalCubeM3 = units.reduce((sum, u) => sum + u.cubeM3, 0);
    const totalWeightKg = units.reduce((sum, u) => sum + u.weightKg, 0);

    const requiresCrew: 1 | 2 = units.some(
      (u) => (input.products.get(u.sku)?.crewRequired ?? 1) === 2,
    )
      ? 2
      : 1;

    const requiresSkills = [
      ...new Set(units.map((u) => u.installType).filter((t): t is InstallType => t !== 'none')),
    ];

    // --- Staging: where can this be loaded from, and when is it ready there? ----
    const stockNodes = stockNodesFor(order.lines, input.inventory);
    const sourceNodes = stockNodes.length > 0 ? stockNodes : [order.originBranchId];

    const stagingOptions: StagingOption[] = sourceNodes.map((nodeId) => ({
      nodeId,
      readyAt: order.confirmedAt,
      transferCost: 0,
    }));

    // A shipment can also ride the overnight shuttle to a corridor hub, which is what
    // makes cross-branch consolidation possible. The transfer costs money and delays
    // readiness, so the optimiser only takes it when the route saving is larger.
    for (const hubId of input.hubNodeIds) {
      if (stagingOptions.some((option) => option.nodeId === hubId)) continue;
      stagingOptions.push({
        nodeId: hubId,
        readyAt: input.shuttleArrival,
        transferCost: totalCubeM3 * input.transferCostPerM3,
      });
    }

    const needsPaymentAtDoor = order.paymentType !== 'card';

    shipments.push({
      id: `SHP-${order.id}`,
      orderId: order.id,
      customerId: customer.id,
      sellingBranchId: order.originBranchId,
      destination: customer.location,
      localityId: customer.localityId,
      // The DESTINATION zone, not the selling branch's. This is what vehicle and driver
      // eligibility is checked against, so getting it from the wrong end would let the
      // optimiser plan a stop no assigned vehicle can legally reach.
      zone: input.localities.get(customer.localityId)?.zone ?? 'central',
      units,
      totalCubeM3,
      totalWeightKg,
      dueAt: order.dueAt,
      serviceMinutes: Math.round(
        serviceMinutesFor(units, input.products, customer.access, needsPaymentAtDoor),
      ),
      requiresCrew,
      requiresSkills,
      containsFragile: units.some((u) => u.fragile),
      stagingOptions,
      paymentType: order.paymentType,
      amountDue: order.amountDue,
      priority: order.dueAt.getTime(),
    });
  }

  return { shipments, held };
}

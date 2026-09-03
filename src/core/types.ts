/**
 * Masar — canonical domain model.
 *
 * Deliberately NOT a mirror of the retailer's commerce schema. This is the model a
 * delivery network needs; the OrderSource adapter translates from theirs into this.
 * See docs/04-data-model-and-db-integration.md.
 */

// ---------------------------------------------------------------------------
// Geography
// ---------------------------------------------------------------------------

/**
 * Access-regime partition of the network. This is not a marketing region — it is the
 * unit at which vehicle and driver eligibility is granted, which is how Jerusalem
 * access is enforced structurally rather than by anyone remembering a rule.
 */
export type Zone = 'north' | 'central' | 'south' | 'jerusalem' | 'jordan_valley';

export const ZONES: Zone[] = ['north', 'central', 'south', 'jerusalem', 'jordan_valley'];

export interface LatLng {
  lat: number;
  lng: number;
}

/** Gazetteer entry. Free-text addresses from the showroom floor normalise onto these. */
export interface Locality {
  id: string;
  nameAr: string;
  nameEn: string;
  governorate: string;
  zone: Zone;
  location: LatLng;
}

/** A physical network node: branch showroom, distribution centre, or corridor hub. */
export interface Node {
  id: string;
  nameAr: string;
  nameEn: string;
  kind: 'branch' | 'dc' | 'hub';
  zone: Zone;
  location: LatLng;
  localityId: string;
  /** Can trucks be loaded here, or is it street-front only? Drives staging feasibility. */
  hasDock: boolean;
  /** Holds delivery stock, vs showroom-only. */
  holdsStock: boolean;
}

// ---------------------------------------------------------------------------
// Product & handling
// ---------------------------------------------------------------------------

/**
 * A = major appliances / white goods, B = small domestic appliances,
 * C = kitchenware / glassware / gifts. See docs/01 §2 — these three behave so
 * differently in a delivery network that they should not share one process.
 */
export type ProductClass = 'A' | 'B' | 'C';

export type InstallType = 'none' | 'plumbing' | 'gas' | 'electrical' | 'mount';

export interface Product {
  sku: string;
  nameAr: string;
  nameEn: string;
  brand: string;
  category: string;
  productClass: ProductClass;
  /** Packaged volume. The binding constraint on a truck — not weight, and never order count. */
  cubeM3: number;
  weightKg: number;
  fragile: boolean;
  /** Can other items be stacked on top of it during loading? */
  stackable: boolean;
  installType: InstallType;
  /** People required at the door to handle it safely. */
  crewRequired: 1 | 2;
  /** Minutes to carry in and position, excluding installation. */
  handlingMinutes: number;
  /** Minutes for installation + functional test, when installType !== 'none'. */
  installMinutes: number;
  /** True when cube/weight were derived from a category default rather than measured. */
  dimensionsEstimated: boolean;
}

// ---------------------------------------------------------------------------
// Commerce
// ---------------------------------------------------------------------------

export type SalesChannel = 'showroom' | 'web' | 'phone' | 'whatsapp';

export type PaymentType = 'cash' | 'card' | 'bank_instalment';

/**
 * Captured by the salesperson at point of sale. Missing access data is the single
 * most expensive data gap in the network: the crew arrives and the fridge does not fit.
 */
export interface AccessSurvey {
  floor: number;
  hasElevator: boolean;
  /** Elevator big enough for a boxed major appliance? Meaningless when hasElevator is false. */
  elevatorFitsAppliance: boolean;
  narrowStairs: boolean;
  parkingDifficult: boolean;
  /** False when the survey was never taken — planned as a risk, not as a fact. */
  surveyed: boolean;
}

export interface Customer {
  id: string;
  name: string;
  nameAr: string;
  phone: string;
  localityId: string;
  /** Free-text as captured, retained for the driver even after normalisation. */
  addressLine: string;
  addressLineAr: string;
  location: LatLng;
  /** 0..1 geocode confidence. Below the gate threshold the order cannot be planned. */
  geocodeConfidence: number;
  access: AccessSurvey;
}

export interface OrderLine {
  sku: string;
  quantity: number;
}

export interface Order {
  id: string;
  customerId: string;
  channel: SalesChannel;
  /** Branch that made the sale — not necessarily the branch that fulfils it. */
  originBranchId: string;
  confirmedAt: Date;
  /** confirmedAt + SLA hours, adjusted for calendar. Hard deadline in the optimiser. */
  dueAt: Date;
  paymentType: PaymentType;
  amountDue: number;
  /** Bank instalment paperwork complete. False => held from planning (docs/04 §5). */
  paymentCleared: boolean;
  lines: OrderLine[];
}

export interface InventoryRecord {
  sku: string;
  nodeId: string;
  quantityOnHand: number;
}

// ---------------------------------------------------------------------------
// Delivery domain
// ---------------------------------------------------------------------------

export interface ShipmentUnit {
  sku: string;
  quantity: number;
  cubeM3: number;
  weightKg: number;
  fragile: boolean;
  stackable: boolean;
  productClass: ProductClass;
  installType: InstallType;
}

/** A node the shipment can be loaded from, and the time it is ready there. */
export interface StagingOption {
  nodeId: string;
  /** Stock is at this node from this time — a transfer leg pushes it later. */
  readyAt: Date;
  /** Cost of getting it here (0 when it is already in stock at this node). */
  transferCost: number;
}

export type TimeWindow = { earliest: Date; latest: Date };

/**
 * The planning unit. One order becomes one shipment unless sourcing has to split it.
 */
export interface Shipment {
  id: string;
  orderId: string;
  customerId: string;
  /** Branch that made the sale. Used only for the current-state baseline comparison. */
  sellingBranchId: string;
  destination: LatLng;
  localityId: string;
  zone: Zone;
  units: ShipmentUnit[];
  totalCubeM3: number;
  totalWeightKg: number;
  /** Hard SLA deadline: arrival must be <= dueAt. */
  dueAt: Date;
  /** Customer-agreed window, once confirmed. Hard constraint when present. */
  window?: TimeWindow;
  /** Minutes at the door: handling + install + floor penalty. Dominates the route. */
  serviceMinutes: number;
  requiresCrew: 1 | 2;
  requiresSkills: InstallType[];
  containsFragile: boolean;
  stagingOptions: StagingOption[];
  paymentType: PaymentType;
  amountDue: number;
  priority: number;
}

export type VehicleType = 'truck_3t' | 'van_large' | 'van_small' | 'pickup';

export interface Vehicle {
  id: string;
  plate: string;
  type: VehicleType;
  /** Usable cargo cube — internal box volume derated for stacking reality. */
  capacityM3: number;
  capacityKg: number;
  /** People on board. A 2-crew item cannot ride a 1-crew vehicle. */
  crewSize: 1 | 2;
  /** Hard feasibility. A stop outside these zones is unassignable to this vehicle. */
  eligibleZones: Zone[];
  homeNodeId: string;
  costPerKm: number;
  costPerHour: number;
  /** Cost of putting the vehicle on the road at all — drives consolidation. */
  fixedCost: number;
  canCarryClassA: boolean;
}

export interface Driver {
  id: string;
  name: string;
  nameAr: string;
  skills: InstallType[];
  eligibleZones: Zone[];
  /** Minutes from midnight, local. */
  shiftStartMin: number;
  shiftEndMin: number;
  defaultVehicleId?: string;
}

export type StopStatus =
  | 'planned'
  | 'en_route'
  | 'arrived'
  | 'delivered'
  | 'partial'
  | 'failed';

export interface PlannedStop {
  seq: number;
  shipmentId: string;
  arriveAt: Date;
  departAt: Date;
  /** Wait when the crew arrives before the window opens — pure waste, minimised. */
  waitMinutes: number;
  travelKmFromPrev: number;
  travelMinutesFromPrev: number;
  serviceMinutes: number;
  /** Committed window shown to the customer. */
  promisedWindow: TimeWindow;
  slackMinutes: number;
  status: StopStatus;
}

/**
 * One line of the loading manifest. Sequence is REVERSE delivery order (LIFO): the
 * last stop loads first, so nothing is unloaded twice and fragile never sits underneath.
 */
export interface LoadLine {
  loadSeq: number;
  shipmentId: string;
  deliverySeq: number;
  sku: string;
  quantity: number;
  cubeM3: number;
  fragile: boolean;
  productClass: ProductClass;
  /** Where in the box it goes, derived from stackability and fragility. */
  zoneInVehicle: 'floor_rear' | 'floor_mid' | 'floor_front' | 'top_shelf';
}

export interface RouteMetrics {
  distanceKm: number;
  driveMinutes: number;
  serviceMinutes: number;
  waitMinutes: number;
  totalMinutes: number;
  loadM3: number;
  loadKg: number;
  cubeUtilisation: number;
  weightUtilisation: number;
  cost: number;
  costPerDrop: number;
  stopCount: number;
}

export interface Route {
  id: string;
  vehicleId: string;
  driverId: string;
  originNodeId: string;
  startAt: Date;
  endAt: Date;
  stops: PlannedStop[];
  loadPlan: LoadLine[];
  metrics: RouteMetrics;
}

export interface UnassignedShipment {
  shipmentId: string;
  reason: string;
  detail: string;
}

export interface PlanMetrics {
  routeCount: number;
  shipmentCount: number;
  assignedCount: number;
  unassignedCount: number;
  totalDistanceKm: number;
  totalCost: number;
  costPerDrop: number;
  avgCubeUtilisation: number;
  totalDriveMinutes: number;
  totalServiceMinutes: number;
  slaAtRiskCount: number;
}

export interface DeliveryPlan {
  id: string;
  waveName: string;
  generatedAt: Date;
  routes: Route[];
  unassigned: UnassignedShipment[];
  metrics: PlanMetrics;
  /** How long the solver ran and what it improved — shown in the Control Tower. */
  solverLog: SolverLogEntry[];
}

export type SolverPhase = 'setup' | 'construct' | 'improve' | 'finalise';

/**
 * A trace line carries a stable code and its numbers, never a prose sentence.
 * The solver has no business deciding what language the control tower speaks,
 * and this screen is read in Arabic; the wording lives in the UI's own strings.
 */
export interface SolverLogEntry {
  phase: SolverPhase;
  code: string;
  params: Record<string, string | number>;
  cost?: number;
  elapsedMs: number;
}

// ---------------------------------------------------------------------------
// Exceptions & proof
// ---------------------------------------------------------------------------

export type ExceptionCode =
  | 'customer_absent'
  | 'customer_refused'
  | 'address_wrong'
  | 'access_blocked'
  | 'does_not_fit'
  | 'damaged_in_transit'
  | 'payment_not_ready'
  | 'install_not_possible'
  | 'route_blocked'
  | 'vehicle_breakdown'
  | 'out_of_time';

export interface ProofOfDelivery {
  shipmentId: string;
  deliveredAt: Date;
  receivedByName: string;
  signatureDataUrl?: string;
  photoCount: number;
  functionalTestPassed: boolean;
  itemOutcomes: { sku: string; outcome: 'accepted' | 'damaged' | 'refused' }[];
  amountCollected: number;
  exceptionCode?: ExceptionCode;
  note?: string;
}

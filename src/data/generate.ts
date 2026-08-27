import { CLASS_A_SKUS, CLASS_B_SKUS, CLASS_C_SKUS, PRODUCTS } from './catalog';
import { LOCALITIES, NODES } from './gazetteer';
import { haversineKm } from '../core/geo';
import type {
  AccessSurvey,
  Customer,
  InventoryRecord,
  Order,
  OrderLine,
  PaymentType,
  SalesChannel,
} from '../core/types';

/** Deterministic PRNG so every run of the demo produces the identical wave. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Demand weights, loosely proportional to population and retail catchment. Hebron and
 * Nablus are the largest markets; Jericho is small; Jerusalem sits behind its own access
 * regime and is deliberately modest.
 */
const LOCALITY_WEIGHTS: Record<string, number> = {
  'LOC-HEB': 14, 'LOC-NAB': 12, 'LOC-RAM': 9, 'LOC-BIR': 7, 'LOC-JEN': 8,
  'LOC-TUL': 6, 'LOC-BET': 5, 'LOC-YTA': 5, 'LOC-DUR': 4, 'LOC-QLQ': 4,
  'LOC-HLH': 3, 'LOC-BSH': 3, 'LOC-BJL': 3, 'LOC-BTN': 3, 'LOC-BZT': 2,
  'LOC-QAB': 3, 'LOC-TBS': 2, 'LOC-ANB': 2, 'LOC-AZN': 2, 'LOC-HWR': 2,
  'LOC-BEI': 2, 'LOC-SLF': 2, 'LOC-JMN': 2, 'LOC-SLW': 2, 'LOC-NLN': 2,
  'LOC-BNM': 2, 'LOC-TRQ': 2, 'LOC-RAMM': 2, 'LOC-JRC': 3, 'LOC-AUJ': 1,
  'LOC-JRS': 4, 'LOC-BTH': 3, 'LOC-ABD': 2, 'LOC-EIZ': 2,
};

// Paired index-for-index so a customer's Arabic and English names are the same person.
const FIRST_NAMES = ['Mohammed', 'Ahmad', 'Layla', 'Sara', 'Khalil', 'Nour', 'Hussein', 'Rana', 'Bassam', 'Dina', 'Jamal', 'Hanan', 'Wael', 'Maha', 'Ibrahim', 'Salma', 'Ziad', 'Rula', 'Adel', 'Iman'];
const FIRST_NAMES_AR = ['محمد', 'أحمد', 'ليلى', 'سارة', 'خليل', 'نور', 'حسين', 'رنا', 'بسام', 'دينا', 'جمال', 'حنان', 'وائل', 'مها', 'إبراهيم', 'سلمى', 'زياد', 'رولا', 'عادل', 'إيمان'];
const FAMILY_NAMES = ['Barghouti', 'Masri', 'Qawasmi', 'Tamimi', 'Nazzal', 'Shaheen', 'Abu Snineh', 'Hamdan', 'Sabri', 'Kanaan', 'Zaghal', 'Dweik', 'Rjoub', 'Sawalha', 'Amleh', 'Hijazi'];
const FAMILY_NAMES_AR = ['البرغوثي', 'المصري', 'القواسمي', 'التميمي', 'نزال', 'شاهين', 'أبو سنينة', 'حمدان', 'صبري', 'كنعان', 'زغل', 'الدويك', 'الرجوب', 'صوالحة', 'عاملة', 'حجازي'];
const STREET_HINTS = ['Main Street', 'near the municipality', 'behind the school', 'Al-Quds Street', 'near the mosque', 'industrial area', 'above the pharmacy', 'Old Town', 'Al-Nahda neighbourhood', 'near the clinic'];
const STREET_HINTS_AR = ['الشارع الرئيسي', 'قرب البلدية', 'خلف المدرسة', 'شارع القدس', 'قرب المسجد', 'المنطقة الصناعية', 'فوق الصيدلية', 'البلدة القديمة', 'حي النهضة', 'قرب العيادة'];

function weightedPick<T extends string>(rng: () => number, weights: Record<T, number>): T {
  const entries = Object.entries(weights) as [T, number][];
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let roll = rng() * total;
  for (const [key, weight] of entries) {
    roll -= weight;
    if (roll <= 0) return key;
  }
  return entries[entries.length - 1][0];
}

function pick<T>(rng: () => number, items: T[]): T {
  return items[Math.floor(rng() * items.length)];
}

function pickIndex(rng: () => number, length: number): number {
  return Math.floor(rng() * length);
}

/** Scatter a point a few hundred metres so stops in one town are not coincident. */
function jitter(rng: () => number, value: number, spread: number): number {
  return value + (rng() - 0.5) * spread;
}

export interface GeneratedData {
  orders: Order[];
  customers: Customer[];
  inventory: InventoryRecord[];
}

export interface GenerateOptions {
  /** Local midnight of the delivery day. */
  planDate: Date;
  orderCount?: number;
  seed?: number;
  slaHours?: number;
}

export function generateWaveData(options: GenerateOptions): GeneratedData {
  const { planDate, orderCount = 78, seed = 20260827, slaHours = 48 } = options;
  const rng = mulberry32(seed);

  const localityMap = new Map(LOCALITIES.map((l) => [l.id, l]));
  const branches = NODES.filter((n) => n.kind === 'branch');
  const branchIds = branches.map((n) => n.id);

  /** Customers mostly buy at the showroom nearest them — but not always. */
  const nearestBranchTo = (localityId: string): string => {
    const locality = localityMap.get(localityId)!;
    let best = branches[0];
    let bestKm = Number.POSITIVE_INFINITY;
    for (const branch of branches) {
      const km = haversineKm(locality.location, branch.location);
      if (km < bestKm) {
        bestKm = km;
        best = branch;
      }
    }
    return best.id;
  };

  const customers: Customer[] = [];
  const orders: Order[] = [];

  for (let i = 0; i < orderCount; i++) {
    const localityId = weightedPick(rng, LOCALITY_WEIGHTS);
    const locality = localityMap.get(localityId)!;

    const channel: SalesChannel =
      rng() < 0.6 ? 'showroom' : rng() < 0.55 ? 'web' : rng() < 0.55 ? 'phone' : 'whatsapp';

    // Showroom addresses are dictated verbally and are the dirtiest input in the system;
    // web orders come with a picked locality and geocode far better.
    const geocodeConfidence =
      channel === 'showroom'
        ? 0.52 + rng() * 0.46
        : channel === 'web'
          ? 0.82 + rng() * 0.18
          : 0.6 + rng() * 0.38;

    const surveyed = rng() < 0.65;
    const hasElevator = rng() < 0.42;
    const access: AccessSurvey = {
      floor: Math.floor(rng() * 5),
      hasElevator,
      elevatorFitsAppliance: hasElevator && rng() < 0.7,
      narrowStairs: rng() < 0.3,
      parkingDifficult: rng() < 0.28,
      surveyed,
    };

    const firstIndex = pickIndex(rng, FIRST_NAMES.length);
    const familyIndex = pickIndex(rng, FAMILY_NAMES.length);
    const hintIndex = pickIndex(rng, STREET_HINTS.length);
    const building = Math.floor(1 + rng() * 40);

    const customer: Customer = {
      id: `CUST-${String(i + 1).padStart(4, '0')}`,
      name: `${FIRST_NAMES[firstIndex]} ${FAMILY_NAMES[familyIndex]}`,
      nameAr: `${FIRST_NAMES_AR[firstIndex]} ${FAMILY_NAMES_AR[familyIndex]}`,
      phone: `+9705${Math.floor(10_000_000 + rng() * 89_999_999)}`,
      localityId,
      addressLine: `${locality.nameEn}, ${STREET_HINTS[hintIndex]}, building ${building}`,
      addressLineAr: `${locality.nameAr}، ${STREET_HINTS_AR[hintIndex]}، بناية ${building}`,
      location: {
        lat: jitter(rng, locality.location.lat, 0.018),
        lng: jitter(rng, locality.location.lng, 0.018),
      },
      geocodeConfidence: Number(geocodeConfidence.toFixed(2)),
      access,
    };
    customers.push(customer);

    // --- basket -----------------------------------------------------------
    const basketRoll = rng();
    const lines: OrderLine[] = [];

    if (basketRoll < 0.55) {
      // Major appliance sale, sometimes with a small item attached.
      lines.push({ sku: pick(rng, CLASS_A_SKUS), quantity: 1 });
      if (rng() < 0.28) lines.push({ sku: pick(rng, CLASS_A_SKUS), quantity: 1 });
      if (rng() < 0.3) lines.push({ sku: pick(rng, CLASS_B_SKUS), quantity: 1 });
      if (rng() < 0.18) lines.push({ sku: pick(rng, CLASS_C_SKUS), quantity: 1 });
    } else if (basketRoll < 0.82) {
      lines.push({ sku: pick(rng, CLASS_B_SKUS), quantity: 1 + Math.floor(rng() * 2) });
      if (rng() < 0.4) lines.push({ sku: pick(rng, CLASS_B_SKUS), quantity: 1 });
      if (rng() < 0.3) lines.push({ sku: pick(rng, CLASS_C_SKUS), quantity: 1 });
    } else {
      lines.push({ sku: pick(rng, CLASS_C_SKUS), quantity: 1 + Math.floor(rng() * 3) });
      if (rng() < 0.5) lines.push({ sku: pick(rng, CLASS_C_SKUS), quantity: 1 });
    }

    // Deduplicate SKUs so quantities stay coherent.
    const merged = new Map<string, number>();
    for (const line of lines) merged.set(line.sku, (merged.get(line.sku) ?? 0) + line.quantity);
    const finalLines = [...merged].map(([sku, quantity]) => ({ sku, quantity }));

    // --- timing -----------------------------------------------------------
    // dueAt is spread across the delivery day and the morning after; confirmedAt is
    // simply dueAt minus the SLA, which is how their promise actually works.
    const dueOffsetHours = 11 + rng() * 15;
    const dueAt = new Date(planDate.getTime() + dueOffsetHours * 3_600_000);
    const confirmedAt = new Date(dueAt.getTime() - slaHours * 3_600_000);

    const paymentRoll = rng();
    const paymentType: PaymentType =
      paymentRoll < 0.45 ? 'cash' : paymentRoll < 0.65 ? 'card' : 'bank_instalment';

    const amountDue =
      paymentType === 'card'
        ? 0
        : Math.round(
            finalLines.reduce((sum, line) => {
              const product = PRODUCTS.find((p) => p.sku === line.sku)!;
              const unitPrice = product.productClass === 'A' ? 900 + product.cubeM3 * 2200 : product.productClass === 'B' ? 180 : 90;
              return sum + unitPrice * line.quantity;
            }, 0),
          );

    orders.push({
      id: `ORD-${String(70_000 + i)}`,
      customerId: customer.id,
      channel,
      // Roughly three quarters of sales happen at the customer's nearest showroom; the
      // rest are cross-branch, which is exactly the traffic that branch-siloed dispatch
      // handles badly.
      originBranchId: rng() < 0.75 ? nearestBranchTo(localityId) : pick(rng, branchIds),
      confirmedAt,
      dueAt,
      paymentType,
      amountDue,
      // A minority of instalment files are still incomplete at planning time. Those
      // orders must be held, not dispatched — see docs/04 §5.
      paymentCleared: paymentType !== 'bank_instalment' || rng() < 0.88,
      lines: finalLines,
    });
  }

  return { orders, customers, inventory: buildInventory() };
}

/**
 * Stock positions. The DC carries the full range; branches carry a subset, which is what
 * makes cross-dock consolidation necessary rather than optional.
 */
function buildInventory(): InventoryRecord[] {
  const records: InventoryRecord[] = [];
  const rng = mulberry32(99);

  for (const product of PRODUCTS) {
    records.push({ sku: product.sku, nodeId: 'DC-CENTRAL', quantityOnHand: 60 });
    for (const node of NODES) {
      if (node.kind !== 'branch') continue;
      // Bigger branches hold more of the range; small showrooms hold display stock only.
      const depth = ['BR-NAB', 'BR-HEB'].includes(node.id) ? 0.8 : 0.45;
      if (rng() < depth) {
        records.push({ sku: product.sku, nodeId: node.id, quantityOnHand: 1 + Math.floor(rng() * 6) });
      }
    }
  }

  return records;
}

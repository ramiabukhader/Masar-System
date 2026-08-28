import type { ProductClass, Zone } from '../core/types';

/**
 * Delivery service tiers. What the business can promise, to whom, and what each promise
 * actually costs to keep.
 *
 * The `status` field is the strategic content of this screen: `active` tiers are ones the
 * network can hold today; `planned` tiers list the operational prerequisites that must be
 * true before switching them on. Same-day sits in `planned` deliberately — running express
 * on a network that has not yet fixed failed attempts and truck fill multiplies cost
 * instead of reducing it (docs/02 §1).
 */
export interface ServiceTier {
  id: string;
  nameAr: string;
  nameEn: string;
  taglineAr: string;
  taglineEn: string;
  status: 'active' | 'pilot' | 'planned';
  /** Hours from order confirmation to the delivery deadline. */
  slaHours: number;
  /** Length of the arrival window promised to the customer; 0 = no window, deadline only. */
  windowMinutes: number;
  /** Charged to the customer, in ILS. Zero is the current promise. */
  customerPrice: number;
  /** Indicative internal cost to serve one drop on this tier, in ILS. */
  costToServe: number;
  eligibility: {
    classes: ProductClass[];
    zones: Zone[] | 'all';
    maxCubeM3?: number;
    installIncluded: boolean;
  };
  requiresAr: string[];
  requiresEn: string[];
}

export const SERVICE_TIERS: ServiceTier[] = [
  {
    id: 'standard_48',
    nameAr: 'التوصيل القياسي',
    nameEn: 'Standard delivery',
    taglineAr: 'خلال ٤٨ ساعة، مجاناً، مع التركيب — الوعد الحالي كما هو',
    taglineEn: 'Within 48 hours, free, with installation — the current promise, unchanged',
    status: 'active',
    slaHours: 48,
    windowMinutes: 0,
    customerPrice: 0,
    costToServe: 206,
    eligibility: { classes: ['A', 'B', 'C'], zones: 'all', installIncluded: true },
    requiresAr: ['لا شيء — هذا ما يعمل به اليوم'],
    requiresEn: ['Nothing — this is how it works today'],
  },
  {
    id: 'scheduled_window',
    nameAr: 'نافذة وصول مؤكدة',
    nameEn: 'Confirmed arrival window',
    taglineAr: 'نفس الـ٤٨ ساعة، لكن مع موعد من ٣ ساعات يؤكده الزبون قبل يوم',
    taglineEn: 'The same 48 hours, but with a three-hour slot the customer confirms the day before',
    status: 'pilot',
    slaHours: 48,
    windowMinutes: 180,
    customerPrice: 0,
    costToServe: 123,
    eligibility: { classes: ['A', 'B', 'C'], zones: 'all', installIncluded: true },
    requiresAr: [
      'إرسال رسائل SMS أو واتساب للزبائن',
      'رقم جوال صحيح لكل طلب',
      'مركز اتصال يتابع من لم يردّ',
    ],
    requiresEn: [
      'SMS or WhatsApp messaging to customers',
      'A valid mobile number on every order',
      'A call centre that follows up non-responders',
    ],
  },
  {
    id: 'parcel',
    nameAr: 'شحن الطرود',
    nameEn: 'Parcel delivery',
    taglineAr: 'الأصناف الصغيرة بلا تركيب — عبر مركبة صغيرة أو شركة شحن، بأقل كلفة للتوصيلة',
    taglineEn: 'Small items with no installation — small van or a courier, at the lowest cost per drop',
    status: 'planned',
    slaHours: 72,
    windowMinutes: 0,
    customerPrice: 0,
    costToServe: 38,
    eligibility: { classes: ['B', 'C'], zones: 'all', maxCubeM3: 0.08, installIncluded: false },
    requiresAr: [
      'فصل تدفق الطرود عن تدفق الأجهزة الكبيرة',
      'اتفاقية مع شركة شحن، أو تخصيص مركبات صغيرة',
      'قواعد تصنيف المنتجات (فئة ب و ج فقط)',
    ],
    requiresEn: [
      'Splitting the parcel flow from the heavy-appliance flow',
      'A courier agreement, or dedicated small vans',
      'Product classification rules (Class B and C only)',
    ],
  },
  {
    id: 'install_plus',
    nameAr: 'تركيب متقدم',
    nameEn: 'Advanced installation',
    taglineAr: 'غاز، مكيفات سبليت، شفاطات — طاقم معتمد وموعد مخصص',
    taglineEn: 'Gas, split AC, extractor hoods — certified crew and a dedicated appointment',
    status: 'active',
    slaHours: 72,
    windowMinutes: 180,
    customerPrice: 0,
    costToServe: 268,
    eligibility: { classes: ['A'], zones: 'all', installIncluded: true },
    requiresAr: [
      'اعتماد الطاقم للغاز والتبريد',
      'التحقق من جاهزية الموقع عند البيع',
    ],
    requiresEn: [
      'Gas and refrigeration certification on the crew',
      'Site-readiness check taken at the point of sale',
    ],
  },
  {
    id: 'same_day',
    nameAr: 'التوصيل في نفس اليوم',
    nameEn: 'Same-day delivery',
    taglineAr: 'غير مفعّل — يُفعَّل بعد أن تصبح الشبكة كفؤة بما يكفي لحمله',
    taglineEn: 'Not enabled — switched on once the network is efficient enough to carry it',
    status: 'planned',
    slaHours: 8,
    windowMinutes: 120,
    customerPrice: 45,
    costToServe: 310,
    eligibility: {
      classes: ['A', 'B', 'C'],
      zones: ['central', 'north', 'south'],
      installIncluded: true,
      maxCubeM3: 2,
    },
    requiresAr: [
      'نسبة نجاح من المحاولة الأولى ٩٥٪ فأكثر',
      'تعبئة المركبات ٧٥٪ فأكثر',
      'موجة تخطيط ثانية خلال اليوم',
      'مخزون متاح في نقطة قريبة من الزبون',
      'تسعير صريح — لا يمكن أن يكون مجانياً',
    ],
    requiresEn: [
      'First-attempt success at 95% or better',
      'Vehicle cube fill at 75% or better',
      'A second planning wave during the day',
      'Stock held close to the customer',
      'An explicit price — this one cannot be free',
    ],
  },
];

export const TIER_MAP = new Map(SERVICE_TIERS.map((t) => [t.id, t]));

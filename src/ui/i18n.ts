export type Lang = 'ar' | 'en';

type Dict = Record<string, { ar: string; en: string }>;

/**
 * Arabic first, English second — everywhere. The people who use this system every day
 * work in Arabic, and a driver app that is "Arabic-capable" rather than Arabic-native is
 * a driver app that gets ignored.
 */
export const STRINGS: Dict = {
  appName: { ar: 'مسار', en: 'Masar' },
  appTagline: { ar: 'نظام إدارة وتحسين التوصيل — مسلماني هوم', en: 'Delivery orchestration & optimisation — Maslamani Home' },
  demoNotice: { ar: 'نسخة تجريبية ببيانات محاكاة', en: 'Demo build on simulated data' },

  navTower: { ar: 'غرفة التحكم', en: 'Control Tower' },
  navBranch: { ar: 'عمليات الفرع', en: 'Branch Ops' },
  navDriver: { ar: 'تطبيق السائق', en: 'Driver App' },
  navProcess: { ar: 'دليل العمليات', en: 'Process Guide' },

  // KPI
  kpiCostPerDrop: { ar: 'كلفة التوصيلة', en: 'Cost per drop' },
  kpiRoutes: { ar: 'عدد الرحلات', en: 'Routes' },
  kpiDistance: { ar: 'إجمالي المسافة', en: 'Total distance' },
  kpiDrops: { ar: 'عدد التوصيلات', en: 'Drops planned' },
  kpiFill: { ar: 'نسبة تعبئة المركبات', en: 'Vehicle cube fill' },
  kpiSlaRisk: { ar: 'توصيلات معرّضة للتأخير', en: 'SLA at risk' },
  kpiDriveTime: { ar: 'ساعات القيادة', en: 'Drive hours' },
  kpiServiceTime: { ar: 'ساعات التركيب والتسليم', en: 'Service hours' },
  kpiUnassigned: { ar: 'غير مجدولة', en: 'Unassigned' },
  kpiHeld: { ar: 'موقوفة قبل التحميل', en: 'Held at data gate' },

  before: { ar: 'الوضع الحالي (نموذج)', en: 'Current state (modelled)' },
  after: { ar: 'بعد التحسين', en: 'Optimised' },
  saving: { ar: 'التوفير', en: 'Saving' },
  baselineCaveat: {
    ar: 'المقارنة مبنية على نموذج للوضع الحالي (توزيع من كل فرع على حدة، بدون دمج أو تخطيط حجمي). الأرقام الحقيقية تُقاس من بياناتهم في المرحلة الأولى.',
    en: 'Comparison against a modelled current state (branch-siloed dispatch, no consolidation, no cube planning). The real baseline is measured from their own data in Phase 1.',
  },

  // Sections
  planTitle: { ar: 'خطة الموجة', en: 'Wave plan' },
  routes: { ar: 'الرحلات', en: 'Routes' },
  networkMap: { ar: 'خريطة الشبكة', en: 'Network map' },
  disruptions: { ar: 'محاكاة الاضطرابات', en: 'Disruption simulator' },
  exceptions: { ar: 'الاستثناءات', en: 'Exceptions' },
  solverLog: { ar: 'سجل المحرّك', en: 'Solver log' },

  closeJerusalem: { ar: 'إغلاق معابر القدس', en: 'Close Jerusalem crossings' },
  slowNorth: { ar: 'ازدحام شديد شمالاً', en: 'Heavy delay — north corridor' },
  truckDown: { ar: 'تعطل شاحنة (T-4471)', en: 'Truck breakdown (T-4471)' },
  replan: { ar: 'إعادة التخطيط', en: 'Re-plan' },
  replanning: { ar: 'جارٍ إعادة التخطيط…', en: 'Re-planning…' },
  disruptionHint: {
    ar: 'الإغلاقات وتعطل المركبات مُدخلات أساسية في النظام وليست مكالمة هاتفية لمدير العمليات. غيّر أي مفتاح لترى الخطة تُعاد خلال ثوانٍ.',
    en: 'Closures and breakdowns are first-class planning inputs, not a phone call to the ops manager. Toggle any switch and watch the plan rebuild in seconds.',
  },

  // Route detail
  vehicle: { ar: 'المركبة', en: 'Vehicle' },
  driver: { ar: 'السائق', en: 'Driver' },
  origin: { ar: 'نقطة التحميل', en: 'Loading point' },
  stops: { ar: 'المحطات', en: 'Stops' },
  load: { ar: 'الحمولة', en: 'Load' },
  cost: { ar: 'الكلفة', en: 'Cost' },
  window: { ar: 'نافذة الوصول', en: 'Arrival window' },
  eta: { ar: 'الوصول المتوقع', en: 'Planned arrival' },
  slack: { ar: 'هامش الأمان', en: 'Slack to SLA' },
  service: { ar: 'مدة التسليم', en: 'Service' },
  travel: { ar: 'الانتقال', en: 'Travel' },
  crossing: { ar: 'وقت المعبر', en: 'Crossing time' },

  // Branch ops
  pickList: { ar: 'قائمة التجهيز', en: 'Pick list' },
  loadManifest: { ar: 'ترتيب التحميل', en: 'Loading manifest' },
  loadOrderHint: {
    ar: 'التحميل بترتيب معكوس للتسليم: آخر محطة تُحمّل أولاً حتى تكون كل شحنة عند باب الشاحنة عند وصولها.',
    en: 'Load in reverse delivery order: the last stop loads first, so every drop is at the rear door when you open it.',
  },
  loadSeq: { ar: 'ترتيب التحميل', en: 'Load #' },
  deliverySeq: { ar: 'ترتيب التسليم', en: 'Drop #' },
  position: { ar: 'الموقع في الصندوق', en: 'Position in box' },
  scanToVerify: { ar: 'امسح الباركود للتأكيد', en: 'Scan to verify' },
  verified: { ar: 'تم التحقق', en: 'Verified' },
  fragile: { ar: 'قابل للكسر', en: 'Fragile' },
  estimatedDims: { ar: 'أبعاد تقديرية', en: 'Estimated dimensions' },

  floor_front: { ar: 'أمام الصندوق (الأعمق)', en: 'Box front (deepest)' },
  floor_mid: { ar: 'وسط الصندوق', en: 'Box middle' },
  floor_rear: { ar: 'خلف الصندوق (عند الباب)', en: 'Box rear (at the door)' },
  top_shelf: { ar: 'الرف العلوي', en: 'Top shelf' },

  // Driver app
  todayRoute: { ar: 'رحلة اليوم', en: "Today's route" },
  stopOf: { ar: 'المحطة', en: 'Stop' },
  of: { ar: 'من', en: 'of' },
  callCustomer: { ar: 'اتصال بالزبون', en: 'Call customer' },
  navigate: { ar: 'ابدأ الملاحة', en: 'Navigate' },
  arrived: { ar: 'وصلت', en: 'Arrived' },
  startService: { ar: 'ابدأ التسليم', en: 'Start delivery' },
  checklist: { ar: 'قائمة التحقق', en: 'Checklist' },
  completeStop: { ar: 'إنهاء المحطة', en: 'Complete stop' },
  reportProblem: { ar: 'الإبلاغ عن مشكلة', en: 'Report a problem' },
  nextStop: { ar: 'المحطة التالية', en: 'Next stop' },
  routeComplete: { ar: 'اكتملت الرحلة', en: 'Route complete' },
  collect: { ar: 'المبلغ المطلوب', en: 'Collect' },
  paid: { ar: 'مدفوع مسبقاً', en: 'Already paid' },
  access: { ar: 'الوصول', en: 'Access' },
  floor: { ar: 'الطابق', en: 'Floor' },
  elevator: { ar: 'مصعد', en: 'Elevator' },
  noElevator: { ar: 'بدون مصعد', en: 'No elevator' },
  narrowStairs: { ar: 'درج ضيق', en: 'Narrow stairs' },
  notSurveyed: { ar: 'لم يتم مسح الوصول — تحقق قبل الصعود', en: 'Access not surveyed — check before carrying up' },
  installNeeded: { ar: 'يتطلب تركيب', en: 'Installation required' },

  chkUnload: { ar: 'أنزل الشحنة وتحقق من التغليف أمام الزبون', en: 'Unload and inspect packaging with the customer' },
  chkPosition: { ar: 'ضع الجهاز في مكانه النهائي', en: 'Position the appliance in its final place' },
  chkInstall: { ar: 'نفّذ التركيب (ماء / غاز / كهرباء / تثبيت)', en: 'Complete installation (water / gas / electrical / mount)' },
  chkTest: { ar: 'شغّل الجهاز واختبره أمام الزبون', en: 'Run the functional test in front of the customer' },
  chkPhotos: { ar: 'التقط صور التسليم', en: 'Capture delivery photos' },
  chkSignature: { ar: 'خذ توقيع الاستلام', en: 'Capture the receipt signature' },
  chkPayment: { ar: 'حصّل المبلغ وسجّله', en: 'Collect and record payment' },
  chkWaste: { ar: 'ارفع التغليف والمخلفات', en: 'Remove packaging and waste' },

  exCustomerAbsent: { ar: 'الزبون غير موجود', en: 'Customer absent' },
  exDoesNotFit: { ar: 'الجهاز لا يمر من المدخل', en: 'Does not fit through access' },
  exDamaged: { ar: 'تلف أثناء النقل', en: 'Damaged in transit' },
  exPayment: { ar: 'الدفع غير جاهز', en: 'Payment not ready' },
  exRefused: { ar: 'رفض الاستلام', en: 'Customer refused' },
  exBlocked: { ar: 'الطريق مغلق', en: 'Route blocked' },

  offline: { ar: 'وضع بلا اتصال — سيتم المزامنة لاحقاً', en: 'Offline — will sync when signal returns' },
  syncQueued: { ar: 'بانتظار المزامنة', en: 'Queued for sync' },

  // Exceptions panel
  heldOrders: { ar: 'طلبات موقوفة عند بوابة الجودة', en: 'Orders held at the data gate' },
  heldHint: {
    ar: 'هذه الطلبات لم تصل إلى الشاحنة لأن بياناتها ناقصة. كل واحدة منها مهمة لشخص، وليست خطأ في النظام.',
    en: 'These never reached a truck because their data is incomplete. Each one is a task for a person, not a system error.',
  },
  unassignedHint: {
    ar: 'شحنات لم يمكن جدولتها اليوم، مع السبب الدقيق لكل منها.',
    en: 'Shipments that could not be scheduled today, each with the precise reason.',
  },
  noneToday: { ar: 'لا يوجد', en: 'None' },

  reason_address_unresolved: { ar: 'العنوان غير محدد', en: 'Address unresolved' },
  reason_payment_not_cleared: { ar: 'ملف التقسيط غير مكتمل', en: 'Instalment file incomplete' },
  reason_customer_missing: { ar: 'بيانات الزبون ناقصة', en: 'Customer record missing' },
  reason_product_missing: { ar: 'بيانات المنتج ناقصة', en: 'Product record missing' },

  km: { ar: 'كم', en: 'km' },
  min: { ar: 'دقيقة', en: 'min' },
  hours: { ar: 'ساعة', en: 'h' },
  currency: { ar: '₪', en: '₪' },
};

export function makeT(lang: Lang) {
  return (key: string): string => STRINGS[key]?.[lang] ?? key;
}

/** Picks the localised variant of a bilingual record (customer, driver, node, product). */
export function loc(lang: Lang, en: string | undefined, ar: string | undefined): string {
  return (lang === 'ar' ? ar : en) ?? en ?? ar ?? '';
}

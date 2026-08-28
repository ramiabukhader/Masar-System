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


  // ── Navigation ──────────────────────────────────────────────────────────
  riskTight: { ar: 'هامش ضيّق', en: 'Tight' },
  riskBreach: { ar: 'تجاوز المدة', en: 'Overdue' },
  technicalDetail: { ar: 'التفصيل الفني', en: 'Technical detail' },
  navOrders: { ar: 'الطلبات', en: 'Orders' },
  navOptions: { ar: 'خيارات التوصيل', en: 'Delivery options' },
  navRoadmap: { ar: 'خارطة الطريق', en: 'Roadmap' },
  groupOps: { ar: 'التشغيل', en: 'Operations' },
  groupSetup: { ar: 'الإعداد', en: 'Setup' },
  groupRef: { ar: 'المرجع', en: 'Reference' },
  backToOrders: { ar: 'رجوع إلى الطلبات', en: 'Back to orders' },

  // ── Simulated clock ─────────────────────────────────────────────────────
  simClock: { ar: 'ساعة المحاكاة', en: 'Simulated clock' },
  simClockHint: {
    ar: 'حرّك الشريط لتشغيل يوم التوصيل. كل الشاشات تتبع هذا الوقت.',
    en: 'Drag to play the delivery day. Every screen follows this clock.',
  },
  deliveryDay: { ar: 'يوم التوصيل', en: 'Delivery day' },

  // ── Orders board ────────────────────────────────────────────────────────
  ordersTitle: { ar: 'لوحة الطلبات', en: 'Orders board' },
  ordersSub: { ar: 'كل طلبات الزبائن في موجة اليوم وحالتها اللحظية', en: "Every customer order in today's wave, with live status" },
  searchOrders: { ar: 'بحث بالاسم أو رقم الطلب أو المدينة…', en: 'Search by name, order number or city…' },
  filterAll: { ar: 'الكل', en: 'All' },
  colOrder: { ar: 'الطلب', en: 'Order' },
  colCustomer: { ar: 'الزبون', en: 'Customer' },
  colCity: { ar: 'المدينة', en: 'City' },
  colItems: { ar: 'الأصناف', en: 'Items' },
  colChannel: { ar: 'قناة البيع', en: 'Channel' },
  colPayment: { ar: 'الدفع', en: 'Payment' },
  colDue: { ar: 'موعد الاستحقاق', en: 'Due' },
  colStatus: { ar: 'الحالة', en: 'Status' },
  colProgress: { ar: 'التقدّم', en: 'Progress' },
  noResults: { ar: 'لا توجد طلبات مطابقة', en: 'No matching orders' },
  ordersShown: { ar: 'طلب معروض', en: 'shown' },

  // States
  state_held: { ar: 'موقوف', en: 'Held' },
  state_blocked: { ar: 'غير مجدول', en: 'Not scheduled' },
  state_scheduled: { ar: 'مجدول', en: 'Scheduled' },
  state_active: { ar: 'في الطريق', en: 'Out for delivery' },
  state_delivered: { ar: 'تم التسليم', en: 'Delivered' },

  // KPIs on the board
  kpiTotalOrders: { ar: 'إجمالي الطلبات', en: 'Total orders' },
  kpiDelivered: { ar: 'تم التسليم', en: 'Delivered' },
  kpiActive: { ar: 'في الطريق', en: 'Out for delivery' },
  kpiScheduled: { ar: 'بانتظار الانطلاق', en: 'Awaiting dispatch' },
  kpiNeedsAction: { ar: 'يحتاج تدخّلاً', en: 'Needs action' },
  kpiCash: { ar: 'مبالغ للتحصيل', en: 'Cash to collect' },

  // ── Milestones ──────────────────────────────────────────────────────────
  milestones: { ar: 'مراحل الطلب', en: 'Order milestones' },
  ms_placed: { ar: 'تسجيل الطلب', en: 'Order placed' },
  ms_validated: { ar: 'اكتمال البيانات', en: 'Data complete' },
  ms_sourced: { ar: 'التجهيز على الرصيف', en: 'Staged on the dock' },
  ms_planned: { ar: 'الجدولة في الموجة', en: 'Scheduled in the wave' },
  ms_window_confirmed: { ar: 'تأكيد النافذة', en: 'Window confirmed' },
  ms_loaded: { ar: 'التحميل على المركبة', en: 'Loaded on the vehicle' },
  ms_out_for_delivery: { ar: 'الانطلاق للتوصيل', en: 'Out for delivery' },
  ms_delivered: { ar: 'التسليم وإثباته', en: 'Delivered and proven' },
  msPending: { ar: 'لم تتم بعد', en: 'Not yet' },

  // ── Order detail ────────────────────────────────────────────────────────
  orderDetail: { ar: 'تفاصيل الطلب', en: 'Order detail' },
  customerInfo: { ar: 'الزبون والعنوان', en: 'Customer and address' },
  orderItems: { ar: 'أصناف الطلب', en: 'Order items' },
  assignment: { ar: 'الإسناد', en: 'Assignment' },
  followUp: { ar: 'المتابعة', en: 'Follow-up' },
  notAssigned: { ar: 'لم يُسند بعد', en: 'Not assigned yet' },
  blockerTitle: { ar: 'ما الذي يوقف هذا الطلب', en: 'What is holding this order' },
  actionNeeded: { ar: 'الإجراء المطلوب', en: 'Action needed' },
  phone: { ar: 'الهاتف', en: 'Phone' },
  channel: { ar: 'قناة البيع', en: 'Sales channel' },
  totalCube: { ar: 'الحجم الكلي', en: 'Total volume' },
  totalWeight: { ar: 'الوزن الكلي', en: 'Total weight' },
  serviceTime: { ar: 'مدة التسليم المتوقعة', en: 'Expected time at the door' },
  crewNeeded: { ar: 'حجم الطاقم', en: 'Crew required' },
  skillsNeeded: { ar: 'مهارات التركيب', en: 'Installation skills' },
  geocodeConfidence: { ar: 'دقة تحديد الموقع', en: 'Geocode confidence' },

  channel_showroom: { ar: 'المعرض', en: 'Showroom' },
  channel_web: { ar: 'الموقع', en: 'Website' },
  channel_phone: { ar: 'الهاتف', en: 'Phone' },
  channel_whatsapp: { ar: 'واتساب', en: 'WhatsApp' },
  pay_cash: { ar: 'نقداً', en: 'Cash' },
  pay_card: { ar: 'بطاقة', en: 'Card' },
  pay_bank_instalment: { ar: 'تقسيط بنكي', en: 'Bank instalment' },

  install_plumbing: { ar: 'سباكة', en: 'Plumbing' },
  install_gas: { ar: 'غاز', en: 'Gas' },
  install_electrical: { ar: 'كهرباء', en: 'Electrical' },
  install_mount: { ar: 'تثبيت', en: 'Wall-mount' },
  install_none: { ar: 'بدون تركيب', en: 'No installation' },

  // ── Delivery options ────────────────────────────────────────────────────
  optionsTitle: { ar: 'خيارات التوصيل', en: 'Delivery options' },
  optionsSub: { ar: 'ما يمكن وعد الزبون به، ولمن، وكم يكلّف الوفاء به', en: 'What can be promised, to whom, and what it costs to keep' },
  tierActive: { ar: 'مفعّل', en: 'Active' },
  tierPilot: { ar: 'قيد التطبيق', en: 'Rolling out' },
  tierPlanned: { ar: 'غير مفعّل', en: 'Not enabled' },
  tierSla: { ar: 'المدة', en: 'Deadline' },
  tierWindow: { ar: 'النافذة', en: 'Window' },
  tierNoWindow: { ar: 'بدون نافذة', en: 'No window' },
  tierPrice: { ar: 'سعر الزبون', en: 'Customer price' },
  tierCost: { ar: 'كلفة التوصيلة', en: 'Cost to serve' },
  tierFree: { ar: 'مجاني', en: 'Free' },
  tierEligibility: { ar: 'الفئات المشمولة', en: 'Eligible classes' },
  tierRequires: { ar: 'ما يتطلبه التفعيل', en: 'What switching it on requires' },
  tierInstall: { ar: 'يشمل التركيب', en: 'Installation included' },
  tierZones: { ar: 'المناطق', en: 'Zones' },
  tierAllZones: { ar: 'كل المناطق', en: 'All zones' },
  tierMaxCube: { ar: 'أقصى حجم', en: 'Max volume' },
  optionsNote: {
    ar: 'التوصيل في نفس اليوم موجود هنا عمداً كخيار غير مفعّل: تشغيله على شبكة لم تُصلح بعد نسبة الفشل من المحاولة الأولى وتعبئة المركبات يضاعف الكلفة بدل أن يخفضها.',
    en: 'Same-day sits here deliberately as a switched-off option: running it on a network that has not yet fixed first-attempt failure and truck fill multiplies the cost instead of reducing it.',
  },

  // ── Roadmap ─────────────────────────────────────────────────────────────
  roadmapTitle: { ar: 'خارطة الطريق', en: 'Roadmap' },
  roadmapSub: { ar: 'أين وصلنا، وما التالي، وماذا تساوي كل مرحلة', en: 'Where we are, what is next, and what each phase is worth' },
  phaseGoal: { ar: 'الهدف', en: 'Goal' },
  phaseOutcome: { ar: 'الناتج', en: 'Outcome' },
  st_done: { ar: 'مكتمل', en: 'Done' },
  st_in_progress: { ar: 'جارٍ', en: 'In progress' },
  st_next: { ar: 'التالي', en: 'Next' },
  st_later: { ar: 'لاحقاً', en: 'Later' },

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

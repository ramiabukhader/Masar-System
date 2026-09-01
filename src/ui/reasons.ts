import type { Lang } from './i18n';

/**
 * Plain-language explanations for every reason code the data gate and the optimiser can
 * emit. The core deliberately returns machine-readable codes plus an English technical
 * detail; this is where they become something an Arabic-speaking dispatcher can act on.
 *
 * Keeping the map here rather than in `src/core` means the engine never has to know about
 * languages, and adding a language never touches the solver.
 */
const REASONS: Record<string, { ar: string; en: string }> = {
  // Data-quality gates
  address_unresolved: {
    ar: 'العنوان غير مؤكد — دقة تحديد الموقع أقل من الحد المسموح',
    en: 'Address unresolved — geocode confidence below the gate',
  },
  payment_not_cleared: {
    ar: 'ملف التقسيط البنكي غير مكتمل — الطاقم لن يستطيع تسليم البضاعة',
    en: 'Bank instalment file incomplete — the crew could not release the goods',
  },
  customer_missing: { ar: 'سجل الزبون ناقص', en: 'Customer record missing' },
  product_missing: { ar: 'الصنف غير موجود في دليل المنتجات', en: 'Product not found in the product master' },

  // Planning outcomes
  no_capacity_left: {
    ar: 'الأسطول ممتلئ — الطلب قابل للخدمة لكن لا توجد طاقة متبقية اليوم',
    en: 'Fleet is full — serviceable in principle, but no capacity left today',
  },
  no_eligible_vehicle: { ar: 'لا توجد مركبة أو سائق مؤهل لهذا الطلب', en: 'No eligible vehicle or driver for this order' },
  not_planned: { ar: 'خارج الموجة الحالية', en: 'Outside the current wave' },
  planner_budget_exhausted: {
    ar: 'انتهت مهلة التخطيط قبل جدولة الطلب — ليس بالضرورة غير قابل للخدمة، أعد تشغيل الموجة بمهلة أطول',
    en: 'Planning time ran out before this order was scheduled — not necessarily unservable, re-run the wave with a longer budget',
  },

  // Hard-constraint rejections
  zone_ineligible_vehicle: { ar: 'المركبة غير مخوّلة لدخول منطقة التسليم', en: 'Vehicle is not eligible for the delivery zone' },
  zone_ineligible_driver: { ar: 'السائق غير مخوّل لدخول منطقة التسليم', en: 'Driver is not eligible for the delivery zone' },
  crew_too_small: { ar: 'الطلب يحتاج طاقماً من شخصين', en: 'The order needs a two-person crew' },
  vehicle_cannot_carry_class_a: { ar: 'المركبة لا تحمل الأجهزة الكبيرة', en: 'Vehicle cannot carry major appliances' },
  missing_install_skill: { ar: 'الطاقم لا يملك اعتماد التركيب المطلوب', en: 'The crew lacks the required installation certification' },
  not_stageable_at_origin: { ar: 'البضاعة غير متوفرة في نقطة التحميل', en: 'Goods are not available at the loading point' },
  over_cube: { ar: 'الحمولة تتجاوز حجم صندوق المركبة', en: 'Load exceeds the vehicle cube' },
  over_weight: { ar: 'الحمولة تتجاوز الحمولة المسموحة', en: 'Load exceeds the payload limit' },
  window_violated: { ar: 'لا يمكن الوصول ضمن نافذة الزبون', en: 'Cannot arrive inside the customer window' },
  sla_breach: { ar: 'لا يمكن الوصول قبل انتهاء مدة الالتزام', en: 'Cannot arrive before the SLA deadline' },
  shift_exceeded: { ar: 'الرحلة تتجاوز دوام السائق', en: 'Route runs past the driver shift' },
  route_blocked: { ar: 'الطريق أو المعبر مغلق', en: 'Route or crossing is closed' },
};

const FALLBACK = { ar: 'سبب غير معروف', en: 'Unknown reason' };

export function reasonText(code: string, lang: Lang): string {
  return (REASONS[code] ?? FALLBACK)[lang];
}

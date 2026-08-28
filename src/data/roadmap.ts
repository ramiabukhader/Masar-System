/**
 * Programme milestones. The delivery plan for the delivery system — what has been built,
 * what is next, and what each phase is worth. Mirrors docs/02 §6.
 */
export type MilestoneStatus = 'done' | 'in_progress' | 'next' | 'later';

export interface ProgrammeItem {
  titleAr: string;
  titleEn: string;
  status: MilestoneStatus;
}

export interface ProgrammePhase {
  id: string;
  labelAr: string;
  labelEn: string;
  timingAr: string;
  timingEn: string;
  goalAr: string;
  goalEn: string;
  outcomeAr: string;
  outcomeEn: string;
  status: MilestoneStatus;
  items: ProgrammeItem[];
}

export const PHASES: ProgrammePhase[] = [
  {
    id: 'phase-0',
    labelAr: 'المرحلة صفر · النموذج',
    labelEn: 'Phase 0 · Prototype',
    timingAr: 'مكتملة',
    timingEn: 'Complete',
    goalAr: 'إثبات أن المشكلة قابلة للحل، وبناء نسخة تجريبية تُعرض على مسلماني هوم.',
    goalEn: 'Prove the problem is solvable, and build a demo to show Maslamani Home.',
    outcomeAr: 'محرك تخطيط حقيقي يعمل، وتطبيق ويب عربي بالكامل، ودليل عمليات من البداية إلى النهاية.',
    outcomeEn: 'A working planning engine, a fully Arabic web application, and end-to-end process manuals.',
    status: 'done',
    items: [
      { titleAr: 'بحث وتحليل الوضع الحالي', titleEn: 'Research and current-state analysis', status: 'done' },
      { titleAr: 'نموذج البيانات وعقد التكامل مع قاعدة بياناتهم', titleEn: 'Data model and DB integration contract', status: 'done' },
      { titleAr: 'محرك تحسين المسارات مع كل القيود الصارمة', titleEn: 'Route optimiser with every hard constraint', status: 'done' },
      { titleAr: 'لوحة الطلبات وغرفة التحكم وعمليات الفرع', titleEn: 'Orders board, Control Tower, Branch Ops', status: 'done' },
      { titleAr: 'تطبيق السائق ومتابعة مراحل الطلب', titleEn: 'Driver app and order milestone tracking', status: 'done' },
      { titleAr: 'إجراءات العمل بالعربية والإنجليزية', titleEn: 'Standard operating procedures, Arabic and English', status: 'done' },
    ],
  },
  {
    id: 'phase-1',
    labelAr: 'المرحلة الأولى · نرى',
    labelEn: 'Phase 1 · See it',
    timingAr: 'الأسابيع ١–٤',
    timingEn: 'Weeks 1–4',
    goalAr: 'ربط النظام بقاعدة بياناتهم للقراءة فقط، وقياس خط الأساس الحقيقي. لا يتغير شيء في طريقة عملهم.',
    goalEn: 'Read-only integration with their database, and measure the real baseline. Nothing about how they work changes.',
    outcomeAr: 'رقم حقيقي لكلفة التوصيلة ونسبة النجاح من المحاولة الأولى — لا يمكن اعتماد تغيير لا يمكن قياس أثره.',
    outcomeEn: 'A real cost-per-drop and first-attempt success figure — you cannot approve a change whose benefit you cannot measure.',
    status: 'next',
    items: [
      { titleAr: 'الوصول إلى نسخة القراءة من قاعدة البيانات', titleEn: 'Access to the read-replica', status: 'next' },
      { titleAr: 'سد فجوة أبعاد وأوزان المنتجات', titleEn: 'Close the product dimension and weight gap', status: 'next' },
      { titleAr: 'توحيد العناوين وتحديد الإحداثيات', titleEn: 'Address normalisation and geocoding', status: 'next' },
      { titleAr: 'غرفة التحكم في وضع المراقبة', titleEn: 'Control Tower in observe mode', status: 'next' },
      { titleAr: 'قياس خط الأساس من ١٢ شهراً من السجلات', titleEn: 'Baseline measured from 12 months of history', status: 'next' },
    ],
  },
  {
    id: 'phase-2',
    labelAr: 'المرحلة الثانية · نخطط',
    labelEn: 'Phase 2 · Plan it',
    timingAr: 'الأسابيع ٥–١٠',
    timingEn: 'Weeks 5–10',
    goalAr: 'تشغيل مخطط الموجة كمستشار: يرى المخطط الخطة المحسّنة بجانب ما كانت الفروع ستفعله ويختار.',
    goalEn: 'Wave planner live in advisory mode: the planner sees the optimised plan next to what the branches would have done, and chooses.',
    outcomeAr: 'انخفاض متوقع ١٥–٢٥٪ في الكيلومترات، وتحسّن ملموس في تعبئة المركبات.',
    outcomeEn: 'Expected 15–25% fewer kilometres, and a measurable improvement in vehicle fill.',
    status: 'later',
    items: [
      { titleAr: 'موجة تخطيط يومية الساعة ١٦:٠٠', titleEn: 'Daily planning wave at 16:00', status: 'later' },
      { titleAr: 'قوائم التجهيز وبيانات التحميل للفروع', titleEn: 'Pick lists and loading manifests to branches', status: 'later' },
      { titleAr: 'إضافة مسح الوصول في نقطة البيع', titleEn: 'Access survey added at point of sale', status: 'later' },
      { titleAr: 'دمج التوزيع بين الفروع عبر النقل الليلي', titleEn: 'Cross-branch consolidation via the overnight shuttle', status: 'later' },
    ],
  },
  {
    id: 'phase-3',
    labelAr: 'المرحلة الثالثة · نشغّل',
    labelEn: 'Phase 3 · Run it',
    timingAr: 'الأسابيع ١١–١٨',
    timingEn: 'Weeks 11–18',
    goalAr: 'تطبيق السائق في الميدان، ونوافذ الوصول المؤكدة مع الزبائن، وإثبات التسليم والتحصيل.',
    goalEn: 'Driver app in the field, confirmed arrival windows with customers, proof of delivery and payment collection.',
    outcomeAr: 'ارتفاع النجاح من المحاولة الأولى من ~٨٥٪ إلى ٩٥٪ فأكثر. هذه المرحلة هي التي تسدّد كلفة البرنامج.',
    outcomeEn: 'First-attempt success from ~85% to 95%+. This is the phase that pays for the programme.',
    status: 'later',
    items: [
      { titleAr: 'تطبيق السائق يعمل بلا اتصال', titleEn: 'Offline-capable driver app', status: 'later' },
      { titleAr: 'تأكيد النوافذ عبر SMS وواتساب', titleEn: 'Window confirmation over SMS and WhatsApp', status: 'later' },
      { titleAr: 'إثبات التسليم بالصور والتوقيع', titleEn: 'Proof of delivery with photos and signature', status: 'later' },
      { titleAr: 'رموز الاستثناءات والتسوية اليومية', titleEn: 'Exception codes and daily reconciliation', status: 'later' },
      { titleAr: 'إعادة التخطيط المباشر خلال اليوم', titleEn: 'Live intra-day re-planning', status: 'later' },
    ],
  },
  {
    id: 'phase-4',
    labelAr: 'المرحلة الرابعة · نضبط ثم نُسرِع',
    labelEn: 'Phase 4 · Tune it, then accelerate',
    timingAr: 'الشهر الخامس وما بعده',
    timingEn: 'Month 5 onwards',
    goalAr: 'تعلّم أوقات الانتقال من مسارات الأسطول نفسه، ثم — وعندها فقط — تفعيل التوصيل في نفس اليوم.',
    goalEn: "Learn travel times from the fleet's own traces, then — and only then — switch on same-day.",
    outcomeAr: 'شبكة تتحسّن كل أسبوع تعمل فيه، وخدمة سريعة مدفوعة تركب على بنية كفؤة أصلاً.',
    outcomeEn: 'A network that improves every week it runs, and a paid express tier riding on an already-efficient structure.',
    status: 'later',
    items: [
      { titleAr: 'أوقات انتقال مُتعلَّمة من بيانات GPS', titleEn: 'Travel times learned from GPS traces', status: 'later' },
      { titleAr: 'تنبيه استباقي لمخاطر التأخير', titleEn: 'Predictive SLA risk alerting', status: 'later' },
      { titleAr: 'تسليم تدفق الطرود لشركة شحن', titleEn: 'Courier hand-off for the parcel flow', status: 'later' },
      { titleAr: 'لوحات الكلفة حسب الفرع والسائق وفئة المنتج', titleEn: 'Cost dashboards by branch, driver and product class', status: 'later' },
      { titleAr: 'إطلاق التوصيل في نفس اليوم كخدمة مدفوعة', titleEn: 'Same-day launched as a paid tier', status: 'later' },
    ],
  },
];

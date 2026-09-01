import type { Lang } from '../i18n';
import { InfoTip } from '../components/InfoTip';

interface Step {
  role: { ar: string; en: string };
  title: { ar: string; en: string };
  desc: { ar: string; en: string };
  guard?: { ar: string; en: string };
}

/**
 * The end-to-end process, from the moment the order is taken to the moment the money and
 * the proof are reconciled. Every step names its owner, and every guard names the failure
 * it exists to prevent — a process step nobody owns is a step that does not happen.
 *
 * Mirrors docs/06 (English) and docs/07 (Arabic), so the screen and the printed SOP can
 * never drift apart.
 */
const STEPS: Step[] = [
  {
    role: { ar: 'البائع — المعرض', en: 'Salesperson — showroom' },
    title: { ar: 'إتمام البيع ومسح الوصول', en: 'Close the sale and take the access survey' },
    desc: {
      ar: 'سجّل الطابق، وجود المصعد وهل يتسع للجهاز، عرض الدرج، وصعوبة الوقوف. اسأل عن توفر وصلة الماء أو الغاز إن كان الجهاز يحتاجها.',
      en: 'Record the floor, whether there is an elevator and whether it fits a boxed appliance, stair width, and parking difficulty. Ask whether the water or gas connection exists if the appliance needs one.',
    },
    guard: {
      ar: 'بدون مسح الوصول، النظام يفترض الطابق الثاني ويضيف وقتاً — والطاقم قد يصل ولا يمر الجهاز من المدخل. هذه أغلى مشكلة في الشبكة.',
      en: 'Without the survey the system assumes a second floor and adds time — and the crew may arrive to find the appliance does not fit. This is the most expensive failure in the network.',
    },
  },
  {
    role: { ar: 'النظام', en: 'System' },
    title: { ar: 'تشغيل ساعة الالتزام (٤٨ ساعة)', en: 'Start the 48-hour SLA clock' },
    desc: {
      ar: 'تبدأ الساعة من لحظة تأكيد الطلب، لا من لحظة إنشائه. يُحسب موعد الاستحقاق ويصبح قيداً صارماً في التخطيط.',
      en: 'The clock starts at order confirmation, not at cart creation. The due time is computed and becomes a hard constraint in planning.',
    },
  },
  {
    role: { ar: 'النظام + مركز الاتصال', en: 'System + call centre' },
    title: { ar: 'توحيد العنوان وتحديد الإحداثيات', en: 'Normalise the address and geocode it' },
    desc: {
      ar: 'يُطابق العنوان مع دليل المواقع (محافظة ← مدينة ← تجمع). إن كانت درجة الثقة منخفضة، يتحوّل الطلب إلى قائمة التأكيد البشري.',
      en: 'The address is matched against the locality gazetteer (governorate → city → locality). Low confidence sends the order to the human confirmation queue.',
    },
    guard: {
      ar: 'العنوان غير المؤكد لا يصل إلى الشاحنة أبداً. تخمين الموقع يعني رحلة ضائعة كاملة.',
      en: 'An unresolved address never reaches a truck. Guessing the location means one entirely wasted trip.',
    },
  },
  {
    role: { ar: 'المالية / المبيعات', en: 'Finance / Sales' },
    title: { ar: 'تأكيد جاهزية الدفع أو التقسيط', en: 'Confirm payment or instalment file is complete' },
    desc: {
      ar: 'طلبات التقسيط البنكي لا تُجدول قبل اكتمال الأوراق، مع بقاء ساعة الالتزام تعمل وإشعار المبيعات.',
      en: 'Bank instalment orders are not scheduled until the paperwork is complete. The SLA clock keeps running and sales is notified.',
    },
    guard: {
      ar: 'الطاقم لا يستطيع تسليم البضاعة بدون أوراق مكتملة — الرحلة تضيع بالكامل.',
      en: 'The crew cannot release the goods without complete paperwork — the whole trip is wasted.',
    },
  },
  {
    role: { ar: 'مخطط التوصيل', en: 'Delivery Planner' },
    title: { ar: 'تحديد مصدر البضاعة ونقطة التحميل', en: 'Source the stock and pick the loading point' },
    desc: {
      ar: 'يُفضّل مصدر واحد لكل طلب. إذا احتاج نقلاً بين الفروع، تُنشأ رحلة نقل ليلية ويُسجَّل وقت الجاهزية كقيد على الموعد.',
      en: 'One source per order wherever possible. Where a transfer is needed, an overnight leg is created and its arrival time becomes a release constraint on the delivery.',
    },
  },
  {
    role: { ar: 'مخطط التوصيل', en: 'Delivery Planner' },
    title: { ar: 'تشغيل موجة التخطيط — الساعة ١٦:٠٠', en: 'Run the planning wave — 16:00' },
    desc: {
      ar: 'كل الطلبات المستحقة خلال الأفق، من كل نقاط الانطلاق، تدخل تحسيناً واحداً: مسارات، تسلسل محطات، نوافذ وصول، وترتيب تحميل.',
      en: 'Every order due within the horizon, from every origin, enters one optimisation: routes, stop sequences, arrival windows and loading order.',
    },
    guard: {
      ar: 'الدمج يتم حسب جغرافيا التسليم، لا حسب الفرع البائع. هنا يختفي ازدواج الكيلومترات.',
      en: 'Consolidation is by delivery geography, not by selling branch. This is where duplicated kilometres disappear.',
    },
  },
  {
    role: { ar: 'النظام + مركز الاتصال', en: 'System + call centre' },
    title: { ar: 'تأكيد نافذة الوصول قبل يوم', en: 'Confirm the arrival window the day before' },
    desc: {
      ar: 'رسالة نصية أو واتساب بنافذة من ٣ ساعات ورابط لإعادة الجدولة بضغطة واحدة. من لا يرد يُتَّصل به.',
      en: 'SMS or WhatsApp with a three-hour window and a one-tap reschedule link. Non-responders get a call.',
    },
    guard: {
      ar: 'هذه الخطوة وحدها هي أكبر توفير في البرنامج — لأنها تمنع المحاولة الفاشلة الأولى.',
      en: 'This single step is the largest saving in the programme, because it prevents the failed first attempt.',
    },
  },
  {
    role: { ar: 'النقل الليلي', en: 'Overnight shuttle' },
    title: { ar: 'نقل البضاعة إلى نقاط التجميع', en: 'Move stock to the corridor staging points' },
    desc: {
      ar: 'تصل الشحنات المنقولة قبل بداية الدوام لتكون على الرصيف عند وصول الطواقم.',
      en: 'Transferred shipments land before shift start so they are on the dock when the crews arrive.',
    },
  },
  {
    role: { ar: 'مشرف الفرع / المستودع', en: 'Branch / DC supervisor' },
    title: { ar: 'التجهيز والتحضير على الرصيف', en: 'Pick and stage on the dock' },
    desc: {
      ar: 'التجهيز من قائمة واحدة لكل رحلة، وتُرصف الشحنات بترتيب التحميل قبل فتح باب الشاحنة.',
      en: 'Pick from one list per route, and lay the shipments out in loading order before the truck door opens.',
    },
  },
  {
    role: { ar: 'العامل + السائق', en: 'Loader + driver' },
    title: { ar: 'التحميل بترتيب معكوس مع المسح الضوئي', en: 'Load in reverse delivery order, scan-verified' },
    desc: {
      ar: 'آخر محطة تُحمّل أولاً. الثقيل والقابل للرصف على الأرضية، والقابل للكسر على الرف العلوي دائماً.',
      en: 'The last stop loads first. Heavy and stackable on the floor; fragile always on the top shelf.',
    },
    guard: {
      ar: 'بدون هذا الترتيب يُفرّغ الطاقم نصف الشاحنة عند كل محطة — وهنا يقع معظم التلف وضياع الوقت.',
      en: 'Without this order the crew unloads half the truck at every stop — which is where most of the damage and lost time come from.',
    },
  },
  {
    role: { ar: 'السائق', en: 'Driver' },
    title: { ar: 'فحص ما قبل الانطلاق', en: 'Departure check' },
    desc: {
      ar: 'تطابق عدد القطع مع البيان، أدوات التركيب على متن المركبة، الهاتف مشحون والبيان محمّل للعمل بلا اتصال.',
      en: 'Piece count matches the manifest, installation tools are on board, phone charged and manifest downloaded for offline use.',
    },
  },
  {
    role: { ar: 'السائق', en: 'Driver' },
    title: { ar: 'الانتقال واتباع تسلسل المحطات', en: 'Drive the planned sequence' },
    desc: {
      ar: 'التسلسل محسوب على أوقات انتقال تتغير حسب الساعة. تغييره يدوياً يُفقد النوافذ المؤكدة للزبائن.',
      en: 'The sequence is computed against travel times that change by hour. Changing it by hand breaks the windows already promised to customers.',
    },
    guard: {
      ar: 'أي تأخير غير متوقع يُبلَّغ من التطبيق فوراً — غرفة التحكم تعيد الحساب وتبلّغ الزبائن التاليين.',
      en: 'Report any unexpected delay from the app immediately — the Control Tower re-computes and notifies the customers further down the route.',
    },
  },
  {
    role: { ar: 'السائق', en: 'Driver' },
    title: { ar: 'اتصال ما قبل الوصول', en: 'Pre-arrival call' },
    desc: {
      ar: 'اتصل قبل ١٥–٢٠ دقيقة. تأكد أن الزبون موجود وأن الطريق للمدخل سالك.',
      en: 'Call 15–20 minutes ahead. Confirm the customer is there and the path to the entrance is clear.',
    },
  },
  {
    role: { ar: 'الطاقم', en: 'Crew' },
    title: { ar: 'الوصول وفحص المدخل', en: 'Arrive and check the access' },
    desc: {
      ar: 'قِس المدخل والدرج قبل رفع الجهاز. إن كان لا يمر، وثّق بالصور وأبلغ فوراً قبل أي محاولة.',
      en: 'Measure the doorway and stairs before lifting. If it will not fit, photograph it and report immediately — before attempting anything.',
    },
  },
  {
    role: { ar: 'الطاقم', en: 'Crew' },
    title: { ar: 'الإنزال والفحص أمام الزبون', en: 'Unload and inspect with the customer' },
    desc: {
      ar: 'افتح التغليف وافحص الجهاز بحضور الزبون. أي تلف يُوثَّق الآن — لا بعد المغادرة.',
      en: 'Open the packaging and inspect the item with the customer present. Any damage is documented now, not after you leave.',
    },
    guard: {
      ar: 'سياسة الشركة تمنح الزبون ٢٤ ساعة للإبلاغ عن التلف (ونفس اليوم للقابل للكسر). التوثيق عند الباب يحسم النزاع قبل أن يبدأ.',
      en: 'Company policy gives the customer 24 hours to report damage (same day for fragile items). Documenting at the door settles the dispute before it starts.',
    },
  },
  {
    role: { ar: 'الطاقم', en: 'Crew' },
    title: { ar: 'التوضيع والتركيب', en: 'Position and install' },
    desc: {
      ar: 'ضع الجهاز في مكانه النهائي، ثم نفّذ التركيب: ماء، غاز، كهرباء، أو تثبيت على الجدار — حسب صلاحيات الطاقم.',
      en: 'Place the appliance in its final position, then complete the installation: water, gas, electrical or wall-mount — within the crew’s certification.',
    },
    guard: {
      ar: 'لا يُنفَّذ تركيب غاز إلا من طاقم معتمد. النظام لا يُسند هذه الطلبات لغير المؤهلين أصلاً.',
      en: 'Gas work is done only by a certified crew. The system will not assign those jobs to anyone else in the first place.',
    },
  },
  {
    role: { ar: 'الطاقم', en: 'Crew' },
    title: { ar: 'التشغيل والاختبار أمام الزبون', en: 'Run the functional test with the customer' },
    desc: {
      ar: 'شغّل الجهاز واعرض عمله. هذا وعد معلن من الشركة، وليس خطوة اختيارية.',
      en: 'Power it up and demonstrate that it works. This is a promise the company advertises, not an optional step.',
    },
  },
  {
    role: { ar: 'الطاقم', en: 'Crew' },
    title: { ar: 'إثبات التسليم', en: 'Capture proof of delivery' },
    desc: {
      ar: 'صور للجهاز في مكانه، تأكيد نجاح الاختبار، واسم وتوقيع المستلم.',
      en: 'Photos of the item in place, confirmation the test passed, and the receiver’s name and signature.',
    },
  },
  {
    role: { ar: 'الطاقم', en: 'Crew' },
    title: { ar: 'تحصيل المبلغ وتسجيله', en: 'Collect and record the payment' },
    desc: {
      ar: 'سجّل المبلغ في التطبيق فور استلامه. تُطابق المبالغ لكل سائق في نهاية اليوم.',
      en: 'Record the amount in the app the moment you take it. Totals are reconciled per driver at end of day.',
    },
  },
  {
    role: { ar: 'الطاقم', en: 'Crew' },
    title: { ar: 'رفع التغليف والمخلفات', en: 'Remove packaging and waste' },
    desc: {
      ar: 'خذ التغليف معك ما لم يطلب الزبون الاحتفاظ به — مع تذكيره بأن سياسة الاسترجاع تتطلب حفظ التغليف.',
      en: 'Take the packaging unless the customer asks to keep it — reminding them the returns policy requires the packaging to be retained.',
    },
  },
  {
    role: { ar: 'الطاقم ← غرفة التحكم', en: 'Crew → Control Tower' },
    title: { ar: 'التعامل مع الاستثناءات', en: 'Handle the exception' },
    desc: {
      ar: 'اختر رمز السبب من التطبيق: الزبون غير موجود، لا يمر من المدخل، تلف، دفع غير جاهز، رفض، طريق مغلق. لا تكتب ملاحظة حرة فقط.',
      en: 'Pick the reason code in the app: customer absent, does not fit, damaged, payment not ready, refused, route blocked. Never a free-text note alone.',
    },
    guard: {
      ar: 'رموز الأسباب هي ما يجعل المشكلة قابلة للقياس والإصلاح. الملاحظات الحرة تختفي ولا تُصلح شيئاً.',
      en: 'Reason codes are what make a problem measurable and fixable. Free-text notes vanish and fix nothing.',
    },
  },
  {
    role: { ar: 'السائق + المالية', en: 'Driver + Finance' },
    title: { ar: 'العودة والتسوية المالية', en: 'Return to base and reconcile' },
    desc: {
      ar: 'أعد المرتجعات، سلّم المبالغ المحصّلة، وطابقها مع سجل التطبيق لكل سائق لكل يوم.',
      en: 'Return any refused goods, hand over collected cash, and reconcile it against the app record per driver per day.',
    },
  },
  {
    role: { ar: 'النظام', en: 'System' },
    title: { ar: 'الإغلاق وقياس الكلفة', en: 'Close out and cost the day' },
    desc: {
      ar: 'تُكتب حالة التسليم في نظامهم، وتُحسب كلفة كل توصيلة، ونسبة النجاح من المحاولة الأولى، والالتزام بالمدة، وتعبئة المركبات.',
      en: 'Delivery status is written back to their system, and cost per drop, first-attempt success, SLA attainment and vehicle fill are computed.',
    },
    guard: {
      ar: 'ما لا يُقاس لا يتحسّن. هذه الأرقام هي ما يحوّل "نشعر أن العمل غير منظم" إلى رقم ينخفض كل شهر.',
      en: 'What is not measured does not improve. These numbers are what turn "we feel unorganised" into a number that goes down every month.',
    },
  },
];

export function ProcessGuide({ t, lang }: { t: (key: string) => string; lang: Lang }) {
  return (
    <div className="grid">
      <div className="panel">
        <div className="panel-head">
          <h2>{t('navProcess')}<InfoTip text={t('processIntro')} label={`${t('explain')}: ${t('navProcess')}`} /></h2>
          <span className="sub">{STEPS.length} {lang === 'ar' ? 'خطوة' : 'steps'}</span>
        </div>
        <div className="panel-body">
          <div className="flow">
            {STEPS.map((step, index) => (
              <div className="flow-step" key={index}>
                <div className="flow-rail">
                  <div className="flow-num">{index + 1}</div>
                  {index < STEPS.length - 1 && <div className="flow-line" />}
                </div>
                <div className="flow-content">
                  <div className="flow-role">{step.role[lang]}</div>
                  <div className="flow-title">
                    {step.title[lang]}
                    {/* The guard is what this step exists to prevent. It is worth
                        keeping and worth reading once, but printing all 23 of
                        them turned the guide into a wall you had to scroll past
                        rather than a list you could scan. */}
                    {step.guard && <InfoTip text={step.guard[lang]} label={`${t('guardLabel')}: ${step.title[lang]}`} />}
                  </div>
                  <p className="flow-desc">{step.desc[lang]}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

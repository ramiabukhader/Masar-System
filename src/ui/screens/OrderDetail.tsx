import { MILESTONES, type OrderTrack } from '../../core/lifecycle';
import { LOCALITY_MAP, NODE_MAP } from '../../data/gazetteer';
import { PRODUCT_MAP } from '../../data/catalog';
import { DRIVER_MAP, VEHICLE_MAP } from '../../data/fleet';
import { fmtDue, fmtNum, fmtStamp, fmtTime, PLAN_DATE, type PlanState } from '../usePlan';
import { loc, type Lang } from '../i18n';
import { reasonText } from '../reasons';

interface Props {
  t: (key: string) => string;
  lang: Lang;
  track: OrderTrack;
  state: PlanState;
  onOpenRoute: (routeId: string) => void;
}

/**
 * What to actually do about a stuck order, per blocker reason. A status that names a
 * problem without naming its owner or its next step just moves the confusion around.
 */
const ACTIONS: Record<string, { ar: string; en: string }> = {
  address_unresolved: {
    ar: 'مركز الاتصال: اتصل بالزبون وأكّد العلامة المميزة للعنوان، ثم أعد تحديد الموقع.',
    en: 'Call centre: phone the customer, confirm the address landmark, then re-geocode.',
  },
  payment_not_cleared: {
    ar: 'المبيعات والمالية: أكملوا ملف التقسيط البنكي اليوم — ساعة الالتزام تعمل.',
    en: 'Sales and Finance: complete the bank instalment file today — the SLA clock is running.',
  },
  customer_missing: {
    ar: 'المبيعات: سجل الزبون ناقص. أكمل الاسم والهاتف والعنوان.',
    en: 'Sales: the customer record is incomplete. Fill in name, phone and address.',
  },
  product_missing: {
    ar: 'إدارة المنتجات: الصنف غير موجود في دليل المنتجات. أضفه بأبعاده ووزنه.',
    en: 'Product management: the item is missing from the product master. Add it with dimensions and weight.',
  },
  no_capacity_left: {
    ar: 'المخطط: الأسطول ممتلئ. أضف مركبة، أو أجّل أقل الطلبات إلحاحاً ما دام لديها هامش.',
    en: 'Planner: the fleet is full. Add a vehicle, or defer the least urgent orders while they still have slack.',
  },
  no_eligible_vehicle: {
    ar: 'المخطط: لا مركبة ولا سائق مؤهل لهذه المنطقة أو هذا التركيب. أعد الإسناد أو صعّد الأمر.',
    en: 'Planner: no vehicle or driver is eligible for this zone or installation. Reassign or escalate.',
  },
  route_blocked: {
    ar: 'الموزّع: أكّد الإغلاق في محاكي الاضطرابات ثم أعد تشغيل الموجة.',
    en: 'Dispatcher: confirm the closure in the disruption simulator, then re-run the wave.',
  },
  not_planned: {
    ar: 'المخطط: هذا الطلب خارج الموجة الحالية. أدرجه في الموجة التالية.',
    en: 'Planner: this order is outside the current wave. Include it in the next one.',
  },
};

const FALLBACK_ACTION = {
  ar: 'المخطط: راجع القيد المذكور أعلاه وعدّل الإسناد أو الأسطول.',
  en: 'Planner: review the constraint above and adjust the assignment or the fleet.',
};

export function OrderDetail({ t, lang, track, state, onOpenRoute }: Props) {
  const { order, customer, shipment } = track;
  const locality = customer ? LOCALITY_MAP.get(customer.localityId) : undefined;
  const vehicle = track.vehicleId ? VEHICLE_MAP.get(track.vehicleId) : undefined;
  const driver = track.driverId ? DRIVER_MAP.get(track.driverId) : undefined;
  const origin = track.originNodeId ? NODE_MAP.get(track.originNodeId) : undefined;
  const route = state.plan?.routes.find((r) => r.id === track.routeId);

  const stateTone =
    track.state === 'delivered' ? 'ok' : track.state === 'held' ? 'danger' : track.state === 'blocked' ? 'warn' : track.state === 'active' ? 'info' : '';

  return (
    <div className="grid">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="panel">
        <div className="panel-body">
          <div className="order-head">
            <div>
              <div className="order-id mono">{order.id}</div>
              <div className="order-name">{loc(lang, customer?.name, customer?.nameAr)}</div>
              <div className="cell-sub">{loc(lang, customer?.addressLine, customer?.addressLineAr)}</div>
            </div>
            <div className="order-head-meta">
              <span className={`chip ${stateTone}`}>{t(`state_${track.state}`)}</span>
              <div className="kv"><span>{t('colDue')}</span><b>{fmtDue(order.dueAt, PLAN_DATE, lang)}</b></div>
              {track.promisedWindow && (
                <div className="kv">
                  <span>{t('window')}</span>
                  <b className="mono ltr">
                    {fmtTime(track.promisedWindow.earliest)}–{fmtTime(track.promisedWindow.latest)}
                  </b>
                </div>
              )}
              {track.slackMinutes !== undefined && (
                <div className="kv">
                  <span>{t('slack')}</span>
                  <b className={track.slaRisk === 'ok' ? '' : 'risk'}>
                    {Math.round(track.slackMinutes / 60)} {t('hours')}
                  </b>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Blocker ─────────────────────────────────────────────────── */}
      {track.blocker && (
        <div className="panel blocker">
          <div className="panel-head">
            <h2>{t('blockerTitle')}</h2>
            <span className="chip danger mono">{track.blocker.reason}</span>
          </div>
          <div className="panel-body">
            <p style={{ margin: '0 0 6px', fontSize: 15 }}>{reasonText(track.blocker.reason, lang)}</p>
            <p className="tech-detail">
              <span>{t('technicalDetail')}</span> {track.blocker.detail}
            </p>
            <div className="action-box">
              <span className="action-label">{t('actionNeeded')}</span>
              <p style={{ margin: 0 }}>
                {(ACTIONS[track.blocker.reason] ?? FALLBACK_ACTION)[lang]}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-2">
        {/* ── Milestones ────────────────────────────────────────────── */}
        <div className="panel">
          <div className="panel-head">
            <h2>{t('milestones')}</h2>
            <span className="sub">{track.reachedCount}/{MILESTONES.length}</span>
          </div>
          <div className="panel-body">
            <ol className="timeline">
              {track.events.map((event, index) => {
                const isBlocked =
                  Boolean(track.blocker) && index === track.reachedCount;
                return (
                  <li
                    key={event.milestone}
                    className="tl-item"
                    data-done={event.reached}
                    data-blocked={isBlocked}
                    data-last={index === track.events.length - 1}
                  >
                    <span className="tl-dot">{event.reached ? '✓' : isBlocked ? '!' : ''}</span>
                    <div className="tl-body">
                      <div className="tl-title">{t(`ms_${event.milestone}`)}</div>
                      <div className="tl-time mono ltr">
                        {event.at && event.reached ? (
                          fmtStamp(event.at, PLAN_DATE, lang)
                        ) : (
                          <span className="tl-pending">{t('msPending')}</span>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>

        <div className="grid">
          {/* ── Customer and access ─────────────────────────────────── */}
          <div className="panel">
            <div className="panel-head"><h2>{t('customerInfo')}</h2></div>
            <div className="panel-body">
              <div className="kv-list">
                <div className="kv"><span>{t('phone')}</span><b className="mono ltr">{customer?.phone}</b></div>
                <div className="kv"><span>{t('colCity')}</span><b>{loc(lang, locality?.nameEn, locality?.nameAr)}</b></div>
                <div className="kv"><span>{t('channel')}</span><b>{t(`channel_${order.channel}`)}</b></div>
                <div className="kv"><span>{t('colPayment')}</span><b>{t(`pay_${order.paymentType}`)}</b></div>
                {order.amountDue > 0 && (
                  <div className="kv"><span>{t('collect')}</span><b className="mono">{fmtNum(order.amountDue)} {t('currency')}</b></div>
                )}
                <div className="kv">
                  <span>{t('geocodeConfidence')}</span>
                  <b className="mono">{customer ? customer.geocodeConfidence.toFixed(2) : '—'}</b>
                </div>
                <div className="kv">
                  <span>{t('access')}</span>
                  <b>
                    {customer && (
                      <>
                        {t('floor')} {customer.access.floor} ·{' '}
                        {customer.access.hasElevator && customer.access.elevatorFitsAppliance
                          ? t('elevator')
                          : t('noElevator')}
                      </>
                    )}
                  </b>
                </div>
              </div>
              {customer && !customer.access.surveyed && (
                <div className="alert warn" style={{ marginTop: 12 }}>{t('notSurveyed')}</div>
              )}
            </div>
          </div>

          {/* ── Assignment ──────────────────────────────────────────── */}
          <div className="panel">
            <div className="panel-head"><h2>{t('assignment')}</h2></div>
            <div className="panel-body">
              {route ? (
                <>
                  <div className="kv-list">
                    <div className="kv"><span>{t('vehicle')}</span><b className="mono">{vehicle?.plate}</b></div>
                    <div className="kv"><span>{t('driver')}</span><b>{loc(lang, driver?.name, driver?.nameAr)}</b></div>
                    <div className="kv"><span>{t('origin')}</span><b>{loc(lang, origin?.nameEn, origin?.nameAr)}</b></div>
                    <div className="kv"><span>{t('stopOf')}</span><b className="mono">{track.stopSeq} / {route.stops.length}</b></div>
                    <div className="kv"><span>{t('eta')}</span><b className="mono ltr">{track.plannedArrival ? fmtTime(track.plannedArrival) : '—'}</b></div>
                  </div>
                  <button className="btn ghost block" style={{ marginTop: 14 }} onClick={() => onOpenRoute(route.id)}>
                    {t('navTower')} · {route.id}
                  </button>
                </>
              ) : (
                <div className="empty">{t('notAssigned')}</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Items ───────────────────────────────────────────────────── */}
      <div className="panel">
        <div className="panel-head">
          <h2>{t('orderItems')}</h2>
          {shipment && (
            <span className="sub ltr">
              {fmtNum(shipment.totalCubeM3, 2)} m³ · {fmtNum(shipment.totalWeightKg)} kg · {shipment.serviceMinutes} min
            </span>
          )}
        </div>
        <div className="panel-body tight">
          <div className="scroll-x">
            <table>
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>{lang === 'ar' ? 'الصنف' : 'Item'}</th>
                  <th>{lang === 'ar' ? 'الكمية' : 'Qty'}</th>
                  <th>m³</th>
                  <th>kg</th>
                  <th>{t('skillsNeeded')}</th>
                </tr>
              </thead>
              <tbody>
                {order.lines.map((line) => {
                  const product = PRODUCT_MAP.get(line.sku);
                  if (!product) return null;
                  return (
                    <tr key={line.sku}>
                      <td className="mono" style={{ fontSize: 11 }}>{line.sku}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          <span className={`chip ${product.productClass.toLowerCase()}`}>{product.productClass}</span>
                          <span>{loc(lang, product.nameEn, product.nameAr)}</span>
                          {product.fragile && <span className="chip fragile">{t('fragile')}</span>}
                        </div>
                      </td>
                      <td className="mono">{line.quantity}</td>
                      <td className="mono">{(product.cubeM3 * line.quantity).toFixed(2)}</td>
                      <td className="mono">{(product.weightKg * line.quantity).toFixed(0)}</td>
                      <td>
                        <span className="chip">{t(`install_${product.installType}`)}</span>
                        {product.crewRequired === 2 && (
                          <span className="chip" style={{ marginInlineStart: 4 }}>
                            {lang === 'ar' ? 'شخصان' : '2 crew'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Follow-up log ───────────────────────────────────────────── */}
      <div className="panel">
        <div className="panel-head"><h2>{t('followUp')}</h2></div>
        <div className="panel-body">
          <div className="log">
            {track.events
              .filter((event) => event.reached && event.at)
              .reverse()
              .map((event) => (
                <div className="log-row" key={event.milestone}>
                  <span className="log-time mono ltr">{fmtStamp(event.at!, PLAN_DATE, lang)}</span>
                  <span className="log-text">{t(`ms_${event.milestone}`)}</span>
                </div>
              ))}
            {track.blocker && (
              <div className="log-row">
                <span className="log-time mono">—</span>
                <span className="log-text" style={{ color: 'var(--red)' }}>{reasonText(track.blocker.reason, lang)}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

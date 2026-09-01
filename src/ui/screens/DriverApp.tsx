import { useEffect, useMemo, useState } from 'react';
import { fmtCube, fmtNum, fmtTime, type PlanState } from '../usePlan';
import { PRODUCT_MAP } from '../../data/catalog';
import { DRIVER_MAP, VEHICLE_MAP } from '../../data/fleet';
import { NODE_MAP } from '../../data/gazetteer';
import { loc, type Lang } from '../i18n';
import { activatable } from '../activate';
import { accessLabelKey, needsStairCarry } from '../access';

interface Props {
  t: (key: string) => string;
  lang: Lang;
  state: PlanState;
  selectedRouteId: string | null;
  setSelectedRouteId: (id: string) => void;
}

type Phase = 'enroute' | 'arrived' | 'service' | 'closed';

const EXCEPTIONS = [
  { code: 'customer_absent', key: 'exCustomerAbsent' },
  { code: 'does_not_fit', key: 'exDoesNotFit' },
  { code: 'damaged_in_transit', key: 'exDamaged' },
  { code: 'payment_not_ready', key: 'exPayment' },
  { code: 'customer_refused', key: 'exRefused' },
  { code: 'route_blocked', key: 'exBlocked' },
];

/**
 * The driver's phone. Offline-first by design (docs/03 §5): the manifest is held locally
 * and every action queues, because a crew must never be stuck at a customer's door
 * waiting for a bar of signal.
 */
export function DriverApp({ t, lang, state, selectedRouteId, setSelectedRouteId }: Props) {
  const { plan, shipmentMap, customerMap } = state;
  const route = plan?.routes.find((r) => r.id === selectedRouteId) ?? plan?.routes[0];

  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('enroute');
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [outcomes, setOutcomes] = useState<Record<string, string>>({});
  const [showExceptions, setShowExceptions] = useState(false);

  // Re-planning replaces the route entirely; the phone has to start from the top.
  //
  // Keyed on the plan, not on route.id: ids are positional (`RT-${n}`), so the same
  // string comes back after a re-plan attached to a different vehicle and a different
  // stop list. Keyed on the id this never fired — the driver kept a cursor of 7 against
  // a 6-stop route, so `done` went true and the phone showed "route complete" with every
  // stop marked failed, for a route on which nothing had been delivered.
  useEffect(() => {
    setIndex(0);
    setPhase('enroute');
    setChecked(new Set());
    setOutcomes({});
    setShowExceptions(false);
  }, [plan, route?.id]);

  const stop = route?.stops[index];
  const shipment = stop ? shipmentMap.get(stop.shipmentId) : undefined;
  const customer = shipment ? customerMap.get(shipment.customerId) : undefined;

  const checklist = useMemo(() => {
    if (!shipment) return [];
    const needsInstall = shipment.requiresSkills.length > 0;
    const items = [
      { id: 'unload', key: 'chkUnload' },
      { id: 'position', key: 'chkPosition' },
    ];
    if (needsInstall) {
      items.push({ id: 'install', key: 'chkInstall' });
      items.push({ id: 'test', key: 'chkTest' });
    }
    items.push({ id: 'photos', key: 'chkPhotos' });
    items.push({ id: 'signature', key: 'chkSignature' });
    if (shipment.amountDue > 0) items.push({ id: 'payment', key: 'chkPayment' });
    items.push({ id: 'waste', key: 'chkWaste' });
    return items;
  }, [shipment]);

  if (!plan || !route) return <div className="empty">{t('replanning')}</div>;

  const vehicle = VEHICLE_MAP.get(route.vehicleId);
  const driver = DRIVER_MAP.get(route.driverId);
  const allChecked = checklist.every((item) => checked.has(item.id));
  const done = index >= route.stops.length;

  const advance = () => {
    if (!stop) return;
    setOutcomes({ ...outcomes, [stop.shipmentId]: 'delivered' });
    setChecked(new Set());
    // As fail() already does. Left open, the six red failure buttons followed the
    // driver to the next customer, where one tap fails that stop with no confirmation.
    setShowExceptions(false);
    setPhase('enroute');
    setIndex(index + 1);
  };

  const fail = (code: string) => {
    if (!stop) return;
    setOutcomes({ ...outcomes, [stop.shipmentId]: code });
    setChecked(new Set());
    setShowExceptions(false);
    setPhase('enroute');
    setIndex(index + 1);
  };

  const phaseIndex = phase === 'enroute' ? 0 : phase === 'arrived' ? 1 : phase === 'service' ? 2 : 3;

  return (
    <div className="phone-stage">
      <div className="phone">
        <div className="phone-status">
          <span>●</span>
          <span>{vehicle?.plate} · {loc(lang, driver?.name, driver?.nameAr)}</span>
          <span style={{ marginInlineStart: 'auto' }}>{t('offline')}</span>
        </div>

        <div className="phone-body">
          {done ? (
            <>
              <div className="alert ok lead-line">{t('routeComplete')}</div>
              <div className="panel" style={{ background: 'var(--bg-inset)' }}>
                <div className="panel-body">
                  {route.stops.map((s) => {
                    const sh = shipmentMap.get(s.shipmentId);
                    const c = sh ? customerMap.get(sh.customerId) : undefined;
                    const outcome = outcomes[s.shipmentId];
                    return (
                      <div className="item-row" key={s.shipmentId}>
                        <span className="mono" style={{ color: 'var(--text-dim)' }}>{s.seq}</span>
                        <div className="grow">
                          <div className="name">{loc(lang, c?.name, c?.nameAr)}</div>
                          <div className="meta">{fmtTime(s.arriveAt)}</div>
                        </div>
                        <span className={`chip ${outcome === 'delivered' ? 'ok' : 'danger'}`}>
                          {outcome === 'delivered' ? '✓' : '!'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="alert info" style={{ marginTop: 12 }}>{t('syncQueued')}</div>
            </>
          ) : (
            stop && shipment && customer && (
              <>
                <div className="step-rail">
                  {[0, 1, 2, 3].map((i) => <i key={i} data-on={i <= phaseIndex} />)}
                </div>

                <div className="stop-head">
                  <span className="stop-counter">{t('stopOf')} {stop.seq} {t('of')} {route.stops.length}</span>
                </div>
                <div className="stop-name">{loc(lang, customer.name, customer.nameAr)}</div>
                <div className="stop-addr">{loc(lang, customer.addressLine, customer.addressLineAr)}</div>

                <div className="window-badge">
                  <div className="label">{t('window')}</div>
                  <div className="value" dir="ltr">{fmtTime(stop.promisedWindow.earliest)} – {fmtTime(stop.promisedWindow.latest)}</div>
                </div>

                {!customer.access.surveyed && <div className="alert warn">{t('notSurveyed')}</div>}
                {needsStairCarry(customer.access) && (
                  <div className="alert warn">
                    {t('floor')} {customer.access.floor} · {t(accessLabelKey(customer.access))}
                    {customer.access.narrowStairs ? ` · ${t('narrowStairs')}` : ''}
                  </div>
                )}

                {phase === 'enroute' && (
                  <>
                    <div className="item-row"><span className="grow">{t('travel')}</span><span className="mono">{fmtNum(stop.travelKmFromPrev, 1)} {t('km')} · {stop.travelMinutesFromPrev} {t('min')}</span></div>
                    <div className="item-row"><span className="grow">{t('service')}</span><span className="mono">{stop.serviceMinutes} {t('min')}</span></div>
                    <div className="item-row"><span className="grow">{t('collect')}</span><span className="mono">{shipment.amountDue > 0 ? `${fmtNum(shipment.amountDue)} ${t('currency')}` : t('paid')}</span></div>
                  </>
                )}

                {(phase === 'arrived' || phase === 'enroute') && (
                  <div style={{ marginTop: 14 }}>
                    {shipment.units.map((unit) => {
                      const product = PRODUCT_MAP.get(unit.sku)!;
                      return (
                        <div className="item-row" key={unit.sku}>
                          <span className={`chip ${unit.productClass.toLowerCase()}`}>{unit.productClass}</span>
                          <div className="grow">
                            <div className="name">{lang === 'ar' ? product.nameAr : product.nameEn}</div>
                            <div className="meta">
                              <span className="ltr">×{unit.quantity} · {fmtCube(unit.cubeM3)} {t('m3')} · {unit.weightKg.toFixed(0)} {t('kg')}</span>
                              {product.crewRequired === 2 ? ` · ${lang === 'ar' ? 'شخصان' : '2 crew'}` : ''}
                            </div>
                          </div>
                          {unit.fragile && <span className="chip fragile">{t('fragile')}</span>}
                        </div>
                      );
                    })}
                  </div>
                )}

                {phase === 'service' && (
                  <div style={{ marginTop: 6 }}>
                    <div className="panel-head" style={{ marginInline: -14, marginBottom: 12 }}>
                      <h2>{t('checklist')}</h2>
                      <span className="sub">{checked.size}/{checklist.length}</span>
                    </div>
                    {checklist.map((item) => {
                      const isDone = checked.has(item.id);
                      return (
                        <div
                          key={item.id}
                          className="check-item"
                          data-done={isDone}
                          role="checkbox"
                          aria-checked={isDone}
                          aria-label={t(item.key)}
                          {...activatable(() => {
                            const next = new Set(checked);
                            if (next.has(item.id)) next.delete(item.id);
                            else next.add(item.id);
                            setChecked(next);
                          })}
                        >
                          <span className="check-box">{isDone ? '✓' : ''}</span>
                          <span>{t(item.key)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {showExceptions && (
                  <div style={{ marginTop: 12 }}>
                    {EXCEPTIONS.map((exception) => (
                      <button key={exception.code} className="btn danger block" style={{ marginBottom: 6 }} onClick={() => fail(exception.code)}>
                        {t(exception.key)}
                      </button>
                    ))}
                    <button
                      className="btn ghost block"
                      aria-label={t('cancel')}
                      title={t('cancel')}
                      onClick={() => setShowExceptions(false)}
                    >
                      ✕
                    </button>
                  </div>
                )}
              </>
            )
          )}
        </div>

        {!done && stop && (
          <div className="phone-foot">
            {phase === 'enroute' && (
              <>
                <button className="btn block" onClick={() => setPhase('arrived')} style={{ marginBottom: 8 }}>{t('navigate')} → {t('arrived')}</button>
                <button className="btn ghost block" onClick={() => setShowExceptions(!showExceptions)}>{t('reportProblem')}</button>
              </>
            )}
            {phase === 'arrived' && (
              <>
                <button className="btn block" onClick={() => setPhase('service')} style={{ marginBottom: 8 }}>{t('startService')}</button>
                <button className="btn ghost block" onClick={() => setShowExceptions(!showExceptions)}>{t('reportProblem')}</button>
              </>
            )}
            {phase === 'service' && (
              <>
                <button className="btn block" disabled={!allChecked} onClick={advance} style={{ marginBottom: 8 }}>
                  {t('completeStop')}
                </button>
                <button className="btn ghost block" onClick={() => setShowExceptions(!showExceptions)}>{t('reportProblem')}</button>
              </>
            )}
          </div>
        )}
      </div>

      {/* ---- Explanatory panel for the demo audience ---- */}
      <div className="driver-notes grid">
        <div className="panel">
          <div className="panel-head">
            <h2>{t('todayRoute')}</h2>
            <span className="sub">{NODE_MAP.get(route.originNodeId)?.[lang === 'ar' ? 'nameAr' : 'nameEn']}</span>
          </div>
          <div className="panel-body">
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
              {plan.routes.map((option) => (
                <button
                  key={option.id}
                  className={`btn ${option.id === route.id ? '' : 'ghost'}`}
                  onClick={() => setSelectedRouteId(option.id)}
                >
                  {VEHICLE_MAP.get(option.vehicleId)?.plate}
                </button>
              ))}
            </div>
            <table>
              <tbody>
                {route.stops.map((s) => {
                  const sh = shipmentMap.get(s.shipmentId);
                  const c = sh ? customerMap.get(sh.customerId) : undefined;
                  const outcome = outcomes[s.shipmentId];
                  return (
                    <tr key={s.shipmentId} data-selected={s.seq === (stop?.seq ?? -1)}>
                      <td className="mono" style={{ width: 30 }}>{s.seq}</td>
                      <td>{loc(lang, c?.name, c?.nameAr)}</td>
                      <td className="mono ltr">{fmtTime(s.promisedWindow.earliest)}–{fmtTime(s.promisedWindow.latest)}</td>
                      <td>{outcome && <span className={`chip ${outcome === 'delivered' ? 'ok' : 'danger'}`}>{outcome === 'delivered' ? '✓' : '!'}</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

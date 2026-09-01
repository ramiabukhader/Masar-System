import { useEffect, useMemo, useState } from 'react';
import { InfoTip } from '../components/InfoTip';
import { fmtCube, fmtNum, fmtTime, type PlanState } from '../usePlan';
import { NODE_MAP } from '../../data/gazetteer';
import { PRODUCT_MAP } from '../../data/catalog';
import { VEHICLE_MAP } from '../../data/fleet';
import { loc, type Lang } from '../i18n';
import { activatable } from '../activate';
import { accessLabelKey } from '../access';

interface Props {
  t: (key: string) => string;
  lang: Lang;
  state: PlanState;
  selectedRouteId: string | null;
  setSelectedRouteId: (id: string) => void;
}

/**
 * The tablet screen on the loading dock. Two jobs: tell the picker what to bring, and
 * tell the loader what order to put it in the truck.
 */
export function BranchOps({ t, lang, state, selectedRouteId, setSelectedRouteId }: Props) {
  const { plan, shipmentMap, customerMap } = state;
  const [verified, setVerified] = useState<Set<number>>(new Set());

  const route = plan?.routes.find((r) => r.id === selectedRouteId) ?? plan?.routes[0];

  // A tick means "I have seen this item on this manifest", so it cannot outlive the
  // manifest. Route ids are positional, so a re-plan hands the same id a different load
  // plan; clearing only in the route-picker left 18 ticks against a 10-line manifest —
  // "18/10 verified", a bar at 180%, and all ten new rows showing as already scanned,
  // on the one screen whose job is to prove each item was checked.
  useEffect(() => {
    setVerified(new Set());
  }, [plan, route?.id]);

  const pickList = useMemo(() => {
    if (!route) return [];
    const totals = new Map<string, number>();
    for (const stop of route.stops) {
      const shipment = shipmentMap.get(stop.shipmentId);
      if (!shipment) continue;
      for (const unit of shipment.units) {
        totals.set(unit.sku, (totals.get(unit.sku) ?? 0) + unit.quantity);
      }
    }
    return [...totals].map(([sku, quantity]) => ({ sku, quantity, product: PRODUCT_MAP.get(sku)! }));
  }, [route, shipmentMap]);

  if (!plan || !route) return <div className="empty">{t('replanning')}</div>;

  const vehicle = VEHICLE_MAP.get(route.vehicleId);
  const progress = route.loadPlan.length ? verified.size / route.loadPlan.length : 0;

  const toggle = (seq: number) => {
    const next = new Set(verified);
    if (next.has(seq)) next.delete(seq);
    else next.add(seq);
    setVerified(next);
  };

  return (
    <div className="grid">
      <div className="panel">
        <div className="panel-head">
          <h2>{t('navBranch')}</h2>
          <span className="sub">{NODE_MAP.get(route.originNodeId)?.[lang === 'ar' ? 'nameAr' : 'nameEn']}</span>
        </div>
        <div className="panel-body">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {plan.routes.map((option) => (
              <button
                key={option.id}
                className={`btn ${option.id === route.id ? '' : 'ghost'}`}
                style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                onClick={() => {
                  setSelectedRouteId(option.id);
                  setVerified(new Set());
                }}
              >
                {VEHICLE_MAP.get(option.vehicleId)?.plate}
                <span style={{ opacity: 0.7, fontWeight: 400 }}>· {option.metrics.stopCount}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-2">
        {/* ---- Pick list ---- */}
        <div className="panel">
          <div className="panel-head">
            <h2>{t('pickList')}</h2>
            <span className="sub">{pickList.length} SKU · {fmtCube(route.metrics.loadM3)} {t('m3')}</span>
          </div>
          <div className="panel-body tight">
            <table>
              <thead>
                <tr><th>SKU</th><th>{lang === 'ar' ? 'الصنف' : 'Item'}</th><th>{lang === 'ar' ? 'الكمية' : 'Qty'}</th><th>{t('m3')}</th></tr>
              </thead>
              <tbody>
                {pickList.map((line) => (
                  <tr key={line.sku}>
                    <td className="mono">{line.sku}</td>
                    <td>
                      <div>{lang === 'ar' ? line.product.nameAr : line.product.nameEn}</div>
                      <div style={{ display: 'flex', gap: 5, marginTop: 3, flexWrap: 'wrap' }}>
                        <span className={`chip ${line.product.productClass.toLowerCase()}`}>{line.product.productClass}</span>
                        {line.product.fragile && <span className="chip fragile">{t('fragile')}</span>}
                        {line.product.installType !== 'none' && <span className="chip attr">{t('installNeeded')}</span>}
                        {line.product.dimensionsEstimated && <span className="chip">{t('estimatedDims')}</span>}
                      </div>
                    </td>
                    <td className="mono">{line.quantity}</td>
                    <td className="mono">{fmtCube(line.product.cubeM3 * line.quantity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ---- Load manifest ---- */}
        <div className="panel">
          <div className="panel-head">
            <h2>{t('loadManifest')}<InfoTip text={t('loadOrderHint')} label={t('explain')} /></h2>
            <span className="sub">{verified.size}/{route.loadPlan.length} {t('verified')}</span>
          </div>
          <div className="panel-body">
            <div className="bar" style={{ marginBottom: 12, height: 8 }}>
              <i style={{ width: `${progress * 100}%`, background: progress === 1 ? 'var(--green)' : 'var(--progress)' }} />
            </div>
            <div className="scroll">
              <table>
                <thead>
                  <tr>
                    <th>{t('loadSeq')}</th>
                    <th>{lang === 'ar' ? 'الصنف' : 'Item'}</th>
                    <th>{t('position')}</th>
                    <th>{t('deliverySeq')}</th>
                    <th>{t('scanToVerify')}</th>
                  </tr>
                </thead>
                <tbody>
                  {route.loadPlan.map((line) => {
                    const product = PRODUCT_MAP.get(line.sku)!;
                    const isVerified = verified.has(line.loadSeq);
                    return (
                      // The row keeps its implicit `row` role. Overriding it with
                      // `checkbox` left the <tbody> rowgroup owning nothing, so the
                      // manifest exposed five column headers and zero rows — table
                      // navigation could not reach the Position column at all, on the
                      // one screen whose job is proving each item was checked. The
                      // checkbox semantics belong to the scan cell, not to the row.
                      <tr
                        key={line.loadSeq}
                        className="clickable"
                        {...activatable(() => toggle(line.loadSeq))}
                      >
                        <td className="mono" style={{ fontWeight: 700, color: 'var(--progress)' }}>{line.loadSeq}</td>
                        <td>
                          <div>{lang === 'ar' ? product.nameAr : product.nameEn}</div>
                          {line.fragile && <span className="chip fragile">{t('fragile')}</span>}
                        </td>
                        <td>{t(line.zoneInVehicle)}</td>
                        <td className="mono">{line.deliverySeq}</td>
                        <td>
                          <span
                            className="check-box"
                            role="checkbox"
                            aria-checked={isVerified}
                            aria-label={`${t('scanToVerify')} ${line.loadSeq} — ${lang === 'ar' ? product.nameAr : product.nameEn}`}
                            style={isVerified ? { background: 'var(--green-solid)', borderColor: 'var(--green-solid)' } : undefined}
                          >
                            {isVerified ? '✓' : ''}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* ---- Dispatch summary ---- */}
      <div className="panel">
        <div className="panel-head">
          <h2>{vehicle?.plate} · {t('stops')}</h2>
          <span className="sub ltr">
            {fmtTime(route.startAt)} → {fmtTime(route.endAt)} · {fmtCube(route.metrics.loadM3)}/{vehicle?.capacityM3} {t('m3')} · {fmtNum(route.metrics.loadKg)}/{vehicle?.capacityKg} {t('kg')}
          </span>
        </div>
        <div className="panel-body tight">
          <div className="scroll-x">
            <table>
              <thead>
                <tr><th>{t('deliverySeq')}</th><th>{lang === 'ar' ? 'الزبون' : 'Customer'}</th><th>{t('window')}</th><th>{t('access')}</th><th>{t('collect')}</th></tr>
              </thead>
              <tbody>
                {route.stops.map((stop) => {
                  const shipment = shipmentMap.get(stop.shipmentId);
                  const customer = shipment ? customerMap.get(shipment.customerId) : undefined;
                  return (
                    <tr key={stop.shipmentId}>
                      <td className="mono">{stop.seq}</td>
                      <td>
                        <div>{loc(lang, customer?.name, customer?.nameAr)}</div>
                        <div className="cell-sub">{loc(lang, customer?.addressLine, customer?.addressLineAr)}</div>
                      </td>
                      <td className="mono ltr">{fmtTime(stop.promisedWindow.earliest)}–{fmtTime(stop.promisedWindow.latest)}</td>
                      <td>
                        {customer && (
                          <>
                            {t('floor')} {customer.access.floor}
                            {' · '}
                            {t(accessLabelKey(customer.access))}
                            {!customer.access.surveyed && <div><span className="chip warn">{t('notSurveyed')}</span></div>}
                          </>
                        )}
                      </td>
                      <td className="mono">
                        {shipment && shipment.amountDue > 0 ? `${fmtNum(shipment.amountDue)} ${t('currency')}` : t('paid')}
                      </td>
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

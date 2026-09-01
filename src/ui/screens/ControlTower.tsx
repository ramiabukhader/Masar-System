import { NetworkMap } from '../components/NetworkMap';
import { InfoTip } from '../components/InfoTip';
import { fmtNum, fmtTime, type Disruptions, type PlanState } from '../usePlan';
import { NODE_MAP } from '../../data/gazetteer';
import { DRIVER_MAP, VEHICLE_MAP } from '../../data/fleet';
import { fill, loc, type Lang } from '../i18n';
import { reasonText } from '../reasons';
import { activatable } from '../activate';

interface Props {
  t: (key: string) => string;
  lang: Lang;
  state: PlanState;
  disruptions: Disruptions;
  setDisruptions: (value: Disruptions) => void;
  selectedRouteId: string | null;
  setSelectedRouteId: (id: string) => void;
}

export function ControlTower({
  t,
  lang,
  state,
  disruptions,
  setDisruptions,
  selectedRouteId,
  setSelectedRouteId,
}: Props) {
  const { plan, baseline, shipmentMap, customerMap, held, loading } = state;

  if (!plan || !baseline) {
    return <div className="empty">{t('replanning')}</div>;
  }

  const costDelta = ((plan.metrics.costPerDrop - baseline.costPerDrop) / baseline.costPerDrop) * 100;
  const kmDelta = ((plan.metrics.totalDistanceKm - baseline.totalDistanceKm) / baseline.totalDistanceKm) * 100;
  const selected = plan.routes.find((r) => r.id === selectedRouteId) ?? null;

  return (
    <div className="grid" style={{ opacity: loading ? 0.55 : 1, transition: 'opacity 0.2s' }}>
      {/* ---- KPI row ---- */}
      <div className="grid grid-kpi">
        <Kpi label={t('kpiCostPerDrop')} value={fmtNum(plan.metrics.costPerDrop, 0)} unit={t('currency')} delta={costDelta} />
        <Kpi label={t('kpiDistance')} value={fmtNum(plan.metrics.totalDistanceKm)} unit={t('km')} delta={kmDelta} />
        <Kpi label={t('kpiRoutes')} value={String(plan.metrics.routeCount)} unit={`/ ${baseline.routeCount}`} delta={((plan.metrics.routeCount - baseline.routeCount) / baseline.routeCount) * 100} />
        <Kpi label={t('kpiDrops')} value={String(plan.metrics.assignedCount)} />
        <Kpi
          label={t('kpiFill')}
          value={fmtNum(plan.metrics.avgCubeUtilisation * 100)}
          unit="%"
          delta={((plan.metrics.avgCubeUtilisation - baseline.avgCubeUtilisation) / Math.max(baseline.avgCubeUtilisation, 0.01)) * 100}
          higherIsBetter
        />
        <Kpi label={t('kpiSlaRisk')} value={String(plan.metrics.slaAtRiskCount)} tone={plan.metrics.slaAtRiskCount > 0 ? 'warn' : 'ok'} />
        <Kpi label={t('kpiUnassigned')} value={String(plan.metrics.unassignedCount)} tone={plan.metrics.unassignedCount > 0 ? 'warn' : 'ok'} />
        <Kpi label={t('kpiHeld')} value={String(held.length)} tone={held.length > 0 ? 'warn' : 'ok'} />
      </div>

      <div className="grid grid-2">
        {/* ---- Before / after ---- */}
        <div className="panel">
          <div className="panel-head">
            <h2>{t('planTitle')}<InfoTip text={t('baselineCaveat')} label={t('explain')} /></h2>
            <span className="sub">{plan.id}</span>
          </div>
          <div className="panel-body">
            <div className="compare">
              <div className="compare-side">
                <div className="compare-title">{t('before')}</div>
                <CompareRow label={t('kpiCostPerDrop')} value={`${fmtNum(baseline.costPerDrop)} ${t('currency')}`} />
                <CompareRow label={t('kpiDistance')} value={`${fmtNum(baseline.totalDistanceKm)} ${t('km')}`} />
                <CompareRow label={t('kpiRoutes')} value={String(baseline.routeCount)} />
                <CompareRow label={t('kpiFill')} value={`${fmtNum(baseline.avgCubeUtilisation * 100)}%`} />
                <CompareRow label={t('kpiDriveTime')} value={`${fmtNum(baseline.totalDriveMinutes / 60, 1)} ${t('hours')}`} />
                <CompareRow label={t('kpiUnassigned')} value={String(baseline.undeliverableCount)} />
              </div>
              <div className="compare-arrow">{lang === 'ar' ? '←' : '→'}</div>
              <div className="compare-side after">
                <div className="compare-title">{t('after')}</div>
                <CompareRow label={t('kpiCostPerDrop')} value={`${fmtNum(plan.metrics.costPerDrop)} ${t('currency')}`} />
                <CompareRow label={t('kpiDistance')} value={`${fmtNum(plan.metrics.totalDistanceKm)} ${t('km')}`} />
                <CompareRow label={t('kpiRoutes')} value={String(plan.metrics.routeCount)} />
                <CompareRow label={t('kpiFill')} value={`${fmtNum(plan.metrics.avgCubeUtilisation * 100)}%`} />
                <CompareRow label={t('kpiDriveTime')} value={`${fmtNum(plan.metrics.totalDriveMinutes / 60, 1)} ${t('hours')}`} />
                <CompareRow label={t('kpiUnassigned')} value={String(plan.metrics.unassignedCount)} />
              </div>
            </div>
          </div>
        </div>

        {/* ---- Disruption simulator ---- */}
        <div className="panel">
          <div className="panel-head">
            <h2>{t('disruptions')}<InfoTip text={t('disruptionHint')} label={t('explain')} /></h2>
            {loading && <span className="sub">{t('replanning')}</span>}
          </div>
          <div className="panel-body">
            <Toggle
              label={t('closeJerusalem')}
              on={disruptions.jerusalemClosed}
              onToggle={() => setDisruptions({ ...disruptions, jerusalemClosed: !disruptions.jerusalemClosed })}
            />
            <Toggle
              label={t('slowNorth')}
              on={disruptions.northCongested}
              onToggle={() => setDisruptions({ ...disruptions, northCongested: !disruptions.northCongested })}
            />
            <Toggle
              label={t('truckDown')}
              on={disruptions.truckDown}
              onToggle={() => setDisruptions({ ...disruptions, truckDown: !disruptions.truckDown })}
            />

            {/* Diagnostic, not operational — folded away so it stops competing
                with the switches above it for the reader's attention. */}
            <details className="log-details">
              <summary>
                {t('solverLog')}
                <span className="log-count">{plan.solverLog.length}</span>
                <InfoTip text={t('solverLogNote')} label={t('explain')} />
              </summary>
              <div className="log-body">
                {plan.solverLog.map((entry, i) => (
                  <div className="log-line" key={i}>
                    <span className="log-phase">{t(`sp_${entry.phase}`)}</span>
                    <span style={{ flex: 1 }}>{fill(t(`sl_${entry.code}`), entry.params)}</span>
                    <span className="log-time">{entry.elapsedMs}ms</span>
                  </div>
                ))}
              </div>
            </details>
          </div>
        </div>
      </div>

      {/* ---- Map + routes ---- */}
      <div className="panel">
        <div className="panel-head">
          <h2>{t('networkMap')}</h2>
          <span className="sub">{t('routes')}: {plan.routes.length}</span>
        </div>
        <div className="panel-body">
          <div className="map-wrap">
            <NetworkMap
              plan={plan}
              nodes={NODE_MAP}
              shipmentMap={shipmentMap}
              selectedRouteId={selectedRouteId}
              onSelectRoute={setSelectedRouteId}
            />
            <div style={{ flex: 1, minWidth: 320 }}>
              <div className="scroll-x">
                <table>
                  <thead>
                    <tr>
                      <th></th>
                      <th>{t('vehicle')}</th>
                      <th>{t('origin')}</th>
                      <th>{t('stops')}</th>
                      <th>{t('kpiDistance')}</th>
                      <th>{t('load')}</th>
                      <th>{t('cost')}</th>
                      <th>{t('eta')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plan.routes.map((route) => {
                      const vehicle = VEHICLE_MAP.get(route.vehicleId);
                      const driver = DRIVER_MAP.get(route.driverId);
                      const fill = route.metrics.cubeUtilisation;
                      return (
                        <tr
                          key={route.id}
                          className="clickable"
                          data-selected={selectedRouteId === route.id}
                          {...activatable(() => setSelectedRouteId(route.id))}
                        >
                          <td><span className="dot" data-on={selectedRouteId === route.id} /></td>
                          <td>
                            <div className="mono">{vehicle?.plate}</div>
                            <div className="cell-sub">{loc(lang, driver?.name, driver?.nameAr)}</div>
                          </td>
                          <td>{NODE_MAP.get(route.originNodeId)?.[lang === 'ar' ? 'nameAr' : 'nameEn']}</td>
                          <td className="mono">{route.metrics.stopCount}</td>
                          <td className="mono">{fmtNum(route.metrics.distanceKm)}</td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div className="bar"><i style={{ width: `${Math.min(fill * 100, 100)}%` }} data-low={fill < 0.5} /></div>
                              <span className="mono">{fmtNum(fill * 100)}%</span>
                            </div>
                          </td>
                          <td className="mono">{fmtNum(route.metrics.cost)}</td>
                          <td className="mono ltr">{fmtTime(route.startAt)}–{fmtTime(route.endAt)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ---- Selected route stops ---- */}
      {selected && (
        <div className="panel">
          <div className="panel-head">
            <h2>{selected.id} · {VEHICLE_MAP.get(selected.vehicleId)?.plate} · {loc(lang, DRIVER_MAP.get(selected.driverId)?.name, DRIVER_MAP.get(selected.driverId)?.nameAr)}</h2>
            <span className="sub">{selected.metrics.stopCount} {t('stops')} · {fmtNum(selected.metrics.distanceKm)} {t('km')} · {fmtNum(selected.metrics.cost)} {t('currency')}</span>
          </div>
          <div className="panel-body tight">
            <div className="scroll scroll-x">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>{t('stops')}</th>
                    <th>{t('window')}</th>
                    <th>{t('eta')}</th>
                    <th>{t('travel')}</th>
                    <th>{t('service')}</th>
                    <th>{t('slack')}</th>
                    <th>{t('load')}</th>
                  </tr>
                </thead>
                <tbody>
                  {selected.stops.map((stop) => {
                    const shipment = shipmentMap.get(stop.shipmentId);
                    const customer = shipment ? customerMap.get(shipment.customerId) : undefined;
                    const tight = stop.slackMinutes < 90;
                    return (
                      <tr key={stop.shipmentId}>
                        <td className="mono">{stop.seq}</td>
                        <td>
                          <div>{loc(lang, customer?.name, customer?.nameAr)}</div>
                          <div className="cell-sub">{loc(lang, customer?.addressLine, customer?.addressLineAr)}</div>
                        </td>
                        <td className="mono ltr">{fmtTime(stop.promisedWindow.earliest)}–{fmtTime(stop.promisedWindow.latest)}</td>
                        <td className="mono">{fmtTime(stop.arriveAt)}</td>
                        <td className="mono">{fmtNum(stop.travelKmFromPrev, 1)} {t('km')} · {stop.travelMinutesFromPrev} {t('min')}</td>
                        <td className="mono">{stop.serviceMinutes} {t('min')}</td>
                        <td>
                          <span className={`chip ${tight ? 'warn' : 'ok'}`}>{Math.round(stop.slackMinutes / 60)} {t('hours')}</span>
                        </td>
                        <td>
                          {shipment?.units.map((unit) => (
                            <span key={unit.sku} className={`chip ${unit.productClass.toLowerCase()}`} style={{ marginInlineEnd: 4 }}>
                              {unit.productClass}{unit.quantity > 1 ? ` ×${unit.quantity}` : ''}
                            </span>
                          ))}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ---- Exceptions ---- */}
      <div className="grid grid-2">
        <div className="panel">
          <div className="panel-head"><h2>{t('kpiUnassigned')}<InfoTip text={t('unassignedHint')} label={t('explain')} /></h2><span className="sub">{plan.unassigned.length}</span></div>
          <div className="panel-body">
            {plan.unassigned.length === 0 ? (
              <div className="empty">{t('noneToday')}</div>
            ) : (
              plan.unassigned.map((item) => (
                <ExceptionRow
                  key={item.shipmentId}
                  id={item.shipmentId}
                  reason={reasonText(item.reason, lang)}
                  detail={item.detail}
                  t={t}
                />
              ))
            )}
          </div>
        </div>

        <div className="panel">
          <div className="panel-head"><h2>{t('heldOrders')}<InfoTip text={t('heldHint')} label={t('explain')} /></h2><span className="sub">{held.length}</span></div>
          <div className="panel-body">
            <div className="scroll">
              {held.map((item) => (
                <ExceptionRow
                  key={item.orderId}
                  id={item.orderId}
                  reason={reasonText(item.reason, lang)}
                  detail={item.detail}
                  t={t}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * One exception, on one line. The reason a dispatcher acts on is in Arabic and
 * in front of them; the solver's own English technical detail is real evidence
 * but it is for whoever is debugging the gate, so it hangs off the ⓘ instead of
 * putting a line of untranslated prose under every row.
 */
function ExceptionRow({
  id,
  reason,
  detail,
  t,
}: {
  id: string;
  reason: string;
  detail: string;
  t: (key: string) => string;
}) {
  return (
    <div className="exception-row">
      <span className="mono">{id}</span>
      <span className="chip warn">{reason}</span>
      <InfoTip text={detail} label={t('technicalDetail')} />
    </div>
  );
}

function Kpi({
  label,
  value,
  unit,
  delta,
  tone,
  higherIsBetter = false,
}: {
  label: string;
  value: string;
  unit?: string;
  delta?: number;
  tone?: 'ok' | 'warn';
  /** Cost and distance improve by falling; vehicle fill improves by rising. */
  higherIsBetter?: boolean;
}) {
  const improving = higherIsBetter ? (delta ?? 0) > 0.5 : (delta ?? 0) < -0.5;
  const worsening = higherIsBetter ? (delta ?? 0) < -0.5 : (delta ?? 0) > 0.5;
  return (
    <div className="kpi">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value" style={tone === 'warn' ? { color: 'var(--amber)' } : undefined}>
        {value}
        {unit && <span className="kpi-unit">{unit}</span>}
      </div>
      {delta !== undefined && Number.isFinite(delta) && (
        <div className={`kpi-delta ${improving ? 'good' : worsening ? 'bad' : 'flat'}`}>
          {delta > 0 ? '▲' : '▼'} {Math.abs(delta).toFixed(0)}%
        </div>
      )}
    </div>
  );
}

function CompareRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="compare-row">
      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span>{value}</span>
    </div>
  );
}

/**
 * A real button with `role="switch"`, not a styled div. These three switches are the
 * Control Tower's main interaction, and as a div they were unreachable by Tab, deaf to
 * Enter and Space, and announced to a screen reader as neither a control nor on/off.
 */
function Toggle({ label, on, onToggle }: { label: string; on: boolean; onToggle: () => void }) {
  return (
    <button type="button" className="switch-row" role="switch" aria-checked={on} onClick={onToggle}>
      <span className="switch" data-on={on} />
      <span>{label}</span>
    </button>
  );
}

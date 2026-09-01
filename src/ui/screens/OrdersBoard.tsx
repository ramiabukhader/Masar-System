import { useMemo, useState } from 'react';
import { MILESTONES, summarise, triageRank, type OrderState, type OrderTrack } from '../../core/lifecycle';
import { activatable } from '../activate';
import { LOCALITY_MAP } from '../../data/gazetteer';
import { PRODUCT_MAP } from '../../data/catalog';
import { fmtDue, fmtNum, fmtTime, PLAN_DATE } from '../usePlan';
import { loc, type Lang } from '../i18n';

interface Props {
  t: (key: string) => string;
  lang: Lang;
  tracks: OrderTrack[];
  loading: boolean;
  onOpenOrder: (orderId: string) => void;
}

type Filter = 'all' | OrderState;

const FILTERS: Filter[] = ['all', 'held', 'blocked', 'scheduled', 'active', 'delivered'];

const STATE_TONE: Record<OrderState, string> = {
  held: 'danger',
  blocked: 'warn',
  scheduled: '',
  active: 'info',
  delivered: 'ok',
};

/**
 * The home page: every customer order in the wave, with where it actually is right now.
 * This is the screen a branch manager or the owner opens first, so it answers the two
 * questions they always ask — what is happening today, and what needs me.
 */
export function OrdersBoard({ t, lang, tracks, loading, onOpenOrder }: Props) {
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');

  const summary = useMemo(() => summarise(tracks, PLAN_DATE), [tracks]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return tracks
      .filter((track) => filter === 'all' || track.state === filter)
      .filter((track) => {
        if (!needle) return true;
        const locality = track.customer ? LOCALITY_MAP.get(track.customer.localityId) : undefined;
        return [
          track.orderId,
          track.customer?.name,
          track.customer?.nameAr,
          locality?.nameEn,
          locality?.nameAr,
          track.customer?.phone,
        ]
          .filter(Boolean)
          .some((field) => String(field).toLowerCase().includes(needle));
      })
      .sort((a, b) => {
        // Anything needing a human comes first, then by urgency, and finished work last.
        // See triageRank: it scores all three SlaRisk values and sinks delivered orders,
        // which is what the risk chip further down this row already assumed.
        return triageRank(a) - triageRank(b) || a.order.dueAt.getTime() - b.order.dueAt.getTime();
      });
  }, [tracks, filter, query]);

  return (
    <div className="grid" style={{ opacity: loading ? 0.55 : 1, transition: 'opacity .2s' }}>

      {/* ── Summary ─────────────────────────────────────────────────── */}
      <div className="grid grid-kpi">
        <Tile label={t('kpiTotalOrders')} value={String(summary.total)} />
        <Tile label={t('kpiDelivered')} value={String(summary.delivered)} tone="ok" />
        <Tile label={t('kpiActive')} value={String(summary.active)} tone="info" />
        <Tile label={t('kpiScheduled')} value={String(summary.scheduled)} />
        <Tile
          label={t('kpiNeedsAction')}
          value={String(summary.held + summary.blocked)}
          tone={summary.held + summary.blocked > 0 ? 'warn' : 'ok'}
        />
        <Tile label={t('kpiCash')} value={`${fmtNum(summary.cashToCollect)}`} unit={t('currency')} />
      </div>

      {/* ── Filters ─────────────────────────────────────────────────── */}
      <div className="toolbar">
        <div className="filters">
          {FILTERS.map((option) => {
            const count =
              option === 'all' ? tracks.length : tracks.filter((track) => track.state === option).length;
            return (
              <button
                key={option}
                className="filter-chip"
                data-active={filter === option}
                onClick={() => setFilter(option)}
              >
                {option === 'all' ? t('filterAll') : t(`state_${option}`)}
                <span className="filter-count">{count}</span>
              </button>
            );
          })}
        </div>
        <input
          className="search"
          type="search"
          value={query}
          placeholder={t('searchOrders')}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      {/* ── Table ───────────────────────────────────────────────────── */}
      <div className="panel">
        <div className="panel-head">
          <h2>{t('ordersTitle')}</h2>
          <span className="sub">{visible.length} {t('ordersShown')}</span>
        </div>
        <div className="panel-body tight">
          {visible.length === 0 ? (
            <div className="empty">{t('noResults')}</div>
          ) : (
            <div className="scroll-x">
              <table>
                <thead>
                  <tr>
                    <th>{t('colOrder')}</th>
                    <th>{t('colCustomer')}</th>
                    <th>{t('colCity')}</th>
                    <th>{t('colItems')}</th>
                    <th>{t('colPayment')}</th>
                    <th>{t('colDue')}</th>
                    <th>{t('colStatus')}</th>
                    <th>{t('colProgress')}</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((track) => {
                    const locality = track.customer
                      ? LOCALITY_MAP.get(track.customer.localityId)
                      : undefined;
                    const itemCount = track.order.lines.reduce((sum, line) => sum + line.quantity, 0);
                    const topSku = track.order.lines[0]?.sku;
                    const topProduct = topSku ? PRODUCT_MAP.get(topSku) : undefined;

                    return (
                      <tr
                        key={track.orderId}
                        className="clickable"
                        {...activatable(() => onOpenOrder(track.orderId))}
                      >
                        <td className="mono">{track.orderId}</td>
                        <td>
                          <div>{loc(lang, track.customer?.name, track.customer?.nameAr)}</div>
                          <div className="cell-sub">{t(`channel_${track.order.channel}`)}</div>
                        </td>
                        <td>{loc(lang, locality?.nameEn, locality?.nameAr)}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {topProduct && (
                              <span className={`chip ${topProduct.productClass.toLowerCase()}`}>
                                {topProduct.productClass}
                              </span>
                            )}
                            <span className="cell-sub">
                              {itemCount} {lang === 'ar' ? 'قطعة' : itemCount === 1 ? 'item' : 'items'}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className="cell-sub">{t(`pay_${track.order.paymentType}`)}</div>
                          {track.order.amountDue > 0 && (
                            <div className="mono">
                              {fmtNum(track.order.amountDue)} {t('currency')}
                            </div>
                          )}
                        </td>
                        <td>
                          <div className="cell-sub">{fmtDue(track.order.dueAt, PLAN_DATE, lang)}</div>
                          {track.promisedWindow && (
                            <div className="mono ltr">
                              {fmtTime(track.promisedWindow.earliest)}–{fmtTime(track.promisedWindow.latest)}
                            </div>
                          )}
                        </td>
                        <td>
                          <span className={`chip ${STATE_TONE[track.state]}`}>
                            {t(`state_${track.state}`)}
                          </span>
                          {track.slaRisk !== 'ok' && track.state !== 'delivered' && (
                            <div style={{ marginTop: 3 }}>
                              <span className={`chip ${track.slaRisk === 'breach' ? 'danger' : 'warn'}`}>
                                {t(track.slaRisk === 'breach' ? 'riskBreach' : 'riskTight')}
                              </span>
                            </div>
                          )}
                        </td>
                        <td>
                          <Progress track={track} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Tile({ label, value, unit, tone }: { label: string; value: string; unit?: string; tone?: string }) {
  return (
    <div className="kpi">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value" data-tone={tone}>
        {value}
        {unit && <span className="kpi-unit">{unit}</span>}
      </div>
    </div>
  );
}

/** Eight segments, one per milestone. Blocked orders show where the chain stopped. */
function Progress({ track }: { track: OrderTrack }) {
  const blocked = track.state === 'held' || track.state === 'blocked';
  return (
    <div className="milestone-bar" title={`${track.reachedCount}/${MILESTONES.length}`}>
      {MILESTONES.map((milestone, index) => (
        <i
          key={milestone}
          data-on={index < track.reachedCount}
          data-blocked={blocked && index === track.reachedCount}
        />
      ))}
    </div>
  );
}

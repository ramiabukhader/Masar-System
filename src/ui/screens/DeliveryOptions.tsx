import { useMemo, useState } from 'react';
import { InfoTip } from '../components/InfoTip';
import { SERVICE_TIERS, type ServiceTier } from '../../data/services';
import { offerSlots } from '../../core/promise';
import { ZONES, type Zone } from '../../core/types';
import { VEHICLES } from '../../data/fleet';
import { fmtNum, PLAN_DATE, type PlanState } from '../usePlan';
import type { Lang } from '../i18n';

interface Props {
  t: (key: string) => string;
  lang: Lang;
  state: PlanState;
}

const STATUS_KEY: Record<ServiceTier['status'], string> = {
  active: 'tierActive',
  pilot: 'tierPilot',
  planned: 'tierPlanned',
};

const STATUS_TONE: Record<ServiceTier['status'], string> = {
  active: 'ok',
  pilot: 'info',
  planned: 'warn',
};

/**
 * What the business can promise, to whom, and what keeping the promise costs.
 *
 * The point of this screen is the `planned` tiers: they carry their own prerequisites, so
 * a conversation about "can we do same-day" becomes a conversation about the five things
 * that have to be true first, rather than a yes or a no.
 */
export function DeliveryOptions({ t, lang, state }: Props) {
  const [zone, setZone] = useState<Zone>('central');

  const offers = useMemo(() => {
    if (!state.plan) return [];
    return offerSlots({
      plan: state.plan,
      shipments: state.shipments,
      vehicles: VEHICLES,
      planDate: PLAN_DATE,
      zone,
    });
  }, [state.plan, state.shipments, zone]);

  return (
    <div className="grid">

      {/* ── Promise engine ─────────────────────────────────────────────
          The single most transferable practice from the benchmarks: offer the
          customer a real, capacity-checked slot while they are still in the
          showroom, instead of confirming a window by message the day before. */}
      <div className="panel">
        <div className="panel-head">
          <h2>{t('promiseTitle')}<InfoTip text={t('promiseSub')} label={t('explain')} /></h2>
          <div className="zone-picker">
            <span>{t('promiseZone')}</span>
            {ZONES.map((option) => (
              <button
                key={option}
                className="filter-chip"
                data-active={zone === option}
                onClick={() => setZone(option)}
              >
                {t(`zone_${option}`)}
              </button>
            ))}
          </div>
        </div>
        <div className="panel-body">
          <div className="slots">
            {offers.map((offer) => (
              <div
                className="slot"
                key={offer.id}
                data-recommended={offer.recommended}
                data-full={!offer.deliverable}
              >
                <div className="slot-head">
                  <span className="slot-time">{t(`slot_${offer.id}`)}</span>
                  {offer.recommended && <span className="chip ok">{t('slotRecommended')}</span>}
                  {!offer.deliverable && <span className="chip danger">{t('slotFull')}</span>}
                </div>
                <div className="slot-meter">
                  <div className="bar">
                    <i
                      style={{ width: `${Math.min(offer.utilisation * 100, 100)}%` }}
                      data-low={offer.utilisation < 0.4}
                    />
                  </div>
                  <span className="mono ltr">
                    {offer.plannedStops}/{offer.capacityStops}
                  </span>
                </div>
                <div className="slot-facts">
                  <div className="kv">
                    <span>{t('slotLoad')}</span>
                    <b className="mono">{fmtNum(offer.utilisation * 100)}%</b>
                  </div>
                  <div className="kv">
                    <span>{t('slotMarginal')}</span>
                    <b className={offer.marginalCost < 0.34 ? 'good' : offer.marginalCost < 0.67 ? '' : 'risk'}>
                      {t(offer.marginalCost < 0.34 ? 'costLow' : offer.marginalCost < 0.67 ? 'costMedium' : 'costHigh')}
                    </b>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Comparison first — the whole menu at a glance. */}
      <div className="panel">
        <div className="panel-head"><h2>{t('optionsTitle')}<InfoTip text={t('optionsNote')} label={t('explain')} /></h2></div>
        <div className="panel-body tight">
          <div className="scroll-x">
            <table>
              <thead>
                <tr>
                  <th>{lang === 'ar' ? 'الخدمة' : 'Service'}</th>
                  <th>{t('colStatus')}</th>
                  <th>{t('tierSla')}</th>
                  <th>{t('tierWindow')}</th>
                  <th>{t('tierEligibility')}</th>
                  <th>{t('tierPrice')}</th>
                  <th>{t('tierCost')}</th>
                </tr>
              </thead>
              <tbody>
                {SERVICE_TIERS.map((tier) => (
                  <tr key={tier.id}>
                    <td>
                      <div style={{ fontWeight: 500 }}>{lang === 'ar' ? tier.nameAr : tier.nameEn}</div>
                      <div className="cell-sub">{lang === 'ar' ? tier.taglineAr : tier.taglineEn}</div>
                    </td>
                    <td><span className={`chip ${STATUS_TONE[tier.status]}`}>{t(STATUS_KEY[tier.status])}</span></td>
                    <td className="mono">{tier.slaHours}{lang === 'ar' ? ' س' : 'h'}</td>
                    <td className="mono">
                      {tier.windowMinutes ? `${tier.windowMinutes / 60}${lang === 'ar' ? ' س' : 'h'}` : <span className="cell-sub">{t('tierNoWindow')}</span>}
                    </td>
                    <td>
                      {tier.eligibility.classes.map((productClass) => (
                        <span key={productClass} className={`chip ${productClass.toLowerCase()}`} style={{ marginInlineEnd: 4 }}>
                          {productClass}
                        </span>
                      ))}
                    </td>
                    <td className="mono">
                      {tier.customerPrice === 0 ? <span className="chip ok">{t('tierFree')}</span> : `${tier.customerPrice} ${t('currency')}`}
                    </td>
                    <td className="mono">{fmtNum(tier.costToServe)} {t('currency')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>


      {/* Then each tier in full. */}
      <div className="grid grid-2">
        {SERVICE_TIERS.map((tier) => (
          <div className="panel tier" key={tier.id} data-status={tier.status}>
            <div className="panel-head">
              <h2>{lang === 'ar' ? tier.nameAr : tier.nameEn}</h2>
              <span className={`chip ${STATUS_TONE[tier.status]}`} style={{ marginInlineStart: 'auto' }}>
                {t(STATUS_KEY[tier.status])}
              </span>
            </div>
            {/* Only what the comparison table above cannot show. Name, tagline,
                SLA, window, price and cost are all in that table already, and
                repeating them here doubled the length of the page without
                adding a fact. */}
            <div className="panel-body">
              <div className="kv-list">
                <div className="kv">
                  <span>{t('tierZones')}</span>
                  <b>{tier.eligibility.zones === 'all' ? t('tierAllZones') : tier.eligibility.zones.length}</b>
                </div>
                <div className="kv">
                  <span>{t('tierInstall')}</span>
                  <b>{tier.eligibility.installIncluded ? (lang === 'ar' ? 'نعم' : 'Yes') : (lang === 'ar' ? 'لا' : 'No')}</b>
                </div>
                {tier.eligibility.maxCubeM3 !== undefined && (
                  <div className="kv"><span>{t('tierMaxCube')}</span><b className="mono">{tier.eligibility.maxCubeM3} {t('m3')}</b></div>
                )}
              </div>

              <h4 className="tier-req-head">{t('tierRequires')}</h4>
              <ul className="req-list">
                {(lang === 'ar' ? tier.requiresAr : tier.requiresEn).map((requirement) => (
                  <li key={requirement}>{requirement}</li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

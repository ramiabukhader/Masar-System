import { SERVICE_TIERS, type ServiceTier } from '../../data/services';
import { fmtNum } from '../usePlan';
import type { Lang } from '../i18n';

interface Props {
  t: (key: string) => string;
  lang: Lang;
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
export function DeliveryOptions({ t, lang }: Props) {
  return (
    <div className="grid">
      <p className="page-sub">{t('optionsSub')}</p>

      {/* Comparison first — the whole menu at a glance. */}
      <div className="panel">
        <div className="panel-head"><h2>{t('optionsTitle')}</h2></div>
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

      <p className="hint">{t('optionsNote')}</p>

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
            <div className="panel-body">
              <p style={{ color: 'var(--text-muted)', fontSize: 13.5, marginTop: 0 }}>
                {lang === 'ar' ? tier.taglineAr : tier.taglineEn}
              </p>

              <div className="kv-list">
                <div className="kv"><span>{t('tierSla')}</span><b className="mono">{tier.slaHours} {lang === 'ar' ? 'ساعة' : 'hours'}</b></div>
                <div className="kv">
                  <span>{t('tierWindow')}</span>
                  <b className="mono">
                    {tier.windowMinutes ? `${tier.windowMinutes / 60} ${lang === 'ar' ? 'ساعات' : 'hours'}` : t('tierNoWindow')}
                  </b>
                </div>
                <div className="kv">
                  <span>{t('tierZones')}</span>
                  <b>{tier.eligibility.zones === 'all' ? t('tierAllZones') : tier.eligibility.zones.length}</b>
                </div>
                {tier.eligibility.maxCubeM3 !== undefined && (
                  <div className="kv"><span>{t('tierMaxCube')}</span><b className="mono">{tier.eligibility.maxCubeM3} m³</b></div>
                )}
                <div className="kv">
                  <span>{t('tierInstall')}</span>
                  <b>{tier.eligibility.installIncluded ? (lang === 'ar' ? 'نعم' : 'Yes') : (lang === 'ar' ? 'لا' : 'No')}</b>
                </div>
                <div className="kv"><span>{t('tierCost')}</span><b className="mono">{fmtNum(tier.costToServe)} {t('currency')}</b></div>
              </div>

              <h4 style={{ margin: '18px 0 8px', fontSize: 13 }}>{t('tierRequires')}</h4>
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

import { PHASES, type MilestoneStatus } from '../../data/roadmap';
import type { Lang } from '../i18n';

interface Props {
  t: (key: string) => string;
  lang: Lang;
}

const TONE: Record<MilestoneStatus, string> = {
  done: 'ok',
  in_progress: 'info',
  next: 'warn',
  later: '',
};

/**
 * Programme milestones. Deliberately shows what is already built as well as what is not —
 * a roadmap that only lists future work gives a client no way to judge progress.
 */
export function Roadmap({ t, lang }: Props) {
  const allItems = PHASES.flatMap((phase) => phase.items);
  const doneCount = allItems.filter((item) => item.status === 'done').length;

  return (
    <div className="grid">

      <div className="panel">
        <div className="panel-body">
          <div className="progress-head">
            <span>{lang === 'ar' ? 'إجمالي التقدّم' : 'Overall progress'}</span>
            <span className="mono ltr">{doneCount} / {allItems.length}</span>
          </div>
          <div className="bar" style={{ height: 8 }}>
            <i style={{ width: `${(doneCount / allItems.length) * 100}%`, background: 'var(--green)' }} />
          </div>
        </div>
      </div>

      {PHASES.map((phase) => (
        <div className="panel phase-panel" key={phase.id} data-status={phase.status}>
          <div className="panel-head">
            <h2>{lang === 'ar' ? phase.labelAr : phase.labelEn}</h2>
            <span className="sub">{lang === 'ar' ? phase.timingAr : phase.timingEn}</span>
            <span className={`chip ${TONE[phase.status]}`}>{t(`st_${phase.status}`)}</span>
          </div>
          <div className="panel-body">
            <div className="grid grid-2" style={{ marginBottom: 16 }}>
              <div>
                <div className="mini-label">{t('phaseGoal')}</div>
                <p className="phase-text">{lang === 'ar' ? phase.goalAr : phase.goalEn}</p>
              </div>
              <div>
                <div className="mini-label">{t('phaseOutcome')}</div>
                <p className="phase-text">{lang === 'ar' ? phase.outcomeAr : phase.outcomeEn}</p>
              </div>
            </div>

            <ul className="check-list">
              {phase.items.map((item) => (
                <li key={item.titleEn} data-status={item.status}>
                  <span className="check-mark">{item.status === 'done' ? '✓' : ''}</span>
                  <span>{lang === 'ar' ? item.titleAr : item.titleEn}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ))}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { makeT, type Lang } from './i18n';
import { NO_DISRUPTIONS, usePlan, type Disruptions } from './usePlan';
import { ControlTower } from './screens/ControlTower';
import { BranchOps } from './screens/BranchOps';
import { DriverApp } from './screens/DriverApp';
import { ProcessGuide } from './screens/ProcessGuide';

type Tab = 'tower' | 'branch' | 'driver' | 'process';

const TABS: { id: Tab; key: string }[] = [
  { id: 'tower', key: 'navTower' },
  { id: 'branch', key: 'navBranch' },
  { id: 'driver', key: 'navDriver' },
  { id: 'process', key: 'navProcess' },
];

export function App() {
  const [lang, setLang] = useState<Lang>('ar');
  const [tab, setTab] = useState<Tab>('tower');
  const [disruptions, setDisruptions] = useState<Disruptions>(NO_DISRUPTIONS);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);

  const state = usePlan(disruptions);
  const t = makeT(lang);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang]);

  // Keep the selection valid across a re-plan — route ids are regenerated each wave.
  useEffect(() => {
    if (!state.plan) return;
    if (!selectedRouteId || !state.plan.routes.some((r) => r.id === selectedRouteId)) {
      setSelectedRouteId(state.plan.routes[0]?.id ?? null);
    }
  }, [state.plan, selectedRouteId]);

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">{t('appName')}</span>
          <span className="brand-tag">{t('appTagline')}</span>
        </div>
        <span className="demo-pill">{t('demoNotice')}</span>

        <nav className="nav">
          {TABS.map((item) => (
            <button key={item.id} data-active={tab === item.id} onClick={() => setTab(item.id)}>
              {t(item.key)}
            </button>
          ))}
          <button className="lang-toggle" onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}>
            {lang === 'ar' ? 'EN' : 'ع'}
          </button>
        </nav>
      </header>

      <main className="main">
        {tab === 'tower' && (
          <ControlTower
            t={t}
            lang={lang}
            state={state}
            disruptions={disruptions}
            setDisruptions={setDisruptions}
            selectedRouteId={selectedRouteId}
            setSelectedRouteId={setSelectedRouteId}
          />
        )}
        {tab === 'branch' && (
          <BranchOps
            t={t}
            lang={lang}
            state={state}
            selectedRouteId={selectedRouteId}
            setSelectedRouteId={setSelectedRouteId}
          />
        )}
        {tab === 'driver' && (
          <DriverApp
            t={t}
            lang={lang}
            state={state}
            selectedRouteId={selectedRouteId}
            setSelectedRouteId={setSelectedRouteId}
          />
        )}
        {tab === 'process' && <ProcessGuide t={t} lang={lang} />}
      </main>
    </div>
  );
}

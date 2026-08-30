import { useEffect, useMemo, useState } from 'react';
import { makeT, type Lang } from './i18n';
import { InfoTip } from './components/InfoTip';
import { fmtClock, fmtDay, NO_DISRUPTIONS, PLAN_DATE, usePlan, type Disruptions } from './usePlan';
import { buildOrderTracks } from '../core/lifecycle';
import { OrdersBoard } from './screens/OrdersBoard';
import { OrderDetail } from './screens/OrderDetail';
import { DeliveryOptions } from './screens/DeliveryOptions';
import { ControlTower } from './screens/ControlTower';
import { BranchOps } from './screens/BranchOps';
import { DriverApp } from './screens/DriverApp';
import { ProcessGuide } from './screens/ProcessGuide';
import { Roadmap } from './screens/Roadmap';

type View =
  | 'orders'
  | 'options'
  | 'tower'
  | 'branch'
  | 'driver'
  | 'process'
  | 'roadmap';

type Theme = 'dark' | 'light';

interface NavGroup {
  key: string;
  items: { id: View; key: string; icon: string }[];
}

/**
 * Grouped navigation rather than a flat tab bar: this is an application people work in
 * all day, not a slide deck. Icons are inline glyphs so the app carries no icon font and
 * runs with no network at all.
 */
const NAV: NavGroup[] = [
  {
    key: 'groupOps',
    items: [
      { id: 'orders', key: 'navOrders', icon: '▤' },
      { id: 'tower', key: 'navTower', icon: '◎' },
      { id: 'branch', key: 'navBranch', icon: '▦' },
      { id: 'driver', key: 'navDriver', icon: '▮' },
    ],
  },
  { key: 'groupSetup', items: [{ id: 'options', key: 'navOptions', icon: '⚙' }] },
  {
    key: 'groupRef',
    items: [
      { id: 'process', key: 'navProcess', icon: '☰' },
      { id: 'roadmap', key: 'navRoadmap', icon: '◈' },
    ],
  },
];

/**
 * The one-line description of each screen. It hangs off the ⓘ beside the page
 * title rather than sitting under it as a paragraph: every screen gets the same
 * introduction, and none of them spends a line of the viewport on it.
 */
const SUB: Record<View, string> = {
  orders: 'ordersSub',
  tower: 'towerSub',
  branch: 'branchSub',
  driver: 'driverSub',
  options: 'optionsSub',
  process: 'processSub',
  roadmap: 'roadmapSub',
};

const SHIFT_START = 7 * 60;
const SHIFT_END = 18 * 60;

export function App() {
  const [lang, setLang] = useState<Lang>('ar');
  // Their own site is a dark charcoal ground with red — that is the default here. The light
  // ground stays one click away, because a dispatcher reads this screen for ten hours.
  const [theme, setTheme] = useState<Theme>('dark');
  const [view, setView] = useState<View>('orders');
  const [openOrderId, setOpenOrderId] = useState<string | null>(null);
  const [nowMinutes, setNowMinutes] = useState(11 * 60);
  const [disruptions, setDisruptions] = useState<Disruptions>(NO_DISRUPTIONS);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);

  const state = usePlan(disruptions);
  const t = makeT(lang);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  // Route ids are regenerated on every re-plan, so a stale selection has to be repaired.
  useEffect(() => {
    if (!state.plan) return;
    if (!selectedRouteId || !state.plan.routes.some((r) => r.id === selectedRouteId)) {
      setSelectedRouteId(state.plan.routes[0]?.id ?? null);
    }
  }, [state.plan, selectedRouteId]);

  const tracks = useMemo(() => {
    if (!state.plan) return [];
    return buildOrderTracks({
      planDate: PLAN_DATE,
      nowMinutes,
      plan: state.plan,
      orders: [...state.orderMap.values()],
      customers: state.customerMap,
      shipments: state.shipments,
      held: state.held,
    });
  }, [state.plan, state.orderMap, state.customerMap, state.shipments, state.held, nowMinutes]);

  const openTrack = openOrderId ? tracks.find((track) => track.orderId === openOrderId) : undefined;

  const titleKey =
    openTrack ? 'orderDetail' : NAV.flatMap((g) => g.items).find((i) => i.id === view)?.key ?? 'navOrders';
  const subKey = openTrack ? 'orderSub' : SUB[view];

  const go = (next: View) => {
    setOpenOrderId(null);
    setView(next);
  };

  return (
    <div className="app">
      {/* ── Sidebar ───────────────────────────────────────────────────── */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="brand-mark">{t('appName')}</span>
          <span className="brand-tag">{t('appTagline')}</span>
        </div>

        <nav className="sidebar-nav">
          {NAV.map((group) => (
            <div className="nav-group" key={group.key}>
              <div className="nav-group-label">{t(group.key)}</div>
              {group.items.map((item) => (
                <button
                  key={item.id}
                  className="nav-item"
                  data-active={!openTrack && view === item.id}
                  onClick={() => go(item.id)}
                >
                  <span className="nav-icon" aria-hidden="true">{item.icon}</span>
                  <span>{t(item.key)}</span>
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-foot">
          <span className="demo-pill">{t('demoNotice')}</span>
        </div>
      </aside>

      {/* ── Content ───────────────────────────────────────────────────── */}
      <div className="content">
        <header className="topbar">
          <div className="topbar-title">
            <h1>
              {t(titleKey)}
              <InfoTip text={t(subKey)} label={t('explain')} />
            </h1>
            {openTrack && (
              <button className="btn ghost sm" onClick={() => setOpenOrderId(null)}>
                ← {t('backToOrders')}
              </button>
            )}
          </div>

          {/* The clock drives every screen — scrubbing it replays the real day. */}
          <div className="clock" title={t('simClockHint')}>
            <div className="clock-meta">
              <span className="clock-label">{t('simClock')}</span>
              <span className="clock-day">{fmtDay(PLAN_DATE, lang)}</span>
            </div>
            <span className="clock-time">{fmtClock(nowMinutes)}</span>
            <input
              type="range"
              min={SHIFT_START}
              max={SHIFT_END}
              step={5}
              value={nowMinutes}
              onChange={(event) => setNowMinutes(Number(event.target.value))}
              aria-label={t('simClock')}
            />
          </div>

          <div className="topbar-toggles">
            <button
              className="topbar-toggle theme-toggle"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              title={t('themeToggle')}
              aria-label={t('themeToggle')}
            >
              {theme === 'dark' ? '☀' : '☾'}
            </button>
            <button
              className="topbar-toggle lang-toggle"
              onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
              title={t('langToggle')}
              aria-label={t('langToggle')}
            >
              {lang === 'ar' ? 'EN' : 'ع'}
            </button>
          </div>
        </header>

        <main className="main">
          {openTrack ? (
            <OrderDetail
              t={t}
              lang={lang}
              track={openTrack}
              state={state}
              onOpenRoute={(routeId) => {
                setSelectedRouteId(routeId);
                go('tower');
              }}
            />
          ) : view === 'orders' ? (
            <OrdersBoard
              t={t}
              lang={lang}
              tracks={tracks}
              loading={state.loading}
              onOpenOrder={setOpenOrderId}
            />
          ) : view === 'options' ? (
            <DeliveryOptions t={t} lang={lang} state={state} />
          ) : view === 'roadmap' ? (
            <Roadmap t={t} lang={lang} />
          ) : view === 'tower' ? (
            <ControlTower
              t={t}
              lang={lang}
              state={state}
              disruptions={disruptions}
              setDisruptions={setDisruptions}
              selectedRouteId={selectedRouteId}
              setSelectedRouteId={setSelectedRouteId}
            />
          ) : view === 'branch' ? (
            <BranchOps
              t={t}
              lang={lang}
              state={state}
              selectedRouteId={selectedRouteId}
              setSelectedRouteId={setSelectedRouteId}
            />
          ) : view === 'driver' ? (
            <DriverApp
              t={t}
              lang={lang}
              state={state}
              selectedRouteId={selectedRouteId}
              setSelectedRouteId={setSelectedRouteId}
            />
          ) : (
            <ProcessGuide t={t} lang={lang} />
          )}
        </main>
      </div>
    </div>
  );
}

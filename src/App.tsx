import { useState, useMemo, useCallback, useEffect } from 'react';
import { sections, badgeStyles } from './data';
import { fetchAllWeather } from './weather';
import { useFirebaseSync } from './hooks/useFirebaseSync';
import { useDarkMode } from './hooks/useDarkMode';
import { useAuth } from './hooks/useAuth';
import { logout } from './firebase';
import { Countdown, DEPART } from './components/Countdown';
import { Checklist } from './components/Checklist';
import { JollySection } from './components/JollySection';
import { Section } from './components/Section';
import { NextActivity } from './components/NextActivity';
import { LoginScreen } from './components/LoginScreen';
import './App.css';
import type {
  Row, DayInfo, AlertData, ItineraryData, ChecklistData,
  AlertsData, TitleOverridesData, BadgeOverridesData, JolliesData,
  WeatherDataMap, ChecklistItem,
} from './types';

const TRIP_END = new Date('2026-06-06T00:00:00');

export default function App() {
  const { state } = useAuth();
  const [dark, setDark] = useDarkMode();

  if (state === 'loading') return (
    <div className="page"><div className="loading-screen"><p className="loading-text">Caricamento…</p></div></div>
  );
  if (state === 'unauthenticated') return <LoginScreen />;
  if (state === 'denied') return <LoginScreen denied />;
  const [weatherData, setWeatherData] = useState<WeatherDataMap>({});
  const [weatherUpdatedAt, setWeatherUpdatedAt] = useState<Date | null>(null);
  const [cardVersions, setCardVersions] = useState<Record<string, number>>({});

  // ── Firebase real-time sync (feature 1) ──────────────────────────────────
  const [itinerary, setItinerary]           = useFirebaseSync<ItineraryData>('itinerary');
  const [checklist, setChecklist]           = useFirebaseSync<ChecklistData>('checklist');
  const [alerts, setAlerts]                 = useFirebaseSync<AlertsData>('alerts');
  const [titleOverrides, setTitleOverrides] = useFirebaseSync<TitleOverridesData>('titleOverrides');
  const [badgeOverrides, setBadgeOverrides] = useFirebaseSync<BadgeOverridesData>('badgeOverrides');
  const [jollies, setJollies]               = useFirebaseSync<JolliesData>('jollies');

  const allDays = useMemo<DayInfo[]>(
    () => sections.flatMap((s) => s.days.map((d) => ({ key: d.date ?? d.title, label: d.title, badge: d.badge }))),
    [],
  );

  // ── Auto-open today's section (feature 2) ────────────────────────────────
  const todayKey = useMemo(() => {
    const t = new Date();
    if (t < DEPART || t >= TRIP_END) return null;
    return t.toISOString().slice(0, 10);
  }, []);

  const initialSection = useMemo(() => {
    if (todayKey) {
      const sec = sections.find((s) => s.days.some((d) => d.date === todayKey));
      if (sec) return sec.id;
    }
    return 'osaka';
  }, [todayKey]);

  const [activeSection, setActiveSection] = useState<string | null>(initialSection);

  useEffect(() => {
    if (!todayKey) return;
    // Double rAF: first frame opens section, second frame DayCard is in DOM
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.getElementById(todayKey)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Weather (auto-refresh every 30 min) ──────────────────────────────────
  useEffect(() => {
    const load = () =>
      fetchAllWeather()
        .then((data) => { setWeatherData(data); setWeatherUpdatedAt(new Date()); })
        .catch(() => {});
    load();
    const timer = setInterval(load, 30 * 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleRowsChange = useCallback((key: string, rows: Row[]) => {
    setItinerary((prev) => prev ? { ...prev, [key]: rows } : prev);
  }, [setItinerary]);

  const handleChecklistChange = useCallback((catId: string, items: ChecklistItem[]) => {
    setChecklist((prev) => prev ? { ...prev, [catId]: items } : prev);
  }, [setChecklist]);

  const handleMoveRow = useCallback((row: Row, toKey: string) => {
    setItinerary((prev) => prev ? { ...prev, [toKey]: [...(prev[toKey] ?? []), row] } : prev);
    setCardVersions((prev) => ({ ...prev, [toKey]: (prev[toKey] ?? 0) + 1 }));
  }, [setItinerary]);

  const handleAlertChange = useCallback((dayKey: string, val: AlertData) => {
    setAlerts((prev) => prev ? { ...prev, [dayKey]: val } : prev);
  }, [setAlerts]);

  const handleJolliesChange = useCallback((newJollies: JolliesData) => {
    setJollies(newJollies);
  }, [setJollies]);

  // Feature 3: edit day title and badge
  const handleDayEdit = useCallback((dayKey: string, patch: { title?: string; badge?: string }) => {
    if (patch.title !== undefined)
      setTitleOverrides((prev) => prev ? { ...prev, [dayKey]: patch.title! } : prev);
    if (patch.badge !== undefined)
      setBadgeOverrides((prev) => prev ? { ...prev, [dayKey]: patch.badge! } : prev);
  }, [setTitleOverrides, setBadgeOverrides]);

  const handleSwapDays = useCallback((keyA: string, keyB: string) => {
    const allDaysList = sections.flatMap((s) => s.days);
    const dayA = allDaysList.find((d) => (d.date ?? d.title) === keyA);
    const dayB = allDaysList.find((d) => (d.date ?? d.title) === keyB);

    const getSubtitle = (key: string, day: typeof dayA) => {
      const ov = titleOverrides?.[key];
      if (ov !== undefined) return ov;
      return day?.title?.split(' — ').slice(1).join(' — ') ?? '';
    };
    const getRows = (key: string, day: typeof dayA): Row[] =>
      itinerary?.[key]?.length
        ? itinerary[key]
        : (day?.rows?.map((r, i) => ({ ...r, _id: `${key}-${i}` })) ?? []);
    const getEffectiveAlert = (key: string, day: typeof dayA): AlertData | null =>
      alerts?.[key] !== undefined ? alerts[key] : (day?.alert ?? null);

    const rowsA = getRows(keyA, dayA);
    const rowsB = getRows(keyB, dayB);
    const subA = getSubtitle(keyA, dayA);
    const subB = getSubtitle(keyB, dayB);
    const alertA = getEffectiveAlert(keyA, dayA);
    const alertB = getEffectiveAlert(keyB, dayB);
    const badgeA = badgeOverrides?.[keyA] ?? dayA?.badge ?? 'osaka';
    const badgeB = badgeOverrides?.[keyB] ?? dayB?.badge ?? 'osaka';
    const ts = Date.now();

    setItinerary((prev) => prev ? {
      ...prev,
      [keyA]: rowsB.map((r, i) => ({ ...r, _id: `${keyA}-sw-${ts}-${i}` })),
      [keyB]: rowsA.map((r, i) => ({ ...r, _id: `${keyB}-sw-${ts}-${i}` })),
    } : prev);
    setTitleOverrides((prev) => prev ? { ...prev, [keyA]: subB, [keyB]: subA } : prev);
    setBadgeOverrides((prev) => prev ? { ...prev, [keyA]: badgeB, [keyB]: badgeA } : prev);
    setAlerts((prev) => {
      if (!prev) return prev;
      const next = { ...prev };
      if (alertB) next[keyA] = alertB; else delete next[keyA];
      if (alertA) next[keyB] = alertA; else delete next[keyB];
      return next;
    });
    setCardVersions((prev) => ({
      ...prev,
      [keyA]: (prev[keyA] ?? 0) + 1,
      [keyB]: (prev[keyB] ?? 0) + 1,
    }));
  }, [itinerary, titleOverrides, badgeOverrides, alerts, setItinerary, setTitleOverrides, setBadgeOverrides, setAlerts]);

  const handleInsertJollyActivity = useCallback((jollyId: string, dayKey: string) => {
    const activity = (jollies ?? {})[jollyId];
    if (!activity) return;
    const newRow: Row = { ...activity, _id: `${dayKey}-jolly-${Date.now()}`, done: false };
    setItinerary((prev) => prev ? { ...prev, [dayKey]: [...(prev[dayKey] ?? []), newRow] } : prev);
    setCardVersions((prev) => ({ ...prev, [dayKey]: (prev[dayKey] ?? 0) + 1 }));
    setJollies((prev) => {
      if (!prev) return prev;
      const next = { ...prev };
      delete next[jollyId];
      return next;
    });
  }, [jollies, setItinerary, setJollies]);

  const toggle = (id: string) => setActiveSection((cur) => (cur === id ? null : id));

  // ── Loading ───────────────────────────────────────────────────────────────

  if (
    itinerary === null || checklist === null || alerts === null ||
    jollies === null || titleOverrides === null || badgeOverrides === null
  ) {
    return (
      <div className="page">
        <div className="loading-screen">
          <p className="loading-text">Caricamento…</p>
          <button className="loading-retry" onClick={() => window.location.reload()}>
            Riprova
          </button>
        </div>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const weatherLabel = weatherUpdatedAt
    ? `Live · ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
    : 'Caricamento meteo…';

  const duringTrip = now >= DEPART && now < TRIP_END;

  return (
    <div className="page">
        <header className="header">
          <div>
            <h1>Janap 🏯​⛩️​🍙​🍱​🍜​🍥​</h1>
            <p className="header-sub">Osaka · Kobe · Kyoto · Uji · Nara · Tokyo</p>
            <p className="header-sub">
              24 mag – 5 giu 2026 &nbsp;·&nbsp;{' '}
              <span className={weatherUpdatedAt ? 'weather-live' : 'weather-loading'}>
                {weatherLabel}
              </span>
            </p>
            {duringTrip && <NextActivity itinerary={itinerary} now={now} />}
          </div>
          <div className="header-actions">
            <button className="dark-toggle" onClick={() => setDark((d) => !d)} aria-label="Tema">
              {dark ? '☀️' : '🌙'}
            </button>
            <button className="logout-btn" onClick={logout} title="Esci">↪</button>
          </div>
          <div className="legend">
            {Object.entries(badgeStyles).map(([key, val]) => (
              <div className="legend-item" key={key}>
                <span className="legend-dot" style={{ background: val.color }} />
                {val.label}
              </div>
            ))}
          </div>
        </header>

        <main>
          <Countdown />
          {DEPART > new Date() && (
            <Checklist state={checklist} onChange={handleChecklistChange} />
          )}
          <JollySection
            jollies={jollies}
            onChange={handleJolliesChange}
            allDays={allDays}
            onInsert={handleInsertJollyActivity}
          />
          {sections.map((s) => (
            <Section
              key={s.id}
              section={s}
              activeSection={activeSection}
              onToggle={toggle}
              weatherData={weatherData}
              itinerary={itinerary}
              onRowsChange={handleRowsChange}
              allDays={allDays}
              onMoveRow={handleMoveRow}
              cardVersions={cardVersions}
              alerts={alerts}
              onAlertChange={handleAlertChange}
              titleOverrides={titleOverrides}
              badgeOverrides={badgeOverrides}
              onDayEdit={handleDayEdit}
              onSwapDay={handleSwapDays}
              todayKey={todayKey}
            />
          ))}
        </main>

        <footer className="footer">
          <span>Janap 2026</span>
          <span className={weatherUpdatedAt ? 'weather-live' : 'weather-loading'}>
            {weatherLabel}
          </span>
        </footer>
      </div>
  );
}

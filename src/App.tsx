import { useState, useMemo, useCallback, useEffect } from 'react';
import { sections } from './data';
import { fetchAllWeather } from './weather';
import { useFirebaseSync } from './hooks/useFirebaseSync';
import { useDarkMode } from './hooks/useDarkMode';
import { useAuth } from './hooks/useAuth';
import { logout } from './firebase';
import { LogOut } from 'lucide-react';
import { Countdown, DEPART } from './components/Countdown';
import { Checklist } from './components/Checklist';
import { JollySection } from './components/JollySection';
import { Section } from './components/Section';
import { NextActivity } from './components/NextActivity';
import { LoginScreen } from './components/LoginScreen';
import loghino from './assets/loghino.svg';
import janapTypo from './assets/janap_typo.svg';
import './App.css';
import type {
  Row, DayInfo, AlertData, ItineraryData, ChecklistData,
  AlertsData, TitleOverridesData, BadgeOverridesData, JolliesData,
  WeatherDataMap, ChecklistItem, DayTagsData,
} from './types';

const TRIP_END = new Date('2026-06-06T00:00:00');
const DEV_NOW: Date | null = null;

export default function App() {
  // ── ALL hooks must run unconditionally ────────────────────────────────────
  const { state } = useAuth();
  const [dark, setDark] = useDarkMode();
  const [weatherData, setWeatherData] = useState<WeatherDataMap>({});
  const [weatherUpdatedAt, setWeatherUpdatedAt] = useState<Date | null>(null);
  const [cardVersions, setCardVersions] = useState<Record<string, number>>({});

  const [itinerary, setItinerary]           = useFirebaseSync<ItineraryData>('itinerary');
  const [checklist, setChecklist]           = useFirebaseSync<ChecklistData>('checklist');
  const [alerts, setAlerts]                 = useFirebaseSync<AlertsData>('alerts');
  const [titleOverrides, setTitleOverrides] = useFirebaseSync<TitleOverridesData>('titleOverrides');
  const [badgeOverrides, setBadgeOverrides] = useFirebaseSync<BadgeOverridesData>('badgeOverrides');
  const [jollies, setJollies]               = useFirebaseSync<JolliesData>('jollies');
  const [dayTags, setDayTags]               = useFirebaseSync<DayTagsData>('dayTags');

  const allDays = useMemo<DayInfo[]>(
    () => sections.flatMap((s) => s.days.map((d) => ({ key: d.date ?? d.title, label: d.title, badge: d.badge }))),
    [],
  );

  const todayKey = useMemo(() => {
    const t = DEV_NOW ?? new Date();
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
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.getElementById(todayKey)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const load = () =>
      fetchAllWeather()
        .then((data) => { setWeatherData(data); setWeatherUpdatedAt(new Date()); })
        .catch(() => {});
    load();
    const timer = setInterval(load, 30 * 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  const [now, setNow] = useState(DEV_NOW ?? new Date());
  useEffect(() => {
    if (DEV_NOW) return;
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

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

  const handleDayTagsChange = useCallback((dayKey: string, tags: string[]) => {
    setDayTags((prev) => prev ? { ...prev, [dayKey]: tags } : { [dayKey]: tags });
  }, [setDayTags]);

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

  // ── Auth guard (after all hooks) ──────────────────────────────────────────
  if (state === 'loading') return (
    <div className="page"><div className="loading-screen"><p className="loading-text">Caricamento…</p></div></div>
  );
  if (state === 'unauthenticated') return <LoginScreen />;
  if (state === 'denied') return <LoginScreen denied />;

  // ── Data loading ──────────────────────────────────────────────────────────
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
          <p className="header-sub">
            24 mag – 5 giu 2026 &nbsp;·&nbsp;{' '}
            <span className={weatherUpdatedAt ? 'weather-live' : 'weather-loading'}>
              {weatherLabel}
            </span>
          </p>
        </div>
        <div className="header-actions">
          <button className="dark-toggle" onClick={() => setDark((d) => !d)} aria-label="Tema">
            {dark ? '☀️' : '🌙'}
          </button>
          <button className="logout-btn" onClick={logout} title="Esci"><LogOut size={15} /></button>
        </div>
      </header>

      <main>
        <Countdown now={now} />
        {DEPART > (DEV_NOW ?? new Date()) && (
          <Checklist state={checklist} onChange={handleChecklistChange} />
        )}
        <JollySection
          jollies={jollies}
          onChange={handleJolliesChange}
          allDays={allDays}
          onInsert={handleInsertJollyActivity}
        />
        {duringTrip && <NextActivity itinerary={itinerary} now={now} />}
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
            dayTags={dayTags ?? {}}
            onDayTagsChange={handleDayTagsChange}
          />
        ))}
      </main>

      <footer className="footer">
        <img src={loghino} alt="" className="footer-logo" />
        <img src={janapTypo} alt="Janap" className="footer-typo" />
        <span className={weatherUpdatedAt ? 'weather-live' : 'weather-loading'}>
          {weatherLabel}
        </span>
      </footer>
    </div>
  );
}

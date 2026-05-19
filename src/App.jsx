import { useState, useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { sections, tagColors, badgeStyles } from "./data";
import { fetchAllWeather } from "./weather";
import { dayMapPoints } from "./dayMaps";
import "./App.css";

const makeMarkerIcon = (n, color) =>
  L.divIcon({
    className: "",
    html: `<div style="width:22px;height:22px;border-radius:50%;background:${color};color:#fff;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35);font-family:sans-serif">${n}</div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -13],
  });

function MapFitter({ positions }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length > 1) map.fitBounds(positions, { padding: [28, 28] });
    else map.setView(positions[0], 15);
  }, [map]);
  return null;
}

function DayMap({ points, color }) {
  const positions = points.map((p) => p.coords);
  return (
    <div className="day-map">
      <MapContainer
        center={positions[0]}
        zoom={13}
        zoomControl={false}
        attributionControl={false}
        style={{ height: "210px", width: "100%" }}
      >
        <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
        <MapFitter positions={positions} />
        {positions.length > 1 && (
          <Polyline positions={positions} color={color} weight={2.5} opacity={0.75} />
        )}
        {points.map((p, i) => (
          <Marker key={i} position={p.coords} icon={makeMarkerIcon(i + 1, color)}>
            <Popup>{p.label}</Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

function Tag({ label }) {
  const style = tagColors[label] || { bg: "#F3F4F6", color: "#374151" };
  return (
    <span className="tag" style={{ background: style.bg, color: style.color }}>
      {label}
    </span>
  );
}

function Alert({ type, text }) {
  return <div className={`alert alert-${type}`}>{text}</div>;
}

function HourlyStrip({ slots }) {
  return (
    <div className="hourly-strip">
      {slots.map((s) => (
        <div className="hourly-slot" key={s.hour}>
          <span className="hourly-time">{s.hour}</span>
          <span className="hourly-icon">{s.icon}</span>
          <span className="hourly-temp">{s.temp}°</span>
          <span className="hourly-rain">{s.rain}%</span>
        </div>
      ))}
    </div>
  );
}

function DayCard({ day, weatherData }) {
  const [open, setOpen] = useState(true);
  const [rows, setRows] = useState(() => day.rows);
  const [dragFrom, setDragFrom] = useState(null);
  const [overIdx, setOverIdx] = useState(null);
  const badge = badgeStyles[day.badge];

  const hourlySlots = weatherData[`${day.date}_${day.city}_hourly`] ?? null;

  const weather = useMemo(() => {
    if (!day.date || !day.city) return day.weather;
    const w = weatherData[`${day.date}_${day.city}`];
    if (!w) return day.weather;
    return `${w.icon} ${w.temp}°C · ${w.rain}%`;
  }, [day, weatherData]);

  const handleDragStart = (e, i) => {
    setDragFrom(i);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e, i) => {
    e.preventDefault();
    if (i !== dragFrom) setOverIdx(i);
  };

  const handleDrop = (i) => {
    if (dragFrom === null || dragFrom === i) { setOverIdx(null); return; }
    const times = rows.map((r) => r.time);
    const next = [...rows];
    const [moved] = next.splice(dragFrom, 1);
    next.splice(i, 0, moved);
    setRows(next.map((row, idx) => ({ ...row, time: times[idx] })));
    setDragFrom(null);
    setOverIdx(null);
  };

  const handleDragEnd = () => { setDragFrom(null); setOverIdx(null); };

  return (
    <div className="day-card">
      <button className="day-head" onClick={() => setOpen((o) => !o)}>
        <span className="badge" style={{ background: badge.bg, color: badge.color }}>
          {badge.label}
        </span>
        <span className="day-title">{day.title}</span>
        <span className="weather">{weather}</span>
        <span className="chevron" style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}>
          ▾
        </span>
      </button>

      {open && hourlySlots && <HourlyStrip slots={hourlySlots} />}

      {open && dayMapPoints[day.date] && (
        <DayMap points={dayMapPoints[day.date]} color={badgeStyles[day.badge].color} />
      )}

      {open && (
        <div className="day-body">
          {day.alert && <Alert type={day.alert.type} text={day.alert.text} />}
          {rows.map((row, i) => (
            <div
              className={`row${dragFrom === i ? " row-dragging" : ""}${overIdx === i ? " row-over" : ""}`}
              key={i}
              draggable
              onDragStart={(e) => handleDragStart(e, i)}
              onDragOver={(e) => handleDragOver(e, i)}
              onDrop={() => handleDrop(i)}
              onDragEnd={handleDragEnd}
            >
              <span className="drag-handle">⠿</span>
              <span className="time">{row.time}</span>
              <div className="row-content">
                <span className="row-text">
                  {row.text}
                  {row.tags?.map((t) => <Tag key={t} label={t} />)}
                </span>
                {row.note && <div className="row-note">{row.note}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Section({ section, activeSection, onToggle, weatherData }) {
  const isOpen = activeSection === section.id;
  return (
    <div className="section">
      <button className="section-label" onClick={() => onToggle(section.id)}>
        <span>{section.label}</span>
        <span className="section-sub">{section.subtitle}</span>
        <span className="section-chevron" style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}>▾</span>
      </button>
      {isOpen && (
        <div className="section-days">
          {section.days.map((day, i) => (
            <DayCard key={i} day={day} weatherData={weatherData} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [activeSection, setActiveSection] = useState("osaka");
  const [weatherData, setWeatherData] = useState({});
  const [weatherUpdatedAt, setWeatherUpdatedAt] = useState(null);

  useEffect(() => {
    const load = () =>
      fetchAllWeather()
        .then((data) => {
          setWeatherData(data);
          setWeatherUpdatedAt(new Date());
        })
        .catch(() => {});

    load();
    const timer = setInterval(load, 30 * 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  const toggle = (id) => setActiveSection((cur) => (cur === id ? null : id));

  const weatherLabel = weatherUpdatedAt
    ? `● Live · ${weatherUpdatedAt.getHours().toString().padStart(2, "0")}:${weatherUpdatedAt.getMinutes().toString().padStart(2, "0")}`
    : "Caricamento meteo…";

  return (
    <div className="page">
      <header className="header">
        <div>
          <h1>Itinerario Giappone <span>— Maggio · Giugno 2026</span></h1>
          <p className="header-sub">
            Osaka · Kobe · Kyoto · Uji · Nara · Tokyo &nbsp;·&nbsp; 24 mag – 5 giu 2026
            &nbsp;·&nbsp; <span className={weatherUpdatedAt ? "weather-live" : "weather-loading"}>{weatherLabel}</span>
          </p>
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
        {sections.map((s) => (
          <Section
            key={s.id}
            section={s}
            activeSection={activeSection}
            onToggle={toggle}
            weatherData={weatherData}
          />
        ))}
      </main>

      <footer className="footer">
        <span>Itinerario Giappone · Maggio–Giugno 2026</span>
        <span className={weatherUpdatedAt ? "weather-live" : "weather-loading"}>{weatherLabel}</span>
      </footer>
    </div>
  );
}

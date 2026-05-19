import { useState } from "react";
import { sections, tagColors, badgeStyles } from "./data";
import "./App.css";

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

function DayCard({ day }) {
  const [open, setOpen] = useState(true);
  const badge = badgeStyles[day.badge];

  return (
    <div className="day-card">
      <button className="day-head" onClick={() => setOpen((o) => !o)}>
        <span className="badge" style={{ background: badge.bg, color: badge.color }}>
          {badge.label}
        </span>
        <span className="day-title">{day.title}</span>
        <span className="weather">{day.weather}</span>
        <span className="chevron" style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}>
          ▾
        </span>
      </button>

      {open && (
        <div className="day-body">
          {day.alert && <Alert type={day.alert.type} text={day.alert.text} />}
          {day.rows.map((row, i) => (
            <div className="row" key={i}>
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

function Section({ section, activeSection, onToggle }) {
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
            <DayCard key={i} day={day} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [activeSection, setActiveSection] = useState("osaka");

  const toggle = (id) => setActiveSection((cur) => (cur === id ? null : id));

  return (
    <div className="page">
      <header className="header">
        <div>
          <h1>Itinerario Giappone <span>— Maggio · Giugno 2026</span></h1>
          <p className="header-sub">
            Osaka · Kobe · Kyoto · Uji · Nara · Tokyo &nbsp;·&nbsp; 24 mag – 5 giu 2026
            &nbsp;·&nbsp; Meteo: tenki.jp
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
          />
        ))}
      </main>

      <footer className="footer">
        <span>Itinerario Giappone · Maggio–Giugno 2026</span>
        <span>Meteo: tenki.jp</span>
      </footer>
    </div>
  );
}

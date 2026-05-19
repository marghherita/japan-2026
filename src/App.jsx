import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  DndContext, closestCenter, MouseSensor, TouchSensor, useSensor, useSensors,
} from "@dnd-kit/core";
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { sections, tagColors, badgeStyles } from "./data";
import { checklistCategories } from "./checklistData";
import { fetchAllWeather } from "./weather";
import "./App.css";
import { loadItinerary, saveItinerary, loadChecklist, saveChecklist } from "./firebase";

// ── map helpers ──────────────────────────────────────────────────────────────

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
        <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}" />
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

// ── small components ─────────────────────────────────────────────────────────

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

// ── sortable row ─────────────────────────────────────────────────────────────

function SortableRow({ id, row, idx, isEditing, editVals, setEditVals, startEdit, saveEdit, handleEditKey, deleteRow }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled: isEditing,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  if (isEditing) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="row row-editing"
        onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) saveEdit(idx); }}
      >
        <input
          className="edit-time"
          value={editVals.time}
          onChange={(e) => setEditVals((v) => ({ ...v, time: e.target.value }))}
          onKeyDown={(e) => handleEditKey(e, idx)}
        />
        <div className="row-content">
          <input
            className="edit-text"
            value={editVals.text}
            onChange={(e) => setEditVals((v) => ({ ...v, text: e.target.value }))}
            onKeyDown={(e) => handleEditKey(e, idx)}
            autoFocus
          />
          <input
            className="edit-note"
            placeholder="nota (opzionale)"
            value={editVals.note}
            onChange={(e) => setEditVals((v) => ({ ...v, note: e.target.value }))}
            onKeyDown={(e) => handleEditKey(e, idx)}
          />
        </div>
      </div>
    );
  }

  return (
    <div ref={setNodeRef} style={style} className="row">
      <span className="drag-handle" {...attributes} {...listeners}>⠿</span>
      <span className="time">{row.time}</span>
      <div className="row-content">
        <span className="row-text">
          {row.text}
          {row.tags?.map((t) => <Tag key={t} label={t} />)}
        </span>
        {row.note && <div className="row-note">{row.note}</div>}
      </div>
      <button
        className="edit-btn"
        onClick={(e) => { e.stopPropagation(); startEdit(idx); }}
        title="Modifica"
      >✎</button>
      <button
        className="delete-btn"
        onClick={(e) => { e.stopPropagation(); deleteRow(idx); }}
        title="Elimina"
      >×</button>
    </div>
  );
}

// ── day card ─────────────────────────────────────────────────────────────────

function DayCard({ day, weatherData, initialRows, onRowsChange }) {
  const [open, setOpen] = useState(true);
  const dayKey = day.date ?? day.title;
  const defaultRows = day.rows.map((r, i) => ({ ...r, _id: `${dayKey}-${i}` }));

  const [rows, setRows] = useState(() => {
    if (initialRows?.length) {
      return initialRows.map((row) => {
        const def = defaultRows.find((d) => d._id === row._id);
        return { ...row, coords: row.coords ?? def?.coords };
      });
    }
    return defaultRows;
  });

  const isFirstRowEffect = useRef(true);
  useEffect(() => {
    if (isFirstRowEffect.current) { isFirstRowEffect.current = false; return; }
    onRowsChange?.(dayKey, rows);
  }, [rows]);
  const [editIdx, setEditIdx] = useState(null);
  const [editVals, setEditVals] = useState({});
  const [isNewRow, setIsNewRow] = useState(false);
  const badge = badgeStyles[day.badge];

  const hourlySlots = weatherData[`${day.date}_${day.city}_hourly`] ?? null;

  const weather = useMemo(() => {
    if (!day.date || !day.city) return day.weather;
    const w = weatherData[`${day.date}_${day.city}`];
    if (!w) return day.weather;
    return `${w.icon} ${w.temp}°C · ${w.rain}%`;
  }, [day, weatherData]);

  // — dnd-kit sensors: mouse + touch (hold 200ms to start drag) —
  const sensors = useSensors(
    useSensor(MouseSensor),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  const handleSortEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    setRows((prev) => {
      const oldIdx = prev.findIndex((r) => r._id === active.id);
      const newIdx = prev.findIndex((r) => r._id === over.id);
      const times = prev.map((r) => r.time);
      const next = arrayMove(prev, oldIdx, newIdx);
      return next.map((row, i) => ({ ...row, time: times[i] }));
    });
  };

  // — inline edit —
  const startEdit = (i) => {
    setEditIdx(i);
    setEditVals({ time: rows[i].time, text: rows[i].text, note: rows[i].note ?? "" });
  };
  const saveEdit = (i) => {
    setRows((prev) => prev.map((row, idx) =>
      idx === i
        ? { ...row, time: editVals.time.trim() || row.time, text: editVals.text.trim() || row.text, note: editVals.note.trim() || undefined }
        : row
    ));
    setIsNewRow(false);
    setEditIdx(null);
  };
  const cancelEdit = () => {
    if (isNewRow) setRows((prev) => prev.filter((_, idx) => idx !== editIdx));
    setIsNewRow(false);
    setEditIdx(null);
  };
  const handleEditKey = (e, i) => {
    if (e.key === "Enter") { e.preventDefault(); saveEdit(i); }
    if (e.key === "Escape") cancelEdit();
  };
  const deleteRow = (i) => setRows((prev) => prev.filter((_, idx) => idx !== i));

  const addRow = () => {
    const lastTime = rows[rows.length - 1]?.time ?? "09:00";
    const [h, m] = lastTime.split(":").map(Number);
    let newTime = "09:00";
    if (!isNaN(h) && !isNaN(m)) {
      const total = h * 60 + m + 30;
      newTime = `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
    }
    const newId = `${day.date ?? day.title}-${Date.now()}`;
    const newIdx = rows.length;
    setRows((prev) => [...prev, { time: newTime, text: "", _id: newId }]);
    setEditIdx(newIdx);
    setEditVals({ time: newTime, text: "", note: "" });
    setIsNewRow(true);
  };

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

      {open && (() => {
        const pts = rows.filter((r) => r.coords).map((r) => ({ label: r.text, coords: r.coords }));
        return pts.length > 0 && <DayMap points={pts} color={badgeStyles[day.badge].color} />;
      })()}

      {open && (
        <div className="day-body">
          {day.alert && <Alert type={day.alert.type} text={day.alert.text} />}
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleSortEnd}>
            <SortableContext items={rows.map((r) => r._id)} strategy={verticalListSortingStrategy}>
              {rows.map((row, i) => (
                <SortableRow
                  key={row._id}
                  id={row._id}
                  row={row}
                  idx={i}
                  isEditing={editIdx === i}
                  editVals={editVals}
                  setEditVals={setEditVals}
                  startEdit={startEdit}
                  saveEdit={saveEdit}
                  handleEditKey={handleEditKey}
                  deleteRow={deleteRow}
                />
              ))}
            </SortableContext>
          </DndContext>
          <button className="add-row-btn" onClick={addRow}>+ aggiungi attività</button>
        </div>
      )}
    </div>
  );
}

// ── checklist ────────────────────────────────────────────────────────────────

function ChecklistCategory({ category, items, onChange }) {
  const [open, setOpen] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newText, setNewText] = useState("");

  const checkedCount = items.filter((i) => i.checked).length;

  const toggle = (id) => onChange(items.map((i) => i.id === id ? { ...i, checked: !i.checked } : i));
  const deleteItem = (id) => onChange(items.filter((i) => i.id !== id));
  const confirmAdd = () => {
    if (!newText.trim()) return;
    onChange([...items, { id: `${category.id}-${Date.now()}`, text: newText.trim(), checked: false }]);
    setNewText("");
    setAdding(false);
  };

  return (
    <div className="cl-cat">
      <button className="cl-cat-head" onClick={() => setOpen((o) => !o)}>
        <span className="cl-cat-icon">{category.icon}</span>
        <span className="cl-cat-label">{category.label}</span>
        <span className="cl-cat-count">{checkedCount}/{items.length}</span>
        <span className="chevron" style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}>▾</span>
      </button>
      {open && (
        <div className="cl-items">
          {items.map((item) => (
            <div key={item.id} className={`cl-item${item.checked ? " cl-item-done" : ""}`}>
              <input
                type="checkbox"
                className="cl-checkbox"
                checked={item.checked}
                onChange={() => toggle(item.id)}
              />
              <span className="cl-item-text">{item.text}</span>
              <button className="cl-del-btn" onClick={() => deleteItem(item.id)} title="Elimina">×</button>
            </div>
          ))}
          {adding ? (
            <div className="cl-add-row">
              <input
                autoFocus
                className="cl-add-input"
                placeholder="Nuova voce…"
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") confirmAdd(); if (e.key === "Escape") setAdding(false); }}
              />
              <button className="cl-add-confirm" onClick={confirmAdd}>✓</button>
              <button className="cl-add-cancel" onClick={() => setAdding(false)}>×</button>
            </div>
          ) : (
            <button className="add-row-btn" onClick={() => setAdding(true)}>+ aggiungi voce</button>
          )}
        </div>
      )}
    </div>
  );
}

function Checklist({ state, onChange }) {
  const [open, setOpen] = useState(false);

  const allItems = checklistCategories.flatMap((cat) => state[cat.id] ?? cat.defaultItems);
  const total = allItems.length;
  const checked = allItems.filter((i) => i.checked).length;
  const pct = total > 0 ? Math.round((checked / total) * 100) : 0;

  return (
    <div className="cl-wrap">
      <button className="cl-head" onClick={() => setOpen((o) => !o)}>
        <span className="cl-head-left">
          <span className="cl-head-title">✈ Checklist viaggio</span>
          <span className="cl-head-counter">{checked}/{total} voci</span>
        </span>
        <span className="cl-progress-wrap">
          <span className="cl-progress-bar" style={{ width: `${pct}%` }} />
        </span>
        <span className="cl-pct">{pct}%</span>
        <span className="section-chevron" style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}>▾</span>
      </button>
      {open && (
        <div className="cl-body">
          {checklistCategories.map((cat) => (
            <ChecklistCategory
              key={cat.id}
              category={cat}
              items={state[cat.id] ?? cat.defaultItems}
              onChange={(items) => onChange(cat.id, items)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── section ───────────────────────────────────────────────────────────────────

function Section({ section, activeSection, onToggle, weatherData, itinerary, onRowsChange }) {
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
          {section.days.map((day, i) => {
            const dk = day.date ?? day.title;
            return (
              <DayCard key={i} day={day} weatherData={weatherData}
                initialRows={itinerary?.[dk]}
                onRowsChange={onRowsChange}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── app ───────────────────────────────────────────────────────────────────────

export default function App() {
  const [activeSection, setActiveSection] = useState("osaka");
  const [weatherData, setWeatherData] = useState({});
  const [weatherUpdatedAt, setWeatherUpdatedAt] = useState(null);
  const [itinerary, setItinerary] = useState(null);
  const hasLoaded = useRef(false);
  const [checklist, setChecklist] = useState(null);
  const hasChecklistLoaded = useRef(false);

  useEffect(() => {
    loadItinerary()
      .then((data) => setItinerary(data ?? {}))
      .catch(() => setItinerary({}));
    loadChecklist()
      .then((data) => setChecklist(data ?? {}))
      .catch(() => setChecklist({}));
  }, []);

  useEffect(() => {
    if (itinerary === null) return;
    if (!hasLoaded.current) { hasLoaded.current = true; return; }
    saveItinerary(itinerary).catch(console.error);
  }, [itinerary]);

  useEffect(() => {
    if (checklist === null) return;
    if (!hasChecklistLoaded.current) { hasChecklistLoaded.current = true; return; }
    saveChecklist(checklist).catch(console.error);
  }, [checklist]);

  const handleRowsChange = useCallback((key, rows) => {
    setItinerary((prev) => ({ ...prev, [key]: rows }));
  }, []);

  const handleChecklistChange = useCallback((catId, items) => {
    setChecklist((prev) => ({ ...prev, [catId]: items }));
  }, []);

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

  const toggle = (id) => setActiveSection((cur) => (cur === id ? null : id));

  const weatherLabel = weatherUpdatedAt
    ? `● Live · ${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`
    : "Caricamento meteo…";

  if (itinerary === null || checklist === null) {
    return <div className="page"><p style={{ padding: "2rem", textAlign: "center" }}>Caricamento…</p></div>;
  }

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
        <Checklist state={checklist} onChange={handleChecklistChange} />
        {sections.map((s) => (
          <Section key={s.id} section={s} activeSection={activeSection} onToggle={toggle} weatherData={weatherData} itinerary={itinerary} onRowsChange={handleRowsChange} />
        ))}
      </main>

      <footer className="footer">
        <span>Itinerario Giappone · Maggio–Giugno 2026</span>
        <span className={weatherUpdatedAt ? "weather-live" : "weather-loading"}>{weatherLabel}</span>
      </footer>
    </div>
  );
}

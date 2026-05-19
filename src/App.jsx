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

// ── helpers ───────────────────────────────────────────────────────────────────

const MONTHS = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'];

function formatDayOption(day) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day.key)) return day.label;
  const d = new Date(day.key + 'T12:00:00');
  return `${d.getDate()} ${MONTHS[d.getMonth()]} · ${day.label}`;
}

// ── map helpers ───────────────────────────────────────────────────────────────

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

function SortableRow({ id, row, idx, startEdit, deleteRow, onToggleDone }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`row${row.done ? " row-done" : ""}`}
      onClick={() => onToggleDone(idx)}
      title={row.done ? "Segna come non fatto" : "Segna come fatto"}
    >
      <span className="drag-handle" {...attributes} {...listeners} onClick={(e) => e.stopPropagation()}>⠿</span>
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

function DayCard({ day, weatherData, initialRows, onRowsChange, allDays, onMoveRow }) {
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

  // — modal edit —
  const startEdit = (i) => {
    setEditIdx(i);
    setEditVals({ time: rows[i].time, text: rows[i].text, note: rows[i].note ?? "", tags: rows[i].tags ?? [], targetDay: dayKey });
  };
  const saveEdit = () => {
    if (editIdx === null) return;
    const targetDay = editVals.targetDay ?? dayKey;
    const isMove = targetDay !== dayKey;

    if (isMove) {
      setRows((prev) => prev.filter((_, i) => i !== editIdx));
      const src = isNewRow ? {} : rows[editIdx];
      const moved = {
        ...src,
        _id: `${targetDay}-${Date.now()}`,
        time: editVals.time.trim() || src.time || "09:00",
        text: editVals.text.trim() || src.text || "",
        note: editVals.note.trim() || undefined,
        tags: editVals.tags?.length ? editVals.tags : undefined,
      };
      if (moved.text) onMoveRow?.(moved, targetDay);
    } else {
      setRows((prev) => prev.map((row, i) =>
        i === editIdx
          ? {
              ...row,
              time: editVals.time.trim() || row.time,
              text: editVals.text.trim() || row.text,
              note: editVals.note.trim() || undefined,
              tags: editVals.tags?.length ? editVals.tags : undefined,
            }
          : row
      ));
    }
    setIsNewRow(false);
    setEditIdx(null);
  };
  const cancelEdit = () => {
    if (isNewRow) setRows((prev) => prev.filter((_, i) => i !== editIdx));
    setIsNewRow(false);
    setEditIdx(null);
  };
  const deleteRow = (i) => setRows((prev) => prev.filter((_, idx) => idx !== i));
  const toggleDone = (i) => setRows((prev) => prev.map((row, idx) => idx === i ? { ...row, done: !row.done } : row));

  const addRow = () => {
    const lastTime = rows[rows.length - 1]?.time ?? "09:00";
    const [h, m] = lastTime.split(":").map(Number);
    let newTime = "09:00";
    if (!isNaN(h) && !isNaN(m)) {
      const total = h * 60 + m + 30;
      newTime = `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
    }
    const newId = `${dayKey}-${Date.now()}`;
    setRows((prev) => [...prev, { time: newTime, text: "", _id: newId }]);
    setEditIdx(rows.length);
    setEditVals({ time: newTime, text: "", note: "", tags: [], targetDay: dayKey });
    setIsNewRow(true);
  };

  return (
    <>
    {editIdx !== null && (
      <ActivityModal
        isNew={isNewRow}
        editVals={editVals}
        setEditVals={setEditVals}
        onSave={saveEdit}
        onCancel={cancelEdit}
        allDays={allDays}
        currentDayKey={dayKey}
      />
    )}
    <div className="day-card">
      <button className="day-head" onClick={() => setOpen((o) => !o)}>
        <span className="badge" style={{ background: badge.bg, color: badge.color }}>
          {badge.label}
        </span>
        <span className="day-title">{day.title}</span>
        {(() => {
          const done = rows.filter((r) => r.done).length;
          const total = rows.length;
          if (done === 0) return null;
          const all = done === total;
          return (
            <span className="day-progress" style={{ color: all ? "#22C55E" : "#F59E0B" }}>
              {done}/{total}
            </span>
          );
        })()}
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
                  startEdit={startEdit}
                  deleteRow={deleteRow}
                  onToggleDone={toggleDone}
                />
              ))}
            </SortableContext>
          </DndContext>
          <button className="add-row-btn" onClick={addRow}>
            <span className="add-row-icon">＋</span> aggiungi attività
          </button>
        </div>
      )}
    </div>
    </>
  );
}

// ── activity modal ───────────────────────────────────────────────────────────

function ActivityModal({ isNew, editVals, setEditVals, onSave, onCancel, allDays, currentDayKey }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onCancel(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onCancel]);

  useEffect(() => {
    const y = window.scrollY;
    document.body.style.cssText = `position:fixed;top:-${y}px;left:0;right:0;overflow-y:scroll`;
    return () => { document.body.style.cssText = ""; window.scrollTo(0, y); };
  }, []);

  const handleKey = (e) => {
    if (e.key === "Enter") { e.preventDefault(); onSave(); }
  };

  const toggleTag = (tag) => {
    setEditVals((v) => ({
      ...v,
      tags: v.tags?.includes(tag) ? v.tags.filter((t) => t !== tag) : [...(v.tags ?? []), tag],
    }));
  };

  return (
    <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="modal">
        <div className="modal-header">
          {isNew ? "Nuova attività" : "Modifica attività"}
        </div>
        <div className="modal-body">
          <div className="modal-field">
            <label>Attività</label>
            <input
              className="modal-input"
              value={editVals.text}
              placeholder="es. Visita al Fushimi Inari…"
              onChange={(e) => setEditVals((v) => ({ ...v, text: e.target.value }))}
              onKeyDown={handleKey}
              autoFocus
            />
          </div>
          <div className="modal-row">
            <div className="modal-field modal-field-time">
              <label>Orario</label>
              <input
                className="modal-input"
                type="time"
                value={editVals.time}
                onChange={(e) => setEditVals((v) => ({ ...v, time: e.target.value }))}
                onKeyDown={handleKey}
              />
            </div>
            <div className="modal-field" style={{ flex: 1 }}>
              <label>Nota <span>(opzionale)</span></label>
              <input
                className="modal-input"
                value={editVals.note}
                placeholder="prenotazione, link, prezzo…"
                onChange={(e) => setEditVals((v) => ({ ...v, note: e.target.value }))}
                onKeyDown={handleKey}
              />
            </div>
          </div>
          <div className="modal-field">
            <label>Tag <span>(opzionale)</span></label>
            <div className="modal-tags">
              {Object.entries(tagColors).map(([tag, s]) => {
                const active = editVals.tags?.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    className={`modal-tag${active ? " modal-tag-active" : ""}`}
                    style={active ? { background: s.bg, color: s.color, borderColor: s.bg } : {}}
                    onClick={() => toggleTag(tag)}
                  >{tag}</button>
                );
              })}
            </div>
          </div>
          {allDays && allDays.length > 1 && (
            <div className="modal-field">
              <label>Giorno <span>(sposta attività)</span></label>
              <select
                className="modal-select"
                value={editVals.targetDay ?? currentDayKey}
                onChange={(e) => setEditVals((v) => ({ ...v, targetDay: e.target.value }))}
              >
                {allDays.map((d) => (
                  <option key={d.key} value={d.key}>{formatDayOption(d)}</option>
                ))}
              </select>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="modal-btn-cancel" onClick={onCancel}>Annulla</button>
          <button className="modal-btn-save" onClick={onSave}>Salva</button>
        </div>
      </div>
    </div>
  );
}

// ── checklist ────────────────────────────────────────────────────────────────

function ChecklistItemModal({ isNew, text, setText, onSave, onCancel }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onCancel(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onCancel]);

  useEffect(() => {
    const y = window.scrollY;
    document.body.style.cssText = `position:fixed;top:-${y}px;left:0;right:0;overflow-y:scroll`;
    return () => { document.body.style.cssText = ""; window.scrollTo(0, y); };
  }, []);

  return (
    <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="modal">
        <div className="modal-header">{isNew ? "Nuova voce" : "Modifica voce"}</div>
        <div className="modal-body">
          <div className="modal-field">
            <label>Voce</label>
            <input
              className="modal-input"
              value={text}
              placeholder="es. Passaporto, adattatore prese…"
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onSave(); } }}
              autoFocus
            />
          </div>
        </div>
        <div className="modal-footer">
          <button className="modal-btn-cancel" onClick={onCancel}>Annulla</button>
          <button className="modal-btn-save" onClick={onSave}>Salva</button>
        </div>
      </div>
    </div>
  );
}

function ChecklistCategory({ category, items, onChange }) {
  const [open, setOpen] = useState(true);
  const [editId, setEditId] = useState(null);
  const [modalText, setModalText] = useState("");

  const checkedCount = items.filter((i) => i.checked).length;

  const toggle = (id) => onChange(items.map((i) => i.id === id ? { ...i, checked: !i.checked } : i));
  const deleteItem = (id) => onChange(items.filter((i) => i.id !== id));

  const openAdd = () => { setEditId("new"); setModalText(""); };
  const openEdit = (item) => { setEditId(item.id); setModalText(item.text); };
  const closeModal = () => { setEditId(null); setModalText(""); };
  const saveModal = () => {
    if (!modalText.trim()) return;
    if (editId === "new") {
      onChange([...items, { id: `${category.id}-${Date.now()}`, text: modalText.trim(), checked: false }]);
    } else {
      onChange(items.map((i) => i.id === editId ? { ...i, text: modalText.trim() } : i));
    }
    closeModal();
  };

  return (
    <>
      {editId !== null && (
        <ChecklistItemModal
          isNew={editId === "new"}
          text={modalText}
          setText={setModalText}
          onSave={saveModal}
          onCancel={closeModal}
        />
      )}
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
                <input type="checkbox" className="cl-checkbox" checked={item.checked} onChange={() => toggle(item.id)} />
                <span className="cl-item-text">{item.text}</span>
                <button className="edit-btn" onClick={() => openEdit(item)} title="Modifica">✎</button>
                <button className="cl-del-btn" onClick={() => deleteItem(item.id)} title="Elimina">×</button>
              </div>
            ))}
            <button className="add-row-btn" onClick={openAdd}>
              <span className="add-row-icon">＋</span> aggiungi voce
            </button>
          </div>
        )}
      </div>
    </>
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

function Section({ section, activeSection, onToggle, weatherData, itinerary, onRowsChange, allDays, onMoveRow, cardVersions }) {
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
          {section.days.map((day) => {
            const dk = day.date ?? day.title;
            return (
              <DayCard
                key={`${dk}-${cardVersions?.[dk] ?? 0}`}
                day={day}
                weatherData={weatherData}
                initialRows={itinerary?.[dk]}
                onRowsChange={onRowsChange}
                allDays={allDays}
                onMoveRow={onMoveRow}
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
  const [cardVersions, setCardVersions] = useState({});

  const allDays = useMemo(() =>
    sections.flatMap((s) => s.days.map((d) => ({ key: d.date ?? d.title, label: d.title, badge: d.badge }))),
  []);

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

  const handleMoveRow = useCallback((row, toKey) => {
    setItinerary((prev) => ({
      ...prev,
      [toKey]: [...(prev?.[toKey] ?? []), row],
    }));
    setCardVersions((prev) => ({ ...prev, [toKey]: (prev[toKey] ?? 0) + 1 }));
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
          <Section key={s.id} section={s} activeSection={activeSection} onToggle={toggle} weatherData={weatherData} itinerary={itinerary} onRowsChange={handleRowsChange} allDays={allDays} onMoveRow={handleMoveRow} cardVersions={cardVersions} />
        ))}
      </main>

      <footer className="footer">
        <span>Itinerario Giappone · Maggio–Giugno 2026</span>
        <span className={weatherUpdatedAt ? "weather-live" : "weather-loading"}>{weatherLabel}</span>
      </footer>
    </div>
  );
}

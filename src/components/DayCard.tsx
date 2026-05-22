import { useState, useEffect, useMemo, useRef } from 'react';
import {
  DndContext, closestCenter, MouseSensor, TouchSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy, arrayMove,
} from '@dnd-kit/sortable';
import type { DragEndEvent } from '@dnd-kit/core';
import { badgeStyles } from '../data';
import { ChevronDown, Pencil, Plus } from 'lucide-react';
import { SortableRow } from './SortableRow';
import { DayMap } from './DayMap';
import { HourlyStrip } from './HourlyStrip';
import { AlertBanner } from './AlertBanner';
import { ActivityModal } from './modals/ActivityModal';
import { AlertEditModal } from './modals/AlertEditModal';
import { DaySwapModal } from './modals/DaySwapModal';
import { DayEditModal } from './modals/DayEditModal';
import { parseMapsCoords } from '../utils/coords';
import type {
  Row, DayData, DayInfo, AlertData, WeatherDataMap, HourlySlot, WeatherDay,
  EditVals, TitleOverridesData,
} from '../types';

interface Props {
  day: DayData;
  weatherData: WeatherDataMap;
  initialRows: Row[] | undefined;
  onRowsChange?: (dayKey: string, rows: Row[]) => void;
  allDays: DayInfo[];
  onMoveRow?: (row: Row, toKey: string) => void;
  alertOverride?: AlertData;
  onAlertChange?: (dayKey: string, val: AlertData) => void;
  titleOverride?: string;
  titleOverrides: TitleOverridesData | null;
  badgeOverride?: string;
  onDayEdit?: (dayKey: string, patch: { title?: string; badge?: string }) => void;
  onSwapDay?: (keyA: string, keyB: string) => void;
  isToday?: boolean;
  defaultOpen?: boolean;
  tagOverride?: string[];
  onTagsChange?: (dayKey: string, tags: string[]) => void;
}

export function DayCard({
  day, weatherData, initialRows, onRowsChange, allDays, onMoveRow,
  alertOverride, onAlertChange, titleOverride, titleOverrides,
  badgeOverride, onDayEdit, onSwapDay, isToday, defaultOpen = true,
  tagOverride, onTagsChange,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const dayKey = day.date ?? day.title;
  const defaultRows: Row[] = day.rows.map((r, i) => ({ ...r, _id: `${dayKey}-${i}` }));

  const [rows, setRows] = useState<Row[]>(() => {
    const base = initialRows?.length
      ? initialRows.map((row) => {
          const def = defaultRows.find((d) => d._id === row._id);
          return { ...row, coords: row.coords ?? def?.coords };
        })
      : defaultRows;
    return [...base].sort((a, b) => (a.time ?? '').localeCompare(b.time ?? ''));
  });

  const isFirstRowEffect = useRef(true);
  useEffect(() => {
    if (isFirstRowEffect.current) { isFirstRowEffect.current = false; return; }
    onRowsChange?.(dayKey, rows);
  }, [rows]); // eslint-disable-line react-hooks/exhaustive-deps

  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [editVals, setEditVals] = useState<EditVals>({ time: '', text: '', note: '', tags: [], url: '' });
  const [isNewRow, setIsNewRow] = useState(false);
  const [alertEditOpen, setAlertEditOpen] = useState(false);
  const [daySwapOpen, setDaySwapOpen] = useState(false);
  const [dayEditOpen, setDayEditOpen] = useState(false);

  // Effective badge and city (may be overridden via Firebase)
  const effectiveBadgeKey = badgeOverride ?? day.badge;
  const badge = badgeStyles[effectiveBadgeKey] ?? badgeStyles[day.badge];

  const titleParts = day.title.split(' — ');
  const datePrefix = titleParts[0];
  const effectiveSubtitle = titleOverride !== undefined ? titleOverride : (titleParts[1] ?? '');

  const effectiveAlert: AlertData | null = alertOverride !== undefined
    ? (alertOverride.text ? alertOverride : null)
    : (day.alert ?? null);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  );

  const handleSortEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    setRows((prev) => {
      const oldIdx = prev.findIndex((r) => r._id === active.id);
      const newIdx = prev.findIndex((r) => r._id === over.id);
      const times = prev.map((r) => r.time);
      const next = arrayMove(prev, oldIdx, newIdx);
      return next.map((row, i) => ({ ...row, time: times[i] }));
    });
  };

  // Weather uses effective badge/city
  const hourlySlots = weatherData[`${day.date}_${effectiveBadgeKey}_hourly`] as HourlySlot[] | undefined ?? null;
  const weather = useMemo(() => {
    if (!day.date) return day.weather;
    const w = weatherData[`${day.date}_${effectiveBadgeKey}`] as WeatherDay | undefined;
    if (!w) return day.weather;
    return `${w.icon} ${w.temp}°C · ${w.rain}%`;
  }, [day, weatherData, effectiveBadgeKey]);

  const startEdit = (i: number) => {
    setEditIdx(i);
    setEditVals({
      time: rows[i].time,
      text: rows[i].text,
      note: rows[i].note ?? '',
      tags: rows[i].tags ?? [],
      url: rows[i].url ?? '',
      targetDay: dayKey,
    });
  };

  const saveEdit = () => {
    if (editIdx === null) return;
    const targetDay = editVals.targetDay ?? dayKey;
    const isMove = targetDay !== dayKey;
    if (isMove) {
      setRows((prev) => prev.filter((_, i) => i !== editIdx));
      const src = rows[editIdx];
      const moved: Row = {
        ...src,
        _id: `${targetDay}-${Date.now()}`,
        time: editVals.time.trim() || src.time,
        text: editVals.text.trim() || src.text,
        note: editVals.note.trim() || undefined,
        tags: editVals.tags.length ? editVals.tags : undefined,
        url: editVals.url.trim() || undefined,
      };
      if (moved.text) onMoveRow?.(moved, targetDay);
    } else {
      setRows((prev) =>
        [...prev.map((row, i) =>
          i === editIdx
            ? {
                ...row,
                time: editVals.time.trim() || row.time,
                text: editVals.text.trim() || row.text,
                note: editVals.note.trim() || undefined,
                tags: editVals.tags.length ? editVals.tags : undefined,
                url: editVals.url.trim() || undefined,
              }
            : row,
        )].sort((a, b) => (a.time ?? '').localeCompare(b.time ?? '')),
      );
    }
    setIsNewRow(false);
    setEditIdx(null);
  };

  const cancelEdit = () => {
    if (isNewRow) setRows((prev) => prev.filter((_, i) => i !== editIdx));
    setIsNewRow(false);
    setEditIdx(null);
  };

  const deleteRow = (i: number) => setRows((prev) => prev.filter((_, idx) => idx !== i));
  const toggleDone = (i: number) =>
    setRows((prev) => prev.map((row, idx) => idx === i ? { ...row, done: !row.done } : row));

  const addRow = () => {
    const lastTime = rows[rows.length - 1]?.time ?? '09:00';
    const [h, m] = lastTime.split(':').map(Number);
    let newTime = '09:00';
    if (!isNaN(h) && !isNaN(m)) {
      const total = h * 60 + m + 30;
      newTime = `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
    }
    const newId = `${dayKey}-${Date.now()}`;
    setRows((prev) => [...prev, { time: newTime, text: '', _id: newId }]);
    setEditIdx(rows.length);
    setEditVals({ time: newTime, text: '', note: '', tags: [], url: '', targetDay: dayKey });
    setIsNewRow(true);
  };

  // Map points + per-row map number (feature 5)
  const mapPoints = rows.flatMap((r) => {
    const coords = r.coords ?? (r.url ? parseMapsCoords(r.url) ?? undefined : undefined);
    return coords ? [{ label: r.text, coords, done: r.done }] : [];
  });

  let _mapCounter = 0;
  const rowMapNums = rows.map((r) => {
    const coords = r.coords ?? (r.url ? parseMapsCoords(r.url) ?? undefined : undefined);
    return coords ? ++_mapCounter : null;
  });

  return (
    <div id={dayKey} className={`day-card${isToday ? ' day-card-today' : ''}`}>
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
      {daySwapOpen && (
        <DaySwapModal
          allDays={allDays}
          currentDayKey={dayKey}
          titleOverrides={titleOverrides}
          onSwap={(targetKey) => { onSwapDay?.(dayKey, targetKey); setDaySwapOpen(false); }}
          onCancel={() => setDaySwapOpen(false)}
        />
      )}
      {alertEditOpen && (
        <AlertEditModal
          current={effectiveAlert}
          onSave={(val) => { onAlertChange?.(dayKey, val); setAlertEditOpen(false); }}
          onCancel={() => setAlertEditOpen(false)}
          onRemove={() => { onAlertChange?.(dayKey, { type: '', text: '' }); setAlertEditOpen(false); }}
        />
      )}
      {dayEditOpen && (
        <DayEditModal
          currentSubtitle={titleOverride ?? (titleParts[1] ?? '')}
          currentBadge={effectiveBadgeKey}
          currentTags={tagOverride ?? []}
          onSave={(subtitle, newBadge, tags) => {
            onDayEdit?.(dayKey, { title: subtitle, badge: newBadge });
            onTagsChange?.(dayKey, tags);
            setDayEditOpen(false);
          }}
          onCancel={() => setDayEditOpen(false)}
        />
      )}

      <div
        className="day-head"
        role="button"
        tabIndex={0}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => e.key === 'Enter' && setOpen((o) => !o)}
      >
        <span className="badge" style={{ background: badge.bg, color: badge.color }}>
          {badge.label}
        </span>
        {isToday && <span className="today-pill">oggi</span>}
        <span className="day-title">
          <span
            className="day-title-date"
            onClick={(e) => { e.stopPropagation(); setDaySwapOpen(true); }}
            title="Scambia giornata"
          >{datePrefix}</span>
          {effectiveSubtitle && <> — {effectiveSubtitle}</>}
        </span>
        {tagOverride && tagOverride.length > 0 && (
          <span className="day-head-tags">
            {tagOverride.map((t) => {
              const s = badgeStyles[t] ?? { bg: '#f3f4f6', color: '#374151', label: t };
              return (
                <span key={t} className="badge" style={{ background: s.bg, color: s.color }}>
                  {s.label}
                </span>
              );
            })}
          </span>
        )}
        {(() => {
          const done = rows.filter((r) => r.done).length;
          const total = rows.length;
          if (total === 0) return null;
          const pct = Math.round((done / total) * 100);
          const all = done === total;
          return (
            <span className="day-progress" style={{ color: all ? '#22C55E' : badge.color }}>
              {done}/{total}
              <span className="day-progress-pct"> · {pct}%</span>
            </span>
          );
        })()}
        <span className="weather">{weather}</span>
        <button
          className="day-edit-btn"
          title="Modifica giornata"
          onClick={(e) => { e.stopPropagation(); setDayEditOpen(true); }}
        >
          <Pencil size={13} />
        </button>
        <span className="chevron" style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}><ChevronDown size={14} /></span>
      </div>
      {(() => {
        const done = rows.filter((r) => r.done).length;
        const total = rows.length;
        if (done === 0 || total === 0) return null;
        return (
          <div className="day-done-track">
            <div
              className="day-done-fill"
              style={{ width: `${(done / total) * 100}%`, background: badge.color }}
            />
          </div>
        );
      })()}

      {open && hourlySlots && <HourlyStrip slots={hourlySlots} />}
      {open && mapPoints.length > 0 && (
        <DayMap points={mapPoints} color={badge.color} />
      )}

      {open && (
        <div className="day-body">
          {effectiveAlert ? (
            <div className="alert-wrap">
              <AlertBanner alert={effectiveAlert} />
              <button className="alert-edit-btn" onClick={() => setAlertEditOpen(true)} title="Modifica nota"><Pencil size={13} /></button>
            </div>
          ) : (
            <button className="add-alert-btn" onClick={() => setAlertEditOpen(true)}><Plus size={12} /> aggiungi nota</button>
          )}
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleSortEnd}>
            <SortableContext items={rows.map((r) => r._id)} strategy={verticalListSortingStrategy}>
              {rows.map((row, i) => (
                <SortableRow
                  key={row._id}
                  id={row._id}
                  row={row}
                  idx={i}
                  mapNum={rowMapNums[i]}
                  startEdit={startEdit}
                  deleteRow={deleteRow}
                  onToggleDone={toggleDone}
                />
              ))}
            </SortableContext>
          </DndContext>
          <button className="add-row-btn" onClick={addRow}>
            <Plus size={14} /> aggiungi attività
          </button>
        </div>
      )}
    </div>
  );
}

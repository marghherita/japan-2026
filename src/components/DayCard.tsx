import { useState, useEffect, useMemo, useRef } from 'react';
import {
  DndContext, closestCenter, MouseSensor, TouchSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy, arrayMove,
} from '@dnd-kit/sortable';
import type { DragEndEvent } from '@dnd-kit/core';
import { badgeStyles } from '../data';
import { SortableRow } from './SortableRow';
import { DayMap } from './DayMap';
import { HourlyStrip } from './HourlyStrip';
import { AlertBanner } from './AlertBanner';
import { ActivityModal } from './modals/ActivityModal';
import { AlertEditModal } from './modals/AlertEditModal';
import { DaySwapModal } from './modals/DaySwapModal';
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
  onSwapDay?: (keyA: string, keyB: string) => void;
}

export function DayCard({
  day, weatherData, initialRows, onRowsChange, allDays, onMoveRow,
  alertOverride, onAlertChange, titleOverride, titleOverrides, onSwapDay,
}: Props) {
  const [open, setOpen] = useState(true);
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
  const [editVals, setEditVals] = useState<EditVals>({
    time: '', text: '', note: '', tags: [], url: '',
  });
  const [isNewRow, setIsNewRow] = useState(false);
  const [alertEditOpen, setAlertEditOpen] = useState(false);
  const [daySwapOpen, setDaySwapOpen] = useState(false);

  const badge = badgeStyles[day.badge];
  const titleParts = day.title.split(' — ');
  const displayTitle = titleOverride !== undefined
    ? (titleOverride ? `${titleParts[0]} — ${titleOverride}` : titleParts[0])
    : day.title;

  const effectiveAlert: AlertData | null = alertOverride !== undefined
    ? (alertOverride.text ? alertOverride : null)
    : (day.alert ?? null);

  const sensors = useSensors(
    useSensor(MouseSensor),
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

  const hourlySlots = weatherData[`${day.date}_${day.city}_hourly`] as HourlySlot[] | undefined ?? null;

  const weather = useMemo(() => {
    if (!day.date || !day.city) return day.weather;
    const w = weatherData[`${day.date}_${day.city}`] as WeatherDay | undefined;
    if (!w) return day.weather;
    return `${w.icon} ${w.temp}°C · ${w.rain}%`;
  }, [day, weatherData]);

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

  const mapPoints = rows
    .flatMap((r) => {
      const coords = r.coords ?? (r.url ? parseMapsCoords(r.url) ?? undefined : undefined);
      return coords ? [{ label: r.text, coords }] : [];
    });

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
      <div className="day-card">
        <button className="day-head" onClick={() => setOpen((o) => !o)}>
          <span className="badge" style={{ background: badge.bg, color: badge.color }}>
            {badge.label}
          </span>
          <span className="day-title">{displayTitle}</span>
          {(() => {
            const done = rows.filter((r) => r.done).length;
            const total = rows.length;
            if (done === 0) return null;
            const all = done === total;
            return (
              <span className="day-progress" style={{ color: all ? '#22C55E' : '#F59E0B' }}>
                {done}/{total}
              </span>
            );
          })()}
          <span className="weather">{weather}</span>
          <span className="chevron" style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>▾</span>
        </button>

        {open && hourlySlots && <HourlyStrip slots={hourlySlots} />}

        {open && mapPoints.length > 0 && (
          <DayMap points={mapPoints} color={badgeStyles[day.badge].color} />
        )}

        {open && (
          <div className="day-body">
            {effectiveAlert ? (
              <div className="alert-wrap">
                <AlertBanner alert={effectiveAlert} />
                <button className="alert-edit-btn" onClick={() => setAlertEditOpen(true)} title="Modifica nota">✎</button>
              </div>
            ) : (
              <button className="add-alert-btn" onClick={() => setAlertEditOpen(true)}>＋ aggiungi nota</button>
            )}
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
            <button className="day-swap-btn" onClick={() => setDaySwapOpen(true)}>⇄ scambia giornata</button>
          </div>
        )}
      </div>
    </>
  );
}

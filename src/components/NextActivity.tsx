import type { ItineraryData, Row, SectionData } from '../types';

interface Props {
  itinerary: ItineraryData;
  now: Date;
  sections: SectionData[];
}

export function NextActivity({ itinerary, now, sections }: Props) {
  const todayStr = now.toISOString().slice(0, 10);
  const todayDay = sections.flatMap((s) => s.days).find((d) => d.date === todayStr);
  if (!todayDay) return null;

  const rows: Row[] = itinerary[todayStr]?.length
    ? itinerary[todayStr]
    : todayDay.rows.map((r, i) => ({ ...r, _id: `${todayStr}-${i}` }));

  const nowMins = now.getHours() * 60 + now.getMinutes();

  const next = [...rows]
    .filter((r) => !r.done && r.time)
    .map((r) => {
      const [h, m] = r.time.split(':').map(Number);
      return { row: r, mins: h * 60 + m };
    })
    .filter(({ mins }) => mins > nowMins)
    .sort((a, b) => a.mins - b.mins)[0];

  if (!next) return null;

  const diff = next.mins - nowMins;
  const diffStr =
    diff < 60
      ? `tra ${diff} min`
      : `tra ${Math.floor(diff / 60)}h${diff % 60 ? ` ${diff % 60} min` : ''}`;

  return (
    <div className="next-activity">
      <span className="next-activity-label">Prossima</span>
      <span className="next-activity-text">{next.row.text}</span>
      <span className="next-activity-time">{next.row.time} · {diffStr}</span>
    </div>
  );
}

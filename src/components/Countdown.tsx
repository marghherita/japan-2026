import { useState, useEffect } from 'react';

export const DEPART = new Date('2026-05-24T00:00:00');

interface TimeLeft {
  days: number;
  hours: number;
  mins: number;
}

function calcLeft(now: number): TimeLeft | null {
  const diff = DEPART.getTime() - now;
  if (diff <= 0) return null;
  return {
    days:  Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    mins:  Math.floor((diff % 3600000)  / 60000),
  };
}

export function Countdown({ now }: { now: Date }) {
  const [left, setLeft] = useState<TimeLeft | null>(() => calcLeft(now.getTime()));

  useEffect(() => {
    setLeft(calcLeft(now.getTime()));
  }, [now]);

  if (!left) return null;

  return (
    <div className="countdown">
      <span className="countdown-label">🇯🇵​ Mancano:</span>
      <div className="countdown-units">
        {(
          [
            { n: left.days,  u: 'giorni' },
            { n: left.hours, u: 'ore'    },
            { n: left.mins,  u: 'min'    },
          ] as const
        ).map(({ n, u }) => (
          <div className="countdown-unit" key={u}>
            <span className="countdown-num">{n}</span>
            <span className="countdown-unit-label">{u}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

import { Moon, Sun, Share } from 'lucide-react';
import logoJanap from '../assets/logo_janap.png';
import { DEPART } from './Countdown';
import type { SectionData, TitleOverridesData } from '../types';

const TRIP_END   = new Date('2026-06-06T00:00:00');
const TOTAL_DAYS = 13;
const IT_MONTHS  = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'];
const IT_DAYS    = ['Dom','Lun','Mar','Mer','Gio','Ven','Sab'];

interface Props {
  dark: boolean;
  onToggleDark: () => void;
  now: Date;
  sections: SectionData[];
  titleOverrides: TitleOverridesData;
  todayKey: string | null;
}

export function AppHeader({ dark, onToggleDark, now, sections, titleOverrides, todayKey }: Props) {
  const duringTrip = now >= DEPART && now < TRIP_END;
  const preTrip    = now < DEPART;

  const dayNum = duringTrip
    ? Math.floor((now.getTime() - DEPART.getTime()) / 86400000) + 1
    : null;

  const daysLeft = preTrip
    ? Math.ceil((DEPART.getTime() - now.getTime()) / 86400000)
    : null;

  const dateStr = `${now.getDate()} ${IT_MONTHS[now.getMonth()]},`;
  const dayStr  = IT_DAYS[now.getDay()];

  let statusText: string | null = null;
  if (preTrip && daysLeft !== null) {
    statusText = `MANCANO ${daysLeft} ${daysLeft === 1 ? 'GIORNO' : 'GIORNI'} AL VIAGGIO`;
  } else if (duringTrip) {
    statusText = `GIORNO ${dayNum} DI ${TOTAL_DAYS} · IN VIAGGIO`;
  }

  let subtitle = '';
  if (duringTrip && todayKey) {
    const todayDay = sections.flatMap((s) => s.days).find((d) => d.date === todayKey);
    if (todayDay) {
      subtitle = titleOverrides[todayKey] ?? todayDay.title?.split(' — ').slice(1).join(' — ') ?? '';
    }
  }

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: 'Janap', url: window.location.href }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(window.location.href).catch(() => {});
    }
  };

  return (
    <header className="header">
      <div className="header-topbar">
        <div className="header-brand">
          <img src={logoJanap} alt="Janap" className="header-logo-full" />
        </div>
        <div className="header-actions">
          <button className="header-btn" onClick={onToggleDark} aria-label="Tema">
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button className="header-btn" onClick={handleShare} aria-label="Condividi">
            <Share size={16} />
          </button>
        </div>
      </div>

      {statusText && (
        <div className="header-status">
          <span className="header-status-dot" />
          <span>{statusText}</span>
        </div>
      )}
      <div className="header-date">
        <span className="header-date-main">{dateStr}</span>
        <span className="header-date-day"> {dayStr}</span>
      </div>
      {subtitle && <div className="header-subtitle">{subtitle}</div>}
    </header>
  );
}

import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { LatLngTuple } from 'leaflet';
import type { MapPoint } from '../types';

function makeMarkerIcon(n: number, color: string) {
  return L.divIcon({
    className: '',
    html: `<div style="width:22px;height:22px;border-radius:50%;background:${color};color:#fff;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35);font-family:sans-serif">${n}</div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -13],
  });
}

function MapFitter({ positions }: { positions: LatLngTuple[] }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length > 1) map.fitBounds(positions, { padding: [28, 28] });
    else map.setView(positions[0], 15);
  }, [map]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

function MapDragGuard({ enabled }: { enabled: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (enabled) { map.dragging.enable(); map.touchZoom.enable(); }
    else         { map.dragging.disable(); map.touchZoom.disable(); }
  }, [map, enabled]);
  return null;
}

interface Props {
  points: MapPoint[];
  color: string;
}

export function DayMap({ points, color }: Props) {
  const positions = points.map((p) => p.coords as LatLngTuple);
  const isPointer = window.matchMedia('(hover: hover)').matches;
  const [enabled, setEnabled] = useState(isPointer);

  return (
    <div className="day-map">
      <MapContainer
        center={positions[0]}
        zoom={13}
        zoomControl={false}
        attributionControl={false}
        style={{ height: '210px', width: '100%' }}
      >
        <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}" />
        <MapFitter positions={positions} />
        <MapDragGuard enabled={enabled} />
        {positions.length > 1 && (
          <Polyline
            positions={positions}
            pathOptions={{ color, weight: 2.5, opacity: 0.75 }}
          />
        )}
        {points.map((p, i) => (
          <Marker key={i} position={p.coords as LatLngTuple} icon={makeMarkerIcon(i + 1, color)}>
            <Popup>{p.label}</Popup>
          </Marker>
        ))}
      </MapContainer>
      {!enabled && (
        <div className="map-overlay" onClick={() => setEnabled(true)}>
          <span className="map-overlay-hint">Tocca per navigare</span>
        </div>
      )}
    </div>
  );
}

import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { MapPoint } from '../types';

type LatLng = [number, number];

function makeIcon(index: number, color: string) {
  return L.divIcon({
    html: `<div style="width:22px;height:22px;border-radius:50%;background:${color};color:#fff;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35);font-family:sans-serif">${index + 1}</div>`,
    className: '',
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -13],
  });
}

function BoundsFitter({ positions, posKey }: { positions: LatLng[]; posKey: string }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length === 0) return;
    if (positions.length === 1) {
      map.setView(positions[0], 15);
    } else {
      map.fitBounds(L.latLngBounds(positions), { padding: [40, 40] });
    }
  }, [map, posKey]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

interface Props {
  points: MapPoint[];
  color: string;
}

export function DayMap({ points, color }: Props) {
  const positions = useMemo<LatLng[]>(
    () => points.map((p) => [p.coords[0], p.coords[1]]),
    [points],
  );
  const posKey = positions.map((p) => p.join(',')).join('|');

  return (
    <div className="day-map">
      <MapContainer
        center={positions[0] ?? [34.69, 135.5]}
        zoom={13}
        style={{ height: 210, width: '100%' }}
        scrollWheelZoom={false}
        zoomControl
      >
        <TileLayer
          url={`https://api.maptiler.com/maps/basic-v2/{z}/{x}/{y}.png?key=${import.meta.env.VITE_MAPTILER_KEY}`}
          attribution='&copy; <a href="https://www.maptiler.com/">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          maxZoom={20}
          tileSize={512}
          zoomOffset={-1}
        />
        <BoundsFitter positions={positions} posKey={posKey} />
        {positions.length > 1 && (
          <Polyline positions={positions} color={color} weight={2.5} opacity={0.75} />
        )}
        {points.map((p, i) => (
          <Marker key={i} position={positions[i]} icon={makeIcon(i, color)}>
            <Popup>{p.label}</Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

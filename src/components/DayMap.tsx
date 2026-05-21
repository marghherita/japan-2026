import { useEffect, useRef } from 'react';
import { Map, AdvancedMarker, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import type { MapPoint } from '../types';

const MAP_ID = (import.meta.env.VITE_GOOGLE_MAPS_MAP_ID as string | undefined) || 'DEMO_MAP_ID';

type LatLng = google.maps.LatLngLiteral;

function PolylineDraw({ path, color }: { path: LatLng[]; color: string }) {
  const map = useMap();
  const mapsLib = useMapsLibrary('maps');
  const lineRef = useRef<google.maps.Polyline | null>(null);
  const pathKey = path.map((p) => `${p.lat},${p.lng}`).join('|');

  useEffect(() => {
    if (!map || !mapsLib) return;
    lineRef.current?.setMap(null);
    if (path.length < 2) return;
    lineRef.current = new mapsLib.Polyline({
      path,
      strokeColor: color,
      strokeWeight: 2.5,
      strokeOpacity: 0.75,
      map,
    });
    return () => { lineRef.current?.setMap(null); };
  }, [map, mapsLib, color, pathKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

function BoundsFitter({ path }: { path: LatLng[] }) {
  const map = useMap();
  const coreLib = useMapsLibrary('core');
  const pathKey = path.map((p) => `${p.lat},${p.lng}`).join('|');

  useEffect(() => {
    if (!map || !coreLib || path.length === 0) return;
    if (path.length === 1) {
      map.setCenter(path[0]);
      map.setZoom(15);
    } else {
      const bounds = new coreLib.LatLngBounds();
      path.forEach((p) => bounds.extend(p));
      map.fitBounds(bounds, 40);
    }
  }, [map, coreLib, pathKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

interface Props {
  points: MapPoint[];
  color: string;
}

export function DayMap({ points, color }: Props) {
  const path: LatLng[] = points.map((p) => ({ lat: p.coords[0], lng: p.coords[1] }));

  return (
    <div className="day-map">
      <Map
        style={{ height: 210, width: '100%' }}
        defaultCenter={path[0]}
        defaultZoom={13}
        mapId={MAP_ID}
        gestureHandling="cooperative"
        disableDefaultUI
        zoomControl
      >
        <BoundsFitter path={path} />
        {path.length > 1 && <PolylineDraw path={path} color={color} />}
        {points.map((p, i) => (
          <AdvancedMarker key={i} position={path[i]} title={p.label}>
            <div style={{
              width: 22, height: 22, borderRadius: '50%',
              background: color, color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700,
              border: '2px solid #fff',
              boxShadow: '0 1px 4px rgba(0,0,0,.35)',
              fontFamily: 'sans-serif',
            }}>{i + 1}</div>
          </AdvancedMarker>
        ))}
      </Map>
    </div>
  );
}

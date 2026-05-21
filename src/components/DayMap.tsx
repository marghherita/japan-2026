import { useEffect, useRef, useMemo } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { MapPoint } from '../types';

const KEY = import.meta.env.VITE_MAPTILER_KEY as string;

interface Props {
  points: MapPoint[];
  color: string;
}

export function DayMap({ points, color }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  const coords = useMemo(
    () => points.map((p) => [p.coords[1], p.coords[0]] as [number, number]),
    [points],
  );
  const pointsKey = coords.map((c) => c.join(',')).join('|');

  useEffect(() => {
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: `https://api.maptiler.com/maps/basic-v2/style.json?key=${KEY}`,
      center: coords[0] ?? [135.5, 34.69],
      zoom: 13,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-left');
    map.addControl(new maplibregl.AttributionControl({ compact: true }));

    map.on('style.load', () => {
      // Force English labels on every symbol layer
      map.getStyle().layers.forEach((layer) => {
        if (layer.type === 'symbol') {
          try {
            map.setLayoutProperty(layer.id, 'text-field', [
              'coalesce', ['get', 'name:en'], ['get', 'name:latin'], ['get', 'name'],
            ]);
          } catch { /* some layers don't support text-field */ }
        }
      });

      // Fit bounds
      if (coords.length === 1) {
        map.setCenter(coords[0]);
        map.setZoom(15);
      } else if (coords.length > 1) {
        const bounds = coords.reduce(
          (b, c) => b.extend(c as maplibregl.LngLatLike),
          new maplibregl.LngLatBounds(coords[0], coords[0]),
        );
        map.fitBounds(bounds, { padding: 40, animate: false });
      }

      // Polyline
      if (coords.length > 1) {
        map.addSource('route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: { type: 'LineString', coordinates: coords },
            properties: {},
          },
        });
        map.addLayer({
          id: 'route',
          type: 'line',
          source: 'route',
          paint: { 'line-color': color, 'line-width': 2.5, 'line-opacity': 0.75 },
        });
      }

      // Numbered circle markers
      points.forEach((p, i) => {
        const [lng, lat] = coords[i];
        const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=transit`;

        const el = document.createElement('a');
        el.href = mapsUrl;
        el.target = '_blank';
        el.rel = 'noopener noreferrer';
        el.title = `Naviga verso: ${p.label}`;
        el.style.cssText = [
          'width:22px', 'height:22px', 'border-radius:50%',
          `background:${color}`, 'color:#fff',
          'display:flex', 'align-items:center', 'justify-content:center',
          'font-size:11px', 'font-weight:700',
          'border:2px solid #fff',
          'box-shadow:0 1px 4px rgba(0,0,0,.35)',
          'font-family:sans-serif', 'cursor:pointer',
          'text-decoration:none',
        ].join(';');
        el.textContent = String(i + 1);

        new maplibregl.Marker({ element: el })
          .setLngLat(coords[i])
          .addTo(map);
      });
    });

    return () => { map.remove(); };
  }, [pointsKey, color]); // eslint-disable-line react-hooks/exhaustive-deps

  return <div className="day-map" ref={containerRef} style={{ height: 210 }} />;
}

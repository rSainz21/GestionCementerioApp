import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import React from 'react';

type Props = {
  height: number;
  center: { latitude: number; longitude: number };
  label?: string;
  preset?: 'cerca' | 'medio' | 'amplio';
  markers?: {
    id: number;
    lat: number;
    lon: number;
    label: string;
    color?: string;
  }[];
  onPressMarker?: (id: number) => void;
};

export function OsmWebMap({ height, center, label, preset = 'medio', markers = [], onPressMarker }: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const osmMarkersRef = useRef<any[]>([]);
  const wheelCleanupRef = useRef<(() => void) | null>(null);
  const statusRef = useRef<'loading' | 'ready' | 'error'>('loading');
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  const setStatusSafe = (s: 'loading' | 'ready' | 'error') => {
    statusRef.current = s;
    setStatus(s);
  };

  const zoom = useMemo(() => (preset === 'cerca' ? 19 : preset === 'amplio' ? 16 : 18), [preset]);
  const maxBounds = useMemo(() => {
    const p =
      preset === 'cerca'
        ? { dLon: 0.0012, dLat: 0.0010 }
        : preset === 'amplio'
          ? { dLon: 0.0050, dLat: 0.0040 }
          : { dLon: 0.0026, dLat: 0.0020 };
    return {
      left: center.longitude - p.dLon,
      right: center.longitude + p.dLon,
      top: center.latitude + p.dLat,
      bottom: center.latitude - p.dLat,
    };
  }, [center.latitude, center.longitude, preset]);

  const embedSrc = useMemo(() => {
    const marker = `${center.latitude},${center.longitude}`;
    const note = label ? encodeURIComponent(label) : 'Cementerio';
    return `https://www.openstreetmap.org/export/embed.html?bbox=${maxBounds.left}%2C${maxBounds.bottom}%2C${maxBounds.right}%2C${maxBounds.top}&layer=mapnik&marker=${marker}&note=${note}`;
  }, [center.latitude, center.longitude, label, maxBounds.bottom, maxBounds.left, maxBounds.right, maxBounds.top]);

  // 1) Cargar MapLibre (CDN) y crear el mapa UNA vez
  useEffect(() => {
    const ensureCss = () => {
      const id = 'maplibre-css';
      if (document.getElementById(id)) return;
      const link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      // CDN 1 (unpkg) suele ir bien, pero si está bloqueado, el mapa caerá al embed.
      link.href = 'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css';
      document.head.appendChild(link);
    };

    const ensureScript = () =>
      new Promise<void>((resolve, reject) => {
        const id = 'maplibre-js';
        if ((window as any).maplibregl) return resolve();
        const existing = document.getElementById(id) as HTMLScriptElement | null;
        if (existing) {
          existing.addEventListener('load', () => resolve());
          existing.addEventListener('error', () => reject(new Error('MapLibre load failed')));
          return;
        }

        const tryUrls = [
          'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js',
          'https://cdn.jsdelivr.net/npm/maplibre-gl@4.7.1/dist/maplibre-gl.js',
        ];

        const s = document.createElement('script');
        s.id = id;
        s.async = true;
        let idx = 0;
        const loadUrl = (i: number) => {
          idx = i;
          s.src = tryUrls[i];
        };
        s.onload = () => resolve();
        s.onerror = () => {
          if (idx + 1 < tryUrls.length) loadUrl(idx + 1);
          else reject(new Error('MapLibre load failed'));
        };
        loadUrl(0);
        document.head.appendChild(s);
      });

    let cancelled = false;
    const timeout = window.setTimeout(() => {
      // Si el CDN está bloqueado, no nos quedamos en blanco.
      if (!cancelled && statusRef.current === 'loading') setStatusSafe('error');
    }, 6000);
    ensureCss();
    ensureScript()
      .then(() => {
        if (cancelled) return;
        if (!hostRef.current) return;
        const maplibregl = (window as any).maplibregl;

        if (mapRef.current) return;

        const map = new maplibregl.Map({
          container: hostRef.current,
          style: {
            version: 8,
            sources: {
              osm: {
                type: 'raster',
                tiles: ['https://a.tile.openstreetmap.org/{z}/{x}/{y}.png', 'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png', 'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png'],
                tileSize: 256,
                attribution: '© OpenStreetMap contributors',
              },
            },
            layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
          },
          center: [center.longitude, center.latitude],
          zoom,
          minZoom: 15,
          maxZoom: 20,
          maxBounds: [
            [maxBounds.left, maxBounds.bottom],
            [maxBounds.right, maxBounds.top],
          ],
        });

        // Modo “fijo” para operario: no capturar scroll ni gestos, pero permitir click en marcadores.
        try {
          map.scrollZoom?.disable?.();
          map.dragPan?.disable?.();
          map.dragRotate?.disable?.();
          map.doubleClickZoom?.disable?.();
          map.boxZoom?.disable?.();
          map.keyboard?.disable?.();
          map.touchZoomRotate?.disable?.();
        } catch {}

        // Asegurar que el navegador puede hacer scroll vertical aunque el cursor esté encima del mapa.
        // (MapLibre a veces captura la rueda. La reenviamos al scroll de la página.)
        try {
          const container = map.getContainer?.();
          if (container) {
            (container.style as any).touchAction = 'pan-y';
            const onWheel = (e: WheelEvent) => {
              // Permitir scroll de página con la rueda sobre el mapa
              window.scrollBy({ top: e.deltaY, left: 0, behavior: 'auto' });
            };
            container.addEventListener('wheel', onWheel, { passive: true });
            wheelCleanupRef.current = () => container.removeEventListener('wheel', onWheel as any);
          }
        } catch {}

        mapRef.current = map;
        map.on('load', () => setStatusSafe('ready'));
      })
      .catch(() => {
        setStatusSafe('error');
      });

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
      try {
        wheelCleanupRef.current?.();
      } catch {}
      wheelCleanupRef.current = null;
      try {
        mapRef.current?.remove?.();
      } catch {}
      mapRef.current = null;
    };
  }, []); // montar una sola vez

  // 2) Actualizar vista (center/zoom/bounds) cuando cambie preset/centro
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    try {
      map.setMaxBounds?.([
        [maxBounds.left, maxBounds.bottom],
        [maxBounds.right, maxBounds.top],
      ]);
      map.jumpTo?.({ center: [center.longitude, center.latitude], zoom });
    } catch {}
  }, [center.latitude, center.longitude, maxBounds.bottom, maxBounds.left, maxBounds.right, maxBounds.top, zoom]);

  useEffect(() => {
    const map = mapRef.current;
    const maplibregl = (window as any).maplibregl;
    if (!map || !maplibregl) return;

    // Clear previous markers
    for (const m of osmMarkersRef.current) {
      try {
        m.remove();
      } catch {}
    }
    osmMarkersRef.current = [];

    // Center marker
    const centerEl = document.createElement('div');
    centerEl.className = 'cem-center';
    centerEl.style.width = '14px';
    centerEl.style.height = '14px';
    centerEl.style.borderRadius = '7px';
    centerEl.style.background = '#15803D';
    centerEl.style.border = '2px solid white';
    centerEl.style.boxShadow = '0 1px 4px rgba(0,0,0,0.35)';
    const centerMarker = new maplibregl.Marker({ element: centerEl })
      .setLngLat([center.longitude, center.latitude])
      .setPopup(new maplibregl.Popup({ offset: 18 }).setText(label ?? 'Cementerio'))
      .addTo(map);
    osmMarkersRef.current.push(centerMarker);

    // Sepulturas markers
    for (const it of markers) {
      const el = document.createElement('button');
      el.type = 'button';
      el.title = it.label;
      el.className = 'cem-marker';
      el.style.width = '12px';
      el.style.height = '12px';
      el.style.borderRadius = '6px';
      el.style.border = '2px solid #0F172A';
      el.style.background = it.color ?? '#3B82F6';
      el.style.boxShadow = '0 1px 3px rgba(0,0,0,0.35)';
      el.style.cursor = 'pointer';
      el.onclick = () => onPressMarker?.(it.id);

      const mk = new maplibregl.Marker({ element: el })
        .setLngLat([it.lon, it.lat])
        .addTo(map);
      osmMarkersRef.current.push(mk);
    }
  }, [center.latitude, center.longitude, label, markers, onPressMarker]);

  return (
    <View style={[s.frame, { height }]}>
      {/* Fallback SIEMPRE disponible: embed OSM */}
      {React.createElement('iframe', {
        title: label ?? 'OpenStreetMap',
        src: embedSrc,
        style: { width: '100%', height: '100%', border: 0, opacity: status === 'ready' ? 0 : 1 },
        loading: 'lazy',
        referrerPolicy: 'no-referrer-when-downgrade',
      })}

      {/* MapLibre encima si carga (permite dibujar nichos y click) */}
      {React.createElement('div', {
        ref: (n: any) => (hostRef.current = n),
        style: { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, opacity: status === 'ready' ? 1 : 0 },
      })}

      {status !== 'ready' ? (
        <View style={s.overlay}>
          <Text style={s.overlayT}>
            {status === 'loading' ? 'Cargando mapa…' : 'Modo básico (sin puntos).'}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  frame: { width: '100%', borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#FFF' },
  overlay: { position: 'absolute', left: 10, right: 10, bottom: 10, padding: 10, borderRadius: 12, backgroundColor: 'rgba(15,23,42,0.65)' },
  overlayT: { color: '#FFF', fontWeight: '900', textAlign: 'center' },
});


import '@/components/leaflet-min.css';

import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { SomahozHotspotId } from '@/lib/mapa-somahoz-hotspots';
import type { Sepultura } from '@/lib/types';
import { normalizarEstadoDb } from '@/lib/estado-sepultura';
import { SOMAHOZ_BBOX, SOMAHOZ_BLOQUES_LATLON, vbToLatLon } from '@/lib/somahoz-geo';
import { SOMAHOZ_YELLOW_MARKERS } from '@/lib/somahoz-yellow-markers';
import { loadYellowMarkerPositions } from '@/lib/mapa-yellow-store';
import L from 'leaflet';
import {
  Circle,
  MapContainer,
  Marker,
  Polygon,
  TileLayer,
  Tooltip,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import { POLIGONOS_BLOQUES_SOMAHOZ } from '@/lib/mapa-somahoz';
import type { CementerioMapaOSMProps } from './CementerioMapaOSM.types';

/**
 * Solo se carga en cliente vía `import()` desde `CementerioMapaOSM.web.tsx` (SSR / static export sin `window`).
 */
export const CementerioMapaLeafletInner = memo(function CementerioMapaLeafletInner({
  height,
  hotspots,
  activeHotspotId,
  onPressHotspot,
  blocks,
  selectedCodigo,
  onPressBlock,
  allGrids,
  selectedSepulturas,
  selectedGrid,
  highlightSepulturaId,
  userLocation,
  userAccuracyM,
  customBloques,
  onPressYellowMarker,
  yellowReloadNonce,
  estadoFiltro = 'todos',
  geoSepulturas,
  allowDragGeoSepulturas = false,
  onDragGeoSepultura,
  onMapCenterChange,
  onPressGeoSepultura,
  highlightGeoSepulturaId,
}: CementerioMapaOSMProps) {
  const mapRef = useRef<any>(null);
  const [yellowById, setYellowById] = useState<Record<string, { latitude: number; longitude: number }> | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    loadYellowMarkerPositions()
      .then((all) => {
        const by: Record<string, { latitude: number; longitude: number }> = {};
        for (const p of all) by[String(p.id)] = { latitude: Number(p.latitude), longitude: Number(p.longitude) };
        setYellowById(by);
      })
      .catch(() => setYellowById({}));
  }, [yellowReloadNonce]);
  const sepsGeo = Array.isArray(geoSepulturas) ? geoSepulturas : [];

  const hs = Array.isArray(hotspots) ? hotspots : [];

  const blocksByCode = useMemo(() => new Set((blocks ?? []).map((b) => String((b as any)?.codigo))), [blocks]);

  const polys = useMemo(() => {
    const base = Array.isArray(customBloques) && customBloques.length > 0 ? customBloques : SOMAHOZ_BLOQUES_LATLON;
    return base.filter((p) => blocksByCode.has(String((p as any)?.codigo)));
  }, [blocksByCode, customBloques]);

  const allNiches = useMemo(() => {
    const grids = Array.isArray(allGrids) ? allGrids : [];
    if (grids.length === 0) return [];

    const centroid = (points: { x: number; y: number }[]) => {
      let sx = 0;
      let sy = 0;
      for (const p of points) {
        sx += p.x;
        sy += p.y;
      }
      const n = Math.max(1, points.length);
      return { x: sx / n, y: sy / n };
    };
    const principalAxis = (points: { x: number; y: number }[]) => {
      if (points.length < 2) return { ux: 1, uy: 0 };
      const c = centroid(points);
      let sxx = 0;
      let sxy = 0;
      let syy = 0;
      for (const p of points) {
        const dx = p.x - c.x;
        const dy = p.y - c.y;
        sxx += dx * dx;
        sxy += dx * dy;
        syy += dy * dy;
      }
      const tr = sxx + syy;
      const det = sxx * syy - sxy * sxy;
      const disc = Math.max(0, (tr * tr) / 4 - det);
      const lambda1 = tr / 2 + Math.sqrt(disc);
      let vx = sxy;
      let vy = lambda1 - sxx;
      if (Math.abs(vx) + Math.abs(vy) < 1e-6) {
        vx = lambda1 - syy;
        vy = sxy;
      }
      const len = Math.hypot(vx, vy) || 1;
      return { ux: vx / len, uy: vy / len };
    };
    const rotate90 = (u: { ux: number; uy: number }) => ({ ux: -u.uy, uy: u.ux });
    const project = (pt: { x: number; y: number }, origin: { x: number; y: number }, u: { ux: number; uy: number }, v: { ux: number; uy: number }) => {
      const dx = pt.x - origin.x;
      const dy = pt.y - origin.y;
      return { u: dx * u.ux + dy * u.uy, v: dx * v.ux + dy * v.uy };
    };
    const unproject = (uv: { u: number; v: number }, origin: { x: number; y: number }, u: { ux: number; uy: number }, v: { ux: number; uy: number }) => ({
      x: origin.x + uv.u * u.ux + uv.v * v.ux,
      y: origin.y + uv.u * u.uy + uv.v * v.uy,
    });
    const pointInPoly = (pt: { x: number; y: number }, poly: { x: number; y: number }[]) => {
      let inside = false;
      for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const xi = poly[i].x;
        const yi = poly[i].y;
        const xj = poly[j].x;
        const yj = poly[j].y;
        const intersect = yi > pt.y !== yj > pt.y && pt.x < ((xj - xi) * (pt.y - yi)) / (yj - yi + 1e-7) + xi;
        if (intersect) inside = !inside;
      }
      return inside;
    };
    const gridPositionsInPoly = (poly: { x: number; y: number }[], filas: number, columnas: number, squareCells: boolean) => {
      if (!Number.isFinite(filas) || !Number.isFinite(columnas) || filas <= 0 || columnas <= 0) return [];
      const origin = centroid(poly);
      const u = principalAxis(poly);
      const v = rotate90(u);
      let minU = Number.POSITIVE_INFINITY;
      let maxU = Number.NEGATIVE_INFINITY;
      let minV = Number.POSITIVE_INFINITY;
      let maxV = Number.NEGATIVE_INFINITY;
      for (const p of poly) {
        const pv = project(p, origin, u, v);
        minU = Math.min(minU, pv.u);
        maxU = Math.max(maxU, pv.u);
        minV = Math.min(minV, pv.v);
        maxV = Math.max(maxV, pv.v);
      }
      const spanU = Math.max(1e-6, maxU - minU);
      const spanV = Math.max(1e-6, maxV - minV);
      let stepU = spanU / columnas;
      let stepV = spanV / filas;
      if (squareCells) {
        const step = Math.min(stepU, stepV);
        const usedU = step * columnas;
        const usedV = step * filas;
        const padU = (spanU - usedU) / 2;
        const padV = (spanV - usedV) / 2;
        minU += Math.max(0, padU);
        minV += Math.max(0, padV);
        stepU = step;
        stepV = step;
      }
      const positions: Array<{ x: number; y: number }> = [];
      for (let row = 0; row < filas; row++) {
        for (let col = 0; col < columnas; col++) {
          const cu = minU + (col + 0.5) * stepU;
          const cv = minV + (row + 0.5) * stepV;
          const p = unproject({ u: cu, v: cv }, origin, u, v);
          if (!pointInPoly(p, poly)) continue;
          positions.push(p);
        }
      }
      return positions;
    };

    const polysByCode = new Map<string, any>(POLIGONOS_BLOQUES_SOMAHOZ.map((p: any) => [String(p.codigo), p]));
    const out: Array<{ code: string; lat: number; lon: number }> = [];
    const MAX_POINTS = 5200;
    for (const g of grids) {
      if (out.length >= MAX_POINTS) break;
      const code = String((g as any)?.codigo ?? '').trim();
      if (!code) continue;
      const poly = polysByCode.get(code);
      if (!poly) continue;
      const filas = Number((g as any)?.filas);
      const columnas = Number((g as any)?.columnas);
      if (!Number.isFinite(filas) || !Number.isFinite(columnas) || filas <= 0 || columnas <= 0) continue;
      const positions = gridPositionsInPoly(poly.puntos, filas, columnas, true);
      for (let i = 0; i < positions.length && out.length < MAX_POINTS; i++) {
        const ll = vbToLatLon(positions[i]);
        out.push({ code, lat: ll.latitude, lon: ll.longitude });
      }
    }
    return out;
  }, [allGrids]);

  const selectedNiches = useMemo(() => {
    if (!selectedCodigo) return [];
    const poly = POLIGONOS_BLOQUES_SOMAHOZ.find((p: any) => String(p.codigo) === String(selectedCodigo));
    if (!poly) return [];
    const filas = Number(selectedGrid?.filas ?? 0);
    const columnas = Number(selectedGrid?.columnas ?? 0);
    if (!Number.isFinite(filas) || !Number.isFinite(columnas) || filas <= 0 || columnas <= 0) return [];
    const seps: Sepultura[] = Array.isArray(selectedSepulturas) ? selectedSepulturas : [];
    if (seps.length === 0) return [];

    // Reusamos el mismo generador de rejilla del bloque (copiado arriba vía allNiches),
    // pero aquí hacemos un truco simple: filtrar de allNiches por código y mapear por orden.
    // (Suficiente para UX “Pedro”; si luego quieres exactitud absoluta, movemos a generador único compartido.)
    const base = allNiches.filter((x) => String(x.code) === String(selectedCodigo));
    if (base.length === 0) return [];
    const sorted = [...seps].sort((a: any, b: any) => Number((a as any)?.numero ?? (a as any)?.id ?? 0) - Number((b as any)?.numero ?? (b as any)?.id ?? 0));
    const out: Array<{ id: number; lat: number; lon: number; estado: string }> = [];
    for (let i = 0; i < sorted.length && i < base.length; i++) {
      out.push({
        id: Number((sorted[i] as any)?.id ?? i),
        lat: base[i].lat,
        lon: base[i].lon,
        estado: normalizarEstadoDb((sorted[i] as any)?.estado),
      });
    }
    return out;
  }, [allNiches, selectedCodigo, selectedGrid?.columnas, selectedGrid?.filas, selectedSepulturas]);

  const center = useMemo(
    () => [(SOMAHOZ_BBOX.south + SOMAHOZ_BBOX.north) / 2, (SOMAHOZ_BBOX.west + SOMAHOZ_BBOX.east) / 2] as [number, number],
    []
  );

  const toLatLngs = (coords: Array<{ latitude: number; longitude: number }>) => coords.map((c) => [c.latitude, c.longitude] as [number, number]);

  const yellowIcon = (id: string) =>
    L.divIcon({
      className: '',
      html: `<div class="${String(id) === '5' ? 'cemn-green' : 'cemn-yellow'}">${id}</div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });

  const iconClassByEstado = (estado?: string | null) => {
    const e = String(estado ?? '').toLowerCase();
    if (e === 'libre') return 'cemn-green';
    if (e === 'ocupada') return 'cemn-gray';
    if (e === 'reservada') return 'cemn-yellow';
    if (e === 'mantenimiento') return 'cemn-red';
    // clausurada u otros
    return 'cemn-gray';
  };

  const customIcon = (estado: string | null | undefined, label: string, isHit: boolean) => {
    const cls = iconClassByEstado(estado);
    return L.divIcon({
      className: '',
      html: `<div class="${cls}" style="${isHit ? 'transform:scale(1.15); outline:3px solid rgba(255,255,255,0.95);' : ''}">${String(label ?? '').slice(0, 3)}</div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });
  };

  const FitBoundsOnce = () => {
    const map = useMap();
    const did = useRef(false);
    useEffect(() => {
      if (did.current) return;
      did.current = true;
      const sw: [number, number] = [SOMAHOZ_BBOX.south, SOMAHOZ_BBOX.west];
      const ne: [number, number] = [SOMAHOZ_BBOX.north, SOMAHOZ_BBOX.east];
      // Arranca ya "metido" en el recinto
      map.fitBounds([sw, ne], { padding: [2, 2], maxZoom: 22 });
      setTimeout(() => {
        // Asegura un zoom cercano si el bbox es pequeño
        try {
          map.setZoom(Math.max(map.getZoom(), 21));
        } catch {
          // noop
        }
      }, 0);
    }, [map]);
    return null;
  };

  const TrackCenter = () => {
    const map = useMapEvents({
      moveend: () => {
        try {
          const c = map.getCenter();
          onMapCenterChange?.(Number(c.lat), Number(c.lng));
        } catch {
          // noop
        }
      },
    });
    useEffect(() => {
      try {
        const c = map.getCenter();
        onMapCenterChange?.(Number(c.lat), Number(c.lng));
      } catch {
        // noop
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    return null;
  };

  const FlyToLocation = ({ userLocation: loc }: { userLocation?: { latitude: number; longitude: number } | null }) => {
    const map = useMap();
    useEffect(() => {
      if (!loc) return;
      map.flyTo([loc.latitude, loc.longitude], Math.max(map.getZoom(), 19), { duration: 0.65 });
    }, [map, loc]);
    return null;
  };

  return (
    <View style={[s.wrap, { height }]}>
      <View style={s.leafletWrap}>
        <MapContainer
          ref={mapRef}
          center={center}
          zoom={21}
          style={{ width: '100%', height: '100%' }}
          zoomControl={false}
          dragging
          // Que el zoom vaya bien en web (rueda + doble click)
          doubleClickZoom
          scrollWheelZoom
          attributionControl={false}
        >
          <TrackCenter />
          <FitBoundsOnce />
          <FlyToLocation userLocation={userLocation} />

          <TileLayer
            url="https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            maxNativeZoom={20}
            maxZoom={22}
          />

          {/* Contorno del recinto (verde discontinuo) */}
          <Polygon
            positions={[
              [SOMAHOZ_BBOX.north, SOMAHOZ_BBOX.west],
              [SOMAHOZ_BBOX.north, SOMAHOZ_BBOX.east],
              [SOMAHOZ_BBOX.south, SOMAHOZ_BBOX.east],
              [SOMAHOZ_BBOX.south, SOMAHOZ_BBOX.west],
            ]}
            pathOptions={{
              color: 'rgba(34,197,94,0.95)',
              weight: 3,
              dashArray: '10 8',
              fillColor: 'rgba(0,0,0,0.00)',
              fillOpacity: 0,
            }}
          />

          {/* GPS */}
          {userLocation ? (
            <>
              {userAccuracyM != null && Number.isFinite(userAccuracyM) && userAccuracyM > 0 ? (
                <Circle
                  center={[userLocation.latitude, userLocation.longitude]}
                  radius={Math.min(35, Math.max(3, userAccuracyM))}
                  pathOptions={{ color: 'rgba(59,130,246,0.65)', weight: 2, fillColor: 'rgba(59,130,246,0.10)', fillOpacity: 1 }}
                />
              ) : null}
              <Circle
                center={[userLocation.latitude, userLocation.longitude]}
                radius={1.4}
                pathOptions={{ color: 'rgba(255,255,255,0.90)', weight: 2, fillColor: 'rgba(59,130,246,0.95)', fillOpacity: 1 }}
              />
            </>
          ) : null}

          {/* Hotspots fat-finger */}
          {hs.map((h) => {
            const active = !!activeHotspotId && h.id === activeHotspotId;
            const coords = h.points.map(vbToLatLon);
            return (
              <Polygon
                key={h.id}
                positions={toLatLngs(coords)}
                pathOptions={{
                  color: active ? 'rgba(255,230,0,0.98)' : 'transparent',
                  weight: active ? 6 : 0,
                  fillColor: active ? 'rgba(255,230,0,0.35)' : 'rgba(0,0,0,0.01)',
                  fillOpacity: 1,
                }}
                eventHandlers={{
                  click: () => onPressHotspot?.(h.id),
                }}
              >
                {h.id === 'TANATORIO' ? <Tooltip sticky>Tanatorio (Fuera de recinto)</Tooltip> : null}
              </Polygon>
            );
          })}

          {/* Bloques */}
          {polys.map((p: any) => {
            const code = String(p.codigo);
            const active = !!selectedCodigo && String(selectedCodigo) === code;
            const coords = Array.isArray(p.coordinates) ? p.coordinates : p.puntos?.map(vbToLatLon);
            return (
              <Polygon
                key={`b-${code}`}
                positions={toLatLngs(coords)}
                pathOptions={{
                  color: active ? 'rgba(59,130,246,0.98)' : 'rgba(30,58,95,0.85)',
                  weight: active ? 4 : 3,
                  fillColor: active ? 'rgba(59,130,246,0.14)' : 'rgba(0,0,0,0.02)',
                  fillOpacity: 1,
                }}
                eventHandlers={{
                  click: () => onPressBlock(code),
                }}
              />
            );
          })}

          {/* Nichos globales (gris) */}
          {allNiches.map((pt, idx) => (
            <Circle
              key={`alln-${pt.code}-${idx}`}
              center={[pt.lat, pt.lon]}
              radius={0.55}
              pathOptions={{ color: 'rgba(15,23,42,0.10)', weight: 1, fillColor: 'rgba(148,163,184,0.55)', fillOpacity: 1 }}
            />
          ))}

          {/* Nichos del bloque seleccionado */}
          {selectedNiches
            .filter((pt) => estadoFiltro === 'todos' || pt.estado === estadoFiltro)
            .map((pt) => {
            const fill =
              pt.estado === 'libre'
                ? 'rgba(34,197,94,0.95)'
                : pt.estado === 'ocupada'
                  ? 'rgba(239,68,68,0.95)'
                  : pt.estado === 'reservada'
                    ? 'rgba(245,158,11,0.95)'
                    : 'rgba(100,116,139,0.95)';
            const isHit = highlightSepulturaId != null && Number(pt.id) === Number(highlightSepulturaId);
            return (
              <Circle
                key={`seln-${pt.id}`}
                center={[pt.lat, pt.lon]}
                radius={isHit ? 1.2 : 0.9}
                pathOptions={{ color: 'rgba(255,255,255,0.85)', weight: 2, fillColor: fill, fillOpacity: 1 }}
              />
            );
            })}

          {/* Números amarillos */}
          {SOMAHOZ_YELLOW_MARKERS.map((m) => {
            const ll = yellowById?.[String(m.id)] ?? vbToLatLon(m.vb);
            return (
              <Marker
                key={`y-${m.id}`}
                position={[ll.latitude, ll.longitude]}
                icon={yellowIcon(m.id)}
                eventHandlers={{
                  click: () => onPressYellowMarker?.(m.id),
                }}
              />
            );
          })}

          {/* Sepulturas con lat/lon (BD) */}
          {sepsGeo.map((m) => (
            <Marker
              key={`sg-${m.id}`}
              position={[Number(m.lat), Number(m.lon)]}
              icon={customIcon(m.estado ?? null, String(m.numero ?? m.id), highlightGeoSepulturaId != null && Number(m.id) === Number(highlightGeoSepulturaId))}
              draggable={!!allowDragGeoSepulturas}
              eventHandlers={{
                dragend: (e: any) => {
                  try {
                    const ll = e?.target?.getLatLng?.();
                    if (!ll) return;
                    onDragGeoSepultura?.(Number(m.id), Number(ll.lat), Number(ll.lng));
                  } catch {
                    // noop
                  }
                },
                click: () => onPressGeoSepultura?.(Number(m.id)),
              }}
            >
              <Tooltip sticky>
                {`${m.tipo ?? 'unidad'} ${m.numero ?? m.id} · ${m.estado ?? '—'}${m.titular ? ` · ${m.titular}` : ''}`}
              </Tooltip>
            </Marker>
          ))}
        </MapContainer>
      </View>

      {/* Controles grandes (Pedro-friendly): zoom +/- y encuadre */}
      <View pointerEvents="box-none" style={s.controls}>
        <View style={s.ctrlStack} pointerEvents="auto">
          <View style={s.ctrlBtn} onTouchEnd={() => mapRef.current?.zoomIn?.(1)}>
            <View style={s.ctrlBtnInner}>
              <View style={s.ctrlPlusMinus} />
              <View style={[s.ctrlPlusMinus, { transform: [{ rotate: '90deg' }] }]} />
            </View>
          </View>
          <View style={s.ctrlBtn} onTouchEnd={() => mapRef.current?.zoomOut?.(1)}>
            <View style={s.ctrlBtnInner}>
              <View style={s.ctrlPlusMinus} />
            </View>
          </View>
          <View
            style={s.ctrlBtn}
            onTouchEnd={() => {
              const sw: [number, number] = [SOMAHOZ_BBOX.south, SOMAHOZ_BBOX.west];
              const ne: [number, number] = [SOMAHOZ_BBOX.north, SOMAHOZ_BBOX.east];
              mapRef.current?.fitBounds?.([sw, ne], { padding: [2, 2], maxZoom: 22 });
            }}
          >
            <View style={s.ctrlBtnInner}>
              <View style={[s.ctrlDot, { borderWidth: 2 }]} />
            </View>
          </View>
        </View>
      </View>
    </View>
  );
});

const s = StyleSheet.create({
  wrap: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  leafletWrap: { width: '100%', height: '100%' },
  loadingT: { fontWeight: '900', color: '#0F172A' },
  controls: { position: 'absolute', right: 10, top: 10 },
  ctrlStack: {
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.12)',
  },
  ctrlBtn: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center' },
  ctrlBtnInner: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center' },
  ctrlPlusMinus: { position: 'absolute', width: 18, height: 3, borderRadius: 2, backgroundColor: '#0F172A' },
  ctrlDot: { width: 16, height: 16, borderRadius: 4, borderColor: '#0F172A' },
});


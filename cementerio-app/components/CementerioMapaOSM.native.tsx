import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Circle, Marker, Polygon, UrlTile } from 'react-native-maps';
import type { HotspotPolygon, SomahozHotspotId } from '@/lib/mapa-somahoz-hotspots';
import { Semantic } from '@/components/ui';
import type { BloqueOficial } from '@/lib/bloques-oficiales';
import type { Sepultura } from '@/lib/types';
import { normalizarEstadoDb } from '@/lib/estado-sepultura';
import { SOMAHOZ_BBOX, SOMAHOZ_BLOQUES_LATLON, vbToLatLon } from '@/lib/somahoz-geo';
import { SOMAHOZ_YELLOW_MARKERS } from '@/lib/somahoz-yellow-markers';
import { loadYellowMarkerPositions } from '@/lib/mapa-yellow-store';

type Props = {
  height: number;
  hotspots: HotspotPolygon[];
  activeHotspotId?: SomahozHotspotId | null;
  onPressHotspot?: (id: SomahozHotspotId) => void;
  // Dibujo completo encima del satélite
  blocks: BloqueOficial[];
  selectedCodigo?: string | null;
  onPressBlock: (codigo: string) => void;
  allGrids?: Array<{ codigo: string; filas: number; columnas: number }> | null;
  selectedSepulturas?: Sepultura[];
  selectedGrid?: { filas: number; columnas: number } | null;
  highlightSepulturaId?: number | null;
  userLocation?: { latitude: number; longitude: number } | null;
  userAccuracyM?: number | null;
  customBloques?: Array<{ codigo: string; coordinates: Array<{ latitude: number; longitude: number }> }> | null;
  onPressYellowMarker?: (id: string) => void;
  yellowReloadNonce?: number;
  estadoFiltro?: 'todos' | 'libre' | 'ocupada' | 'reservada' | 'clausurada';
  geoSepulturas?: Array<{
    id: number;
    numero: number | null;
    lat: number;
    lon: number;
    tipo: string;
    estado?: string | null;
    titular?: string | null;
    bloque_codigo?: string | null;
    zona_nombre?: string | null;
  }>;
  allowDragGeoSepulturas?: boolean;
  onDragGeoSepultura?: (id: number, latitude: number, longitude: number) => void;
  onPressGeoSepultura?: (id: number) => void;
  highlightGeoSepulturaId?: number | null;
};

const SOMAHOZ_CENTER = {
  latitude: 43.2487102,
  longitude: -4.0579621,
};

function centroid(points: { x: number; y: number }[]) {
  let sx = 0;
  let sy = 0;
  for (const p of points) {
    sx += p.x;
    sy += p.y;
  }
  const n = Math.max(1, points.length);
  return { x: sx / n, y: sy / n };
}
function principalAxis(points: { x: number; y: number }[]) {
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
}
function rotate90(u: { ux: number; uy: number }) {
  return { ux: -u.uy, uy: u.ux };
}
function project(pt: { x: number; y: number }, origin: { x: number; y: number }, u: { ux: number; uy: number }, v: { ux: number; uy: number }) {
  const dx = pt.x - origin.x;
  const dy = pt.y - origin.y;
  return { u: dx * u.ux + dy * u.uy, v: dx * v.ux + dy * v.uy };
}
function unproject(uv: { u: number; v: number }, origin: { x: number; y: number }, u: { ux: number; uy: number }, v: { ux: number; uy: number }) {
  return { x: origin.x + uv.u * u.ux + uv.v * v.ux, y: origin.y + uv.u * u.uy + uv.v * v.uy };
}
function pointInPoly(pt: { x: number; y: number }, poly: { x: number; y: number }[]) {
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
}
function gridPositionsInPoly(poly: { x: number; y: number }[], filas: number, columnas: number, squareCells: boolean) {
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
}

export const CementerioMapaOSM = memo(function CementerioMapaOSM({
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
  onPressGeoSepultura,
  highlightGeoSepulturaId,
}: Props) {
  const [yellowById, setYellowById] = useState<Record<string, { latitude: number; longitude: number }> | null>(null);

  useEffect(() => {
    loadYellowMarkerPositions()
      .then((all) => {
        const by: Record<string, { latitude: number; longitude: number }> = {};
        for (const p of all) by[String(p.id)] = { latitude: Number(p.latitude), longitude: Number(p.longitude) };
        setYellowById(by);
      })
      .catch(() => setYellowById({}));
  }, [yellowReloadNonce]);

  const sepsGeo = Array.isArray(geoSepulturas) ? geoSepulturas : [];

  const colorByEstado = (estado?: string | null) => {
    const e = String(estado ?? '').toLowerCase();
    if (e === 'libre') return 'rgba(34,197,94,0.95)';
    if (e === 'reservada') return 'rgba(255,230,0,0.96)';
    if (e === 'mantenimiento') return 'rgba(239,68,68,0.95)';
    if (e === 'ocupada') return 'rgba(148,163,184,0.95)';
    return 'rgba(148,163,184,0.95)';
  };

  const region = useMemo(() => {
    // Más “cerca” por defecto: encuadra el recinto sin tanto aire
    const latitudeDelta = Math.max(0.00016, (SOMAHOZ_BBOX.north - SOMAHOZ_BBOX.south) * 0.72);
    const longitudeDelta = Math.max(0.00016, (SOMAHOZ_BBOX.east - SOMAHOZ_BBOX.west) * 0.72);
    return { ...SOMAHOZ_CENTER, latitudeDelta, longitudeDelta };
  }, []);

  const mapRef = useRef<MapView | null>(null);
  const [lastRegion, setLastRegion] = useState<any>(null);
  useEffect(() => {
    if (!userLocation) return;
    const latitudeDelta = Math.max(0.00025, (SOMAHOZ_BBOX.north - SOMAHOZ_BBOX.south) * 0.65);
    const longitudeDelta = Math.max(0.00025, (SOMAHOZ_BBOX.east - SOMAHOZ_BBOX.west) * 0.65);
    mapRef.current?.animateToRegion({ ...userLocation, latitudeDelta, longitudeDelta }, 650);
  }, [userLocation]);

  const hs = Array.isArray(hotspots) ? hotspots : [];
  const blocksByCode = useMemo(() => new Set((blocks ?? []).map((b) => String((b as any)?.codigo))), [blocks]);
  const polys = useMemo(() => {
    const base = Array.isArray(customBloques) && customBloques.length > 0 ? customBloques : SOMAHOZ_BLOQUES_LATLON;
    return base.filter((p) => blocksByCode.has(String(p.codigo)));
  }, [blocksByCode, customBloques]);

  const allNiches = useMemo(() => {
    const grids = Array.isArray(allGrids) ? allGrids : [];
    if (grids.length === 0) return [];
    // seguimos usando el polígono en VB para la distribución de rejilla (PCA)
    // (si luego pasamos a GeoJSON real, lo ideal es generar posiciones en lat/lon)
    const polysByCode = new Map<string, any>(require('@/lib/mapa-somahoz').POLIGONOS_BLOQUES_SOMAHOZ.map((p: any) => [String(p.codigo), p]));
    const out: Array<{ code: string; lat: number; lon: number }> = [];
    const MAX_POINTS = 5200; // evita saturar el render
    for (const g of grids) {
      if (out.length >= MAX_POINTS) break;
      const code = String((g as any)?.codigo ?? '').trim();
      if (!code) continue;
      const poly = polysByCode.get(code);
      if (!poly) continue;
      const filas = Number((g as any)?.filas);
      const columnas = Number((g as any)?.columnas);
      if (!Number.isFinite(filas) || !Number.isFinite(columnas) || filas <= 0 || columnas <= 0) continue;
      const positions = gridPositionsInPoly((poly as any).puntos, filas, columnas, true);
      for (let i = 0; i < positions.length && out.length < MAX_POINTS; i++) {
        const ll = vbToLatLon(positions[i]);
        out.push({ code, lat: ll.latitude, lon: ll.longitude });
      }
    }
    return out;
  }, [allGrids]);

  const selectedNiches = useMemo(() => {
    if (!selectedCodigo) return [];
    const poly = require('@/lib/mapa-somahoz').POLIGONOS_BLOQUES_SOMAHOZ.find((p: any) => String(p.codigo) === String(selectedCodigo));
    if (!poly) return [];
    const filas = Number(selectedGrid?.filas ?? 0);
    const columnas = Number(selectedGrid?.columnas ?? 0);
    if (!Number.isFinite(filas) || !Number.isFinite(columnas) || filas <= 0 || columnas <= 0) return [];
    const seps: Sepultura[] = Array.isArray(selectedSepulturas) ? selectedSepulturas : [];
    if (seps.length === 0) return [];
    const sorted = [...seps].sort((a: any, b: any) => Number(a?.numero ?? a?.id ?? 0) - Number(b?.numero ?? b?.id ?? 0));
    const positions = gridPositionsInPoly(poly.puntos, filas, columnas, true);
    const out: Array<{ id: number; lat: number; lon: number; estado: string }> = [];
    for (let i = 0; i < sorted.length && i < positions.length; i++) {
      const ll = vbToLatLon(positions[i]);
      out.push({
        id: Number((sorted[i] as any)?.id ?? i),
        lat: ll.latitude,
        lon: ll.longitude,
        estado: normalizarEstadoDb((sorted[i] as any)?.estado),
      });
    }
    return out;
  }, [selectedCodigo, selectedGrid?.columnas, selectedGrid?.filas, selectedSepulturas]);

  return (
    <View style={[s.wrap, { height }]}>
      <MapView
        ref={(r) => {
          mapRef.current = r;
        }}
        style={StyleSheet.absoluteFill}
        initialRegion={region}
        rotateEnabled={false}
        pitchEnabled={false}
        toolbarEnabled={false}
        loadingEnabled
        // Zoom funcional (gesto + botones)
        zoomEnabled
        onRegionChangeComplete={(r) => setLastRegion(r)}
        maxZoomLevel={22}
        minZoomLevel={17}
        // Fallback robusto: satélite nativo (Google/Apple) siempre visible,
        // aunque fallen o tarden las teselas Esri (`UrlTile`).
        mapType="satellite"
      >
        {/* Contorno del recinto (verde discontinuo) */}
        <Polygon
          coordinates={[
            { latitude: SOMAHOZ_BBOX.north, longitude: SOMAHOZ_BBOX.west },
            { latitude: SOMAHOZ_BBOX.north, longitude: SOMAHOZ_BBOX.east },
            { latitude: SOMAHOZ_BBOX.south, longitude: SOMAHOZ_BBOX.east },
            { latitude: SOMAHOZ_BBOX.south, longitude: SOMAHOZ_BBOX.west },
          ]}
          strokeWidth={3}
          strokeColor="rgba(34,197,94,0.95)"
          lineDashPattern={[10, 8]}
          fillColor="rgba(0,0,0,0.00)"
        />
        {/* Teselas: satélite real (Esri World Imagery) */}
        <UrlTile
          urlTemplate="https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          maximumZ={20}
          flipY={false}
          zIndex={999}
        />

        {/* Posición GPS del operario */}
        {userLocation ? (
          <>
            {userAccuracyM != null && Number.isFinite(userAccuracyM) && userAccuracyM > 0 ? (
              <Circle
                center={userLocation}
                radius={Math.min(35, Math.max(3, userAccuracyM))}
                fillColor="rgba(59,130,246,0.10)"
                strokeColor="rgba(59,130,246,0.65)"
                strokeWidth={2}
              />
            ) : null}
            <Circle
              center={userLocation}
              radius={1.4}
              fillColor="rgba(59,130,246,0.95)"
              strokeColor="rgba(255,255,255,0.90)"
              strokeWidth={2}
            />
          </>
        ) : null}

        {/* Hotspots (fat-finger + highlight “sol”) */}
        {hs.map((h) => {
          const active = !!activeHotspotId && h.id === activeHotspotId;
          const coords = h.points.map(vbToLatLon);
          return (
            <Polygon
              key={h.id}
              coordinates={coords}
              tappable
              strokeWidth={active ? 6 : 0}
              // Amarillo tráfico / fluor para exteriores
              strokeColor={active ? 'rgba(255,230,0,0.98)' : 'transparent'}
              fillColor={active ? 'rgba(255,230,0,0.35)' : 'rgba(0,0,0,0.01)'}
              onPress={() => onPressHotspot?.(h.id)}
            />
          );
        })}

        {/* Bloques (polígonos) */}
        {polys.map((p) => {
          const active = !!selectedCodigo && String(p.codigo) === String(selectedCodigo);
          return (
            <Polygon
              key={`b-${p.codigo}`}
              coordinates={((p as any).puntos ?? []).map(vbToLatLon)}
              tappable
              strokeWidth={active ? 4 : 3}
              strokeColor={active ? 'rgba(59,130,246,0.98)' : 'rgba(30,58,95,0.85)'}
              fillColor={active ? 'rgba(59,130,246,0.14)' : 'rgba(0,0,0,0.02)'}
              onPress={() => onPressBlock(String(p.codigo))}
            />
          );
        })}

        {/* Nichos globales (gris) */}
        {allNiches.map((pt, idx) => (
          <Circle
            key={`alln-${pt.code}-${idx}`}
            center={{ latitude: pt.lat, longitude: pt.lon }}
            radius={0.55}
            fillColor="rgba(148,163,184,0.55)"
            strokeColor="rgba(15,23,42,0.10)"
            strokeWidth={1}
          />
        ))}

        {/* Nichos del bloque seleccionado (coloreados por estado) */}
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
              center={{ latitude: pt.lat, longitude: pt.lon }}
              radius={isHit ? 1.2 : 0.9}
              fillColor={fill}
              strokeColor="rgba(255,255,255,0.85)"
              strokeWidth={2}
            />
          );
          })}
        {/* Números amarillos (como en la foto) */}
        {SOMAHOZ_YELLOW_MARKERS.map((m) => (
          <Marker
            key={`y-${m.id}`}
            coordinate={yellowById?.[String(m.id)] ?? vbToLatLon(m.vb)}
            onPress={() => onPressYellowMarker?.(m.id)}
          >
            <View style={[s.yellow, String(m.id) === '5' && s.green]}>
              <Text style={s.yellowT}>{m.id}</Text>
            </View>
          </Marker>
        ))}

        {/* Sepulturas con lat/lon (BD) */}
        {sepsGeo.map((m) => (
          <Marker
            key={`sg-${m.id}`}
            coordinate={{ latitude: Number(m.lat), longitude: Number(m.lon) }}
            draggable={!!allowDragGeoSepulturas}
            onDragEnd={(e: any) => {
              const c = (e as any)?.nativeEvent?.coordinate;
              if (!c) return;
              onDragGeoSepultura?.(Number(m.id), Number(c.latitude), Number(c.longitude));
            }}
            onPress={() => onPressGeoSepultura?.(Number(m.id))}
          >
            <View
              style={[
                s.yellow,
                { backgroundColor: colorByEstado(m.estado) },
                highlightGeoSepulturaId != null && Number(m.id) === Number(highlightGeoSepulturaId) ? { transform: [{ scale: 1.15 }], borderColor: 'rgba(255,255,255,0.95)', borderWidth: 3 } : null,
              ]}
            >
              <Text style={s.yellowT}>{String(m.numero ?? m.id).slice(0, 3)}</Text>
            </View>
          </Marker>
        ))}
      </MapView>

      {/* Controles grandes: zoom +/- y encuadrar */}
      <View pointerEvents="box-none" style={s.controls}>
        <View style={s.ctrlStack} pointerEvents="auto">
          <TouchableOpacity
            style={s.ctrlBtn}
            activeOpacity={0.85}
            onPress={() => {
              const r = lastRegion ?? region;
              mapRef.current?.animateToRegion(
                {
                  ...r,
                  latitudeDelta: Math.max(0.00002, Number(r.latitudeDelta) * 0.7),
                  longitudeDelta: Math.max(0.00002, Number(r.longitudeDelta) * 0.7),
                },
                220
              );
            }}
          >
            <Text style={s.ctrlT}>+</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.ctrlBtn}
            activeOpacity={0.85}
            onPress={() => {
              const r = lastRegion ?? region;
              mapRef.current?.animateToRegion(
                {
                  ...r,
                  latitudeDelta: Math.min(0.01, Number(r.latitudeDelta) * 1.35),
                  longitudeDelta: Math.min(0.01, Number(r.longitudeDelta) * 1.35),
                },
                220
              );
            }}
          >
            <Text style={s.ctrlT}>−</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.ctrlBtn}
            activeOpacity={0.85}
            onPress={() => mapRef.current?.animateToRegion(region, 320)}
          >
            <Text style={s.ctrlT}>⌁</Text>
          </TouchableOpacity>
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
    backgroundColor: Semantic.surface,
    borderWidth: 1,
    borderColor: Semantic.border,
  },
  yellow: {
    width: 26,
    height: 26,
    borderRadius: 9,
    backgroundColor: 'rgba(255,230,0,0.96)',
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  green: { backgroundColor: 'rgba(34,197,94,0.95)' },
  blue: { backgroundColor: 'rgba(59,130,246,0.95)' },
  purple: { backgroundColor: 'rgba(168,85,247,0.95)' },
  yellowT: { fontWeight: '900', color: '#0B0B0B', fontSize: 12 },
  controls: { position: 'absolute', right: 10, top: 10 },
  ctrlStack: { borderRadius: 14, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.92)', borderWidth: 1, borderColor: 'rgba(15,23,42,0.12)' },
  ctrlBtn: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center' },
  ctrlT: { fontWeight: '900', fontSize: 18, color: '#0F172A' },
});


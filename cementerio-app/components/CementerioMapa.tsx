import { forwardRef, memo, useImperativeHandle, useMemo } from 'react';
import { Image, Platform, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, G, Image as SvgImage, Polygon, Rect, Text as SvgText } from 'react-native-svg';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import type { BloqueOficial } from '@/lib/bloques-oficiales';
import { POLIGONOS_BLOQUES_SOMAHOZ } from '@/lib/mapa-somahoz';
import type { HotspotPolygon, SomahozHotspotId } from '@/lib/mapa-somahoz-hotspots';
import type { YellowMarker } from '@/lib/somahoz-yellow-markers';
import type { Sepultura } from '@/lib/types';
import { normalizarEstadoEditable } from '@/lib/estado-sepultura';

type Props = {
  blocks: BloqueOficial[];
  onPressBlock: (codigo: string) => void;
  onPressNicho?: (sepultura: Sepultura) => void;
  onPressHotspot?: (id: SomahozHotspotId) => void;
  hotspots?: HotspotPolygon[];
  activeHotspotId?: SomahozHotspotId | null;
  yellowMarkers?: YellowMarker[];
  onPressYellowMarker?: (m: YellowMarker) => void;
  /** Resalta una sepultura concreta (halo/pin) */
  highlightSepulturaId?: number | null;
  /**
   * Rotación (grados) aplicada SOLO a los overlays (polígonos + puntos),
   * para encajar con una ortofoto ligeramente torcida.
   */
  overlayRotationDeg?: number;
  selectedCodigo?: string | null;
  selectedSepulturas?: Sepultura[];
  selectedGrid?: { filas: number; columnas: number } | null;
  /**
   * Si se pasa, se dibujan "todas" las posiciones de nicho (sin estado) para todos los bloques
   * que tengan `filas/columnas` y polígono en `mapa-somahoz.ts`.
   *
   * Útil para el “plano real” donde quieres ver TODO dibujado de un vistazo.
   */
  allGrids?: Array<{ codigo: string; filas: number; columnas: number }> | null;
  /**
   * Imagen base del plano/ortofoto.
   * - En nativo: normalmente `require('...png')` (número).
   * - En web: puede resolverse a string, también vale.
   */
  baseImage?: any;
  height?: number;
  /**
   * Recorte del plano dentro del viewBox 0..1000 (para quitar márgenes blancos).
   * Si se define, el SVG usa `viewBox` recortado y los polígonos se trasladan.
   */
  crop?: { x: number; y: number; w: number; h: number };
};

export type CementerioMapaHandle = {
  zoomIn: () => void;
  zoomOut: () => void;
  reset: () => void;
};

const VIEWBOX = { w: 1000, h: 1000 };

function pointsToString(points: { x: number; y: number }[]) {
  return points.map((p) => `${p.x},${p.y}`).join(' ');
}

function bbox(points: { x: number; y: number }[]) {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  return { minX, minY, maxX, maxY };
}

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

/**
 * Devuelve un eje principal (unitario) del polígono, aproximando su orientación.
 * Usamos PCA 2D sobre los vértices para sacar la dirección de mayor varianza.
 */
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
  // Eigenvector del mayor autovalor para matriz simétrica [[sxx, sxy],[sxy, syy]]
  const tr = sxx + syy;
  const det = sxx * syy - sxy * sxy;
  const disc = Math.max(0, (tr * tr) / 4 - det);
  const lambda1 = tr / 2 + Math.sqrt(disc);
  // (A - λI)v = 0 -> elegir v = (sxy, λ - sxx) o (λ - syy, sxy)
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
    // centramos un rectángulo "cuadrado" dentro del bbox proyectado
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

// Ray casting (punto dentro de polígono)
function pointInPoly(pt: { x: number; y: number }, poly: { x: number; y: number }[]) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x;
    const yi = poly[i].y;
    const xj = poly[j].x;
    const yj = poly[j].y;
    const intersect =
      yi > pt.y !== yj > pt.y && pt.x < ((xj - xi) * (pt.y - yi)) / (yj - yi + 0.0000001) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function CementerioMapaBase(
  {
  blocks,
  onPressBlock,
  onPressNicho,
  onPressHotspot,
  hotspots,
  activeHotspotId,
  yellowMarkers,
  onPressYellowMarker,
  highlightSepulturaId,
  overlayRotationDeg = 0,
  selectedCodigo,
  selectedSepulturas,
  selectedGrid,
  allGrids,
  baseImage,
  height,
  crop,
}: Props,
  ref: React.Ref<CementerioMapaHandle>
) {
  const scheme = useColorScheme();
  const c = Colors[scheme ?? 'light'];
  const { width } = useWindowDimensions();

  const blocksByCode = useMemo(() => new Set(blocks.map((b) => b.codigo)), [blocks]);
  const polys = useMemo(
    () => POLIGONOS_BLOQUES_SOMAHOZ.filter((p) => blocksByCode.has(p.codigo)),
    [blocksByCode]
  );

  const resolved = useMemo(() => {
    if (!baseImage) return null;
    try {
      return Image.resolveAssetSource(baseImage) ?? null;
    } catch {
      return null;
    }
  }, [baseImage]);

  const mapHeight = height ?? Math.min(520, Math.max(280, Math.round(width * 0.72)));
  const vb = crop
    ? { x: crop.x, y: crop.y, w: crop.w, h: crop.h }
    : { x: 0, y: 0, w: VIEWBOX.w, h: VIEWBOX.h };

  const overlayTransform = useMemo(() => {
    const deg = Number(overlayRotationDeg ?? 0);
    if (!Number.isFinite(deg) || Math.abs(deg) < 0.001) return undefined;
    const cx = vb.x + vb.w / 2;
    const cy = vb.y + vb.h / 2;
    return `rotate(${deg} ${cx} ${cy})`;
  }, [overlayRotationDeg, vb.h, vb.w, vb.x, vb.y]);

  const hotspotsSafe = Array.isArray(hotspots) ? hotspots : [];
  const yellowSafe = Array.isArray(yellowMarkers) ? yellowMarkers : [];

  const selectedPoly = useMemo(() => {
    if (!selectedCodigo) return null;
    return POLIGONOS_BLOQUES_SOMAHOZ.find((p) => p.codigo === selectedCodigo) ?? null;
  }, [selectedCodigo]);

  const allNichesOverlay = useMemo(() => {
    const grids = Array.isArray(allGrids) ? allGrids : [];
    if (grids.length === 0) return [];

    const polysByCode = new Map(POLIGONOS_BLOQUES_SOMAHOZ.map((p) => [p.codigo, p]));
    const out: Array<{ code: string; x: number; y: number; radius: number }> = [];
    const MAX_POINTS = 6500;
    const DEFAULT_RADIUS = 2.8;

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
      // radio en función de la densidad del bloque (siempre “cuadrado”)
      const bb = bbox(poly.puntos);
      const approxCell = Math.min((bb.maxX - bb.minX) / Math.max(1, columnas), (bb.maxY - bb.minY) / Math.max(1, filas));
      // Un poco más grande para legibilidad (sin saturar)
      const r = Math.max(2.2, Math.min(4.4, Math.min(DEFAULT_RADIUS, approxCell * 0.16)));
      for (let i = 0; i < positions.length && out.length < MAX_POINTS; i++) {
        out.push({ code, x: positions[i].x, y: positions[i].y, radius: r });
      }
    }
    return out;
  }, [allGrids]);

  const nichesOverlay = useMemo(() => {
    if (!selectedPoly) return [];
    const filas = Number(selectedGrid?.filas ?? 0);
    const columnas = Number(selectedGrid?.columnas ?? 0);
    if (!Number.isFinite(filas) || !Number.isFinite(columnas) || filas <= 0 || columnas <= 0) return [];

    const seps: Sepultura[] = Array.isArray(selectedSepulturas) ? selectedSepulturas : [];
    if (seps.length === 0) return [];

    const sorted = [...seps].sort((a: any, b: any) => Number(a?.numero ?? a?.id ?? 0) - Number(b?.numero ?? b?.id ?? 0));
    const positions = gridPositionsInPoly(selectedPoly.puntos, filas, columnas, true);
    const bb = bbox(selectedPoly.puntos);
    const approxCell = Math.min((bb.maxX - bb.minX) / Math.max(1, columnas), (bb.maxY - bb.minY) / Math.max(1, filas));
    // Más grande para comodidad (tocar/ver)
    const r = Math.max(5, Math.min(14, Math.round(approxCell * 0.32)));

    const out: Array<{ sep: Sepultura; x: number; y: number; radius: number }> = [];
    for (let i = 0; i < sorted.length && i < positions.length; i++) {
      out.push({ sep: sorted[i], x: positions[i].x, y: positions[i].y, radius: r });
    }
    return out;
  }, [selectedGrid?.columnas, selectedGrid?.filas, selectedPoly, selectedSepulturas]);

  // Pan + zoom (pinch) + doble toque para reset
  const scale = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const startScale = useSharedValue(1);
  const startTx = useSharedValue(0);
  const startTy = useSharedValue(0);

  const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

  const pan = Gesture.Pan()
    .onBegin(() => {
      startTx.value = tx.value;
      startTy.value = ty.value;
    })
    .onUpdate((e) => {
      tx.value = startTx.value + e.translationX;
      ty.value = startTy.value + e.translationY;
    });

  const pinch = Gesture.Pinch()
    .onBegin(() => {
      startScale.value = scale.value;
      startTx.value = tx.value;
      startTy.value = ty.value;
    })
    .onUpdate((e) => {
      const next = clamp(startScale.value * e.scale, 1, 6);
      scale.value = next;
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .maxDuration(250)
    .onEnd(() => {
      scale.value = 1;
      tx.value = 0;
      ty.value = 0;
    });

  const composed = Gesture.Simultaneous(pan, pinch, doubleTap);

  useImperativeHandle(
    ref,
    () => ({
      zoomIn: () => {
        scale.value = clamp(scale.value * 1.18, 1, 6);
      },
      zoomOut: () => {
        scale.value = clamp(scale.value / 1.18, 1, 6);
        if (scale.value <= 1.01) {
          scale.value = 1;
          tx.value = 0;
          ty.value = 0;
        }
      },
      reset: () => {
        scale.value = 1;
        tx.value = 0;
        ty.value = 0;
      },
    }),
    []
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: scale.value }],
  }));

  return (
    <View style={[styles.wrap, { height: mapHeight, backgroundColor: c.background, borderColor: c.border }]}>
      <GestureDetector gesture={composed}>
        <Animated.View style={[styles.canvas, animatedStyle]}>
          <Svg
            width="100%"
            height="100%"
            viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
            preserveAspectRatio="xMidYMid meet"
          >
            {baseImage ? (
              <SvgImage href={baseImage} x={0} y={0} width={VIEWBOX.w} height={VIEWBOX.h} opacity={0.98} />
            ) : (
              <>
                {/* Fondo “plano” cuando no hay imagen base (evita bloquear el desarrollo) */}
                <Polygon
                  points={`0,0 ${VIEWBOX.w},0 ${VIEWBOX.w},${VIEWBOX.h} 0,${VIEWBOX.h}`}
                  fill={scheme === 'dark' ? 'rgba(30,41,59,0.55)' : 'rgba(226,232,240,0.8)'}
                  stroke="transparent"
                />
              </>
            )}

            {/* Overlays: rotables para encajar con ortofoto torcida */}
            <G transform={overlayTransform}>
              {/* Números amarillos (bloques) como “botones” fat-finger */}
              {yellowSafe.length > 0 ? (
                <G>
                  {yellowSafe.map((m) => (
                    <G key={`ym-${m.id}`}>
                      <Rect
                        x={m.vb.x - 28}
                        y={m.vb.y - 28}
                        width={56}
                        height={56}
                        rx={14}
                        fill="rgba(255,230,0,0.96)"
                        stroke="rgba(0,0,0,0.35)"
                        strokeWidth={3}
                        onPress={() => onPressYellowMarker?.(m)}
                      />
                      <SvgText
                        x={m.vb.x}
                        y={m.vb.y + 1}
                        textAnchor="middle"
                        alignmentBaseline="middle"
                        fontSize={24}
                        fontWeight="900"
                        fill="#0B0B0B"
                        onPress={() => onPressYellowMarker?.(m)}
                      >
                        {m.id}
                      </SvgText>
                    </G>
                  ))}
                </G>
              ) : null}

              {/* Hotspots invisibles (UX) */}
              {hotspotsSafe.length > 0 ? (
                <G>
                  {hotspotsSafe.map((h) => {
                    const active = activeHotspotId != null && h.id === activeHotspotId;
                    return (
                      <Polygon
                        key={`hs-${h.id}`}
                        points={pointsToString(h.points)}
                        fill={active ? 'rgba(34,197,94,0.22)' : 'rgba(0,0,0,0.01)'}
                        stroke={active ? 'rgba(34,197,94,0.85)' : 'transparent'}
                        strokeWidth={active ? 5 : 0}
                        onPress={() => onPressHotspot?.(h.id)}
                      />
                    );
                  })}
                </G>
              ) : null}

              {/* Nichos globales (sin estado), para ver "todo dibujado" */}
              {allNichesOverlay.length > 0 ? (
                <G>
                  {allNichesOverlay.map((p, idx) => (
                    <Rect
                      // idx es suficiente aquí: son puntos estáticos derivados de grids
                      key={`all-${p.code}-${idx}`}
                      x={p.x - p.radius}
                      y={p.y - p.radius}
                      width={p.radius * 2}
                      height={p.radius * 2}
                      rx={Math.max(1, p.radius * 0.35)}
                      fill="rgba(148,163,184,0.50)"
                      stroke="rgba(15,23,42,0.12)"
                      strokeWidth={1}
                    />
                  ))}
                </G>
              ) : null}

              <G>
                {polys.map((p) => {
                  const isSelected = selectedCodigo === p.codigo;
                  const fill = isSelected ? 'rgba(59, 130, 246, 0.30)' : 'rgba(30, 58, 95, 0.18)';
                  const stroke = isSelected ? 'rgba(59, 130, 246, 0.95)' : 'rgba(30, 58, 95, 0.70)';
                  const cx = p.puntos.reduce((acc, pt) => acc + pt.x, 0) / p.puntos.length;
                  const cy = p.puntos.reduce((acc, pt) => acc + pt.y, 0) / p.puntos.length;
                  return (
                    <G key={p.codigo}>
                      <Polygon
                        points={pointsToString(p.puntos)}
                        fill={fill}
                        stroke={stroke}
                        strokeWidth={isSelected ? 6 : 4}
                        onPress={() => onPressBlock(p.codigo)}
                      />
                      <SvgText
                        x={cx}
                        y={cy}
                        textAnchor="middle"
                        alignmentBaseline="middle"
                        fontSize={16}
                        fontWeight="800"
                        fill="rgba(15, 23, 42, 0.92)"
                        stroke="rgba(255,255,255,0.85)"
                        strokeWidth={3}
                      >
                        {p.codigo}
                      </SvgText>
                    </G>
                  );
                })}
              </G>

              {selectedCodigo && nichesOverlay.length > 0 ? (
                <G>
                  {nichesOverlay.map(({ sep, x, y, radius }) => {
                    const estado = normalizarEstadoEditable((sep as any)?.estado);
                    const fill =
                      estado === 'libre' ? 'rgba(34,197,94,0.95)' : estado === 'ocupada' ? 'rgba(239,68,68,0.95)' : 'rgba(59,130,246,0.90)';
                    const isHit = highlightSepulturaId != null && Number((sep as any)?.id) === Number(highlightSepulturaId);
                    return (
                      <G key={`sep-${(sep as any)?.id ?? (sep as any)?.numero ?? `${x}-${y}`}`}>
                        {isHit ? (
                          <>
                            <Circle
                              cx={x}
                              cy={y}
                              r={radius + 9}
                              fill="rgba(34,197,94,0.10)"
                              stroke={c.accent}
                              strokeWidth={4}
                            />
                            <Circle cx={x} cy={y} r={radius + 4} fill="transparent" stroke="rgba(255,255,255,0.95)" strokeWidth={3} />
                          </>
                        ) : null}
                        <Rect
                          x={x - (isHit ? radius + 2 : radius)}
                          y={y - (isHit ? radius + 2 : radius)}
                          width={(isHit ? radius + 2 : radius) * 2}
                          height={(isHit ? radius + 2 : radius) * 2}
                          rx={Math.max(2, (isHit ? radius + 2 : radius) * 0.28)}
                          fill={fill}
                          stroke="rgba(255,255,255,0.85)"
                          strokeWidth={2}
                          onPress={() => onPressNicho?.(sep)}
                        />
                      </G>
                    );
                  })}
                </G>
              ) : null}
            </G>
          </Svg>
        </Animated.View>
      </GestureDetector>

      {Platform.OS === 'web' && (
        <View style={[styles.webHint, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={[styles.webHintText, { color: c.textSecondary }]}>
            Consejo: pinch/scroll para zoom · doble toque para reset.
          </Text>
        </View>
      )}
    </View>
  );
}

export const CementerioMapa = memo(forwardRef(CementerioMapaBase));

const styles = StyleSheet.create({
  wrap: { width: '100%', borderWidth: 1, borderRadius: 14, overflow: 'hidden' },
  canvas: { flex: 1 },
  webHint: { position: 'absolute', left: 10, right: 10, bottom: 10, padding: 10, borderRadius: 12, borderWidth: 1 },
  webHintText: { fontSize: 12, fontWeight: '600' },
  missingWrap: { borderWidth: 1, borderRadius: 14, padding: 14 },
  missingTitle: { fontSize: 16, fontWeight: '900' },
  missingText: { marginTop: 8, fontSize: 13, fontWeight: '600', lineHeight: 18 },
});


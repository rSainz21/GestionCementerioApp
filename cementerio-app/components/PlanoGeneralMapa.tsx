import { forwardRef, memo, useImperativeHandle } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Image as SvgImage, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { colorParaEstadoSepulturaDb } from '@/lib/estado-sepultura';
import type { Sepultura } from '@/lib/types';

export type PlanoGeneralMapaHandle = {
  zoomIn: () => void;
  zoomOut: () => void;
  reset: () => void;
};

type BlockDef = {
  codigo: string;
  label: string;
  units: number;
  filas?: number;
  columnas?: number;
  x: number;
  y: number;
  w: number;
  h: number;
};

type Props = {
  height: number;
  selectedCodigo?: string | null;
  onPressBlock: (codigo: string) => void;
  blocks?: BlockDef[];
  /** Sepulturas del bloque seleccionado (para dibujar puntos como en “satélite”) */
  selectedSepulturas?: Sepultura[];
  /** Rejilla real del bloque seleccionado (filas/columnas) */
  selectedGrid?: { filas: number; columnas: number } | null;
  /** Resalta una sepultura concreta (halo/pin) */
  highlightSepulturaId?: number | null;
  /**
   * Si se pasa, se dibuja como fondo (p.ej. `unnamed.png`) para que el plano “tenga la forma real”.
   * Útil para el modo “plano” con diseño esquemático encima de una ortofoto.
   */
  backgroundImage?: any;
  backgroundOpacity?: number;
  /**
   * Permite recortar el viewBox (p.ej. ROI para `unnamed.png` con márgenes blancos).
   * Por defecto: `0 0 1000 1000`
   */
  viewBox?: { x: number; y: number; w: number; h: number };
  /**
   * Activa/desactiva decoraciones (caminos, árboles, capilla…).
   * Cuando hay `backgroundImage`, normalmente interesa desactivar para que no “ensucie”.
   */
  decorations?: boolean;
};

const VW = 1000;
const VH = 1000;

// ─── Somahoz Cemetery ──────────────────────────────────────────────────
// Real layout: all 10 official blocks, proportional to filas×columnas.
// North (top) → South (bottom). Wide strips (h<100) get labels INSIDE.
// ───────────────────────────────────────────────────────────────────────
const DEFAULT_BLOCKS: BlockDef[] = [
  // ── North wall (Muro Norte) ── full-width strip ──────────────────────
  { codigo: 'B2001', label: 'Muro Norte',   units: 52,  filas: 4, columnas: 13, x: 60,  y: 50,  w: 880, h: 75  },

  // ── Central row: Amp A (left) + main south wall (right) ─────────────
  { codigo: 'BA',    label: 'Ampliación A', units: 40,  filas: 4, columnas: 10, x: 60,  y: 215, w: 218, h: 155 },
  { codigo: 'B8',    label: 'Muro Sur',     units: 128, filas: 4, columnas: 32, x: 320, y: 215, w: 620, h: 155 },

  // ── South-wall strips + Amp D ────────────────────────────────────────
  { codigo: 'B7',    label: 'Bloque 7',     units: 56,  filas: 4, columnas: 14, x: 60,  y: 440, w: 296, h: 118 },
  { codigo: 'B6',    label: 'Bloque 6',     units: 40,  filas: 4, columnas: 10, x: 406, y: 440, w: 196, h: 108 },
  { codigo: 'BD',    label: 'Amp. D',       units: 52,  filas: 4, columnas: 13, x: 652, y: 440, w: 288, h: 128 },

  // ── Newer expansions (row 3) ─────────────────────────────────────────
  { codigo: 'B2007', label: 'Exento 2007',  units: 40,  filas: 4, columnas: 10, x: 60,  y: 640, w: 218, h: 130 },
  { codigo: 'B2017', label: 'Amp. 2017',    units: 40,  filas: 4, columnas: 10, x: 328, y: 640, w: 218, h: 120 },
  { codigo: 'B2020', label: 'Amp. 2020',    units: 24,  filas: 4, columnas: 6,  x: 596, y: 640, w: 128, h: 100 },

  // ── Most recent expansion ── full-width strip ─────────────────────────
  { codigo: 'B2025', label: 'Amp. 2025',    units: 48,  filas: 4, columnas: 12, x: 60,  y: 855, w: 880, h: 75  },
];

// Label font size based on block width
function labelFontSize(w: number) {
  if (w > 400) return 22;
  if (w > 200) return 18;
  return 15;
}
function unitsFontSize(w: number) {
  return labelFontSize(w) - 5;
}

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

function PlanoGeneralMapaBase(
  {
    height,
    selectedCodigo,
    onPressBlock,
    blocks,
    selectedSepulturas,
    selectedGrid,
    highlightSepulturaId,
    backgroundImage,
    backgroundOpacity = 0.95,
    viewBox,
    decorations,
  }: Props,
  ref: React.Ref<PlanoGeneralMapaHandle>
) {
  const data = blocks && blocks.length > 0 ? blocks : DEFAULT_BLOCKS;
  const vb = viewBox ?? { x: 0, y: 0, w: VW, h: VH };
  const showDecorations = decorations ?? !backgroundImage;
  // “Modo UX”: si quitamos decoraciones, buscamos máxima legibilidad (sin marrones/ornamentos).
  const isUxMode = !showDecorations;
  const scheme = useColorScheme();
  const c = Colors[scheme ?? 'light'];

  // ── Gesture state ────────────────────────────────────────────────────
  const scale    = useSharedValue(1);
  const tx       = useSharedValue(0);
  const ty       = useSharedValue(0);
  const startTx  = useSharedValue(0);
  const startTy  = useSharedValue(0);
  const startSc  = useSharedValue(1);

  const pan = Gesture.Pan()
    .onBegin(() => { startTx.value = tx.value; startTy.value = ty.value; })
    .onUpdate((e) => { tx.value = startTx.value + e.translationX; ty.value = startTy.value + e.translationY; });

  const pinch = Gesture.Pinch()
    .onBegin(() => { startSc.value = scale.value; })
    .onUpdate((e) => { scale.value = clamp(startSc.value * e.scale, 1, 5); });

  const doubleTap = Gesture.Tap().numberOfTaps(2).maxDuration(250).onEnd(() => {
    scale.value = 1; tx.value = 0; ty.value = 0;
  });

  const composed = Gesture.Simultaneous(pan, pinch, doubleTap);

  useImperativeHandle(ref, () => ({
    zoomIn:  () => { scale.value = clamp(scale.value * 1.18, 1, 5); },
    zoomOut: () => {
      scale.value = clamp(scale.value / 1.18, 1, 5);
      if (scale.value <= 1.01) { scale.value = 1; tx.value = 0; ty.value = 0; }
    },
    reset: () => { scale.value = 1; tx.value = 0; ty.value = 0; },
  }), []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: scale.value }],
  }));

  return (
    <View style={[s.wrap, { height }]}>
      <GestureDetector gesture={composed}>
        <Animated.View style={[s.canvas, animatedStyle]}>
          <Svg
            width="100%"
            height="100%"
            viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
            preserveAspectRatio="xMidYMin meet"
          >
            {/* ── Background ─────────────────────────────────────────── */}
            <Rect
              x={vb.x}
              y={vb.y}
              width={vb.w}
              height={vb.h}
              // Fondo basado en el tema de la app (no hardcode)
              fill={isUxMode ? c.background : '#D4E8CC'}
            />
            {backgroundImage ? (
              <>
                <SvgImage href={backgroundImage} x={0} y={0} width={VW} height={VH} opacity={backgroundOpacity} />
                {/* Si hay fondo, lo apagamos para que el “plano” se lea mejor */}
                <Rect x={vb.x} y={vb.y} width={vb.w} height={vb.h} fill={isUxMode ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0.30)'} />
              </>
            ) : null}

            {/* Dot grid */}
            {!backgroundImage && !isUxMode ? (
              <G opacity={0.38}>
              {Array.from({ length: 28 }, (_, r) =>
                Array.from({ length: 28 }, (_, c) => (
                  <Circle key={`d-${r}-${c}`} cx={36 + c * 34} cy={14 + r * 34} r={2.2} fill="#8CB890" />
                ))
              )}
              </G>
            ) : null}

            {showDecorations ? (
              <>
                {/* ── Trees ──────────────────────────────────────────────── */}
                <Circle cx={80}  cy={38}  r={30} fill="#5A9060" opacity={0.90} />
                <Circle cx={920} cy={38}  r={30} fill="#5A9060" opacity={0.90} />
                <Circle cx={34}  cy={508} r={22} fill="#5A9060" opacity={0.80} />
                <Circle cx={966} cy={508} r={22} fill="#5A9060" opacity={0.80} />
                <Circle cx={34}  cy={750} r={18} fill="#4E8455" opacity={0.75} />
                <Circle cx={966} cy={755} r={18} fill="#4E8455" opacity={0.75} />

                {/* ── White pathways ─────────────────────────────────────── */}
                <Path d="M60 168 L940 168"  stroke="rgba(255,255,255,0.72)" strokeWidth={28} strokeLinecap="round" />
                <Path d="M300 215 L300 370" stroke="rgba(255,255,255,0.60)" strokeWidth={20} strokeLinecap="round" />
                <Path d="M60 405 L940 405"  stroke="rgba(255,255,255,0.65)" strokeWidth={24} strokeLinecap="round" />
                <Path d="M60 600 L940 600"  stroke="rgba(255,255,255,0.65)" strokeWidth={22} strokeLinecap="round" />
                <Path d="M60 808 L940 808"  stroke="rgba(255,255,255,0.60)" strokeWidth={20} strokeLinecap="round" />

                {/* ── Chapel decoration ──────────────────────────────────── */}
                <G>
                  <Path d="M456,165 L490,132 L524,165" fill="#C4B298" stroke="#7A6540" strokeWidth={2.5} />
                  <Rect x={456} y={165} width={68} height={40} rx={5} fill="#D0C0A4" stroke="#7A6540" strokeWidth={2.5} />
                  <Line x1={490} y1={139} x2={490} y2={185} stroke="#6A5530" strokeWidth={4} strokeLinecap="round" />
                  <Line x1={476} y1={151} x2={504} y2={151} stroke="#6A5530" strokeWidth={4} strokeLinecap="round" />
                </G>
              </>
            ) : null}

            {/* ── Blocks ─────────────────────────────────────────────── */}
            {data.map((b) => {
              const active = String(selectedCodigo) === String(b.codigo);
              const modern = isUxMode || Boolean(backgroundImage);
              const FILL   = modern
                ? (active ? 'rgba(34,197,94,0.18)' : 'rgba(255,255,255,0.06)')
                : (active ? '#B09468' : '#C8B68E');
              const STROKE = modern
                ? (active ? 'rgba(34,197,94,0.95)' : 'rgba(148,163,184,0.35)')
                : (active ? '#2F1F06' : 'rgba(80,55,20,0.65)');
              const SW     = active ? (modern ? 6 : 5) : (modern ? 3 : 2.5);
              const labelInside = b.h < 100; // wide thin strips get labels inside

              // Inner grid (nicho cells visual)
              const colsRaw = Number(b.columnas ?? 0);
              const rowsRaw = Number(b.filas ?? 0);
              const cols = colsRaw > 0 ? Math.max(3, Math.min(12, colsRaw)) : Math.max(3, Math.min(10, Math.round(b.w / 55)));
              const rows = rowsRaw > 0 ? Math.max(2, Math.min(8,  rowsRaw)) : Math.max(2, Math.min(6,  Math.round(b.h / 45)));

              const lfs = labelFontSize(b.w);
              const ufs = unitsFontSize(b.w);

              return (
                <G key={b.codigo}>
                  {/* Block body */}
                  <Rect
                    x={b.x} y={b.y} width={b.w} height={b.h}
                    rx={14}
                    fill={FILL}
                    stroke={STROKE}
                    strokeWidth={SW}
                    onPress={() => onPressBlock(b.codigo)}
                  />

                  {/* Inner nicho grid */}
                  <G opacity={modern ? 0.45 : 0.28} pointerEvents="none">
                    {Array.from({ length: cols - 1 }, (_, i) => (
                      <Line
                        key={`vc-${b.codigo}-${i}`}
                        x1={b.x + ((i + 1) * b.w) / cols} y1={b.y + 4}
                        x2={b.x + ((i + 1) * b.w) / cols} y2={b.y + b.h - 4}
                        stroke={modern ? 'rgba(226,232,240,0.38)' : 'rgba(50,30,5,0.55)'} strokeWidth={1.5}
                      />
                    ))}
                    {Array.from({ length: rows - 1 }, (_, i) => (
                      <Line
                        key={`hr-${b.codigo}-${i}`}
                        x1={b.x + 4}  y1={b.y + ((i + 1) * b.h) / rows}
                        x2={b.x + b.w - 4} y2={b.y + ((i + 1) * b.h) / rows}
                        stroke={modern ? 'rgba(226,232,240,0.38)' : 'rgba(50,30,5,0.55)'} strokeWidth={1.5}
                      />
                    ))}
                  </G>

                  {/* Selection indicator — white dot on left */}
                  {active && (
                    <Circle
                      cx={b.x + b.w * 0.12}
                      cy={b.y + b.h * 0.50}
                      r={13}
                      fill="#FFFFFF"
                      stroke="#1A0F00"
                      strokeWidth={3.5}
                    />
                  )}

                  {/* Nichos (puntos) en modo “plano”, igual que satélite */}
                  {active && selectedGrid && Array.isArray(selectedSepulturas) && selectedSepulturas.length > 0 ? (
                    <G>
                      {selectedSepulturas.map((sep) => {
                        const filas = Math.max(1, Number(selectedGrid.filas || 1));
                        const columnas = Math.max(1, Number(selectedGrid.columnas || 1));
                        const fila = Number((sep as any)?.fila ?? 0);
                        const col = Number((sep as any)?.columna ?? 0);
                        if (!Number.isFinite(fila) || !Number.isFinite(col) || fila <= 0 || col <= 0) return null;
                        if (fila > filas || col > columnas) return null;

                        const cellW = b.w / columnas;
                        const cellH = b.h / filas;
                        const cx = b.x + (col - 0.5) * cellW;
                        const cy = b.y + (fila - 0.5) * cellH;
                        // Más grande para comodidad y legibilidad (plano)
                        const radius = Math.max(5.6, Math.min(14.5, Math.min(cellW, cellH) * 0.34));

                        const fill = colorParaEstadoSepulturaDb((sep as any)?.estado);
                        const isHit = highlightSepulturaId != null && Number((sep as any)?.id) === Number(highlightSepulturaId);

                        return (
                          <G key={`sep-dot-${(sep as any)?.id ?? `${fila}-${col}`}`}>
                            {isHit ? (
                              <>
                                <Circle cx={cx} cy={cy} r={radius + 9} fill="rgba(34,197,94,0.10)" stroke={c.accent} strokeWidth={4} />
                                <Circle cx={cx} cy={cy} r={radius + 4} fill="transparent" stroke="rgba(255,255,255,0.95)" strokeWidth={3} />
                              </>
                            ) : null}
                            <Rect
                              x={cx - (isHit ? radius + 2 : radius)}
                              y={cy - (isHit ? radius + 2 : radius)}
                              width={(isHit ? radius + 2 : radius) * 2}
                              height={(isHit ? radius + 2 : radius) * 2}
                              rx={Math.max(2, (isHit ? radius + 2 : radius) * 0.28)}
                              fill={fill}
                              fillOpacity={0.92}
                              stroke="rgba(255,255,255,0.85)"
                              strokeWidth={2.8}
                            />
                          </G>
                        );
                      })}
                    </G>
                  ) : null}

                  {/* Labels ─ inside for thin strips, below for taller blocks */}
                  {labelInside ? (
                    <>
                      <SvgText
                        x={b.x + b.w / 2} y={b.y + b.h * 0.40}
                        textAnchor="middle" alignmentBaseline="middle"
                        fontSize={lfs} fontWeight="800"
                        fill={modern ? 'rgba(255,255,255,0.92)' : 'rgba(15,8,0,0.80)'}
                        stroke={modern ? 'rgba(0,0,0,0.70)' : 'rgba(255,255,255,0.55)'} strokeWidth={modern ? 3 : 2}
                      >
                        {b.label}
                      </SvgText>
                      {b.units > 0 && (
                        <SvgText
                          x={b.x + b.w / 2} y={b.y + b.h * 0.75}
                          textAnchor="middle" alignmentBaseline="middle"
                          fontSize={ufs} fontWeight="700"
                          fill={modern ? 'rgba(226,232,240,0.78)' : 'rgba(15,8,0,0.58)'}
                        >
                          {b.units} nichos
                        </SvgText>
                      )}
                    </>
                  ) : (
                    <>
                      <SvgText
                        x={b.x + b.w / 2} y={b.y + b.h + 26}
                        textAnchor="middle"
                        fontSize={lfs} fontWeight="800"
                        fill={modern ? 'rgba(255,255,255,0.92)' : 'rgba(15,8,0,0.80)'}
                        stroke={modern ? 'rgba(0,0,0,0.70)' : 'transparent'}
                        strokeWidth={modern ? 3 : 0}
                      >
                        {b.label}
                      </SvgText>
                      {b.units > 0 && (
                        <SvgText
                          x={b.x + b.w / 2} y={b.y + b.h + 26 + lfs - 2}
                          textAnchor="middle"
                          fontSize={ufs} fontWeight="700"
                          fill={modern ? 'rgba(226,232,240,0.78)' : 'rgba(15,8,0,0.50)'}
                        >
                          {b.units} nichos
                        </SvgText>
                      )}
                    </>
                  )}
                </G>
              );
            })}
          </Svg>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

export const PlanoGeneralMapa = memo(forwardRef(PlanoGeneralMapaBase));

const s = StyleSheet.create({
  wrap:   { width: '100%', borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(90,120,80,0.22)', backgroundColor: '#D4E8CC' },
  canvas: { flex: 1 },
});

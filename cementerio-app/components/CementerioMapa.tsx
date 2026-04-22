import { memo, useMemo } from 'react';
import { Image, Platform, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Svg, { G, Image as SvgImage, Polygon, Text as SvgText } from 'react-native-svg';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import type { BloqueOficial } from '@/lib/bloques-oficiales';
import { POLIGONOS_BLOQUES_SOMAHOZ } from '@/lib/mapa-somahoz';

type Props = {
  blocks: BloqueOficial[];
  onPressBlock: (codigo: string) => void;
  selectedCodigo?: string | null;
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

const VIEWBOX = { w: 1000, h: 1000 };

function pointsToString(points: { x: number; y: number }[]) {
  return points.map((p) => `${p.x},${p.y}`).join(' ');
}

function CementerioMapaBase({ blocks, onPressBlock, selectedCodigo, baseImage, height, crop }: Props) {
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

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: scale.value }],
  }));

  if (!baseImage) {
    return (
      <View style={[styles.missingWrap, { backgroundColor: c.surface, borderColor: c.border }]}>
        <Text style={[styles.missingTitle, { color: c.text }]}>Falta la imagen del mapa</Text>
        <Text style={[styles.missingText, { color: c.textSecondary }]}>
          Añade una imagen en `assets/images/` y pásala como `baseImage` (por ejemplo: `require('@/assets/images/unnamed.png')`).
        </Text>
        <Text style={[styles.missingText, { color: c.textSecondary }]}>
          Luego ajustamos los polígonos en `lib/mapa-somahoz.ts` para que encajen exactos.
        </Text>
      </View>
    );
  }

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
            <SvgImage href={baseImage} x={0} y={0} width={VIEWBOX.w} height={VIEWBOX.h} opacity={0.98} />

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
                      paintOrder="stroke"
                    >
                      {p.codigo}
                    </SvgText>
                  </G>
                );
              })}
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

export const CementerioMapa = memo(CementerioMapaBase);

const styles = StyleSheet.create({
  wrap: { width: '100%', borderWidth: 1, borderRadius: 14, overflow: 'hidden' },
  canvas: { flex: 1 },
  webHint: { position: 'absolute', left: 10, right: 10, bottom: 10, padding: 10, borderRadius: 12, borderWidth: 1 },
  webHintText: { fontSize: 12, fontWeight: '600' },
  missingWrap: { borderWidth: 1, borderRadius: 14, padding: 14 },
  missingTitle: { fontSize: 16, fontWeight: '900' },
  missingText: { marginTop: 8, fontSize: 13, fontWeight: '600', lineHeight: 18 },
});


import { memo, useMemo } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import type { Hotspot } from '@/lib/mapa-hotspots';

type Roi = {
  /** Coordenadas relativas (0..1) dentro de la imagen */
  x: number;
  y: number;
  w: number;
  h: number;
};

type Props = {
  image: any;
  hotspots: Hotspot[];
  onPressHotspot: (codigo: string) => void;
  height?: number;
  style?: ViewStyle;
  /**
   * Región útil del mapa dentro de la imagen (para PNGs con márgenes blancos).
   * Los hotspots (xPct/yPct) se aplican sobre esta región.
   */
  roi?: Roi;
};

function clamp(v: number, min: number, max: number) {
  'worklet';
  return Math.min(max, Math.max(min, v));
}

function MapaHotspotsStackedBase({ image, hotspots, onPressHotspot, height = 520, roi, style }: Props) {
  // 1) Contenedor Interactivo (padre absoluto): aplica transform a TODO el lienzo.
  const scale = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const startS = useSharedValue(1);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);

  const pan = Gesture.Pan()
    .onBegin(() => {
      startX.value = tx.value;
      startY.value = ty.value;
    })
    .onUpdate((e) => {
      tx.value = startX.value + e.translationX;
      ty.value = startY.value + e.translationY;
    });

  const pinch = Gesture.Pinch()
    .onBegin(() => {
      startS.value = scale.value;
    })
    .onUpdate((e) => {
      scale.value = clamp(startS.value * e.scale, 1, 6);
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

  // Tamaño del lienzo basado en el tamaño real del asset: la imagen dicta el tamaño del Stack.
  const asset = useMemo(() => {
    try {
      return Image.resolveAssetSource(image) as { width: number; height: number } | undefined;
    } catch {
      return undefined;
    }
  }, [image]);

  const imgW = asset?.width ?? 1000;
  const imgH = asset?.height ?? 1000;
  const aspectRatio = imgW / imgH;

  // ROI por defecto para `unnamed.png` (equivalente al crop anterior 255/205/500/500 sobre 1000)
  const roiFinal: Roi = roi ?? { x: 0.255, y: 0.205, w: 0.5, h: 0.5 };

  return (
    <View style={[s.frame, { height }, style]}>
      <GestureDetector gesture={composed}>
        {/* 2) Lienzo de capas (Stack / Relative) */}
        <Animated.View style={[s.canvas, animatedStyle]}>
          <View style={[s.stack, { aspectRatio }]}>
            {/* 3) Capa inferior (Imagen) */}
            <Image source={image} style={s.image} resizeMode="contain" />

            {/* 4) Capa superior (Botones absolutos sobre los píxeles del mapa) */}
            {hotspots.map((h) => {
              const x = (roiFinal.x + roiFinal.w * (h.xPct / 100)) * 100;
              const y = (roiFinal.y + roiFinal.h * (h.yPct / 100)) * 100;
              return (
                <TouchableOpacity
                  key={h.codigo}
                  style={[s.pin, { left: `${x}%`, top: `${y}%` }]}
                  onPress={() => onPressHotspot(h.codigo)}
                  activeOpacity={0.85}
                >
                  <Text style={s.pinText}>{h.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

export const MapaHotspotsStacked = memo(MapaHotspotsStackedBase);

const s = StyleSheet.create({
  frame: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFF',
  },
  canvas: { flex: 1 },
  stack: {
    position: 'relative',
    width: '100%',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  pin: {
    position: 'absolute',
    transform: [{ translateX: -18 }, { translateY: -18 }],
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'rgba(22,163,74,0.95)',
    backgroundColor: 'rgba(22,163,74,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinText: { fontSize: 10, fontWeight: '900', color: '#14532D' },
});


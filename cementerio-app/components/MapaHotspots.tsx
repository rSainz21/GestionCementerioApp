import { memo } from 'react';
import { ImageBackground, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import type { Hotspot } from '@/lib/mapa-hotspots';

type Props = {
  image: any;
  hotspots: Hotspot[];
  onPressHotspot: (codigo: string) => void;
  height?: number;
};

function clamp(v: number, min: number, max: number) {
  'worklet';
  return Math.min(max, Math.max(min, v));
}

function MapaHotspotsBase({ image, hotspots, onPressHotspot, height = 520 }: Props) {
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

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: scale.value }],
  }));

  return (
    <View style={[s.frame, { height }]}>
      <GestureDetector gesture={composed}>
        <Animated.View style={[s.canvas, style]}>
          <ImageBackground source={image} style={s.image} resizeMode="contain">
            {hotspots.map((h) => (
              <TouchableOpacity
                key={h.codigo}
                style={[s.pin, { left: `${h.xPct}%`, top: `${h.yPct}%` }]}
                onPress={() => onPressHotspot(h.codigo)}
                activeOpacity={0.85}
              >
                <Text style={s.pinText}>{h.label}</Text>
              </TouchableOpacity>
            ))}
          </ImageBackground>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

export const MapaHotspots = memo(MapaHotspotsBase);

const s = StyleSheet.create({
  frame: { borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#FFF' },
  canvas: { flex: 1 },
  image: { flex: 1 },
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


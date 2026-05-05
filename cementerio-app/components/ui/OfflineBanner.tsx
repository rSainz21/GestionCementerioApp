import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useNetworkStatus } from '@/lib/useNetworkStatus';

/** Banner sutil que aparece cuando no hay conexión a internet. */
function OfflineBannerBase() {
  const { isConnected } = useNetworkStatus();

  // No mostrar nada mientras se determina el estado o si hay conexión.
  if (isConnected !== false) return null;

  return (
    <View style={s.banner} accessibilityRole="alert">
      <FontAwesome name="wifi" size={14} color="#92400E" />
      <Text style={s.text}>Sin conexión a internet</Text>
      <Text style={s.sub}>Los cambios se guardarán localmente</Text>
    </View>
  );
}

export const OfflineBanner = memo(OfflineBannerBase);

const s = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#FFFBEB',
    borderBottomWidth: 1,
    borderBottomColor: '#FDE68A',
    flexWrap: 'wrap',
  },
  text: {
    fontSize: 13,
    fontWeight: '800',
    color: '#92400E',
  },
  sub: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B45309',
    opacity: 0.7,
  },
});

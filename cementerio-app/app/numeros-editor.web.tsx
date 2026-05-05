import { useEffect, useState, type ComponentType } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

/**
 * SSR / static export: Leaflet solo en cliente (`@/components/NumerosEditorLeaflet.web`).
 */
export default function NumerosEditorWeb() {
  const [Inner, setInner] = useState<ComponentType<Record<string, never>> | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let cancelled = false;
    import('@/components/NumerosEditorLeaflet.web')
      .then((m) => {
        if (!cancelled) {
          setErr(null);
          setInner(() => m.default);
        }
      })
      .catch((e) => {
        if (!cancelled) setErr(String((e as Error)?.message ?? e));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (typeof window === 'undefined') {
    return <View style={s.screen} />;
  }

  if (err) {
    return (
      <View style={[s.screen, s.center]}>
        <Text style={s.errT}>Error: {err}</Text>
      </View>
    );
  }

  if (!Inner) {
    return (
      <View style={[s.screen, s.center]}>
        <ActivityIndicator size="large" color="#FDE047" />
        <Text style={s.loadT}>Cargando editor…</Text>
      </View>
    );
  }

  return <Inner />;
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0B1220' },
  center: { alignItems: 'center', justifyContent: 'center', padding: 16 },
  errT: { fontWeight: '900', color: '#FFFFFF', textAlign: 'center' },
  loadT: { marginTop: 12, fontWeight: '800', color: 'rgba(255,255,255,0.75)' },
});

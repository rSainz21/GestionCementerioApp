import { memo, useEffect, useState, type ComponentType } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { CementerioMapaOSMProps } from './CementerioMapaOSM.types';

/**
 * Web: envoltorio SSR-safe. Leaflet solo entra en cliente vía chunk `CementerioMapaLeafletInner.web`
 * (evita `window is not defined` en static export / prerender).
 */
export const CementerioMapaOSM = memo(function CementerioMapaOSM(props: CementerioMapaOSMProps) {
  const [Inner, setInner] = useState<ComponentType<CementerioMapaOSMProps> | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let cancelled = false;
    import('./CementerioMapaLeafletInner.web')
      .then((mod) => {
        if (!cancelled) {
          setLoadErr(null);
          setInner(() => mod.CementerioMapaLeafletInner);
        }
      })
      .catch((e) => {
        if (!cancelled) setLoadErr(String((e as Error)?.message ?? e ?? 'Error cargando mapa'));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (typeof window === 'undefined') {
    return <View style={[s.wrap, { height: props.height }]} />;
  }

  if (loadErr) {
    return (
      <View style={[s.wrap, { height: props.height, alignItems: 'center', justifyContent: 'center', padding: 14 }]}>
        <Text style={s.loadingT}>Error mapa: {loadErr}</Text>
      </View>
    );
  }

  if (!Inner) {
    return (
      <View style={[s.wrap, { height: props.height, alignItems: 'center', justifyContent: 'center', padding: 14 }]}>
        <Text style={s.loadingT}>Cargando satélite…</Text>
      </View>
    );
  }

  return <Inner {...props} />;
});

const s = StyleSheet.create({
  wrap: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  loadingT: { fontWeight: '900', color: '#0F172A' },
});

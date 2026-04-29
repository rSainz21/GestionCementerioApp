import '@/components/leaflet-min.css';

import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter } from 'expo-router';
import { SOMAHOZ_BBOX, vbToLatLon } from '@/lib/somahoz-geo';
import { SOMAHOZ_YELLOW_MARKERS } from '@/lib/somahoz-yellow-markers';
import { loadYellowMarkerPositions, resetYellowMarkerPositions, saveYellowMarkerPositions } from '@/lib/mapa-yellow-store';

type LeafletMod = typeof import('leaflet');
type ReactLeafletMod = typeof import('react-leaflet');

export default function NumerosEditorWeb() {
  const router = useRouter();
  const [leafletMods, setLeafletMods] = useState<{ L: LeafletMod; RL: ReactLeafletMod } | null>(null);
  const [leafletErr, setLeafletErr] = useState<string | null>(null);
  const [pos, setPos] = useState<Record<string, { latitude: number; longitude: number }>>({});
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let mounted = true;
    Promise.all([import('leaflet'), import('react-leaflet')])
      .then(([L, RL]) => {
        if (!mounted) return;
        const Lm: any = (L as any)?.divIcon ? (L as any) : (L as any)?.default ?? L;
        const RLm: any = (RL as any)?.MapContainer ? (RL as any) : (RL as any)?.default ?? RL;
        if (!Lm?.divIcon || !RLm?.MapContainer) throw new Error('Leaflet/React-Leaflet no cargó correctamente');
        setLeafletMods({ L: Lm, RL: RLm });
        setLeafletErr(null);
      })
      .catch((e) => {
        if (!mounted) return;
        setLeafletErr(String((e as any)?.message ?? e ?? 'Error cargando Leaflet'));
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    loadYellowMarkerPositions()
      .then((all) => {
        const by: Record<string, { latitude: number; longitude: number }> = {};
        for (const p of all) by[String(p.id)] = { latitude: Number(p.latitude), longitude: Number(p.longitude) };
        setPos(by);
      })
      .catch(() => null);
  }, []);

  const center = useMemo(
    () => [(SOMAHOZ_BBOX.south + SOMAHOZ_BBOX.north) / 2, (SOMAHOZ_BBOX.west + SOMAHOZ_BBOX.east) / 2] as [number, number],
    []
  );

  const markers = useMemo(() => {
    return SOMAHOZ_YELLOW_MARKERS.map((m) => {
      const id = String(m.id);
      return { id, coord: pos[id] ?? vbToLatLon(m.vb) };
    });
  }, [pos]);

  const save = async () => {
    const all = markers.map((m) => ({ id: m.id, latitude: m.coord.latitude, longitude: m.coord.longitude, updatedAt: Date.now() }));
    await saveYellowMarkerPositions(all);
    setDirty(false);
    // feedback + asegura que al volver el mapa lo recargue
    router.back();
  };

  const reset = async () => {
    await resetYellowMarkerPositions();
    setPos({});
    setDirty(false);
  };

  if (typeof window === 'undefined') return <View style={s.screen} />;
  if (!leafletMods)
    return (
      <View style={[s.screen, { alignItems: 'center', justifyContent: 'center', padding: 14 }]}>
        <Text style={{ fontWeight: '900', color: '#FFFFFF' }}>{leafletErr ? `Error: ${leafletErr}` : 'Cargando…'}</Text>
      </View>
    );

  const { L, RL } = leafletMods;
  const { MapContainer, Marker, TileLayer } = RL as any;

  const yellowIcon = (id: string) =>
    (L as any).divIcon({
      className: '',
      html: `<div class="${String(id) === '5' ? 'cemn-green' : 'cemn-yellow'}">${id}</div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });

  return (
    <View style={s.screen}>
      <View style={s.top}>
        <TouchableOpacity style={s.iconBtn} onPress={() => router.back()} activeOpacity={0.9}>
          <FontAwesome name="times" size={18} color="#0F172A" />
        </TouchableOpacity>
        <Text style={s.title}>Editar números (1–8)</Text>
        <TouchableOpacity style={s.resetBtn} onPress={reset} activeOpacity={0.9}>
          <FontAwesome name="undo" size={16} color="#0F172A" />
          <Text style={s.resetBtnT}>RESET</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.primaryBtn, !dirty && { opacity: 0.7 }]} onPress={save} activeOpacity={0.9}>
          <FontAwesome name="save" size={16} color="#0F172A" />
          <Text style={s.primaryBtnT}>GUARDAR</Text>
        </TouchableOpacity>
      </View>

      <View style={s.mapWrap}>
        <MapContainer center={center} zoom={21} style={{ width: '100%', height: '100%' }} zoomControl={false} scrollWheelZoom={false} attributionControl={false}>
          <TileLayer
            url="https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            maxNativeZoom={20}
            maxZoom={22}
          />
          {markers.map((m) => (
            <Marker
              key={`y-${m.id}`}
              position={[m.coord.latitude, m.coord.longitude]}
              draggable
              icon={yellowIcon(m.id)}
              eventHandlers={{
                dragend: (e: any) => {
                  const ll = e.target.getLatLng();
                  setDirty(true);
                  setPos((prev) => ({ ...prev, [m.id]: { latitude: ll.lat, longitude: ll.lng } }));
                },
              }}
            />
          ))}
        </MapContainer>
      </View>

      <View style={s.hintBox} pointerEvents="none">
        <Text style={s.hintT}>Arrastra cada número y pulsa GUARDAR.</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0B1220' },
  mapWrap: { flex: 1 },
  top: { position: 'absolute', top: 12, left: 12, right: 12, zIndex: 20, flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontWeight: '900', color: '#FFFFFF', textShadowColor: 'rgba(0,0,0,0.65)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 6 },
  resetBtn: { height: 44, paddingHorizontal: 12, borderRadius: 999, backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', gap: 8 },
  resetBtnT: { fontWeight: '900', color: '#0F172A' },
  primaryBtn: { height: 44, paddingHorizontal: 14, borderRadius: 999, backgroundColor: 'rgba(255,230,0,0.98)', flexDirection: 'row', alignItems: 'center', gap: 10 },
  primaryBtnT: { fontWeight: '900', color: '#0F172A', letterSpacing: 0.7 },
  hintBox: { position: 'absolute', left: 12, right: 12, bottom: 12, padding: 12, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.96)', borderWidth: 1, borderColor: 'rgba(15,23,42,0.14)' },
  hintT: { fontWeight: '900', color: 'rgba(15,23,42,0.70)' },
});


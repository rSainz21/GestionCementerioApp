import { useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View, type NativeSyntheticEvent } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter } from 'expo-router';
import { SOMAHOZ_BBOX, vbToLatLon } from '@/lib/somahoz-geo';
import { SOMAHOZ_YELLOW_MARKERS } from '@/lib/somahoz-yellow-markers';
import { loadYellowMarkerPositions, resetYellowMarkerPositions, saveYellowMarkerPositions } from '@/lib/mapa-yellow-store';
import { Semantic } from '@/components/ui';
import { loadCustomMarkers, removeCustomMarker, saveCustomMarkers, type CustomMarker, type CustomMarkerKind } from '@/lib/mapa-custom-markers-store';

type MapMarkerDragEndEvent = NativeSyntheticEvent<{ coordinate: { latitude: number; longitude: number } }>;

type MapComp = React.ComponentType<any>;
let MapView: MapComp | null = null;
let Marker: MapComp | null = null;
let UrlTile: MapComp | null = null;

if (Platform.OS !== 'web') {
  const rnMaps = require('react-native-maps');
  MapView = rnMaps.default;
  Marker = rnMaps.Marker;
  UrlTile = rnMaps.UrlTile;
}

const SOMAHOZ_CENTER = {
  latitude: 43.2487102,
  longitude: -4.0579621,
  latitudeDelta: Math.max(0.00016, (SOMAHOZ_BBOX.north - SOMAHOZ_BBOX.south) * 0.72),
  longitudeDelta: Math.max(0.00016, (SOMAHOZ_BBOX.east - SOMAHOZ_BBOX.west) * 0.72),
};

export default function NumerosEditorNative() {
  const router = useRouter();
  const [pos, setPos] = useState<Record<string, { latitude: number; longitude: number }>>({});
  const [dirty, setDirty] = useState(false);
  const [custom, setCustom] = useState<CustomMarker[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [addKind, setAddKind] = useState<CustomMarkerKind>('nicho');
  const [addLabel, setAddLabel] = useState('');
  const [addNote, setAddNote] = useState('');

  useEffect(() => {
    loadYellowMarkerPositions()
      .then((all) => {
        const by: Record<string, { latitude: number; longitude: number }> = {};
        for (const p of all) by[String(p.id)] = { latitude: Number(p.latitude), longitude: Number(p.longitude) };
        setPos(by);
      })
      .catch(() => null);
  }, []);

  useEffect(() => {
    loadCustomMarkers().then(setCustom).catch(() => setCustom([]));
  }, []);

  const markers = useMemo(() => {
    return SOMAHOZ_YELLOW_MARKERS.map((m) => {
      const id = String(m.id);
      return { id, coord: pos[id] ?? vbToLatLon(m.vb) };
    });
  }, [pos]);

  const markerStyle = (kind: string) => {
    if (kind === 'sepultura') return s.green;
    if (kind === 'columbario') return s.blue;
    if (kind === 'panteon') return s.purple;
    return null;
  };

  const save = async () => {
    const all = markers.map((m) => ({ id: m.id, latitude: m.coord.latitude, longitude: m.coord.longitude, updatedAt: Date.now() }));
    await saveYellowMarkerPositions(all);
    await saveCustomMarkers(custom.map((m) => ({ ...m, updatedAt: Date.now() })));
    setDirty(false);
    Alert.alert('Guardado', 'Posiciones de números guardadas.');
    router.back();
  };

  const reset = async () => {
    await resetYellowMarkerPositions();
    setPos({});
    setDirty(false);
    Alert.alert('Reset', 'Volvemos a las posiciones por defecto.');
  };

  if (!MapView || !Marker || !UrlTile) {
    return (
      <View style={[s.screen, { alignItems: 'center', justifyContent: 'center', padding: 16 }]}>
        <Text style={{ fontWeight: '900', color: Semantic.text }}>Vista de mapa no disponible en web.</Text>
      </View>
    );
  }

  return (
    <View style={s.screen}>
      <View style={s.top}>
        <TouchableOpacity style={s.iconBtn} onPress={() => router.back()} activeOpacity={0.9}>
          <FontAwesome name="times" size={18} color={Semantic.text} />
        </TouchableOpacity>
        <Text style={s.title}>Marcadores</Text>
        <TouchableOpacity style={s.addBtn} onPress={() => setAddOpen(true)} activeOpacity={0.9}>
          <FontAwesome name="plus" size={16} color="#0F172A" />
          <Text style={s.addBtnT}>AÑADIR</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.resetBtn} onPress={reset} activeOpacity={0.9}>
          <FontAwesome name="undo" size={16} color="#0F172A" />
          <Text style={s.resetBtnT}>RESET</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.primaryBtn, !dirty && { opacity: 0.7 }]} onPress={save} activeOpacity={0.9}>
          <FontAwesome name="save" size={16} color="#0F172A" />
          <Text style={s.primaryBtnT}>GUARDAR</Text>
        </TouchableOpacity>
      </View>

      <MapView style={StyleSheet.absoluteFill} initialRegion={SOMAHOZ_CENTER} rotateEnabled={false} pitchEnabled={false} toolbarEnabled={false}>
        <UrlTile urlTemplate="https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" maximumZ={20} flipY={false} />

        {markers.map((m) => (
          <Marker
            key={`y-${m.id}`}
            coordinate={m.coord}
            draggable
            onDragEnd={(e: MapMarkerDragEndEvent) => {
              const c = e.nativeEvent.coordinate;
              setDirty(true);
              setPos((prev) => ({ ...prev, [m.id]: c }));
            }}
          >
            <View style={[s.yellow, String(m.id) === '5' && s.green]}>
              <Text style={s.yellowT}>{m.id}</Text>
            </View>
          </Marker>
        ))}

        {custom.map((m) => (
          <Marker
            key={`cm-${m.id}`}
            coordinate={{ latitude: Number(m.latitude), longitude: Number(m.longitude) }}
            draggable
            onDragEnd={(e: MapMarkerDragEndEvent) => {
              const c = e.nativeEvent.coordinate;
              setDirty(true);
              setCustom((prev) => prev.map((x) => (x.id === m.id ? { ...x, latitude: c.latitude, longitude: c.longitude } : x)));
            }}
            onCalloutPress={async () => {
              // borrado rápido si alguna vez molesta
              const next = await removeCustomMarker(m.id);
              setCustom(next);
              setDirty(true);
            }}
          >
            <View style={[s.yellow, markerStyle(m.kind)]}>
              <Text style={s.yellowT}>{String(m.label ?? '').slice(0, 3)}</Text>
            </View>
          </Marker>
        ))}
      </MapView>

      <View style={s.hintBox} pointerEvents="none">
        <Text style={s.hintT}>Arrastra marcadores y pulsa GUARDAR. (En custom: pulsar el callout borra)</Text>
      </View>

      <Modal visible={addOpen} transparent animationType="fade" onRequestClose={() => setAddOpen(false)}>
        <View style={s.modalBg}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setAddOpen(false)} />
          <View style={s.sheet}>
            <Text style={s.sheetTitle}>Añadir marcador</Text>
            <Text style={s.sheetLabel}>TIPO</Text>
            <View style={s.kindRow}>
              {([
                { id: 'nicho', label: 'Nicho' },
                { id: 'columbario', label: 'Columbario' },
                { id: 'sepultura', label: 'Sepultura' },
                { id: 'panteon', label: 'Panteón' },
              ] as Array<{ id: CustomMarkerKind; label: string }>).map((k) => (
                <TouchableOpacity
                  key={k.id}
                  style={[s.kindPill, addKind === k.id && s.kindPillActive]}
                  onPress={() => setAddKind(k.id)}
                  activeOpacity={0.9}
                >
                  <Text style={[s.kindPillT, addKind === k.id && s.kindPillTActive]}>{k.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={s.sheetLabel}>NÚMERO/TEXTO</Text>
            <TextInput value={addLabel} onChangeText={setAddLabel} placeholder="Ej: 12" style={s.input} />
            <Text style={s.sheetLabel}>NOTA (opcional)</Text>
            <TextInput value={addNote} onChangeText={setAddNote} placeholder="Ej: sepultura familiar" style={s.input} />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setAddOpen(false)} activeOpacity={0.9}>
                <Text style={s.cancelBtnT}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.createBtn}
                onPress={async () => {
                  const label = String(addLabel ?? '').trim();
                  if (!label) {
                    Alert.alert('Falta dato', 'Pon el número/texto.');
                    return;
                  }
                  const id = `cm_${Date.now()}_${Math.round(Math.random() * 1e6)}`;
                  const m: CustomMarker = {
                    id,
                    kind: addKind,
                    label,
                    note: String(addNote ?? '').trim() || undefined,
                    latitude: SOMAHOZ_CENTER.latitude,
                    longitude: SOMAHOZ_CENTER.longitude,
                    updatedAt: Date.now(),
                  };
                  const next = await saveCustomMarkers([...custom, m]).then(() => [...custom, m]);
                  setCustom(next);
                  setDirty(true);
                  setAddOpen(false);
                  setAddLabel('');
                  setAddNote('');
                }}
                activeOpacity={0.9}
              >
                <Text style={s.createBtnT}>Crear y colocar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Semantic.screenBg },
  top: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 52 : 18,
    left: 14,
    right: 14,
    zIndex: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBtn: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Semantic.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { flex: 1, fontWeight: '900', color: '#FFFFFF', textShadowColor: 'rgba(0,0,0,0.65)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 6 },
  addBtn: { height: 48, paddingHorizontal: 12, borderRadius: 999, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: Semantic.border, flexDirection: 'row', alignItems: 'center', gap: 8 },
  addBtnT: { fontWeight: '900', color: '#0F172A' },
  resetBtn: { height: 48, paddingHorizontal: 12, borderRadius: 999, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: Semantic.border, flexDirection: 'row', alignItems: 'center', gap: 8 },
  resetBtnT: { fontWeight: '900', color: '#0F172A' },
  primaryBtn: { height: 48, paddingHorizontal: 14, borderRadius: 999, backgroundColor: 'rgba(255,230,0,0.98)', flexDirection: 'row', alignItems: 'center', gap: 10 },
  primaryBtnT: { fontWeight: '900', color: '#0F172A', letterSpacing: 0.7 },
  yellow: { width: 26, height: 26, borderRadius: 9, backgroundColor: 'rgba(255,230,0,0.96)', borderWidth: 2, borderColor: 'rgba(0,0,0,0.22)', alignItems: 'center', justifyContent: 'center' },
  green: { backgroundColor: 'rgba(34,197,94,0.95)' },
  blue: { backgroundColor: 'rgba(59,130,246,0.95)' },
  purple: { backgroundColor: 'rgba(168,85,247,0.95)' },
  yellowT: { fontWeight: '900', color: '#0B0B0B', fontSize: 12 },
  hintBox: { position: 'absolute', left: 12, right: 12, bottom: 14, padding: 12, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.96)', borderWidth: 1, borderColor: Semantic.border },
  hintT: { fontWeight: '900', color: Semantic.textSecondary },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: Semantic.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16, borderTopWidth: 1, borderColor: Semantic.border },
  sheetTitle: { fontSize: 18, fontWeight: '900', color: Semantic.text },
  sheetLabel: { marginTop: 10, fontSize: 11, fontWeight: '900', letterSpacing: 1.4, color: Semantic.textSecondary },
  kindRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  kindPill: { paddingHorizontal: 12, height: 36, borderRadius: 999, backgroundColor: 'rgba(15,23,42,0.06)', borderWidth: 1, borderColor: Semantic.border, justifyContent: 'center' },
  kindPillActive: { backgroundColor: 'rgba(255,230,0,0.30)', borderColor: 'rgba(255,230,0,0.85)' },
  kindPillT: { fontWeight: '900', color: '#0F172A' },
  kindPillTActive: { color: '#0F172A' },
  input: { marginTop: 8, height: 44, borderRadius: 14, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: Semantic.border, paddingHorizontal: 12, fontWeight: '800', color: '#0F172A' },
  cancelBtn: { flex: 1, height: 44, borderRadius: 14, backgroundColor: 'rgba(15,23,42,0.06)', borderWidth: 1, borderColor: Semantic.border, alignItems: 'center', justifyContent: 'center' },
  cancelBtnT: { fontWeight: '900', color: Semantic.textSecondary },
  createBtn: { flex: 1.4, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,230,0,0.98)', alignItems: 'center', justifyContent: 'center' },
  createBtnT: { fontWeight: '900', color: '#0F172A' },
});


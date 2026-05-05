import '@/components/leaflet-min.css';

import { useEffect, useMemo, useState } from 'react';
import { Alert, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter } from 'expo-router';
import { SOMAHOZ_BBOX, vbToLatLon } from '@/lib/somahoz-geo';
import { SOMAHOZ_YELLOW_MARKERS } from '@/lib/somahoz-yellow-markers';
import { loadYellowMarkerPositions, resetYellowMarkerPositions, saveYellowMarkerPositions } from '@/lib/mapa-yellow-store';
import { loadCustomMarkers, removeCustomMarker, saveCustomMarkers, type CustomMarker, type CustomMarkerKind } from '@/lib/mapa-custom-markers-store';
import L from 'leaflet';
import { MapContainer, Marker, TileLayer } from 'react-leaflet';

/** Fuera de `app/` para no registrar ruta en Expo Router. Carga con `import()` desde `numeros-editor.web.tsx`. */
export default function NumerosEditorLeafletWeb() {
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
    loadCustomMarkers()
      .then((all) => setCustom(Array.isArray(all) ? all : []))
      .catch(() => setCustom([]));
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
    await saveCustomMarkers(custom.map((m) => ({ ...m, updatedAt: Date.now() })));
    setDirty(false);
    router.back();
  };

  const reset = async () => {
    await resetYellowMarkerPositions();
    setPos({});
    setDirty(false);
  };

  const yellowIcon = (id: string) =>
    L.divIcon({
      className: '',
      html: `<div class="${String(id) === '5' ? 'cemn-green' : 'cemn-yellow'}">${id}</div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });

  const customIcon = (kind: string, label: string) => {
    const cls =
      kind === 'sepultura'
        ? 'cemn-green'
        : kind === 'columbario'
          ? 'cemn-blue'
          : kind === 'panteon'
            ? 'cemn-purple'
            : 'cemn-yellow';
    return L.divIcon({
      className: '',
      html: `<div class="${cls}">${String(label ?? '').slice(0, 3)}</div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });
  };

  return (
    <View style={s.screen}>
      <View style={s.top}>
        <TouchableOpacity style={s.iconBtn} onPress={() => router.back()} activeOpacity={0.9}>
          <FontAwesome name="times" size={18} color="#0F172A" />
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

          {custom.map((m) => (
            <Marker
              key={`cm-${m.id}`}
              position={[Number(m.latitude), Number(m.longitude)]}
              draggable
              icon={customIcon(m.kind, m.label)}
              eventHandlers={{
                dragend: (e: any) => {
                  const ll = e.target.getLatLng();
                  setDirty(true);
                  setCustom((prev) => prev.map((x) => (String(x.id) === String(m.id) ? { ...x, latitude: ll.lat, longitude: ll.lng } : x)));
                },
                click: async () => {
                  const ok = typeof window !== 'undefined' ? window.confirm(`¿Borrar marcador ${m.kind} ${m.label}?`) : false;
                  if (!ok) return;
                  const next = await removeCustomMarker(m.id);
                  setCustom(next);
                  setDirty(true);
                },
              }}
            />
          ))}
        </MapContainer>
      </View>

      <View style={s.hintBox} pointerEvents="none">
        <Text style={s.hintT}>Arrastra marcadores y pulsa GUARDAR. (Click en custom: borrar)</Text>
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
                    latitude: center[0],
                    longitude: center[1],
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
  screen: { flex: 1, backgroundColor: '#0B1220' },
  mapWrap: { flex: 1 },
  top: { position: 'absolute', top: 12, left: 12, right: 12, zIndex: 20, flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontWeight: '900', color: '#FFFFFF', textShadowColor: 'rgba(0,0,0,0.65)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 6 },
  addBtn: { height: 44, paddingHorizontal: 12, borderRadius: 999, backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', gap: 8 },
  addBtnT: { fontWeight: '900', color: '#0F172A' },
  resetBtn: { height: 44, paddingHorizontal: 12, borderRadius: 999, backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', gap: 8 },
  resetBtnT: { fontWeight: '900', color: '#0F172A' },
  primaryBtn: { height: 44, paddingHorizontal: 14, borderRadius: 999, backgroundColor: 'rgba(255,230,0,0.98)', flexDirection: 'row', alignItems: 'center', gap: 10 },
  primaryBtnT: { fontWeight: '900', color: '#0F172A', letterSpacing: 0.7 },
  hintBox: { position: 'absolute', left: 12, right: 12, bottom: 12, padding: 12, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.96)', borderWidth: 1, borderColor: 'rgba(15,23,42,0.14)' },
  hintT: { fontWeight: '900', color: 'rgba(15,23,42,0.70)' },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16, borderTopWidth: 1, borderColor: 'rgba(15,23,42,0.14)' },
  sheetTitle: { fontSize: 18, fontWeight: '900', color: '#0F172A' },
  sheetLabel: { marginTop: 10, fontSize: 11, fontWeight: '900', letterSpacing: 1.4, color: 'rgba(15,23,42,0.55)' },
  kindRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  kindPill: { paddingHorizontal: 12, height: 36, borderRadius: 999, backgroundColor: 'rgba(15,23,42,0.06)', borderWidth: 1, borderColor: 'rgba(15,23,42,0.14)', justifyContent: 'center' },
  kindPillActive: { backgroundColor: 'rgba(255,230,0,0.30)', borderColor: 'rgba(255,230,0,0.85)' },
  kindPillT: { fontWeight: '900', color: '#0F172A' },
  kindPillTActive: { color: '#0F172A' },
  input: { marginTop: 8, height: 44, borderRadius: 14, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: 'rgba(15,23,42,0.14)', paddingHorizontal: 12, fontWeight: '800', color: '#0F172A' },
  cancelBtn: { flex: 1, height: 44, borderRadius: 14, backgroundColor: 'rgba(15,23,42,0.06)', borderWidth: 1, borderColor: 'rgba(15,23,42,0.14)', alignItems: 'center', justifyContent: 'center' },
  cancelBtnT: { fontWeight: '900', color: 'rgba(15,23,42,0.70)' },
  createBtn: { flex: 1.4, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,230,0,0.98)', alignItems: 'center', justifyContent: 'center' },
  createBtnT: { fontWeight: '900', color: '#0F172A' },
});

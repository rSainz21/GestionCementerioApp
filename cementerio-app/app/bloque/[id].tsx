import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { NichoGrid } from '@/components/NichoGrid';
import { normalizarEstadoDb, normalizarEstadoEditable } from '@/lib/estado-sepultura';
import type { Bloque, EstadoSepultura, Sepultura } from '@/lib/types';
import { apiFetch } from '@/lib/laravel-api';
import { AppCard } from '@/components/ui';
import { AppSkeleton, Radius, Space } from '@/components/ui';
import { AppTopBar } from '@/components/ui';
import * as Location from 'expo-location';

export default function BloqueScreen() {
  const { id, crear, fila, columna } = useLocalSearchParams<{ id: string; crear?: string; fila?: string; columna?: string }>();
  const navigation = useNavigation();
  const router = useRouter();
  const [bloque, setBloque] = useState<Bloque | null>(null);
  const [sepulturas, setSepulturas] = useState<Sepultura[]>([]);
  const [loading, setLoading] = useState(true);

  const [crearOpen, setCrearOpen] = useState(false);
  const [crearFila, setCrearFila] = useState<number | null>(null);
  const [crearCol, setCrearCol] = useState<number | null>(null);
  const [crearCodigo, setCrearCodigo] = useState('');
  const [crearEstado, setCrearEstado] = useState<'libre' | 'reservada' | 'ocupada'>('libre');
  const [crearNotas, setCrearNotas] = useState('');
  const [crearGps, setCrearGps] = useState<{ lat: number; lon: number } | null>(null);
  const [crearGpsAcc, setCrearGpsAcc] = useState<number | null>(null);
  const [crearGpsTs, setCrearGpsTs] = useState<number | null>(null);
  const [crearSaving, setCrearSaving] = useState(false);
  const openedFromParamsRef = useRef<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);

    const rawId = (id ?? '').trim();
    const numericId = Number(rawId);
    const isNumericId = rawId !== '' && !Number.isNaN(numericId);

    const bloquesRes = await apiFetch<{ items?: any[] }>('/api/cementerio/bloques');
    let all: any[] = [];
    if (bloquesRes.ok) {
      all = (bloquesRes.data.items ?? []) as any[];
    } else {
      const catRes = await apiFetch<any>('/api/cementerio/catalogo');
      if (!catRes.ok) {
        console.error('[bloque] ', bloquesRes.error ?? catRes.error);
        setBloque(null);
        setSepulturas([]);
        setLoading(false);
        return;
      }
      const zonas = (catRes.data as any)?.zonas ?? [];
      const zById = new Map<number, any>(zonas.map((z: any) => [Number(z.id), z]));
      all = ((catRes.data as any)?.bloques ?? []).map((b: any) => ({
        ...b,
        zona_nombre: zById.get(Number(b.zona_id))?.nombre,
      }));
    }

    const b = (isNumericId ? all.find((x) => Number(x.id) === numericId) : all.find((x) => String(x.codigo) === rawId)) as any;
    if (!b) {
      setBloque(null);
      setSepulturas([]);
      setLoading(false);
      return;
    }
    setBloque(b);

    const sRes = await apiFetch<{ items: Sepultura[] }>(`/api/cementerio/bloques/${b.id}/sepulturas`);
    if (!sRes.ok) {
      console.error('[sepulturas] ', sRes.error);
      setSepulturas([]);
    } else {
      setSepulturas((sRes.data.items ?? []) as Sepultura[]);
    }

    navigation.setOptions({ title: `${b.codigo} — ${b.zona_nombre ?? ''}` });
    setLoading(false);
  }, [id, navigation]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const abrirCrear = useCallback(
    (pos: { fila: number; columna: number }) => {
      if (!bloque) return;
      setCrearFila(pos.fila);
      setCrearCol(pos.columna);
      setCrearCodigo(`${bloque.codigo}-F${pos.fila}-C${pos.columna}`);
      setCrearEstado('libre');
      setCrearNotas('');
      setCrearGps(null);
      setCrearGpsAcc(null);
      setCrearGpsTs(null);
      setCrearOpen(true);
    },
    [bloque]
  );

  useEffect(() => {
    if (!bloque) return;
    if (String(crear ?? '') !== '1') return;
    const f = Number(fila);
    const c = Number(columna);
    if (!Number.isFinite(f) || !Number.isFinite(c) || f <= 0 || c <= 0) return;
    const key = `${bloque.id}-${f}-${c}`;
    if (openedFromParamsRef.current === key) return;
    openedFromParamsRef.current = key;
    abrirCrear({ fila: f, columna: c });
  }, [abrirCrear, bloque, columna, crear, fila]);

  const capturarGpsCrear = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso GPS', 'Necesitamos permiso de ubicación para capturar coordenadas.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.BestForNavigation,
        mayShowUserSettingsDialog: true,
      });
      setCrearGpsAcc(pos.coords.accuracy ?? null);
      setCrearGps({ lat: pos.coords.latitude, lon: pos.coords.longitude });
      setCrearGpsTs(Date.now());
    } catch (e: any) {
      Alert.alert('GPS', e?.message ?? String(e));
    }
  }, []);

  const crearSepultura = useCallback(async () => {
    if (!bloque || !crearFila || !crearCol) return;
    try {
      setCrearSaving(true);
      const res = await apiFetch<any>('/api/cementerio/sepulturas', {
        method: 'POST',
        body: {
          zona_id: (bloque as any).zona_id ?? null,
          bloque_id: bloque.id,
          tipo: 'nicho',
          fila: crearFila,
          columna: crearCol,
          codigo: crearCodigo.trim() || null,
          estado: crearEstado,
          lat: crearGps?.lat ?? null,
          lon: crearGps?.lon ?? null,
          notas: crearNotas.trim() || null,
        },
      });
      if (!res.ok) throw new Error(typeof res.error === 'string' ? res.error : 'No se pudo crear la sepultura.');
      setCrearOpen(false);
      await fetchData();
      Alert.alert('Creada', 'Sepultura creada correctamente.');
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? String(e));
    } finally {
      setCrearSaving(false);
    }
  }, [bloque, crearCodigo, crearCol, crearEstado, crearFila, crearGps, crearNotas, fetchData]);

  const handlePress = useCallback((sep: Sepultura) => {
    router.push(`/sepultura/${sep.id}`);
  }, [router]);

  const handleLongPress = useCallback((sep: Sepultura) => {
    const actual = normalizarEstadoEditable(sep.estado);
    if (actual === 'libre') {
      const num = sep.numero ?? sep.id;
      Alert.alert(`Nicho ${sep.numero ?? sep.id} — Libre`, 'Toca el nicho para abrir la ficha. Más acciones:', [
        {
          text: 'Asignar difunto',
          onPress: () =>
            router.push(`/asignar-difunto?sepultura_id=${sep.id}&numero=${encodeURIComponent(String(num))}`),
        },
        { text: 'Ver ficha', onPress: () => router.push(`/sepultura/${sep.id}`) },
        {
          text: 'Marcar ocupada (sin difunto)',
          onPress: async () => {
            await apiFetch(`/api/cementerio/sepulturas/${sep.id}`, { method: 'PUT', body: { estado: 'ocupada' } });
            fetchData();
          },
        },
        { text: 'Cancelar', style: 'cancel' },
      ]);
      return;
    }
    const estados: EstadoSepultura[] = (['libre', 'ocupada'] as EstadoSepultura[]).filter((e) => e !== actual);
    Alert.alert(`Estado — N.º ${sep.numero}`, `Actual: ${actual}`, [
      ...estados.map((e) => ({
        text: e.charAt(0).toUpperCase() + e.slice(1),
        onPress: async () => {
          await apiFetch(`/api/cementerio/sepulturas/${sep.id}`, { method: 'PUT', body: { estado: e } });
          fetchData();
        },
      })),
      { text: 'Cancelar', style: 'cancel' as const },
    ]);
  }, [fetchData, router]);

  if (loading)
    return (
      <View style={{ flex: 1, backgroundColor: '#F3EFE6' }}>
        <View style={{ padding: 12 }}>
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: Radius.lg, borderWidth: 1, borderColor: 'rgba(15,23,42,0.10)', padding: Space.md }}>
            <AppSkeleton h={18} w={110} r={8} />
            <View style={{ height: 10 }} />
            <AppSkeleton h={12} w={260} r={8} />
            <View style={{ height: 12 }} />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <AppSkeleton h={26} w={110} r={999} />
              <AppSkeleton h={26} w={120} r={999} />
            </View>
          </View>
        </View>
        <View style={{ paddingHorizontal: 12 }}>
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: Radius.lg, borderWidth: 1, borderColor: 'rgba(15,23,42,0.10)', padding: Space.md }}>
            <AppSkeleton h={12} w={160} r={8} />
            <View style={{ height: 12 }} />
            <AppSkeleton h={260} w="100%" r={16} />
          </View>
        </View>
      </View>
    );
  if (!bloque) return <View style={s.center}><Text>No encontrado</Text></View>;

  const libre = sepulturas.filter((x) => normalizarEstadoDb(x.estado) === 'libre').length;
  const ocupada = sepulturas.filter((x) => normalizarEstadoDb(x.estado) === 'ocupada').length;

  return (
    <View style={{ flex: 1, backgroundColor: '#F3EFE6' }}>
      <ScrollView style={[s.container, { backgroundColor: '#F3EFE6' }]}>
      <AppTopBar
        onBack={() => router.back()}
        overline={(bloque as any)?.zona_nombre ?? (bloque as any)?.zona?.nombre ?? '—'}
        title={`Bloque ${bloque.codigo}`}
        style={{ paddingTop: 12, paddingBottom: 8, backgroundColor: '#F3EFE6' }}
      />
      <View style={{ padding: 12, paddingBottom: 8, paddingTop: 0 }}>
        <AppCard>
          <Text style={[s.title, { fontSize: 18 }]}>{bloque.codigo}</Text>
          <Text style={s.sub}>{bloque.filas}×{bloque.columnas} · {sepulturas.length} nichos</Text>
          <View style={s.badges}>
            <View style={[s.badge, { backgroundColor: 'rgba(34,197,94,0.14)', borderColor: 'rgba(34,197,94,0.18)' }]}>
              <Text style={[s.badgeT, { color: '#166534' }]}>{libre} libres</Text>
            </View>
            <View style={[s.badge, { backgroundColor: 'rgba(239,68,68,0.14)', borderColor: 'rgba(239,68,68,0.18)' }]}>
              <Text style={[s.badgeT, { color: '#991B1B' }]}>{ocupada} ocupados</Text>
            </View>
          </View>

          <View style={s.hint}>
            <FontAwesome name="hand-pointer-o" size={14} color="#15803D" />
            <Text style={s.hintT}>Toca = ficha del nicho · Mantén pulsado = más acciones</Text>
          </View>
        </AppCard>
      </View>

      <NichoGrid
        sepulturas={sepulturas}
        filas={bloque.filas}
        columnas={bloque.columnas}
        onNichoPress={handlePress}
        onNichoLongPress={handleLongPress}
        onEmptyPress={abrirCrear}
      />
      <View style={{ height: 30 }} />

      <Modal visible={crearOpen} transparent animationType="slide" onRequestClose={() => setCrearOpen(false)}>
        <View style={s.createBackdrop}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setCrearOpen(false)} />
          <View style={s.createSheet}>
            <View style={s.handle} />
            <Text style={s.createOver}>CREAR SEPULTURA</Text>
            <Text style={s.createTitle}>Nuevo nicho</Text>
            <Text style={s.createSub} numberOfLines={1}>
              {bloque && crearFila && crearCol ? `En posición F${crearFila} · C${crearCol} del Bloque ${bloque.codigo}` : '—'}
            </Text>

            <Text style={s.createLabel}>Código identificador</Text>
            <TextInput
              style={s.createInput}
              value={crearCodigo}
              onChangeText={setCrearCodigo}
              placeholder="BA-F4-C7"
              placeholderTextColor="rgba(15,23,42,0.28)"
              autoCapitalize="characters"
              autoCorrect={false}
            />

            <Text style={s.createLabel}>Estado inicial</Text>
            <View style={s.estadoRow}>
              {([
                { k: 'libre', t: 'Libre' },
                { k: 'reservada', t: 'Reservada' },
                { k: 'ocupada', t: 'Ocupada' },
              ] as const).map((it) => {
                const active = crearEstado === it.k;
                return (
                  <TouchableOpacity key={it.k} style={[s.estadoP, active && s.estadoPActive]} onPress={() => setCrearEstado(it.k)} activeOpacity={0.9}>
                    <Text style={[s.estadoPT, active && s.estadoPTActive]}>{it.t}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={s.createLabel}>Capturar GPS</Text>
            <View style={s.gpsCard}>
              <View style={s.gpsIcon}>
                <FontAwesome name="map-marker" size={18} color="rgba(15,23,42,0.70)" />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.gpsLine} numberOfLines={1}>
                  {crearGps ? `${crearGps.lat.toFixed(6)}, ${crearGps.lon.toFixed(6)}` : '—'}
                </Text>
                <Text style={s.gpsSub} numberOfLines={1}>
                  {crearGpsAcc != null ? `Precisión ±${Math.round(crearGpsAcc)}m` : 'Precisión —'}
                  {crearGpsTs ? ` · captado hace ${Math.max(1, Math.round((Date.now() - crearGpsTs) / 60000))}m` : ''}
                </Text>
              </View>
              <TouchableOpacity onPress={capturarGpsCrear} style={s.gpsRefresh} activeOpacity={0.9}>
                <FontAwesome name="refresh" size={16} color="rgba(15,23,42,0.55)" />
              </TouchableOpacity>
            </View>

            <Text style={s.createLabel}>Observaciones</Text>
            <TextInput
              style={[s.createInput, { minHeight: 92 }]}
              value={crearNotas}
              onChangeText={setCrearNotas}
              placeholder="Notas opcionales…"
              placeholderTextColor="rgba(15,23,42,0.28)"
              multiline
              textAlignVertical="top"
            />

            <TouchableOpacity style={[s.createBtn, crearSaving && { opacity: 0.6 }]} onPress={crearSepultura} disabled={crearSaving} activeOpacity={0.9}>
              {crearSaving ? <ActivityIndicator color="#FFF" /> : <Text style={s.createBtnT}>Crear sepultura</Text>}
            </TouchableOpacity>

            <TouchableOpacity style={s.createCancel} onPress={() => setCrearOpen(false)} activeOpacity={0.85}>
              <Text style={s.createCancelT}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      </ScrollView>

      {/* Botón de pánico “Volver al Cielo” */}
      <TouchableOpacity
        style={s.panicBtn}
        onPress={() => router.push('/(tabs)/mapa')}
        activeOpacity={0.9}
      >
        <FontAwesome name="globe" size={18} color="#0F172A" />
        <Text style={s.panicBtnT}>VOLVER AL MAPA</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  title: { fontSize: 24, fontWeight: '900', color: '#0F172A' },
  sub: { marginTop: 6, fontSize: 12, fontWeight: '800', color: 'rgba(15,23,42,0.55)' },
  badges: { flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' },
  badge: { paddingHorizontal: 12, height: 28, borderRadius: 999, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  badgeT: { fontSize: 12, fontWeight: '900' },
  hint: { marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 14, backgroundColor: 'rgba(47,107,78,0.10)', borderWidth: 1, borderColor: 'rgba(47,107,78,0.14)' },
  hintT: { fontSize: 12, color: '#2F6B4E', fontWeight: '900' },

  panicBtn: {
    position: 'absolute',
    right: 14,
    bottom: 18,
    height: 58,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: 'rgba(255,230,0,0.95)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  panicBtnT: { fontWeight: '900', color: '#0F172A', letterSpacing: 0.6 },

  createBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  createSheet: { backgroundColor: '#F7F4EE', borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 16, paddingTop: 10, paddingBottom: Platform.OS === 'ios' ? 26 : 16 },
  handle: { width: 44, height: 5, borderRadius: 999, backgroundColor: 'rgba(15,23,42,0.18)', alignSelf: 'center', marginBottom: 10 },
  createOver: { fontSize: 11, fontWeight: '900', letterSpacing: 1.6, color: 'rgba(15,23,42,0.45)' },
  createTitle: { marginTop: 6, fontSize: 22, fontWeight: '900', color: '#0F172A' },
  createSub: { marginTop: 6, fontSize: 12, fontWeight: '800', color: 'rgba(15,23,42,0.55)' },
  createLabel: { marginTop: 14, fontSize: 12, fontWeight: '900', color: 'rgba(15,23,42,0.70)' },
  createInput: { marginTop: 8, minHeight: 46, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(15,23,42,0.10)', backgroundColor: '#FFFFFF', paddingHorizontal: 12, paddingVertical: 12, fontSize: 14, fontWeight: '700', color: '#0F172A' },
  estadoRow: { marginTop: 10, flexDirection: 'row', gap: 10 },
  estadoP: { flex: 1, height: 36, borderRadius: 999, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: 'rgba(15,23,42,0.10)', alignItems: 'center', justifyContent: 'center' },
  estadoPActive: { backgroundColor: 'rgba(47,63,53,0.10)', borderColor: 'rgba(47,63,53,0.45)' },
  estadoPT: { fontWeight: '900', color: 'rgba(15,23,42,0.65)', fontSize: 12 },
  estadoPTActive: { color: '#0F172A' },
  gpsCard: { marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 12, borderRadius: 16, backgroundColor: 'rgba(15,23,42,0.04)', borderWidth: 1, borderColor: 'rgba(15,23,42,0.08)' },
  gpsIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: 'rgba(15,23,42,0.10)', alignItems: 'center', justifyContent: 'center' },
  gpsLine: { fontWeight: '900', color: 'rgba(15,23,42,0.80)' },
  gpsSub: { marginTop: 4, fontWeight: '800', fontSize: 12, color: 'rgba(15,23,42,0.55)' },
  gpsRefresh: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: 'rgba(15,23,42,0.10)', alignItems: 'center', justifyContent: 'center' },
  createBtn: { marginTop: 14, height: 54, borderRadius: 999, backgroundColor: '#2F3F35', alignItems: 'center', justifyContent: 'center' },
  createBtnT: { color: '#FFFFFF', fontWeight: '900' },
  createCancel: { marginTop: 12, alignItems: 'center', justifyContent: 'center', paddingVertical: 10 },
  createCancelT: { fontWeight: '900', color: 'rgba(15,23,42,0.65)' },
});

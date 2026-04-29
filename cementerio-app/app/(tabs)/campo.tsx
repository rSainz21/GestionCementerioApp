import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import type { Bloque, Sepultura } from '@/lib/types';
import { etiquetaEstadoVisible, normalizarEstadoDb } from '@/lib/estado-sepultura';
import { NichoGrid } from '@/components/NichoGrid';
import { apiFetch } from '@/lib/laravel-api';
import { unwrapItem } from '@/lib/normalize';
import { AppButton, AppCard, AppPill } from '@/components/ui';
import * as Location from 'expo-location';
type SepListRow = Sepultura & { cemn_bloques?: { codigo: string } | null; cemn_zonas?: { nombre: string } | null };

function isNumeric(s: string) {
  return /^\d+$/.test(s.trim());
}

export default function CampoScreen() {
  const router = useRouter();
  const [selected, setSelected] = useState<SepListRow | null>(null);

  const [bloques, setBloques] = useState<(Bloque & { zona_nombre?: string })[]>([]);
  const [bloqueActivo, setBloqueActivo] = useState<number | null>(null);
  const [zonaActiva, setZonaActiva] = useState<number | 'todas'>('todas');
  const [sepulturasBloque, setSepulturasBloque] = useState<Sepultura[]>([]);
  const [loadingBloque, setLoadingBloque] = useState(false);

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

  const seleccionarSepultura = useCallback(async (sepulturaId: number) => {
    const res = await apiFetch<any>(`/api/cementerio/sepulturas/${sepulturaId}`);
    if (!res.ok) {
      Alert.alert('Error', String(res.error ?? 'No se pudo cargar la sepultura.'));
      return;
    }
    const it = unwrapItem<SepListRow>(res.data);
    if (it) setSelected(it);
  }, []);

  const labelSelected = useMemo(() => {
    if (!selected) return 'Ninguna sepultura seleccionada';
    const b = selected.cemn_bloques?.codigo ?? '—';
    const z = selected.cemn_zonas?.nombre ?? '—';
    const num = selected.numero ?? selected.id;
    return `${z} > ${b} > N.º ${num}`;
  }, [selected]);

  const fetchBloques = useCallback(async () => {
    // Backend del compañero suele tener /cementerio/bloques, pero mantenemos fallback a /cementerio/catalogo.
    const bloquesRes = await apiFetch<{ items?: any[] }>('/api/cementerio/bloques');
    let mapped: any[] = [];
    if (bloquesRes.ok) {
      mapped = (bloquesRes.data.items ?? []) as any[];
    } else {
      const catRes = await apiFetch<any>('/api/cementerio/catalogo');
      if (!catRes.ok) {
        Alert.alert('Error', String(bloquesRes.error ?? catRes.error ?? 'No se pudieron cargar bloques'));
        setBloques([]);
        return;
      }
      const zonas = (catRes.data as any)?.zonas ?? [];
      const zById = new Map<number, any>(zonas.map((z: any) => [Number(z.id), z]));
      mapped = ((catRes.data as any)?.bloques ?? []).map((b: any) => ({
        ...b,
        zona_nombre: zById.get(Number(b.zona_id))?.nombre,
      }));
    }

    setBloques(mapped);
    if (mapped.length > 0) setBloqueActivo((prev) => prev ?? mapped[0].id);
  }, []);

  const bloqueActivoObj = useMemo(() => bloques.find((b) => b.id === bloqueActivo) ?? null, [bloques, bloqueActivo]);

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

  const abrirCrear = useCallback(
    (pos: { fila: number; columna: number }) => {
      if (!bloqueActivoObj) return;
      // “Tiene sentido” crearlo dentro del bloque.
      router.push(`/bloque/${encodeURIComponent(String((bloqueActivoObj as any)?.codigo ?? bloqueActivoObj.id))}?crear=1&fila=${pos.fila}&columna=${pos.columna}`);
    },
    [bloqueActivoObj, router]
  );

  const crearSepultura = useCallback(async () => {
    if (!bloqueActivoObj || !crearFila || !crearCol) return;
    try {
      setCrearSaving(true);
      const res = await apiFetch<any>('/api/cementerio/sepulturas', {
        method: 'POST',
        body: {
          zona_id: (bloqueActivoObj as any).zona_id ?? null,
          bloque_id: bloqueActivoObj.id,
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
      // refrescar bloque
      setLoadingBloque(true);
      const r = await apiFetch<{ items: Sepultura[] }>(`/api/cementerio/bloques/${bloqueActivoObj.id}/sepulturas`);
      setLoadingBloque(false);
      if (r.ok) setSepulturasBloque((r.data.items ?? []) as Sepultura[]);
      Alert.alert('Creada', 'Sepultura creada correctamente.');
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? String(e));
    } finally {
      setCrearSaving(false);
    }
  }, [bloqueActivoObj, crearCodigo, crearCol, crearEstado, crearFila, crearGps, crearNotas]);

  const zonas = useMemo(() => {
    // Construimos lista de zonas desde los propios bloques (para no depender de catálogo si falla).
    const byId = new Map<number, { id: number; nombre: string }>();
    for (const b of bloques) {
      const zid = Number((b as any)?.zona_id);
      if (!Number.isFinite(zid)) continue;
      const nombre = String((b as any)?.zona_nombre ?? (b as any)?.zona?.nombre ?? `Zona ${zid}`);
      if (!byId.has(zid)) byId.set(zid, { id: zid, nombre });
    }
    return Array.from(byId.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [bloques]);

  const bloquesFiltrados = useMemo(() => {
    if (zonaActiva === 'todas') return bloques;
    return bloques.filter((b) => Number((b as any)?.zona_id) === Number(zonaActiva));
  }, [bloques, zonaActiva]);

  // Si cambiamos de zona, aseguramos bloque activo válido.
  useEffect(() => {
    if (bloquesFiltrados.length === 0) return;
    const exists = bloqueActivo != null && bloquesFiltrados.some((b) => b.id === bloqueActivo);
    if (!exists) setBloqueActivo(bloquesFiltrados[0].id);
  }, [bloqueActivo, bloquesFiltrados]);

  const fetchSepulturasBloque = useCallback(async (bid: number) => {
    setLoadingBloque(true);
    const res = await apiFetch<{ items: Sepultura[] }>(`/api/cementerio/bloques/${bid}/sepulturas`);
    setLoadingBloque(false);
    if (!res.ok) {
      Alert.alert('Error', String(res.error ?? 'No se pudieron cargar sepulturas'));
      setSepulturasBloque([]);
      return;
    }
    setSepulturasBloque((res.data.items ?? []) as Sepultura[]);
  }, []);

  const statsBloque = useMemo(() => {
    let libre = 0;
    let ocupada = 0;
    let reservada = 0;
    for (const s of sepulturasBloque) {
      const e = normalizarEstadoDb((s as any)?.estado);
      if (e === 'libre') libre++;
      else if (e === 'ocupada') ocupada++;
      else if (e === 'reservada') reservada++;
    }
    return { libre, ocupada, reservada, total: sepulturasBloque.length };
  }, [sepulturasBloque]);

  // refresco al volver (p.ej. después de registrar un suceso)
  useFocusEffect(
    useCallback(() => {
      if (!selected) return;
      apiFetch<any>(`/api/cementerio/sepulturas/${selected.id}`).then((r) => {
        if (r.ok && (r.data as any)?.item) setSelected((r.data as any).item as SepListRow);
      });
    }, [selected?.id])
  );

  useFocusEffect(
    useCallback(() => {
      fetchBloques();
    }, [fetchBloques])
  );

  useEffect(() => {
    if (!bloqueActivo) return;
    fetchSepulturasBloque(bloqueActivo);
  }, [bloqueActivo, fetchSepulturasBloque]);

  return (
    <View style={s.screen}>
      <View style={s.header}>
        <View style={s.headRow}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.h1}>Mapa de nichos</Text>
            <Text style={s.h2}>Somahoz · selecciona zona y bloque</Text>
          </View>
          <TouchableOpacity style={s.searchBtn} onPress={() => router.push('/buscar')} activeOpacity={0.85}>
            <FontAwesome name="search" size={16} color="#0F172A" />
          </TouchableOpacity>
        </View>

        <View style={s.statsRow}>
          <StatPill label="libres" value={statsBloque.libre} tone="ok" />
          <StatPill label="ocupadas" value={statsBloque.ocupada} tone="bad" />
          <StatPill label="reservadas" value={statsBloque.reservada} tone="warn" />
        </View>
      </View>

      <View style={{ flex: 1 }}>
        {/* ZONAS */}
        {zonas.length > 0 ? (
          <View style={s.zoneStrip}>
            <FlatList
              data={[{ id: 'todas', nombre: 'Todas' }, ...zonas] as any[]}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(z) => String(z.id)}
              contentContainerStyle={s.zoneStripContent}
              renderItem={({ item }) => {
                const active = zonaActiva === item.id || (item.id !== 'todas' && Number(zonaActiva) === Number(item.id));
                return (
                  <AppPill
                    label={String(item.nombre)}
                    active={active}
                    onPress={() => setZonaActiva(item.id === 'todas' ? 'todas' : Number(item.id))}
                    style={{ maxWidth: 240 }}
                  />
                );
              }}
            />
          </View>
        ) : null}

        <View style={s.blockStrip}>
          <FlatList
            data={bloquesFiltrados}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(b) => String(b.id)}
            contentContainerStyle={s.blockStripContent}
            renderItem={({ item }) => (
              <View style={s.blockItem}>
                <AppPill
                  label={item.codigo}
                  active={bloqueActivo === item.id}
                  onPress={() => setBloqueActivo(item.id)}
                />
                <Text style={s.blockMeta} numberOfLines={1}>
                  {(item as any).zona_nombre ?? (item as any).zona?.nombre ?? '—'} · {item.filas}×{item.columnas}
                </Text>
              </View>
            )}
          />
        </View>

        <View style={s.gridHead}>
          <Text style={s.gridTitle}>PLANO DEL BLOQUE</Text>
          <Text style={s.gridSub} numberOfLines={1}>
            {bloqueActivoObj ? `Bloque ${bloqueActivoObj.codigo} · ${bloqueActivoObj.filas}×${bloqueActivoObj.columnas} · ${statsBloque.total} unidades` : '—'}
          </Text>
        </View>

        {loadingBloque ? (
          <View style={s.center}>
            <ActivityIndicator size="large" color="#16A34A" />
            <Text style={s.loadingT}>Cargando sepulturas…</Text>
          </View>
        ) : (
          <NichoGrid
            sepulturas={sepulturasBloque}
            filas={bloqueActivoObj?.filas ?? 4}
            columnas={bloqueActivoObj?.columnas ?? 1}
            sentidoNumeracion={String((bloqueActivoObj as any)?.sentido_numeracion ?? '') || null}
            showToolbar={false}
            onNichoPress={(sep) => {
              seleccionarSepultura(sep.id);
              router.push(`/sepultura/${sep.id}`);
            }}
            onNichoDoublePress={(sep) => {
              seleccionarSepultura(sep.id);
              router.push(`/sepultura/${sep.id}`);
            }}
            onNichoLongPress={(sep) => {
              seleccionarSepultura(sep.id);
              router.push(`/exhumacion-traslado?sepultura_id=${sep.id}&numero=${encodeURIComponent(String(sep.numero ?? ''))}`);
            }}
            onEmptyPress={abrirCrear}
          />
        )}
      </View>

      {/* Crear sepultura se hace dentro de la pantalla del bloque */}

      {/* Barra inferior eliminada: acciones ya en tarjeta "Seleccionada" */}
    </View>
  );
}

function StatPill({ label, value, tone }: { label: string; value: number; tone: 'ok' | 'bad' | 'warn' }) {
  const bg = tone === 'ok' ? 'rgba(34,197,94,0.14)' : tone === 'bad' ? 'rgba(239,68,68,0.14)' : 'rgba(245,158,11,0.18)';
  const fg = tone === 'ok' ? '#166534' : tone === 'bad' ? '#B91C1C' : '#92400E';
  return (
    <View style={[s.statPill, { backgroundColor: bg }]}>
      <Text style={[s.statVal, { color: fg }]}>{value}</Text>
      <Text style={[s.statLab, { color: fg }]}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F3EFE6' },
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, backgroundColor: '#F3EFE6' },
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  h1: { fontSize: 22, fontWeight: '900', color: '#0F172A' },
  h2: { marginTop: 6, color: 'rgba(15,23,42,0.55)', fontWeight: '800' },
  searchBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: { marginTop: 12, flexDirection: 'row', gap: 10 },
  statPill: { flex: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 10, alignItems: 'center', justifyContent: 'center' },
  statVal: { fontSize: 14, fontWeight: '900' },
  statLab: { marginTop: 2, fontSize: 11, fontWeight: '900', textTransform: 'lowercase' },

  // (lista resultados eliminado)
  zoneStrip: { marginTop: 10 },
  zoneStripContent: { paddingHorizontal: 16, gap: 10 },

  blockStrip: { marginTop: 6 },
  blockStripContent: { paddingHorizontal: 16, paddingVertical: 8, gap: 10 },
  blockItem: { minWidth: 140, gap: 6 },
  blockMeta: { fontSize: 11, fontWeight: '800', color: 'rgba(15,23,42,0.45)' },
  gridHead: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 6 },
  gridTitle: { fontSize: 12, fontWeight: '900', letterSpacing: 1.6, color: 'rgba(15,23,42,0.45)' },
  gridSub: { marginTop: 4, fontSize: 12, fontWeight: '800', color: 'rgba(15,23,42,0.65)' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 24 },
  loadingT: { marginTop: 10, color: '#64748B', fontWeight: '800' },

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


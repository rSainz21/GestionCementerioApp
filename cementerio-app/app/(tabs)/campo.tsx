import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
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
import { etiquetaEstadoVisible, normalizarEstadoEditable } from '@/lib/estado-sepultura';
import { NichoGrid } from '@/components/NichoGrid';
import { apiFetch } from '@/lib/laravel-api';
type SepListRow = Sepultura & { cemn_bloques?: { codigo: string } | null; cemn_zonas?: { nombre: string } | null };

function isNumeric(s: string) {
  return /^\d+$/.test(s.trim());
}

export default function CampoScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<'buscar' | 'bloques'>('bloques');

  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<SepListRow[]>([]);
  const [selected, setSelected] = useState<SepListRow | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [bloques, setBloques] = useState<(Bloque & { zona_nombre?: string })[]>([]);
  const [bloqueActivo, setBloqueActivo] = useState<number | null>(null);
  const [sepulturasBloque, setSepulturasBloque] = useState<Sepultura[]>([]);
  const [loadingBloque, setLoadingBloque] = useState(false);

  const seleccionarSepultura = useCallback(async (sepulturaId: number) => {
    const res = await apiFetch<any>(`/api/cementerio/sepulturas/${sepulturaId}`);
    if (!res.ok) {
      Alert.alert('Error', String(res.error ?? 'No se pudo cargar la sepultura.'));
      return;
    }
    if ((res.data as any)?.item) setSelected((res.data as any).item as SepListRow);
  }, []);

  const labelSelected = useMemo(() => {
    if (!selected) return 'Ninguna sepultura seleccionada';
    const b = selected.cemn_bloques?.codigo ?? '—';
    const z = selected.cemn_zonas?.nombre ?? '—';
    const num = selected.numero ?? selected.id;
    return `${z} > ${b} > N.º ${num}`;
  }, [selected]);

  const buscar = useCallback(async (query: string) => {
    const t = query.trim();
    if (t.length < 2) {
      setRows([]);
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch<{ items: any[] }>(`/api/cementerio/sepulturas/search?q=${encodeURIComponent(t)}`);
      if (!res.ok) throw new Error(String(res.error ?? 'Error de búsqueda'));
      const mapped = (res.data.items ?? []).map((it) => ({
        ...it,
        cemn_bloques: it.bloque_codigo ? { codigo: it.bloque_codigo } : null,
        cemn_zonas: it.zona_nombre ? { nombre: it.zona_nombre } : null,
      }));
      setRows(mapped as SepListRow[]);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? String(e));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchBloques = useCallback(async () => {
    const bloquesRes = await apiFetch<{ items: any[] }>('/api/cementerio/bloques');
    if (!bloquesRes.ok) {
      Alert.alert('Error', String(bloquesRes.error ?? 'No se pudieron cargar bloques'));
      setBloques([]);
      return;
    }
    const mapped = (bloquesRes.data.items ?? []) as any[];
    setBloques(mapped);
    if (mapped.length > 0) setBloqueActivo((prev) => prev ?? mapped[0].id);
  }, []);

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

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => buscar(q), 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [q, buscar]);

  return (
    <View style={s.screen}>
      <View style={s.header}>
        <Text style={s.h1}>Campo</Text>
        <Text style={s.h2}>Elige nicho/columbario desde el bloque o busca por código/número.</Text>

        <View style={s.modeTabs}>
          <TouchableOpacity
            style={[s.modeTab, mode === 'bloques' && s.modeTabActive]}
            onPress={() => setMode('bloques')}
            activeOpacity={0.85}
          >
            <Text style={[s.modeTabT, mode === 'bloques' && s.modeTabTActive]}>Bloques</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.modeTab, mode === 'buscar' && s.modeTabActive]}
            onPress={() => setMode('buscar')}
            activeOpacity={0.85}
          >
            <Text style={[s.modeTabT, mode === 'buscar' && s.modeTabTActive]}>Buscar</Text>
          </TouchableOpacity>
        </View>

        <View style={s.searchRow}>
          <FontAwesome name="search" size={16} color="#64748B" />
          <TextInput
            style={s.search}
            value={q}
            onChangeText={setQ}
            placeholder="Ej: ZV-B8-N189, 189, B8…"
            placeholderTextColor="#94A3B8"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {q.length > 0 && (
            <TouchableOpacity onPress={() => setQ('')} style={s.clearBtn} hitSlop={10}>
              <FontAwesome name="times-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        <View style={s.selectedCard}>
          <Text style={s.selectedLabel}>Seleccionada</Text>
          <Text style={s.selectedText}>{labelSelected}</Text>
          {selected ? (
            <View style={s.selectedMetaRow}>
              <View style={s.badge}>
                <Text style={s.badgeT}>{etiquetaEstadoVisible(selected.estado).toUpperCase()}</Text>
              </View>
              <TouchableOpacity style={s.openFicha} onPress={() => router.push(`/sepultura/${selected.id}`)} activeOpacity={0.85}>
                <FontAwesome name="external-link" size={14} color="#15803D" />
                <Text style={s.openFichaT}>Abrir ficha</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      </View>

      {mode === 'buscar' ? (
        <>
          <View style={s.resultsHeader}>
            <Text style={s.resultsTitle}>Resultados</Text>
            {loading ? <ActivityIndicator color="#16A34A" /> : null}
          </View>

          <FlatList
            data={rows}
            keyExtractor={(it) => String(it.id)}
            contentContainerStyle={{ padding: 12, paddingBottom: 160 }}
            renderItem={({ item }) => {
              const b = item.cemn_bloques?.codigo ?? '—';
              const z = item.cemn_zonas?.nombre ?? '—';
              const num = item.numero ?? item.id;
              const estado = normalizarEstadoEditable(item.estado);
              return (
                <TouchableOpacity
                  style={[s.row, selected?.id === item.id && s.rowActive]}
                  onPress={() => setSelected(item)}
                  activeOpacity={0.85}
                >
                  <View style={[s.stateDot, { backgroundColor: estado === 'libre' ? '#22C55E' : '#EF4444' }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.rowTitle}>{b} · N.º {num}</Text>
                    <Text style={s.rowSub}>{z} · {item.codigo ?? 'Sin código'}</Text>
                  </View>
                  <FontAwesome name="chevron-right" size={16} color="#94A3B8" />
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View style={s.empty}>
                <Text style={s.emptyT}>Escribe al menos 2 caracteres para buscar.</Text>
              </View>
            }
          />
        </>
      ) : (
        <View style={{ flex: 1 }}>
          <View style={s.blockStrip}>
            <FlatList
              data={bloques}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(b) => String(b.id)}
              contentContainerStyle={s.blockStripContent}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[s.blockPill, bloqueActivo === item.id && s.blockPillActive]}
                  onPress={() => setBloqueActivo(item.id)}
                  activeOpacity={0.85}
                >
                  <Text style={[s.blockPillT, bloqueActivo === item.id && s.blockPillTActive]}>{item.codigo}</Text>
                </TouchableOpacity>
              )}
            />
          </View>

          {loadingBloque ? (
            <View style={s.center}>
              <ActivityIndicator size="large" color="#16A34A" />
              <Text style={s.loadingT}>Cargando sepulturas…</Text>
            </View>
          ) : (
            <NichoGrid
              sepulturas={sepulturasBloque}
              filas={bloques.find((b) => b.id === bloqueActivo)?.filas ?? 4}
              columnas={bloques.find((b) => b.id === bloqueActivo)?.columnas ?? 1}
              onNichoPress={(sep) => {
                // 1 toque: seleccionar (el botón NUEVO SUCESO ya queda listo)
                seleccionarSepultura(sep.id);
              }}
              onNichoDoublePress={(sep) => {
                // Doble toque: abrir ficha
                seleccionarSepultura(sep.id);
                router.push(`/sepultura/${sep.id}`);
              }}
              onNichoLongPress={(sep) => {
                seleccionarSepultura(sep.id);
                router.push(`/nuevo-suceso?sepultura_id=${sep.id}&numero=${encodeURIComponent(String(sep.numero ?? ''))}`);
              }}
            />
          )}
        </View>
      )}

      {/* Barra inferior cómoda: acciones rápidas + botón principal */}
      <View style={s.bottom}>
        <TouchableOpacity
          style={[s.quickBtn, !selected && { opacity: 0.5 }]}
          onPress={() => selected && router.push(`/sepultura/${selected.id}`)}
          disabled={!selected}
          activeOpacity={0.85}
        >
          <FontAwesome name="id-card-o" size={18} color="#15803D" />
          <Text style={s.quickBtnT}>Ficha</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.quickBtn, !selected && { opacity: 0.5 }]}
          onPress={() => selected && router.push(`/sepultura/${selected.id}`)}
          disabled={!selected}
          activeOpacity={0.85}
        >
          <FontAwesome name="bars" size={18} color="#15803D" />
          <Text style={s.quickBtnT}>Detalle</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.mainBtn, !selected && { opacity: 0.55 }]}
          onPress={() =>
            router.push(
              `/nuevo-suceso${
                selected
                  ? `?sepultura_id=${selected.id}&numero=${encodeURIComponent(String(selected.numero ?? ''))}`
                  : ''
              }`
            )
          }
          activeOpacity={0.9}
        >
          <FontAwesome name="flash" size={18} color="#fff" />
          <Text style={s.mainBtnT}>NUEVO SUCESO</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 12, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  h1: { fontSize: 22, fontWeight: '900', color: '#0F172A' },
  h2: { marginTop: 6, color: '#475569', fontWeight: '700' },
  modeTabs: { marginTop: 12, flexDirection: 'row', gap: 10 },
  modeTab: { flex: 1, height: 40, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  modeTabActive: { backgroundColor: '#15803D', borderColor: '#15803D' },
  modeTabT: { fontWeight: '900', color: '#334155' },
  modeTabTActive: { color: '#FFFFFF' },
  searchRow: { marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 14, paddingHorizontal: 12, height: 48 },
  search: { flex: 1, fontSize: 14, fontWeight: '700', color: '#0F172A' },
  clearBtn: { padding: 4 },
  selectedCard: { marginTop: 12, borderRadius: 16, padding: 12, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0' },
  selectedLabel: { fontSize: 12, fontWeight: '900', color: '#334155' },
  selectedText: { marginTop: 6, fontSize: 14, fontWeight: '900', color: '#0F172A' },
  selectedMetaRow: { marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
  badge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: '#DCFCE7', borderWidth: 1, borderColor: '#86EFAC' },
  badgeT: { fontSize: 12, fontWeight: '900', color: '#15803D' },
  openFicha: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 999, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0' },
  openFichaT: { fontSize: 12, fontWeight: '900', color: '#15803D' },
  resultsHeader: { paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  resultsTitle: { fontSize: 13, fontWeight: '900', color: '#334155' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 14, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 10 },
  rowActive: { borderColor: '#86EFAC', backgroundColor: '#ECFDF5' },
  stateDot: { width: 12, height: 12, borderRadius: 4 },
  rowTitle: { fontSize: 14, fontWeight: '900', color: '#0F172A' },
  rowSub: { marginTop: 3, fontSize: 12, fontWeight: '700', color: '#64748B' },
  empty: { padding: 20, alignItems: 'center' },
  emptyT: { color: '#94A3B8', fontWeight: '800' },
  blockStrip: { backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  blockStripContent: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  blockPill: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB' },
  blockPillActive: { backgroundColor: '#15803D', borderColor: '#15803D' },
  blockPillT: { fontSize: 15, fontWeight: '900', color: '#6B7280' },
  blockPillTActive: { color: '#FFFFFF' },
  loadingT: { marginTop: 10, color: '#64748B', fontWeight: '800' },
  bottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 26 : 14,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  quickBtn: {
    width: 76,
    height: 54,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  quickBtnT: { fontSize: 12, fontWeight: '900', color: '#0F172A' },
  mainBtn: {
    flex: 1,
    height: 54,
    borderRadius: 16,
    backgroundColor: '#15803D',
    borderWidth: 2,
    borderColor: '#86EFAC',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  mainBtnT: { color: '#fff', fontSize: 13, fontWeight: '900', letterSpacing: 0.9 },
});


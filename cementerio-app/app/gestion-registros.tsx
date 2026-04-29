import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { apiFetch } from '@/lib/laravel-api';
import { AppCard, AppPill } from '@/components/ui';

type Tab = 'difuntos' | 'terceros' | 'concesiones';

const TAB_LABELS: Record<Tab, string> = {
  difuntos: 'Difuntos',
  terceros: 'Terceros',
  concesiones: 'Concesiones',
};

export default function GestionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string }>();
  const initialTab = useMemo((): Tab => {
    const t = String(params.tab ?? '').toLowerCase();
    if (t === 'terceros' || t === 'titulares') return 'terceros';
    if (t === 'concesiones' || t === 'expedientes') return 'concesiones';
    return 'difuntos';
  }, [params.tab]);

  const [tab, setTab] = useState<Tab>(initialTab);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    const q = search.trim();
    const qParam = q.length >= 2 ? `&q=${encodeURIComponent(q)}` : '';
    let path = '';
    if (tab === 'difuntos') path = `/api/cementerio/difuntos?limit=150${qParam}`;
    else if (tab === 'terceros') path = `/api/cementerio/terceros?limit=150${qParam}`;
    else path = `/api/cementerio/concesiones?limit=150${qParam}`;

    const r = await apiFetch<{ items: any[] }>(path);
    setData(r.ok ? ((r.data as any)?.items ?? []) : []);
    setLoading(false);
  }, [tab, search]);

  useEffect(() => {
    const delay = search.trim().length >= 2 ? 280 : 0;
    const t = setTimeout(() => {
      void fetchData();
    }, delay);
    return () => clearTimeout(t);
  }, [tab, search, fetchData]);

  const filteredData = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return data;
    return data.filter((item) => {
      if (tab === 'difuntos') {
        return (
          String(item.nombre_completo ?? '').toLowerCase().includes(s) ||
          String(item.dni ?? '').toLowerCase().includes(s) ||
          String(item.sepultura_codigo ?? '').toLowerCase().includes(s) ||
          String(item.label ?? '').toLowerCase().includes(s)
        );
      }
      if (tab === 'terceros') {
        return (
          String(item.nombre ?? '').toLowerCase().includes(s) ||
          String(item.apellido1 ?? '').toLowerCase().includes(s) ||
          String(item.apellido2 ?? '').toLowerCase().includes(s) ||
          String(item.dni ?? '').toLowerCase().includes(s) ||
          String(item.label ?? '').toLowerCase().includes(s)
        );
      }
      return (
        String(item.numero_expediente ?? '').toLowerCase().includes(s) ||
        String(item.estado ?? '').toLowerCase().includes(s) ||
        String(item.concesionario ?? '').toLowerCase().includes(s) ||
        String(item.sepultura_codigo ?? '').toLowerCase().includes(s) ||
        String(item.label ?? '').toLowerCase().includes(s)
      );
    });
  }, [data, search, tab]);

  const eliminarConcesion = (id: number, label: string) => {
    Alert.alert('Eliminar concesión', `¿Eliminar "${label}"? Esta acción no se puede deshacer.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          const r = await apiFetch(`/api/cementerio/admin/concesiones/${id}`, { method: 'DELETE' });
          if (!r.ok) {
            Alert.alert('Error', typeof r.error === 'string' ? r.error : 'No se pudo eliminar.');
            return;
          }
          fetchData();
        },
      },
    ]);
  };

  const renderDifunto = ({ item }: { item: any }) => {
    const sid = Number(item.sepultura_id);
    const canOpen = Number.isFinite(sid) && sid > 0;
    const bloque = item.bloque_codigo ?? item.bloque_nombre ?? '—';
    const num = item.sepultura_numero ?? '—';
    return (
      <TouchableOpacity
        style={styles.rowWrap}
        onPress={() => canOpen && router.push(`/sepultura/${sid}`)}
        activeOpacity={canOpen ? 0.85 : 1}
        disabled={!canOpen}
      >
        <AppCard padded style={styles.rowCard}>
          <View style={styles.rowInner}>
            <View style={styles.iconCircle}>
              <FontAwesome name="user" size={16} color="#15803D" />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.rowTitle} numberOfLines={1}>
                {item.nombre_completo ?? '—'}
              </Text>
              <Text style={styles.rowSub} numberOfLines={2}>
                {canOpen ? `${bloque} · N.º ${num}` : 'Sin sepultura asignada'}
                {item.fecha_fallecimiento ? ` · ${item.fecha_fallecimiento}` : ''}
              </Text>
            </View>
            {canOpen ? <FontAwesome name="chevron-right" size={14} color="rgba(15,23,42,0.35)" /> : null}
          </View>
        </AppCard>
      </TouchableOpacity>
    );
  };

  const renderTercero = ({ item }: { item: any }) => (
    <AppCard padded style={styles.rowCard}>
      <View style={styles.rowInner}>
        <View style={styles.iconCircle}>
          <FontAwesome name="id-card" size={16} color="#15803D" />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.rowTitle} numberOfLines={1}>
            {[item.nombre, item.apellido1, item.apellido2].filter(Boolean).join(' ') || '—'}
          </Text>
          <Text style={styles.rowSub} numberOfLines={1}>
            {item.dni ?? 'Sin DNI'}
            {item.telefono ? ` · ${item.telefono}` : ''}
          </Text>
        </View>
      </View>
    </AppCard>
  );

  const renderConcesion = ({ item }: { item: any }) => {
    const sid = Number(item.sepultura_id);
    const canOpen = Number.isFinite(sid) && sid > 0;
    return (
      <TouchableOpacity
        style={styles.rowWrap}
        onPress={() => canOpen && router.push(`/sepultura/${sid}`)}
        activeOpacity={canOpen ? 0.85 : 1}
        disabled={!canOpen}
      >
        <AppCard padded style={styles.rowCard}>
          <View style={styles.rowInner}>
            <View style={styles.iconCircle}>
              <FontAwesome name="file-text-o" size={16} color="#15803D" />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.rowTitle} numberOfLines={1}>
                {item.numero_expediente ?? 'Sin expediente'}
              </Text>
              <Text style={styles.rowSub} numberOfLines={2}>
                {[item.tipo, item.estado].filter(Boolean).join(' · ')}
                {item.sepultura_codigo ? ` · ${item.sepultura_codigo}` : ''}
                {item.concesionario ? ` · ${item.concesionario}` : ''}
              </Text>
            </View>
            <View style={styles.rowActions}>
              <View style={[styles.badge, { backgroundColor: item.estado === 'vigente' ? '#DCFCE7' : '#FEF3C7' }]}>
                <Text style={[styles.badgeText, { color: item.estado === 'vigente' ? '#16A34A' : '#D97706' }]}>
                  {String(item.estado ?? '—')}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => eliminarConcesion(item.id, String(item.numero_expediente ?? item.id))}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                activeOpacity={0.85}
              >
                <FontAwesome name="trash-o" size={16} color="#EF4444" />
              </TouchableOpacity>
            </View>
          </View>
        </AppCard>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.85}>
          <FontAwesome name="chevron-left" size={16} color="#0F172A" />
        </TouchableOpacity>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.screenTitle}>Registros</Text>
          <Text style={styles.screenSub}>Listado rápido · toca una fila con sepultura para abrir la ficha</Text>
        </View>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/buscar')} activeOpacity={0.85}>
          <FontAwesome name="search" size={16} color="#0F172A" />
        </TouchableOpacity>
      </View>

      <View style={styles.tabs}>
        {(['difuntos', 'terceros', 'concesiones'] as Tab[]).map((t) => (
          <View key={t} style={{ flex: 1 }}>
            <AppPill label={TAB_LABELS[t]} active={tab === t} onPress={() => { setTab(t); setSearch(''); }} />
          </View>
        ))}
      </View>

      <View style={styles.searchBar}>
        <FontAwesome name="search" size={14} color="#9CA3AF" />
        <TextInput
          style={styles.searchInput}
          placeholder={tab === 'difuntos' ? 'Nombre o DNI (2+ letras para filtrar en servidor)…' : 'Buscar…'}
          value={search}
          onChangeText={setSearch}
          placeholderTextColor="#9CA3AF"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Text style={styles.countBadge}>{filteredData.length}</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#16A34A" />
          <Text style={styles.loadingT}>Cargando…</Text>
        </View>
      ) : (
        <FlatList
          data={filteredData}
          keyExtractor={(item) => String(item.id)}
          renderItem={tab === 'difuntos' ? renderDifunto : tab === 'terceros' ? renderTercero : renderConcesion}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <AppCard padded>
              <Text style={styles.emptyTitle}>Sin datos</Text>
              <Text style={styles.emptyText}>
                {search.trim().length > 0 && search.trim().length < 2
                  ? 'Escribe al menos 2 caracteres para buscar en el servidor, o deja vacío para ver el listado reciente.'
                  : `No hay ${TAB_LABELS[tab].toLowerCase()} que mostrar.`}
              </Text>
            </AppCard>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 },
  loadingT: { fontSize: 13, fontWeight: '800', color: 'rgba(15,23,42,0.55)' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#F8FAFC',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenTitle: { fontSize: 18, fontWeight: '900', color: '#0F172A' },
  screenSub: { marginTop: 2, fontSize: 11, fontWeight: '700', color: 'rgba(15,23,42,0.55)' },
  tabs: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 12,
    marginBottom: 8,
    backgroundColor: '#FFF',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.10)',
  },
  searchInput: { flex: 1, fontSize: 14, fontWeight: '700', color: '#0F172A' },
  countBadge: {
    fontSize: 12,
    color: 'rgba(15,23,42,0.55)',
    fontWeight: '900',
    backgroundColor: 'rgba(15,23,42,0.06)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  list: { paddingHorizontal: 12, paddingBottom: 24, gap: 10 },
  rowWrap: {},
  rowCard: { marginBottom: 0 },
  rowInner: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(21,128,61,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: { fontSize: 15, fontWeight: '900', color: '#0F172A' },
  rowSub: { fontSize: 12, fontWeight: '700', color: 'rgba(15,23,42,0.55)', marginTop: 4, lineHeight: 16 },
  rowActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 11, fontWeight: '800', textTransform: 'capitalize' },
  emptyTitle: { fontSize: 16, fontWeight: '900', color: '#0F172A' },
  emptyText: { marginTop: 8, fontSize: 13, fontWeight: '700', color: 'rgba(15,23,42,0.55)', lineHeight: 18 },
});

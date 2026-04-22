import { useEffect, useState } from 'react';
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
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { supabase } from '@/lib/supabase';

type Tab = 'difuntos' | 'terceros' | 'concesiones';

export default function GestionScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('difuntos');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchData = async () => {
    setLoading(true);
    if (tab === 'difuntos') {
      const { data: d } = await supabase
        .from('cemn_difuntos')
        .select('*, cemn_sepulturas(numero, codigo, cemn_bloques(codigo)), cemn_terceros(dni)')
        .order('id', { ascending: false })
        .limit(100);
      setData(d ?? []);
    } else if (tab === 'terceros') {
      const { data: t } = await supabase
        .from('cemn_terceros')
        .select('*')
        .order('id', { ascending: false })
        .limit(100);
      setData(t ?? []);
    } else {
      const { data: c } = await supabase
        .from('cemn_concesiones')
        .select('*, cemn_sepulturas(numero, codigo)')
        .order('id', { ascending: false })
        .limit(100);
      setData(c ?? []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [tab]);

  const filteredData = search.trim()
    ? data.filter((item) => {
        const s = search.toLowerCase();
        if (tab === 'difuntos') return item.nombre_completo?.toLowerCase().includes(s);
        if (tab === 'terceros') return (item.nombre + ' ' + (item.apellido1 ?? '') + ' ' + (item.dni ?? '')).toLowerCase().includes(s);
        return (item.numero_expediente ?? '').toLowerCase().includes(s);
      })
    : data;

  const eliminar = (id: number, tabla: string, nombre: string) => {
    Alert.alert('Eliminar', `¿Seguro que quieres eliminar "${nombre}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive',
        onPress: async () => {
          await supabase.from(tabla).delete().eq('id', id);
          fetchData();
        },
      },
    ]);
  };

  const renderDifunto = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.row}
      onPress={() => item.cemn_sepulturas && router.push(`/sepultura/${item.sepultura_id}`)}
    >
      <View style={styles.rowLeft}>
        <FontAwesome name="user" size={16} color="#15803D" />
        <View>
          <Text style={styles.rowTitle}>{item.nombre_completo}</Text>
          <Text style={styles.rowSub}>
            {item.cemn_sepulturas ? `${item.cemn_sepulturas.cemn_bloques?.codigo ?? ''} · N.º ${item.cemn_sepulturas.numero}` : 'Sin asignar'}
            {item.fecha_fallecimiento ? ` · ${item.fecha_fallecimiento}` : ''}
          </Text>
        </View>
      </View>
      <TouchableOpacity onPress={() => eliminar(item.id, 'cemn_difuntos', item.nombre_completo)}>
        <FontAwesome name="trash-o" size={16} color="#EF4444" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderTercero = ({ item }: { item: any }) => (
    <View style={styles.row}>
      <View style={styles.rowLeft}>
        <FontAwesome name="id-card" size={16} color="#15803D" />
        <View>
          <Text style={styles.rowTitle}>{item.nombre} {item.apellido1 ?? ''} {item.apellido2 ?? ''}</Text>
          <Text style={styles.rowSub}>{item.dni ?? 'Sin DNI'}</Text>
        </View>
      </View>
      <TouchableOpacity onPress={() => eliminar(item.id, 'cemn_terceros', item.nombre)}>
        <FontAwesome name="trash-o" size={16} color="#EF4444" />
      </TouchableOpacity>
    </View>
  );

  const renderConcesion = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.row}
      onPress={() => router.push(`/sepultura/${item.sepultura_id}`)}
    >
      <View style={styles.rowLeft}>
        <FontAwesome name="file-text-o" size={16} color="#15803D" />
        <View>
          <Text style={styles.rowTitle}>{item.numero_expediente ?? 'Sin expediente'}</Text>
          <Text style={styles.rowSub}>
            {item.tipo} · {item.estado} · N.º {item.cemn_sepulturas?.numero ?? '?'}
          </Text>
        </View>
      </View>
      <View style={[styles.badge, { backgroundColor: item.estado === 'vigente' ? '#DCFCE7' : '#FEF3C7' }]}>
        <Text style={[styles.badgeText, { color: item.estado === 'vigente' ? '#16A34A' : '#D97706' }]}>{item.estado}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        {(['difuntos', 'terceros', 'concesiones'] as Tab[]).map((t) => (
          <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => { setTab(t); setSearch(''); }}>
            <FontAwesome
              name={t === 'difuntos' ? 'users' : t === 'terceros' ? 'id-card' : 'file-text'}
              size={14}
              color={tab === t ? '#FFF' : '#6B7280'}
            />
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.searchBar}>
        <FontAwesome name="search" size={14} color="#9CA3AF" />
        <TextInput
          style={styles.searchInput}
          placeholder={`Buscar ${tab}...`}
          value={search}
          onChangeText={setSearch}
          placeholderTextColor="#9CA3AF"
        />
        <Text style={styles.countBadge}>{filteredData.length}</Text>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#16A34A" /></View>
      ) : (
        <FlatList
          data={filteredData}
          keyExtractor={(item) => String(item.id)}
          renderItem={tab === 'difuntos' ? renderDifunto : tab === 'terceros' ? renderTercero : renderConcesion}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>No hay {tab} registrados</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tabs: { flexDirection: 'row', padding: 12, gap: 8, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, borderRadius: 8, backgroundColor: '#F3F4F6' },
  tabActive: { backgroundColor: '#15803D' },
  tabText: { fontSize: 12, fontWeight: '600', color: '#6B7280', textTransform: 'capitalize' },
  tabTextActive: { color: '#FFF' },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginTop: 12, backgroundColor: '#FFF', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  searchInput: { flex: 1, fontSize: 14, color: '#1F2937' },
  countBadge: { fontSize: 12, color: '#9CA3AF', fontWeight: '600', backgroundColor: '#F3F4F6', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  list: { padding: 16, gap: 6 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 10, padding: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  rowTitle: { fontSize: 15, fontWeight: '600', color: '#1F2937' },
  rowSub: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  empty: { textAlign: 'center', color: '#9CA3AF', fontSize: 14, marginTop: 40, textTransform: 'capitalize' },
});

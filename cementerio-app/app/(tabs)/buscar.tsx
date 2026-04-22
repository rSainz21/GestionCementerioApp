import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { colorParaEstadoSepultura, etiquetaEstadoVisible } from '@/lib/estado-sepultura';
import type { Difunto } from '@/lib/types';
import { apiFetch } from '@/lib/laravel-api';

interface ResultadoBusqueda {
  difunto: Difunto;
  sepultura_codigo: string | null;
  bloque_codigo: string | null;
  zona_nombre: string | null;
  fila: number | null;
  columna: number | null;
  estado: string;
  sepultura_id: number | null;
}

export default function BuscarScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [resultados, setResultados] = useState<ResultadoBusqueda[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const buscar = useCallback(async () => {
    if (query.trim().length < 2) return;
    setLoading(true);
    setSearched(true);

    const r = await apiFetch<{ items: any[] }>(`/api/cementerio/difuntos?q=${encodeURIComponent(query.trim())}`);
    const raw = r.ok ? (r.data.items ?? []) : [];
    const mapped: ResultadoBusqueda[] = raw.map((d: any) => ({
      difunto: d,
      sepultura_codigo: d.sepultura_codigo ?? null,
      bloque_codigo: d.bloque_codigo ?? null,
      zona_nombre: d.zona_nombre ?? null,
      fila: d.fila ?? null,
      columna: d.columna ?? null,
      estado: d.estado ?? 'libre',
      sepultura_id: d.sepultura_id ?? null,
    }));

    setResultados(mapped);
    setLoading(false);
  }, [query]);

  const renderItem = ({ item }: { item: ResultadoBusqueda }) => (
    <TouchableOpacity
      style={styles.resultCard}
      onPress={() => item.sepultura_id && router.push(`/sepultura/${item.sepultura_id}`)}
      activeOpacity={0.7}
    >
      <View style={styles.resultHeader}>
        <FontAwesome name="user" size={16} color="#6B7280" />
        <Text style={styles.resultName} numberOfLines={1}>
          {item.difunto.nombre_completo}
        </Text>
        <View style={[styles.badge, { backgroundColor: colorParaEstadoSepultura(item.estado) }]}>
          <Text style={styles.badgeText}>{etiquetaEstadoVisible(item.estado)}</Text>
        </View>
      </View>

      <View style={styles.resultDetails}>
        {item.zona_nombre && (
          <Text style={styles.detailText}>
            {item.zona_nombre} &gt; {item.bloque_codigo}
          </Text>
        )}
        {item.fila != null && item.columna != null && (
          <Text style={styles.locationText}>
            Fila {item.fila} · Columna {item.columna}
          </Text>
        )}
        {item.sepultura_codigo && (
          <Text style={styles.codeText}>{item.sepultura_codigo}</Text>
        )}
      </View>

      {item.difunto.fecha_fallecimiento && (
        <Text style={styles.dateText}>
          Fallecido: {item.difunto.fecha_fallecimiento}
        </Text>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <FontAwesome name="search" size={16} color="#9CA3AF" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Nombre del difunto o DNI del titular..."
            placeholderTextColor="#9CA3AF"
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={buscar}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => { setQuery(''); setResultados([]); setSearched(false); }}>
              <FontAwesome name="times-circle" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={styles.searchButton} onPress={buscar}>
          <Text style={styles.searchButtonText}>Buscar</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#16A34A" />
        </View>
      ) : searched && resultados.length === 0 ? (
        <View style={styles.center}>
          <FontAwesome name="search" size={40} color="#D1D5DB" />
          <Text style={styles.noResults}>Sin resultados para "{query}"</Text>
        </View>
      ) : !searched ? (
        <View style={styles.center}>
          <FontAwesome name="search" size={48} color="#E5E7EB" />
          <Text style={styles.hint}>
            Busca por nombre del difunto{'\n'}o DNI del titular de la concesión
          </Text>
        </View>
      ) : (
        <FlatList
          data={resultados}
          keyExtractor={(item) => String(item.difunto.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <Text style={styles.resultCount}>
              {resultados.length} resultado{resultados.length !== 1 ? 's' : ''}
            </Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1F2937',
  },
  searchButton: {
    backgroundColor: '#16A34A',
    borderRadius: 12,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  searchButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  hint: {
    marginTop: 16,
    fontSize: 15,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 22,
  },
  noResults: {
    marginTop: 16,
    fontSize: 15,
    color: '#6B7280',
  },
  resultCount: {
    fontSize: 13,
    color: '#9CA3AF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontWeight: '600',
  },
  list: {
    paddingBottom: 24,
  },
  resultCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  resultName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  resultDetails: {
    gap: 2,
  },
  detailText: {
    fontSize: 13,
    color: '#6B7280',
  },
  locationText: {
    fontSize: 13,
    color: '#15803D',
    fontWeight: '600',
  },
  codeText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontFamily: 'SpaceMono',
  },
  dateText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 6,
  },
});

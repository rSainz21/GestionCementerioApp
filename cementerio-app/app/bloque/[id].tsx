import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { NichoGrid } from '@/components/NichoGrid';
import { normalizarEstadoEditable } from '@/lib/estado-sepultura';
import type { Bloque, EstadoSepultura, Sepultura } from '@/lib/types';
import { apiFetch } from '@/lib/laravel-api';

export default function BloqueScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const router = useRouter();
  const [bloque, setBloque] = useState<Bloque | null>(null);
  const [sepulturas, setSepulturas] = useState<Sepultura[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);

    const rawId = (id ?? '').trim();
    const numericId = Number(rawId);
    const isNumericId = rawId !== '' && !Number.isNaN(numericId);

    const bloquesRes = await apiFetch<{ items: any[] }>('/api/cementerio/bloques');
    if (!bloquesRes.ok) {
      console.error('[bloque] ', bloquesRes.error);
      setBloque(null);
      setSepulturas([]);
      setLoading(false);
      return;
    }

    const all = (bloquesRes.data.items ?? []) as any[];
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

  const handlePress = useCallback((sep: Sepultura) => {
    if (normalizarEstadoEditable(sep.estado) === 'libre') {
      const num = sep.numero ?? sep.id;
      router.push(
        `/asignar-difunto?sepultura_id=${sep.id}&numero=${encodeURIComponent(String(num))}`
      );
      return;
    }
    router.push(`/sepultura/${sep.id}`);
  }, [router]);

  const handleLongPress = useCallback((sep: Sepultura) => {
    const actual = normalizarEstadoEditable(sep.estado);
    if (actual === 'libre') {
      Alert.alert(`Nicho ${sep.numero ?? sep.id} — Libre`, 'Pulsación corta = asignar difunto. Otras acciones:', [
        { text: 'Ver ficha vacía', onPress: () => router.push(`/sepultura/${sep.id}`) },
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

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color="#16A34A" /></View>;
  if (!bloque) return <View style={s.center}><Text>No encontrado</Text></View>;

  const libre = sepulturas.filter((x) => normalizarEstadoEditable(x.estado) === 'libre').length;
  const ocupada = sepulturas.length - libre;

  return (
    <ScrollView style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>{bloque.codigo}</Text>
        <Text style={s.sub}>{bloque.filas}×{bloque.columnas} · {sepulturas.length} nichos</Text>
        <View style={s.badges}>
          <View style={[s.badge, { backgroundColor: '#DCFCE7' }]}><Text style={[s.badgeT, { color: '#16A34A' }]}>{libre} libres</Text></View>
          <View style={[s.badge, { backgroundColor: '#FEE2E2' }]}><Text style={[s.badgeT, { color: '#DC2626' }]}>{ocupada} ocupados</Text></View>
        </View>
      </View>
      <View style={s.hint}>
        <FontAwesome name="hand-pointer-o" size={14} color="#15803D" />
        <Text style={s.hintT}>Toca = ficha · Mantén pulsado = cambiar estado</Text>
      </View>
      <NichoGrid sepulturas={sepulturas} filas={bloque.filas} columnas={bloque.columnas} onNichoPress={handlePress} onNichoLongPress={handleLongPress} />
      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  header: { backgroundColor: '#FFF', padding: 20, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  title: { fontSize: 28, fontWeight: '800', color: '#15803D' },
  sub: { fontSize: 15, color: '#6B7280', marginTop: 4 },
  badges: { flexDirection: 'row', gap: 8, marginTop: 10 },
  badge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8 },
  badgeT: { fontSize: 14, fontWeight: '700' },
  hint: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#EFF6FF' },
  hintT: { fontSize: 13, color: '#15803D', fontWeight: '500' },
});

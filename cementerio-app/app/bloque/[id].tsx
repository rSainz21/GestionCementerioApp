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
import { supabase } from '@/lib/supabase';
import { normalizarEstadoEditable } from '@/lib/estado-sepultura';
import type { Bloque, EstadoSepultura, Sepultura } from '@/lib/types';

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

    const bRes = isNumericId
      ? await supabase.from('cemn_bloques').select('*, cemn_zonas(nombre)').eq('id', numericId).single()
      : await supabase.from('cemn_bloques').select('*, cemn_zonas(nombre)').eq('codigo', rawId).single();

    if (bRes.error) {
      console.error('[bloque] ', bRes.error);
      setBloque(null);
      setSepulturas([]);
      setLoading(false);
      return;
    }

    const b = bRes.data as any as Bloque;
    setBloque(b);

    const sRes = await supabase
      .from('cemn_sepulturas')
      .select('*')
      .eq('bloque_id', b.id)
      .order('columna')
      .order('fila');

    if (sRes.error) {
      console.error('[sepulturas] ', sRes.error);
      setSepulturas([]);
    } else {
      setSepulturas((sRes.data ?? []) as Sepultura[]);
    }

    navigation.setOptions({ title: `${b.codigo} — ${(b as any).cemn_zonas?.nombre ?? ''}` });
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
            await supabase.from('cemn_sepulturas').update({ estado: 'ocupada' }).eq('id', sep.id);
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
          await supabase.from('cemn_sepulturas').update({ estado: e }).eq('id', sep.id);
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

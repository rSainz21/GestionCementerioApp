import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/laravel-api';
import { AppButton, AppCard, AppInput } from '@/components/ui';

export default function HerenciaModal() {
  const router = useRouter();
  const { sepultura_id, numero } = useLocalSearchParams<{ sepultura_id?: string; numero?: string }>();
  const sepulturaId = Number(sepultura_id);
  const { user } = useAuth();

  const [dni, setDni] = useState('');
  const [nombre, setNombre] = useState('');
  const [apellido1, setApellido1] = useState('');
  const [apellido2, setApellido2] = useState('');

  const [concesionId, setConcesionId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const titulo = useMemo(
    () => `Herencia — ${numero ? `N.º ${numero}` : `ID ${sepulturaId}`}`,
    [numero, sepulturaId]
  );

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      if (!Number.isFinite(sepulturaId) || sepulturaId <= 0) {
        setLoading(false);
        return;
      }
      const r = await apiFetch<{ items?: any[] }>(`/api/cementerio/admin/concesiones?sepultura_id=${sepulturaId}&limit=1`);
      setLoading(false);
      if (!r.ok) {
        Alert.alert('Error', String(r.error ?? 'No se pudo cargar la concesión.'));
        return;
      }
      const row = (r.data.items ?? [])[0] ?? null;
      setConcesionId(row?.id ?? null);
    };
    run();
  }, [sepulturaId]);

  const guardar = async () => {
    try {
      if (!Number.isFinite(sepulturaId) || sepulturaId <= 0) throw new Error('sepultura_id no válido.');
      if (!user) throw new Error('Sin sesión: inicia sesión para guardar (RLS).');
      if (!concesionId) throw new Error('No hay concesión asociada a esta sepultura.');
      if (!nombre.trim()) throw new Error('Nombre (heredero) obligatorio.');

      setSaving(true);

      // 1) Buscar/crear tercero
      let terceroId: number | null = null;
      const tDni = dni.trim();
      if (tDni) {
        const ex = await apiFetch<{ items?: any[] }>(`/api/cementerio/terceros?q=${encodeURIComponent(tDni)}&limit=1`);
        terceroId = ex.ok ? ((ex.data.items ?? [])[0]?.id ?? null) : null;
      }

      if (!terceroId) {
        const ins = await apiFetch<any>('/api/cementerio/terceros', {
          method: 'POST',
          body: {
            dni: tDni || null,
            nombre: nombre.trim(),
            apellido1: apellido1.trim() || null,
            apellido2: apellido2.trim() || null,
          },
        });
        if (!ins.ok) throw new Error(String(ins.error ?? 'No se pudo crear el heredero'));
        terceroId = (ins.data as any).id as number;
      }

      // 2) Vincular como heredero
      const link = await apiFetch(`/api/cementerio/concesiones/${concesionId}/terceros`, {
        method: 'POST',
        body: { tercero_id: terceroId, rol: 'heredero' },
      });
      if (!link.ok) throw new Error(String(link.error ?? 'No se pudo vincular el heredero'));

      Alert.alert('OK', 'Heredero añadido a la concesión.');
      router.back();
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={s.screen} contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
      <Text style={s.h1}>{titulo}</Text>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color="#16A34A" />
          <Text style={s.centerT}>Cargando concesión…</Text>
        </View>
      ) : (
        <AppCard style={s.card} padded>
          <View style={s.row}>
            <FontAwesome name={concesionId ? 'check-circle' : 'exclamation-triangle'} size={18} color={concesionId ? '#16A34A' : '#B45309'} />
            <Text style={s.cardT}>
              {concesionId ? `Concesión detectada (id ${concesionId})` : 'No hay concesión asociada'}
            </Text>
          </View>

          {!user && (
            <AppCard style={s.warnBox} padded>
              <Text style={s.warnText}>Sin sesión no se puede guardar.</Text>
              <AppButton label="Iniciar sesión" variant="primary" onPress={() => router.push('/login')} />
            </AppCard>
          )}

          <AppInput label="DNI (opcional)" value={dni} onChangeText={setDni} placeholder="12345678A" autoCapitalize="characters" />
          <AppInput label="Nombre *" value={nombre} onChangeText={setNombre} placeholder="Nombre" />
          <AppInput label="Apellido 1" value={apellido1} onChangeText={setApellido1} placeholder="Apellido 1" />
          <AppInput label="Apellido 2" value={apellido2} onChangeText={setApellido2} placeholder="Apellido 2" />
        </AppCard>
      )}

      <View style={s.bottom}>
        <View style={{ flex: 1 }}>
          <AppButton label="Cancelar" variant="ghost" onPress={() => router.back()} />
        </View>
        <View style={{ flex: 1 }}>
          <AppButton label="Guardar" variant="primary" onPress={guardar} loading={saving} disabled={!concesionId} />
        </View>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F8FAFC' },
  h1: { fontSize: 18, fontWeight: '900', color: '#0F172A' },
  center: { marginTop: 20, alignItems: 'center', gap: 10 },
  centerT: { color: '#64748B', fontWeight: '800' },
  card: { marginTop: 14, gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardT: { fontWeight: '900', color: '#0F172A' },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 14, paddingTop: 12, paddingBottom: Platform.OS === 'ios' ? 26 : 14, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E5E7EB', flexDirection: 'row', gap: 10 },
  warnBox: { marginTop: 8, backgroundColor: '#FFFBEB' },
  warnText: { fontSize: 13, color: '#92400E', fontWeight: '700' },
});


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

function fechaParaPostgres(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return null;
  const d = new Date(`${t}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : t;
}

export default function RenovarConcesionModal() {
  const router = useRouter();
  const { sepultura_id, numero } = useLocalSearchParams<{ sepultura_id?: string; numero?: string }>();
  const sepulturaId = Number(sepultura_id);
  const { user } = useAuth();

  const [concesionId, setConcesionId] = useState<number | null>(null);
  const [fechaVenc, setFechaVenc] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const titulo = useMemo(
    () => `Renovar concesión — ${numero ? `N.º ${numero}` : `ID ${sepulturaId}`}`,
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
      const cid = row?.id ?? null;
      setConcesionId(cid);
      const fv = row?.fecha_vencimiento ?? '';
      if (fv && !fechaVenc) setFechaVenc(String(fv));
    };
    run();
  }, [sepulturaId]);

  const guardar = async () => {
    try {
      if (!user) throw new Error('Sin sesión: inicia sesión para guardar (RLS).');
      if (!concesionId) throw new Error('No hay concesión asociada a esta sepultura.');
      const venc = fechaParaPostgres(fechaVenc);
      if (!venc) throw new Error('Introduce una fecha de vencimiento (AAAA-MM-DD).');

      setSaving(true);
      const up = await apiFetch(`/api/cementerio/admin/concesiones/${concesionId}`, {
        method: 'PUT',
        body: { fecha_vencimiento: venc, estado: 'renovada' },
      });
      if (!up.ok) throw new Error(String(up.error ?? 'No se pudo renovar.'));

      Alert.alert('OK', 'Concesión renovada.');
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
          {!user && (
            <AppCard style={s.warnBox} padded>
              <Text style={s.warnText}>Sin sesión no se puede guardar.</Text>
              <AppButton label="Iniciar sesión" variant="primary" onPress={() => router.push('/login')} />
            </AppCard>
          )}

          <View style={s.row}>
            <FontAwesome name={concesionId ? 'check-circle' : 'exclamation-triangle'} size={18} color={concesionId ? '#16A34A' : '#B45309'} />
            <Text style={s.cardT}>{concesionId ? `Concesión detectada (id ${concesionId})` : 'No hay concesión asociada'}</Text>
          </View>

          <AppInput label="Nueva fecha de vencimiento *" value={fechaVenc} onChangeText={setFechaVenc} placeholder="2030-12-31" />
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


import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

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
      const res = await supabase
        .from('cemn_concesiones')
        .select('id, estado')
        .eq('sepultura_id', sepulturaId)
        .order('id', { ascending: false })
        .limit(1)
        .maybeSingle();
      setLoading(false);
      if (res.error) {
        Alert.alert('Error', res.error.message);
        return;
      }
      setConcesionId((res.data as any)?.id ?? null);
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
        const ex = await supabase.from('cemn_terceros').select('id').eq('dni', tDni).limit(1).maybeSingle();
        if (ex.error) throw ex.error;
        terceroId = (ex.data as any)?.id ?? null;
      }

      if (!terceroId) {
        const ins = await supabase
          .from('cemn_terceros')
          .insert({
            dni: tDni || null,
            nombre: nombre.trim(),
            apellido1: apellido1.trim() || null,
            apellido2: apellido2.trim() || null,
          })
          .select('id')
          .single();
        if (ins.error) throw ins.error;
        terceroId = (ins.data as any).id as number;
      }

      // 2) Vincular como heredero
      const link = await supabase
        .from('cemn_concesion_terceros')
        .insert({ concesion_id: concesionId, tercero_id: terceroId, rol: 'heredero' } as any);
      if (link.error) throw link.error;

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
        <View style={s.card}>
          <View style={s.row}>
            <FontAwesome name={concesionId ? 'check-circle' : 'exclamation-triangle'} size={18} color={concesionId ? '#16A34A' : '#B45309'} />
            <Text style={s.cardT}>
              {concesionId ? `Concesión detectada (id ${concesionId})` : 'No hay concesión asociada'}
            </Text>
          </View>

          {!user && (
            <View style={s.warnBox}>
              <Text style={s.warnText}>Sin sesión no se puede guardar en Supabase (RLS exige authenticated).</Text>
              <TouchableOpacity style={s.warnBtn} onPress={() => router.push('/login')} activeOpacity={0.85}>
                <Text style={s.warnBtnT}>Iniciar sesión</Text>
              </TouchableOpacity>
            </View>
          )}

          <Text style={s.label}>DNI (opcional)</Text>
          <TextInput style={s.input} value={dni} onChangeText={setDni} placeholder="12345678A" placeholderTextColor="#9CA3AF" autoCapitalize="characters" />

          <Text style={s.label}>Nombre *</Text>
          <TextInput style={s.input} value={nombre} onChangeText={setNombre} placeholder="Nombre" placeholderTextColor="#9CA3AF" />
          <Text style={s.label}>Apellido 1</Text>
          <TextInput style={s.input} value={apellido1} onChangeText={setApellido1} placeholder="Apellido 1" placeholderTextColor="#9CA3AF" />
          <Text style={s.label}>Apellido 2</Text>
          <TextInput style={s.input} value={apellido2} onChangeText={setApellido2} placeholder="Apellido 2" placeholderTextColor="#9CA3AF" />
        </View>
      )}

      <View style={s.bottom}>
        <TouchableOpacity style={[s.btn, s.ghost]} onPress={() => router.back()} activeOpacity={0.85}>
          <Text style={s.ghostT}>Cancelar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.btn, s.primary, (saving || !concesionId) && { opacity: 0.6 }]}
          onPress={guardar}
          disabled={saving || !concesionId}
          activeOpacity={0.85}
        >
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryT}>Guardar</Text>}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F8FAFC' },
  h1: { fontSize: 18, fontWeight: '900', color: '#0F172A' },
  center: { marginTop: 20, alignItems: 'center', gap: 10 },
  centerT: { color: '#64748B', fontWeight: '800' },
  card: { marginTop: 14, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#E5E7EB', gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardT: { fontWeight: '900', color: '#0F172A' },
  label: { marginTop: 10, fontSize: 12, fontWeight: '900', color: '#334155' },
  input: { marginTop: 8, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12, fontSize: 14, fontWeight: '700', color: '#111827', backgroundColor: '#FFF' },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 14, paddingTop: 12, paddingBottom: Platform.OS === 'ios' ? 26 : 14, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E5E7EB', flexDirection: 'row', gap: 10 },
  btn: { flex: 1, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  ghost: { backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0' },
  ghostT: { color: '#0F172A', fontWeight: '900' },
  primary: { backgroundColor: '#16A34A' },
  primaryT: { color: '#fff', fontWeight: '900' },
  warnBox: { marginTop: 8, backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#F59E0B', borderRadius: 12, padding: 12, gap: 10 },
  warnText: { fontSize: 13, color: '#92400E', fontWeight: '700' },
  warnBtn: { alignSelf: 'flex-start', backgroundColor: '#15803D', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  warnBtnT: { color: '#FFF', fontWeight: '900' },
});


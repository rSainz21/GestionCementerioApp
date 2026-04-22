import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
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

const TIPOS = ['temporal', 'perpetua'] as const;

function fechaParaPostgres(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return null;
  const d = new Date(`${t}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : t;
}

export default function VentaConcesionModal() {
  const router = useRouter();
  const { sepultura_id, numero } = useLocalSearchParams<{ sepultura_id?: string; numero?: string }>();
  const sepulturaId = Number(sepultura_id);
  const { user } = useAuth();

  const [dni, setDni] = useState('');
  const [nombre, setNombre] = useState('');
  const [apellido1, setApellido1] = useState('');
  const [apellido2, setApellido2] = useState('');

  const [expediente, setExpediente] = useState('');
  const [tipo, setTipo] = useState<(typeof TIPOS)[number]>('temporal');
  const [fechaVenc, setFechaVenc] = useState('');

  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [existingTerceroId, setExistingTerceroId] = useState<number | null>(null);
  const [searchQ, setSearchQ] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchRows, setSearchRows] = useState<any[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const titulo = useMemo(
    () => `Venta / Nueva concesión — ${numero ? `N.º ${numero}` : `ID ${sepulturaId}`}`,
    [numero, sepulturaId]
  );

  useEffect(() => {
    const run = async () => {
      setExistingTerceroId(null);
      const t = dni.trim();
      if (!t || t.length < 6) return;
      setChecking(true);
      const res = await supabase.from('cemn_terceros').select('id, nombre, apellido1, apellido2').eq('dni', t).limit(1).maybeSingle();
      setChecking(false);
      if (!res.error && res.data) {
        setExistingTerceroId((res.data as any).id as number);
        // autocompletar (sin machacar si ya escribió)
        if (!nombre.trim()) setNombre((res.data as any).nombre ?? '');
        if (!apellido1.trim()) setApellido1((res.data as any).apellido1 ?? '');
        if (!apellido2.trim()) setApellido2((res.data as any).apellido2 ?? '');
      }
    };
    run();
  }, [dni]);

  // Buscar titular existente por DNI/nombre/apellidos
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const q = searchQ.trim();
      if (q.length < 2) {
        setSearchRows([]);
        return;
      }
      setSearching(true);
      try {
        const res = await supabase
          .from('cemn_terceros')
          .select('id, dni, nombre, apellido1, apellido2')
          .or(
            `dni.ilike.%${q}%,nombre.ilike.%${q}%,apellido1.ilike.%${q}%,apellido2.ilike.%${q}%`
          )
          .limit(15);
        if (res.error) throw res.error;
        setSearchRows(res.data ?? []);
      } catch (e: any) {
        Alert.alert('Error', e?.message ?? String(e));
        setSearchRows([]);
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => debounceRef.current && clearTimeout(debounceRef.current);
  }, [searchQ]);

  const guardar = async () => {
    try {
      if (!Number.isFinite(sepulturaId) || sepulturaId <= 0) throw new Error('sepultura_id no válido.');
      if (!user) throw new Error('Sin sesión: inicia sesión para guardar (RLS).');
      if (!nombre.trim()) throw new Error('Nombre (titular) obligatorio.');

      const venc = fechaParaPostgres(fechaVenc);
      if (fechaVenc.trim() && venc === null) throw new Error('Fecha vencimiento no válida. Usa AAAA-MM-DD o vacío.');

      setSaving(true);

      let terceroId = existingTerceroId;
      if (!terceroId) {
        const insT = await supabase
          .from('cemn_terceros')
          .insert({
            dni: dni.trim() || null,
            nombre: nombre.trim(),
            apellido1: apellido1.trim() || null,
            apellido2: apellido2.trim() || null,
          })
          .select('id')
          .single();
        if (insT.error) throw insT.error;
        terceroId = (insT.data as any).id as number;
      }

      const insC = await supabase
        .from('cemn_concesiones')
        .insert({
          sepultura_id: sepulturaId,
          numero_expediente: expediente.trim() || null,
          tipo,
          estado: 'vigente',
          fecha_vencimiento: venc,
        } as any)
        .select('id')
        .single();
      if (insC.error) throw insC.error;
      const concesionId = (insC.data as any).id as number;

      // Vincular titular a concesión (si existe la tabla)
      const link = await supabase
        .from('cemn_concesion_terceros')
        .insert({ concesion_id: concesionId, tercero_id: terceroId, rol: 'concesionario' } as any);
      if (link.error) {
        const msg = (link.error.message ?? '').toLowerCase();
        const isMissing = msg.includes('relation') && msg.includes('does not exist');
        if (!isMissing) throw link.error;
      }

      Alert.alert('OK', 'Titular y concesión registrados.');
      router.back();
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={s.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
        <Text style={s.h1}>{titulo}</Text>
        {!user && (
          <View style={s.warnBox}>
            <Text style={s.warnText}>Sin sesión no se puede guardar en Supabase (RLS exige authenticated).</Text>
            <TouchableOpacity style={s.warnBtn} onPress={() => router.push('/login')} activeOpacity={0.85}>
              <Text style={s.warnBtnT}>Iniciar sesión</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={s.card}>
          <Text style={s.section}>Titular</Text>

          <Text style={s.label}>Buscar titular existente</Text>
          <View style={s.searchRow}>
            <FontAwesome name="search" size={16} color="#64748B" />
            <TextInput
              style={s.search}
              value={searchQ}
              onChangeText={setSearchQ}
              placeholder="DNI o nombre…"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searching ? <ActivityIndicator color="#16A34A" /> : null}
          </View>
          {searchRows.length > 0 ? (
            <FlatList
              data={searchRows}
              keyExtractor={(it) => String(it.id)}
              scrollEnabled={false}
              contentContainerStyle={{ gap: 8, marginTop: 10 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={s.searchItem}
                  activeOpacity={0.85}
                  onPress={() => {
                    setExistingTerceroId(item.id);
                    setDni(item.dni ?? '');
                    setNombre(item.nombre ?? '');
                    setApellido1(item.apellido1 ?? '');
                    setApellido2(item.apellido2 ?? '');
                    setSearchQ('');
                    setSearchRows([]);
                  }}
                >
                  <FontAwesome name="user" size={16} color="#15803D" />
                  <View style={{ flex: 1 }}>
                    <Text style={s.searchItemT} numberOfLines={1}>
                      {(item.nombre ?? '') + (item.apellido1 ? ` ${item.apellido1}` : '') + (item.apellido2 ? ` ${item.apellido2}` : '')}
                    </Text>
                    <Text style={s.searchItemSub} numberOfLines={1}>
                      DNI: {item.dni ?? '—'} · ID {item.id}
                    </Text>
                  </View>
                  <FontAwesome name="chevron-right" size={16} color="#94A3B8" />
                </TouchableOpacity>
              )}
            />
          ) : null}

          <Text style={s.label}>DNI (opcional)</Text>
          <TextInput style={s.input} value={dni} onChangeText={setDni} placeholder="12345678A" placeholderTextColor="#9CA3AF" autoCapitalize="characters" />
          {checking ? <Text style={s.hint}>Buscando titular…</Text> : existingTerceroId ? <Text style={s.hintOk}>Titular existente detectado (se reutiliza).</Text> : null}

          <Text style={s.label}>Nombre *</Text>
          <TextInput style={s.input} value={nombre} onChangeText={setNombre} placeholder="Nombre" placeholderTextColor="#9CA3AF" />
          <Text style={s.label}>Apellido 1</Text>
          <TextInput style={s.input} value={apellido1} onChangeText={setApellido1} placeholder="Apellido 1" placeholderTextColor="#9CA3AF" />
          <Text style={s.label}>Apellido 2</Text>
          <TextInput style={s.input} value={apellido2} onChangeText={setApellido2} placeholder="Apellido 2" placeholderTextColor="#9CA3AF" />
        </View>

        <View style={s.card}>
          <Text style={s.section}>Concesión</Text>
          <Text style={s.label}>N.º expediente (opcional)</Text>
          <TextInput style={s.input} value={expediente} onChangeText={setExpediente} placeholder="EXP-2026-0001" placeholderTextColor="#9CA3AF" autoCapitalize="characters" />

          <Text style={s.label}>Tipo</Text>
          <View style={s.row}>
            {TIPOS.map((t) => (
              <TouchableOpacity key={t} style={[s.pill, tipo === t && s.pillActive]} onPress={() => setTipo(t)} activeOpacity={0.85}>
                <Text style={[s.pillT, tipo === t && s.pillTActive]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={s.label}>Vencimiento (opcional, AAAA-MM-DD)</Text>
          <TextInput style={s.input} value={fechaVenc} onChangeText={setFechaVenc} placeholder="2030-12-31" placeholderTextColor="#9CA3AF" />
        </View>
      </ScrollView>

      <View style={s.bottom}>
        <TouchableOpacity style={[s.btn, s.ghost]} onPress={() => router.back()} activeOpacity={0.85}>
          <Text style={s.ghostT}>Cancelar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.btn, s.primary, saving && { opacity: 0.6 }]} onPress={guardar} disabled={saving} activeOpacity={0.85}>
          {saving ? <ActivityIndicator color="#fff" /> : (
            <>
              <FontAwesome name="check" size={16} color="#fff" />
              <Text style={s.primaryT}>Guardar</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F8FAFC' },
  h1: { fontSize: 18, fontWeight: '900', color: '#0F172A' },
  card: { marginTop: 14, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#E5E7EB' },
  section: { fontSize: 13, fontWeight: '900', color: '#334155', marginBottom: 8 },
  label: { marginTop: 10, fontSize: 12, fontWeight: '900', color: '#334155' },
  input: { marginTop: 8, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12, fontSize: 14, fontWeight: '700', color: '#111827', backgroundColor: '#FFF' },
  row: { flexDirection: 'row', gap: 10, marginTop: 10 },
  pill: { flex: 1, height: 42, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  pillActive: { backgroundColor: '#15803D', borderColor: '#15803D' },
  pillT: { fontWeight: '900', color: '#334155', textTransform: 'capitalize' },
  pillTActive: { color: '#FFFFFF' },
  hint: { marginTop: 8, color: '#64748B', fontWeight: '700' },
  hintOk: { marginTop: 8, color: '#15803D', fontWeight: '900' },
  searchRow: { marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 12, height: 48 },
  search: { flex: 1, fontSize: 14, fontWeight: '700', color: '#111827' },
  searchItem: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 12 },
  searchItemT: { fontSize: 14, fontWeight: '900', color: '#0F172A' },
  searchItemSub: { marginTop: 3, fontSize: 12, fontWeight: '700', color: '#64748B' },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 14, paddingTop: 12, paddingBottom: Platform.OS === 'ios' ? 26 : 14, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E5E7EB', flexDirection: 'row', gap: 10 },
  btn: { flex: 1, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10 },
  ghost: { backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0' },
  ghostT: { color: '#0F172A', fontWeight: '900' },
  primary: { backgroundColor: '#16A34A' },
  primaryT: { color: '#fff', fontWeight: '900' },
  warnBox: { marginTop: 12, backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#F59E0B', borderRadius: 12, padding: 12, gap: 10 },
  warnText: { fontSize: 13, color: '#92400E', fontWeight: '700' },
  warnBtn: { alignSelf: 'flex-start', backgroundColor: '#15803D', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  warnBtnT: { color: '#FFF', fontWeight: '900' },
});


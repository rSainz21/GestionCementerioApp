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
import { apiFetch } from '@/lib/laravel-api';
import { AppButton, AppCard, AppInput, AppPill } from '@/components/ui';

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
      const res = await apiFetch<{ items?: any[] }>(`/api/cementerio/terceros?q=${encodeURIComponent(t)}&limit=1`);
      setChecking(false);
      const row = res.ok ? (res.data.items ?? [])[0] : null;
      if (row) {
        setExistingTerceroId(row.id as number);
        // autocompletar (sin machacar si ya escribió)
        if (!nombre.trim()) setNombre(row.nombre ?? '');
        if (!apellido1.trim()) setApellido1(row.apellido1 ?? '');
        if (!apellido2.trim()) setApellido2(row.apellido2 ?? '');
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
        const res = await apiFetch<{ items?: any[] }>(`/api/cementerio/terceros?q=${encodeURIComponent(q)}&limit=15`);
        if (!res.ok) throw new Error(String(res.error ?? 'No se pudo buscar'));
        setSearchRows(res.data.items ?? []);
      } catch (e: any) {
        Alert.alert('Error', e?.message ?? String(e));
        setSearchRows([]);
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    };
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
        const insT = await apiFetch<any>('/api/cementerio/terceros', {
          method: 'POST',
          body: {
            dni: dni.trim() || null,
            nombre: nombre.trim(),
            apellido1: apellido1.trim() || null,
            apellido2: apellido2.trim() || null,
          },
        });
        if (!insT.ok) throw new Error(String(insT.error ?? 'No se pudo crear el titular'));
        terceroId = (insT.data as any).id as number;
      }

      const insC = await apiFetch<any>('/api/cementerio/admin/concesiones', {
        method: 'POST',
        body: {
          sepultura_id: sepulturaId,
          numero_expediente: expediente.trim() || null,
          tipo,
          estado: 'vigente',
          fecha_vencimiento: venc,
        },
      });
      if (!insC.ok) throw new Error(String(insC.error ?? 'No se pudo crear la concesión'));
      const created = (insC.data as any)?.item ?? (insC.data as any);
      const concesionId = (created as any).id as number;

      // Vincular titular a concesión (si existe la tabla)
      await apiFetch(`/api/cementerio/concesiones/${concesionId}/terceros`, {
        method: 'POST',
        body: { tercero_id: terceroId, rol: 'concesionario' },
      }).catch(() => null);

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
          <AppCard style={s.warnBox} padded>
            <Text style={s.warnText}>Sin sesión no se puede guardar.</Text>
            <AppButton label="Iniciar sesión" variant="primary" onPress={() => router.push('/login')} />
          </AppCard>
        )}

        <AppCard style={s.card} padded>
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

          <AppInput label="DNI (opcional)" value={dni} onChangeText={setDni} placeholder="12345678A" autoCapitalize="characters" />
          {checking ? <Text style={s.hint}>Buscando titular…</Text> : existingTerceroId ? <Text style={s.hintOk}>Titular existente detectado (se reutiliza).</Text> : null}

          <AppInput label="Nombre *" value={nombre} onChangeText={setNombre} placeholder="Nombre" />
          <AppInput label="Apellido 1" value={apellido1} onChangeText={setApellido1} placeholder="Apellido 1" />
          <AppInput label="Apellido 2" value={apellido2} onChangeText={setApellido2} placeholder="Apellido 2" />
        </AppCard>

        <AppCard style={s.card} padded>
          <Text style={s.section}>Concesión</Text>
          <AppInput label="N.º expediente (opcional)" value={expediente} onChangeText={setExpediente} placeholder="EXP-2026-0001" autoCapitalize="characters" />

          <Text style={s.label}>Tipo</Text>
          <View style={s.row}>
            {TIPOS.map((t) => (
              <AppPill key={t} label={t} active={tipo === t} onPress={() => setTipo(t)} style={{ flex: 1 }} />
            ))}
          </View>

          <AppInput label="Vencimiento (opcional, AAAA-MM-DD)" value={fechaVenc} onChangeText={setFechaVenc} placeholder="2030-12-31" />
        </AppCard>
      </ScrollView>

      <View style={s.bottom}>
        <View style={{ flex: 1 }}>
          <AppButton label="Cancelar" variant="ghost" onPress={() => router.back()} />
        </View>
        <View style={{ flex: 1 }}>
          <AppButton label="Guardar" variant="primary" onPress={guardar} loading={saving} />
        </View>
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


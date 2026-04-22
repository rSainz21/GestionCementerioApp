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
import type { Difunto } from '@/lib/types';
import { apiFetch } from '@/lib/laravel-api';

type Tipo = 'exhumacion' | 'traslado';

function hoyISO() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function ExhumacionTrasladoModal() {
  const router = useRouter();
  const { sepultura_id, numero } = useLocalSearchParams<{ sepultura_id?: string; numero?: string }>();
  const sepulturaId = Number(sepultura_id);

  const [loading, setLoading] = useState(true);
  const [difuntos, setDifuntos] = useState<Difunto[]>([]);
  const [difuntoId, setDifuntoId] = useState<number | null>(null);
  const [tipo, setTipo] = useState<Tipo>('exhumacion');
  const [fecha, setFecha] = useState(hoyISO());
  const [obs, setObs] = useState('');
  const [saving, setSaving] = useState(false);

  const difuntoSeleccionado = useMemo(
    () => difuntos.find((d) => d.id === difuntoId) ?? null,
    [difuntos, difuntoId]
  );

  useEffect(() => {
    const run = async () => {
      if (!Number.isFinite(sepulturaId) || sepulturaId <= 0) {
        setLoading(false);
        Alert.alert('Error', 'Falta `sepultura_id` válido.');
        return;
      }
      const r = await apiFetch<{ items: Difunto[] }>(`/api/cementerio/sepulturas/${sepulturaId}/difuntos`);
      if (!r.ok) {
        setLoading(false);
        Alert.alert('Error', String(r.error ?? 'No se pudieron cargar difuntos.'));
        return;
      }
      const rows = (r.data.items ?? []) as Difunto[];
      setDifuntos(rows);
      setDifuntoId(rows[0]?.id ?? null);
      setLoading(false);
    };
    run();
  }, [sepulturaId]);

  const guardar = async () => {
    try {
      if (!difuntoId) throw new Error('Selecciona un difunto.');
      if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
        throw new Error('La fecha debe tener formato AAAA-MM-DD.');
      }

      setSaving(true);

      const res = await apiFetch<{ ok: true; movimiento_id: number; restantes: number }>(
        '/api/cementerio/workflows/exhumacion',
        {
          method: 'POST',
          body: {
            sepultura_id: sepulturaId,
            difunto_id: difuntoId,
            tipo,
            fecha,
            notas: obs.trim() ? obs.trim() : null,
            sepultura_destino_id: null,
          },
        }
      );
      if (!res.ok) throw new Error(typeof res.error === 'string' ? res.error : 'No se pudo registrar el movimiento.');

      Alert.alert(
        'Movimiento registrado',
        `Se registró ${tipo.toUpperCase()}.\nDifuntos restantes: ${res.data.restantes ?? '—'}`
      );
      router.back();
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? String(e));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color="#16A34A" />
        <Text style={s.centerT}>Cargando difuntos…</Text>
      </View>
    );
  }

  return (
    <View style={s.screen}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
        <Text style={s.h1}>Exhumación / Traslado</Text>
        <Text style={s.sub}>
          Sepultura: {Number.isFinite(Number(numero)) ? `N.º ${numero}` : `ID ${sepulturaId}`}
        </Text>

        <View style={s.card}>
          <Text style={s.label}>Tipo</Text>
          <View style={s.row}>
            {(['exhumacion', 'traslado'] as Tipo[]).map((t) => (
              <TouchableOpacity
                key={t}
                style={[s.pill, tipo === t && s.pillActive]}
                onPress={() => setTipo(t)}
                activeOpacity={0.85}
              >
                <FontAwesome name={t === 'exhumacion' ? 'arrow-up' : 'exchange'} size={16} color={tipo === t ? '#15803D' : '#334155'} />
                <Text style={[s.pillT, tipo === t && s.pillTActive]}>{t.toUpperCase()}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={s.label}>Difunto</Text>
          {difuntos.length === 0 ? (
            <Text style={s.warn}>No hay difuntos vinculados a este nicho.</Text>
          ) : (
            <View style={{ gap: 10 }}>
              {difuntos.map((d) => (
                <TouchableOpacity
                  key={d.id}
                  style={[s.difItem, difuntoId === d.id && s.difItemActive]}
                  onPress={() => setDifuntoId(d.id)}
                  activeOpacity={0.85}
                >
                  <FontAwesome name={difuntoId === d.id ? 'check-circle' : 'circle-o'} size={18} color={difuntoId === d.id ? '#16A34A' : '#94A3B8'} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.difName}>{d.nombre_completo}</Text>
                    {d.fecha_fallecimiento ? <Text style={s.difSub}>Fallecido: {d.fecha_fallecimiento}</Text> : null}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Text style={s.label}>Fecha del movimiento (AAAA-MM-DD)</Text>
          <TextInput
            style={s.input}
            value={fecha}
            onChangeText={setFecha}
            placeholder="AAAA-MM-DD"
            placeholderTextColor="#9CA3AF"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default'}
          />

          <Text style={s.label}>Observaciones</Text>
          <TextInput
            style={[s.input, { minHeight: 90 }]}
            value={obs}
            onChangeText={setObs}
            placeholder="Ej: Traslado al Bloque B7 / autorización pendiente…"
            placeholderTextColor="#9CA3AF"
            multiline
            textAlignVertical="top"
          />

          {difuntoSeleccionado ? (
            <View style={s.summary}>
              <Text style={s.summaryT}>
                Se registrará {tipo.toUpperCase()} para:
              </Text>
              <Text style={s.summaryName}>{difuntoSeleccionado.nombre_completo}</Text>
              <Text style={s.summaryHint}>
                Si tras este suceso el nicho queda vacío, el sistema lo devolverá automáticamente a estado LIBRE.
              </Text>
            </View>
          ) : null}
        </View>
      </ScrollView>

      <View style={s.bottom}>
        <TouchableOpacity style={[s.btn, s.btnGhost]} onPress={() => router.back()} activeOpacity={0.85}>
          <Text style={s.btnGhostT}>Cancelar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.btn, s.btnPrimary, (saving || difuntos.length === 0) && { opacity: 0.6 }]}
          onPress={guardar}
          disabled={saving || difuntos.length === 0}
          activeOpacity={0.85}
        >
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.btnPrimaryT}>Guardar suceso</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F8FAFC' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#F8FAFC' },
  centerT: { color: '#64748B', fontWeight: '800' },
  h1: { fontSize: 22, fontWeight: '900', color: '#0F172A' },
  sub: { marginTop: 6, color: '#475569', fontWeight: '700' },
  card: {
    marginTop: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 10,
  },
  label: { marginTop: 6, fontSize: 12, fontWeight: '900', color: '#334155' },
  row: { flexDirection: 'row', gap: 10, marginTop: 8 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F1F5F9',
  },
  pillActive: { backgroundColor: '#DCFCE7', borderColor: '#86EFAC' },
  pillT: { fontSize: 12, fontWeight: '900', color: '#334155' },
  pillTActive: { color: '#15803D' },
  warn: { color: '#B45309', fontWeight: '800', marginTop: 4 },
  difItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  difItemActive: { backgroundColor: '#ECFDF5', borderColor: '#86EFAC' },
  difName: { fontWeight: '900', color: '#0F172A' },
  difSub: { marginTop: 2, color: '#64748B', fontWeight: '700', fontSize: 12 },
  input: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    backgroundColor: '#FFF',
  },
  summary: {
    marginTop: 10,
    borderRadius: 14,
    padding: 12,
    backgroundColor: '#0F172A',
  },
  summaryT: { color: '#E2E8F0', fontWeight: '900', fontSize: 12 },
  summaryName: { marginTop: 6, color: '#FFF', fontWeight: '900', fontSize: 14 },
  summaryHint: { marginTop: 8, color: '#CBD5E1', fontWeight: '700', fontSize: 12, lineHeight: 16 },
  bottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 26 : 14,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    flexDirection: 'row',
    gap: 10,
  },
  btn: { flex: 1, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  btnGhost: { backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0' },
  btnGhostT: { color: '#0F172A', fontWeight: '900' },
  btnPrimary: { backgroundColor: '#16A34A' },
  btnPrimaryT: { color: '#fff', fontWeight: '900' },
});


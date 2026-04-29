import { useCallback, useEffect, useMemo, useState } from 'react';
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
  Modal,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import type { Difunto } from '@/lib/types';
import { apiFetch } from '@/lib/laravel-api';

type Tipo = 'inhumacion' | 'exhumacion' | 'traslado' | 'reduccion';

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
  const [pickerOpen, setPickerOpen] = useState(false);

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

  const guardar = useCallback(async () => {
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
  }, [difuntoId, fecha, obs, router, sepulturaId, tipo]);

  const difuntoLabel = useMemo(() => {
    const d = difuntos.find((x) => x.id === difuntoId);
    return d?.nombre_completo ? String(d.nombre_completo) : 'Selecciona…';
  }, [difuntoId, difuntos]);

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
        <Text style={s.over}>ACTA DE MOVIMIENTO</Text>
        <Text style={s.h1}>Registrar movimiento</Text>

        <View style={s.card}>
          <Text style={s.label}>Tipo de movimiento</Text>
          <View style={s.grid2}>
            {([
              { k: 'inhumacion', t: 'Inhumación', icon: 'arrow-down' as const },
              { k: 'exhumacion', t: 'Exhumación', icon: 'arrow-up' as const },
              { k: 'traslado', t: 'Traslado', icon: 'random' as const },
              { k: 'reduccion', t: 'Reducción', icon: 'compress' as const },
            ] as const).map((it) => {
              const active = tipo === it.k;
              const disabled = it.k === 'inhumacion' || it.k === 'reduccion';
              return (
                <TouchableOpacity
                  key={it.k}
                  style={[s.tipoBtn, active && s.tipoBtnActive, disabled && { opacity: 0.45 }]}
                  onPress={() => {
                    if (disabled) {
                      Alert.alert('Próximamente', 'Este tipo de movimiento aún no está conectado.');
                      return;
                    }
                    setTipo(it.k);
                  }}
                  activeOpacity={0.9}
                >
                  <View style={[s.tipoIcon, active && s.tipoIconActive]}>
                    <FontAwesome name={it.icon} size={16} color={active ? '#2F3F35' : 'rgba(15,23,42,0.60)'} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[s.tipoT, active && s.tipoTActive]} numberOfLines={1}>
                      {it.t}
                    </Text>
                    {disabled ? <Text style={s.tipoSoon}>Próximamente</Text> : null}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={s.label}>Difunto</Text>
          <TouchableOpacity
            style={[s.select, difuntos.length === 0 && { opacity: 0.6 }]}
            onPress={() => (difuntos.length ? setPickerOpen(true) : null)}
            activeOpacity={0.9}
            disabled={difuntos.length === 0}
          >
            <Text style={s.selectT} numberOfLines={1}>
              {difuntoLabel}
            </Text>
            <FontAwesome name="chevron-down" size={16} color="rgba(15,23,42,0.40)" />
          </TouchableOpacity>

          <Text style={s.label}>Fecha</Text>
          <View style={s.dateRow}>
            <TextInput
              style={[s.input, { flex: 1, marginTop: 0 }]}
              value={fecha}
              onChangeText={setFecha}
              placeholder="AAAA-MM-DD"
              placeholderTextColor="rgba(15,23,42,0.28)"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default'}
            />
            <View style={s.calIcon}>
              <FontAwesome name="calendar" size={16} color="rgba(15,23,42,0.50)" />
            </View>
          </View>

          <Text style={s.label}>Descripción</Text>
          <TextInput
            style={[s.input, { minHeight: 90 }]}
            value={obs}
            onChangeText={setObs}
            placeholder="Detalles del acta…"
            placeholderTextColor="rgba(15,23,42,0.28)"
            multiline
            textAlignVertical="top"
          />
        </View>
      </ScrollView>

      <View style={s.bottomSingle}>
        <TouchableOpacity
          style={[s.primary, (saving || difuntos.length === 0) && { opacity: 0.6 }]}
          onPress={guardar}
          disabled={saving || difuntos.length === 0}
          activeOpacity={0.9}
        >
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryT}>Registrar movimiento</Text>}
        </TouchableOpacity>
      </View>

      <Modal visible={pickerOpen} transparent animationType="fade" onRequestClose={() => setPickerOpen(false)}>
        <View style={s.pickerBackdrop}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setPickerOpen(false)} />
          <View style={s.pickerSheet}>
            <Text style={s.pickerTitle}>Selecciona un difunto</Text>
            <ScrollView style={{ maxHeight: 320 }}>
              {difuntos.map((d) => {
                const active = d.id === difuntoId;
                return (
                  <TouchableOpacity
                    key={d.id}
                    style={[s.pickerRow, active && s.pickerRowActive]}
                    onPress={() => {
                      setDifuntoId(d.id);
                      setPickerOpen(false);
                    }}
                    activeOpacity={0.85}
                  >
                    <Text style={s.pickerRowT} numberOfLines={1}>
                      {d.nombre_completo}
                    </Text>
                    {active ? <FontAwesome name="check" size={16} color="#2F3F35" /> : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F3EFE6' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#F8FAFC' },
  centerT: { color: '#64748B', fontWeight: '800' },
  over: { fontSize: 11, fontWeight: '900', letterSpacing: 1.6, color: 'rgba(15,23,42,0.45)' },
  h1: { marginTop: 4, fontSize: 20, fontWeight: '900', color: '#0F172A' },
  card: {
    marginTop: 14,
    backgroundColor: '#F7F3EA',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.08)',
    gap: 10,
  },
  label: { marginTop: 10, fontSize: 12, fontWeight: '900', color: 'rgba(15,23,42,0.70)' },

  grid2: { marginTop: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tipoBtn: {
    width: '48.5%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.10)',
  },
  tipoBtnActive: { borderColor: 'rgba(47,63,53,0.55)', backgroundColor: 'rgba(47,63,53,0.06)' },
  tipoIcon: { width: 30, height: 30, borderRadius: 10, backgroundColor: 'rgba(15,23,42,0.06)', alignItems: 'center', justifyContent: 'center' },
  tipoIconActive: { backgroundColor: 'rgba(47,63,53,0.12)' },
  tipoT: { fontSize: 13, fontWeight: '900', color: 'rgba(15,23,42,0.75)' },
  tipoTActive: { color: '#0F172A' },
  tipoSoon: { marginTop: 2, fontSize: 11, fontWeight: '800', color: 'rgba(15,23,42,0.45)' },

  select: {
    marginTop: 8,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.10)',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  selectT: { flex: 1, fontWeight: '900', color: 'rgba(15,23,42,0.80)' },

  dateRow: { marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 10 },
  calIcon: { width: 46, height: 46, borderRadius: 14, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: 'rgba(15,23,42,0.10)', alignItems: 'center', justifyContent: 'center' },
  input: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.10)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    backgroundColor: '#FFFFFF',
  },

  bottomSingle: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(243,239,230,0.92)',
  },
  primary: { height: 54, borderRadius: 999, backgroundColor: '#2F3F35', alignItems: 'center', justifyContent: 'center' },
  primaryT: { color: '#FFFFFF', fontWeight: '900' },

  pickerBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  pickerSheet: { backgroundColor: '#F7F4EE', borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 16, paddingBottom: 18 },
  pickerTitle: { fontSize: 14, fontWeight: '900', color: '#0F172A', marginBottom: 10 },
  pickerRow: { paddingVertical: 12, paddingHorizontal: 12, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(15,23,42,0.10)', backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10 },
  pickerRowActive: { borderColor: 'rgba(47,63,53,0.55)', backgroundColor: 'rgba(47,63,53,0.06)' },
  pickerRowT: { flex: 1, fontWeight: '900', color: 'rgba(15,23,42,0.85)' },
});


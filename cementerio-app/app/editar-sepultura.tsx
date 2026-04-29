import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import type { EstadoSepultura, TipoSepultura } from '@/lib/types';
import { ESTADO_COLORS } from '@/constants/Colors';
import { normalizarEstadoEditable } from '@/lib/estado-sepultura';
import { apiFetch } from '@/lib/laravel-api';
import { unwrapItem } from '@/lib/normalize';

const ESTADOS: EstadoSepultura[] = ['libre', 'ocupada'];
const TIPOS: TipoSepultura[] = ['nicho', 'sepultura', 'columbario', 'panteon'];

export default function EditarSepulturaScreen() {
  const { id, sepultura_id } = useLocalSearchParams<{ id?: string; sepultura_id?: string }>();
  const router = useRouter();

  const sepulturaId = useMemo(() => {
    const raw = (sepultura_id ?? id ?? '').toString().trim();
    const n = Number(raw);
    return Number.isFinite(n) ? n : NaN;
  }, [id, sepultura_id]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [estado, setEstado] = useState<EstadoSepultura>('libre');
  const [tipo, setTipo] = useState<TipoSepultura>('nicho');
  const [notas, setNotas] = useState('');
  const [ubicacion, setUbicacion] = useState('');

  useEffect(() => {
    const run = async () => {
      if (!Number.isFinite(sepulturaId) || sepulturaId <= 0) {
        Alert.alert('Error', 'sepultura_id no válido.');
        setLoading(false);
        return;
      }
      const res = await apiFetch<any>(`/api/cementerio/sepulturas/${sepulturaId}`);
      if (!res.ok) {
        Alert.alert('Error', String(res.error ?? 'No se pudo cargar la sepultura.'));
        setLoading(false);
        return;
      }
      const data: any = unwrapItem<any>(res.data);
      if (data) {
        setEstado(normalizarEstadoEditable(String(data.estado)));
        setTipo((data.tipo as TipoSepultura) ?? 'nicho');
        setNotas(data.notas ?? '');
        setUbicacion(data.ubicacion_texto ?? '');
      }
      setLoading(false);
    };
    run();
  }, [sepulturaId]);

  const guardar = async () => {
    if (!Number.isFinite(sepulturaId) || sepulturaId <= 0) {
      Alert.alert('Error', 'sepultura_id no válido.');
      return;
    }
    setSaving(true);
    try {
      const res = await apiFetch<any>(`/api/cementerio/sepulturas/${sepulturaId}`, {
        method: 'PUT',
        body: {
          estado,
          tipo,
          notas: notas.trim() || null,
          ubicacion_texto: ubicacion.trim() || null,
        },
      });
      if (!res.ok) {
        Alert.alert('Error', String(res.error ?? 'No se pudo guardar.'));
        return;
      }
      Alert.alert('Guardado', 'Nicho actualizado');
      router.back();
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#16A34A" /></View>;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.label}>Estado</Text>
      <View style={styles.optionRow}>
        {ESTADOS.map((e) => (
          <TouchableOpacity
            key={e}
            style={[styles.estadoOption, estado === e && { backgroundColor: ESTADO_COLORS[e], borderColor: ESTADO_COLORS[e] }]}
            onPress={() => setEstado(e)}
          >
            <Text style={[styles.estadoText, estado === e && { color: '#FFF' }]}>{e}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Tipo</Text>
      <View style={styles.optionRow}>
        {TIPOS.map((t) => (
          <TouchableOpacity key={t} style={[styles.option, tipo === t && styles.optionActive]} onPress={() => setTipo(t)}>
            <Text style={[styles.optionText, tipo === t && styles.optionTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Ubicación (texto descriptivo)</Text>
      <TextInput style={styles.input} value={ubicacion} onChangeText={setUbicacion} placeholder="Muro sur, 3ª fila..." />

      <Text style={styles.label}>Notas de campo</Text>
      <TextInput style={[styles.input, styles.textArea]} value={notas} onChangeText={setNotas} placeholder="Observaciones..." multiline numberOfLines={4} textAlignVertical="top" />

      <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={guardar} disabled={saving}>
        {saving ? <ActivityIndicator color="#FFF" /> : (
          <><FontAwesome name="save" size={16} color="#FFF" /><Text style={styles.saveBtnText}>Guardar cambios</Text></>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 20 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginTop: 16, marginBottom: 6 },
  input: { backgroundColor: '#FFF', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, borderWidth: 1, borderColor: '#E5E7EB' },
  textArea: { minHeight: 100 },
  optionRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  option: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB' },
  optionActive: { backgroundColor: '#15803D', borderColor: '#15803D' },
  optionText: { fontSize: 13, color: '#6B7280', fontWeight: '500', textTransform: 'capitalize' },
  optionTextActive: { color: '#FFF' },
  estadoOption: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: '#F3F4F6', borderWidth: 2, borderColor: '#E5E7EB' },
  estadoText: { fontSize: 13, fontWeight: '700', color: '#6B7280', textTransform: 'capitalize' },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#16A34A', borderRadius: 12, paddingVertical: 16, marginTop: 30 },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});

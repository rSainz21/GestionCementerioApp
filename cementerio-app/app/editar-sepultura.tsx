import { useEffect, useState } from 'react';
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
import { supabase } from '@/lib/supabase';
import type { EstadoSepultura, TipoSepultura } from '@/lib/types';
import { ESTADO_COLORS } from '@/constants/Colors';
import { normalizarEstadoEditable } from '@/lib/estado-sepultura';

const ESTADOS: EstadoSepultura[] = ['libre', 'ocupada'];
const TIPOS: TipoSepultura[] = ['nicho', 'sepultura', 'columbario', 'panteon'];

export default function EditarSepulturaScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [estado, setEstado] = useState<EstadoSepultura>('libre');
  const [tipo, setTipo] = useState<TipoSepultura>('nicho');
  const [notas, setNotas] = useState('');
  const [ubicacion, setUbicacion] = useState('');

  useEffect(() => {
    supabase.from('cemn_sepulturas').select('*').eq('id', Number(id)).single().then(({ data }) => {
      if (data) {
        setEstado(normalizarEstadoEditable(String(data.estado)));
        setTipo(data.tipo as TipoSepultura);
        setNotas(data.notas ?? '');
        setUbicacion(data.ubicacion_texto ?? '');
      }
      setLoading(false);
    });
  }, [id]);

  const guardar = async () => {
    setSaving(true);
    const { error } = await supabase.from('cemn_sepulturas').update({
      estado, tipo, notas: notas.trim() || null, ubicacion_texto: ubicacion.trim() || null,
    }).eq('id', Number(id));
    setSaving(false);
    if (error) { Alert.alert('Error', error.message); return; }
    Alert.alert('Guardado', 'Sepultura actualizada');
    router.back();
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

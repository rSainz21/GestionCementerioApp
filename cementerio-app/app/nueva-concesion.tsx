import { useState } from 'react';
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
import { useAuth } from '@/lib/auth-context';

const TIPOS = ['temporal', 'perpetua'] as const;
const ESTADOS = ['vigente', 'caducada', 'renovada', 'transferida', 'anulada'] as const;

export default function NuevaConcesionScreen() {
  const { sepultura_id } = useLocalSearchParams<{ sepultura_id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [expediente, setExpediente] = useState('');
  const [tipo, setTipo] = useState<typeof TIPOS[number]>('temporal');
  const [estado, setEstado] = useState<typeof ESTADOS[number]>('vigente');
  const [saving, setSaving] = useState(false);

  const guardar = async () => {
    try {
      const sid = Number(sepultura_id);
      if (!Number.isFinite(sid) || sid <= 0) {
        Alert.alert('Error', 'sepultura_id no válido. Abre “Nueva concesión” desde un nicho/sepultura.');
        return;
      }

      if (!user) {
        Alert.alert(
          'Inicia sesión',
          'Para registrar concesiones debes iniciar sesión (RLS exige authenticated).',
          [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Ir al login', onPress: () => router.push('/login') },
          ]
        );
        return;
      }

      setSaving(true);
      const { error } = await supabase.from('cemn_concesiones').insert({
        sepultura_id: sid,
        numero_expediente: expediente.trim() || null,
        tipo,
        estado,
      });
      if (error) {
        const msg = error.message ?? 'Error desconocido';
        // Mensaje más útil cuando es RLS / auth
        const lower = msg.toLowerCase();
        if (lower.includes('row-level security') || lower.includes('policy') || lower.includes('jwt')) {
          Alert.alert('No autorizado', `${msg}\n\nComprueba que estás logueado y que las políticas RLS permiten INSERT.`);
        } else {
          Alert.alert('Error', msg);
        }
        return;
      }
      Alert.alert('Concesión creada', 'Se ha registrado correctamente');
      router.back();
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {!user && (
        <View style={styles.warnBox}>
          <Text style={styles.warnText}>
            Sin sesión no se puede guardar en Supabase (RLS exige authenticated).
          </Text>
          <TouchableOpacity style={styles.warnBtn} onPress={() => router.push('/login')} activeOpacity={0.8}>
            <Text style={styles.warnBtnT}>Iniciar sesión</Text>
          </TouchableOpacity>
        </View>
      )}
      <Text style={styles.label}>N.º Expediente</Text>
      <TextInput style={styles.input} value={expediente} onChangeText={setExpediente} placeholder="EXP-2026-0001" autoCapitalize="characters" />

      <Text style={styles.label}>Tipo de concesión</Text>
      <View style={styles.optionRow}>
        {TIPOS.map((t) => (
          <TouchableOpacity key={t} style={[styles.option, tipo === t && styles.optionActive]} onPress={() => setTipo(t)}>
            <Text style={[styles.optionText, tipo === t && styles.optionTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Estado</Text>
      <View style={styles.optionRow}>
        {ESTADOS.map((e) => (
          <TouchableOpacity key={e} style={[styles.option, estado === e && styles.optionActive]} onPress={() => setEstado(e)}>
            <Text style={[styles.optionText, estado === e && styles.optionTextActive]}>{e}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={guardar} disabled={saving}>
        {saving ? <ActivityIndicator color="#FFF" /> : (
          <><FontAwesome name="check" size={16} color="#FFF" /><Text style={styles.saveBtnText}>Guardar concesión</Text></>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 20 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginTop: 16, marginBottom: 6 },
  input: { backgroundColor: '#FFF', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, borderWidth: 1, borderColor: '#E5E7EB' },
  optionRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  option: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB' },
  optionActive: { backgroundColor: '#15803D', borderColor: '#15803D' },
  optionText: { fontSize: 13, color: '#6B7280', fontWeight: '500', textTransform: 'capitalize' },
  optionTextActive: { color: '#FFF' },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#22C55E', borderRadius: 12, paddingVertical: 16, marginTop: 30 },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  warnBox: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#F59E0B',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    gap: 10,
  },
  warnText: { fontSize: 13, color: '#92400E', fontWeight: '600', lineHeight: 18 },
  warnBtn: { alignSelf: 'flex-start', backgroundColor: '#15803D', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  warnBtnT: { color: '#FFF', fontWeight: '800', fontSize: 13 },
});

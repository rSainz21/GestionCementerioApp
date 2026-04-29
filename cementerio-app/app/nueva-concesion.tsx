import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/laravel-api';
import { AppButton, AppCard, AppInput, AppPill } from '@/components/ui';

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
          'Para registrar concesiones debes iniciar sesión.',
          [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Ir al login', onPress: () => router.push('/login') },
          ]
        );
        return;
      }

      setSaving(true);
      const res = await apiFetch('/api/cementerio/admin/concesiones', {
        method: 'POST',
        body: {
          sepultura_id: sid,
          numero_expediente: expediente.trim() || null,
          tipo,
          estado,
        },
      });
      if (!res.ok) {
        Alert.alert('Error', String(res.error ?? 'No se pudo crear la concesión'));
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
        <AppCard style={styles.warnBox} padded>
          <Text style={styles.warnText}>Sin sesión no se puede guardar.</Text>
          <AppButton label="Iniciar sesión" variant="primary" onPress={() => router.push('/login')} />
        </AppCard>
      )}
      <AppCard style={styles.card} padded>
        <AppInput label="N.º Expediente" value={expediente} onChangeText={setExpediente} placeholder="EXP-2026-0001" autoCapitalize="characters" />

        <Text style={styles.label}>Tipo de concesión</Text>
        <View style={styles.optionRow}>
          {TIPOS.map((t) => (
            <AppPill key={t} label={t} active={tipo === t} onPress={() => setTipo(t)} style={{ flex: 1 }} />
          ))}
        </View>

        <Text style={styles.label}>Estado</Text>
        <View style={styles.optionRow}>
          {ESTADOS.map((e) => (
            <AppPill key={e} label={e} active={estado === e} onPress={() => setEstado(e)} />
          ))}
        </View>
      </AppCard>

      <View style={{ marginTop: 14 }}>
        <AppButton label="Guardar concesión" variant="primary" onPress={guardar} loading={saving} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 20 },
  card: { marginTop: 12 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginTop: 16, marginBottom: 6 },
  optionRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  warnBox: {
    backgroundColor: '#FFFBEB',
    marginBottom: 12,
    gap: 10,
  },
  warnText: { fontSize: 13, color: '#92400E', fontWeight: '600', lineHeight: 18 },
});

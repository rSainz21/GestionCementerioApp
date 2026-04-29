import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useAuth } from '@/lib/auth-context';
import { firstParam } from '@/lib/query-params';
import { apiFetch } from '@/lib/laravel-api';

/** Solo AAAA-MM-DD; cualquier otro formato se rechaza para no romper el tipo date de Postgres */
function fechaParaPostgres(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return null;
  const d = new Date(`${t}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : t;
}

export default function AsignarDifuntoScreen() {
  const raw = useLocalSearchParams<{ sepultura_id: string | string[]; numero: string | string[] }>();
  const sepultura_id = firstParam(raw.sepultura_id);
  const numero = firstParam(raw.numero);
  const router = useRouter();
  const { user } = useAuth();

  const [nombre, setNombre] = useState('');
  const [fecha, setFecha] = useState('');
  const [fechaInhumacion, setFechaInhumacion] = useState(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });
  const [parentesco, setParentesco] = useState('');
  const [notas, setNotas] = useState('');
  const [esTitular, setEsTitular] = useState(true);
  const [saving, setSaving] = useState(false);

  const guardar = async () => {
    if (!nombre.trim()) {
      Alert.alert('Campo obligatorio', 'Escribe el nombre completo del difunto');
      return;
    }

    if (!user) {
      Alert.alert(
        'Inicia sesión',
        'Las zonas y bloques solo se guardan si hay sesión iniciada. Lo mismo aplica al asignar un difunto: inicia sesión para escribir en la base de datos.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Ir al login', onPress: () => router.push('/login') },
        ]
      );
      return;
    }

    const sid = Number(sepultura_id);
    if (!Number.isFinite(sid) || sid <= 0) {
      Alert.alert('Error', 'Identificador de sepultura no válido. Vuelve atrás y abre de nuevo “Asignar difunto” desde el nicho.');
      return;
    }

    const fechaNorm = fechaParaPostgres(fecha);
    if (fecha.trim() && fechaNorm === null) {
      Alert.alert('Fecha no válida', 'Usa el formato AAAA-MM-DD (ejemplo: 2024-03-15) o déjala vacía.');
      return;
    }

    const fechaInhNorm = fechaParaPostgres(fechaInhumacion);
    if (fechaInhumacion.trim() && fechaInhNorm === null) {
      Alert.alert('Fecha no válida', 'Fecha de inhumación: usa AAAA-MM-DD o déjala vacía.');
      return;
    }

    setSaving(true);
    const res = await apiFetch<{ ok: true; difunto_id: number; movimiento_id: number }>(
      '/api/cementerio/workflows/inhumacion',
      {
        method: 'POST',
        body: {
          sepultura_id: sid,
          nombre_completo: nombre.trim(),
          fecha_fallecimiento: fechaNorm,
          fecha_inhumacion: fechaInhNorm,
          es_titular: esTitular,
          parentesco: parentesco.trim() || null,
          notas: notas.trim() || null,
        },
      }
    );
    setSaving(false);
    if (!res.ok) {
      Alert.alert('Error', typeof res.error === 'string' ? res.error : 'No se pudo asignar el difunto.');
      return;
    }

    Alert.alert('Asignado', `${nombre.trim()} vinculado al nicho N.º ${numero || sid}`);
    router.back();
  };

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={s.content}>
        {!user && (
          <View style={s.warnBox}>
            <Text style={s.warnText}>
              Sin sesión no se puede guardar. Pulsa “Iniciar sesión” abajo o desde Más.
            </Text>
            <TouchableOpacity style={s.warnBtn} onPress={() => router.push('/login')} activeOpacity={0.8}>
              <Text style={s.warnBtnT}>Iniciar sesión</Text>
            </TouchableOpacity>
          </View>
        )}
        <View style={s.nichoInfo}>
          <FontAwesome name="cube" size={20} color="#15803D" />
          <Text style={s.nichoText}>Nicho N.º {numero || '—'}</Text>
        </View>

        <Text style={s.label}>Nombre completo del difunto *</Text>
        <TextInput
          style={s.input}
          value={nombre}
          onChangeText={setNombre}
          placeholder="Ej: Victoriano Gutiérrez Gutiérrez"
          placeholderTextColor="#9CA3AF"
          autoFocus
          autoCapitalize="words"
          returnKeyType="next"
        />

        <Text style={s.label}>Fecha de fallecimiento (opcional)</Text>
        <TextInput
          style={s.input}
          value={fecha}
          onChangeText={setFecha}
          placeholder="AAAA-MM-DD"
          placeholderTextColor="#9CA3AF"
          keyboardType="numbers-and-punctuation"
          returnKeyType="done"
          onSubmitEditing={guardar}
        />

        <Text style={s.label}>Fecha de inhumación (opcional)</Text>
        <TextInput
          style={s.input}
          value={fechaInhumacion}
          onChangeText={setFechaInhumacion}
          placeholder="AAAA-MM-DD"
          placeholderTextColor="#9CA3AF"
          keyboardType="numbers-and-punctuation"
        />

        <Text style={s.label}>¿Es titular? (opcional)</Text>
        <View style={s.pillsRow}>
          <TouchableOpacity
            style={[s.pill, esTitular && s.pillActive]}
            onPress={() => setEsTitular(true)}
            activeOpacity={0.85}
          >
            <Text style={[s.pillT, esTitular && s.pillTActive]}>Sí</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.pill, !esTitular && s.pillActive]}
            onPress={() => setEsTitular(false)}
            activeOpacity={0.85}
          >
            <Text style={[s.pillT, !esTitular && s.pillTActive]}>No</Text>
          </TouchableOpacity>
        </View>

        <Text style={s.label}>Parentesco (opcional)</Text>
        <TextInput
          style={s.input}
          value={parentesco}
          onChangeText={setParentesco}
          placeholder="Ej: Hijo/a, Cónyuge…"
          placeholderTextColor="#9CA3AF"
          autoCapitalize="words"
        />

        <Text style={s.label}>Notas (opcional)</Text>
        <TextInput
          style={[s.input, { minHeight: 90 }]}
          value={notas}
          onChangeText={setNotas}
          placeholder="Observaciones…"
          placeholderTextColor="#9CA3AF"
          multiline
          textAlignVertical="top"
        />

        <Text style={s.hint}>
          Estos campos coinciden con tu BD (`tablas_cem.sql`). Los datos de titular/expediente se completan desde concesiones.
        </Text>

        <TouchableOpacity
          style={[s.saveBtn, saving && { opacity: 0.6 }]}
          onPress={guardar}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <FontAwesome name="check" size={20} color="#FFF" />
              <Text style={s.saveBtnText}>Asignar al nicho</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { flex: 1, padding: 20, justifyContent: 'center' },
  nichoInfo: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#DCFCE7', borderRadius: 12, padding: 16, marginBottom: 24 },
  nichoText: { fontSize: 18, fontWeight: '700', color: '#15803D' },
  label: { fontSize: 15, fontWeight: '700', color: '#374151', marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: '#FFF', borderRadius: 14, paddingHorizontal: 18, paddingVertical: 16,
    fontSize: 18, color: '#1F2937', borderWidth: 1, borderColor: '#E5E7EB',
  },
  pillsRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  pill: { flex: 1, height: 48, borderRadius: 14, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  pillActive: { backgroundColor: '#15803D', borderColor: '#15803D' },
  pillT: { fontSize: 16, fontWeight: '900', color: '#334155' },
  pillTActive: { color: '#FFFFFF' },
  hint: { fontSize: 13, color: '#9CA3AF', marginTop: 16, textAlign: 'center', lineHeight: 18 },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: '#22C55E', borderRadius: 14, paddingVertical: 20, marginTop: 24, minHeight: 60,
  },
  saveBtnText: { fontSize: 18, fontWeight: '800', color: '#FFF' },
  warnBox: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#F59E0B',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 10,
  },
  warnText: { fontSize: 13, color: '#92400E', fontWeight: '600', lineHeight: 18 },
  warnBtn: { alignSelf: 'flex-start', backgroundColor: '#15803D', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  warnBtnT: { color: '#FFF', fontWeight: '800', fontSize: 13 },
});

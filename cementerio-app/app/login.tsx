import { useEffect, useMemo, useState } from 'react';
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
import { useRouter } from 'expo-router';
import { useAuth } from '@/lib/auth-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const router = useRouter();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusKind, setStatusKind] = useState<'error' | 'info' | null>(null);
  const [serverOk, setServerOk] = useState<boolean | null>(null);

  const base = useMemo(() => {
    const b = (process.env.EXPO_PUBLIC_LARAVEL_BASE as string | undefined) ?? '';
    return String(b).trim().replace(/\/+$/, '');
  }, []);

  useEffect(() => {
    let alive = true;
    if (!base) {
      setServerOk(false);
      return;
    }
    fetch(`${base}/api/login`, { method: 'HEAD' })
      .then((r) => alive && setServerOk(r.status >= 200 && r.status < 500))
      .catch(() => alive && setServerOk(false));
    return () => {
      alive = false;
    };
  }, [base]);

  const handleSubmit = async () => {
    try {
      if (!username.trim() || !password.trim()) {
        setStatusKind('error');
        setStatusMessage('Introduce usuario/email y contraseña');
        Alert.alert('Error', 'Introduce usuario/email y contraseña');
        return;
      }

      setStatusMessage(null);
      setStatusKind(null);
      setLoading(true);
      const result = await signIn(username.trim(), password, { persist: remember });

      if (result.error) {
        setStatusKind('error');
        setStatusMessage(result.error.message || 'Error desconocido al autenticar.');
        Alert.alert('Error', result.error.message);
      } else {
        router.replace('/(tabs)/campo');
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setStatusKind('error');
      setStatusMessage(msg || 'Error inesperado.');
      Alert.alert('Error', msg || 'Error inesperado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.hero}>
        <Text style={styles.heroOver}>AYTO. LOS CORRALES DE BUELNA</Text>
        <Text style={styles.heroTitle}>Cementerio{'\n'}de Somahoz</Text>
        <Text style={styles.heroSub}>
          Aplicación de gestión y consulta para{'\n'}personal del cementerio municipal.
        </Text>

        <View style={styles.radar} pointerEvents="none">
          <View style={styles.radarRing} />
          <View style={[styles.radarRing, { width: 210, height: 210, borderRadius: 105, opacity: 0.18 }]} />
          <View style={[styles.radarRing, { width: 320, height: 320, borderRadius: 160, opacity: 0.12 }]} />
          <View style={styles.radarCrossV} />
          <View style={styles.radarCrossH} />
        </View>
      </View>

      <View style={styles.sheet}>
        <Text style={styles.sheetTitle}>Acceso</Text>
        <Text style={styles.sheetSub}>Usa tus credenciales del sistema de gestión.</Text>

        <Text style={styles.label}>Usuario</Text>
        <TextInput
          style={styles.input2}
          placeholder="manuel.perez"
          placeholderTextColor="rgba(15,23,42,0.35)"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Text style={[styles.label, { marginTop: 12 }]}>Contraseña</Text>
        <TextInput
          style={styles.input2}
          placeholder="••••••••"
          placeholderTextColor="rgba(15,23,42,0.35)"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        {statusMessage ? (
          <View style={[styles.statusBox, statusKind === 'error' ? styles.statusBoxError : styles.statusBoxInfo]}>
            <Text style={styles.statusText}>{statusMessage}</Text>
          </View>
        ) : null}

        <TouchableOpacity style={[styles.button2, loading && styles.buttonDisabled]} onPress={handleSubmit} disabled={loading} activeOpacity={0.9}>
          {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.button2T}>Entrar</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={styles.secureRow} activeOpacity={0.85} onPress={() => Alert.alert('Conexión', base || 'Sin baseURL')}>
          <View style={[styles.secureCheck, serverOk ? styles.secureCheckOn : null]}>
            {serverOk ? <FontAwesome name="check" size={10} color="#FFFFFF" /> : null}
          </View>
          <Text style={styles.secureT}>
            Conexión segura · {base ? base.replace(/^https?:\/\//, '') : '—'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3EFE6',
  },

  hero: {
    height: 320,
    backgroundColor: '#2B3A2E',
    paddingHorizontal: 22,
    paddingTop: 54,
    overflow: 'hidden',
  },
  heroOver: { color: 'rgba(255,255,255,0.70)', fontWeight: '900', letterSpacing: 2.2, fontSize: 11 },
  heroTitle: { marginTop: 14, fontSize: 44, lineHeight: 46, fontWeight: '900', color: '#FFFFFF' },
  heroSub: { marginTop: 10, fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.70)', lineHeight: 18, maxWidth: 340 },
  radar: { position: 'absolute', right: -30, top: 30, width: 360, height: 360 },
  radarRing: { position: 'absolute', right: 0, top: 0, width: 120, height: 120, borderRadius: 60, borderWidth: 2, borderColor: 'rgba(255,255,255,0.20)', opacity: 0.25 },
  radarCrossV: { position: 'absolute', right: 160, top: 0, bottom: 0, width: 2, backgroundColor: 'rgba(255,255,255,0.10)' },
  radarCrossH: { position: 'absolute', right: 0, top: 160, left: 0, height: 2, backgroundColor: 'rgba(255,255,255,0.10)' },

  sheet: {
    flex: 1,
    marginTop: -26,
    backgroundColor: '#F7F4EE',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: Platform.OS === 'ios' ? 26 : 18,
  },
  sheetTitle: { fontSize: 18, fontWeight: '900', color: '#0F172A' },
  sheetSub: { marginTop: 6, fontSize: 13, fontWeight: '700', color: 'rgba(15,23,42,0.55)' },

  label: { marginTop: 16, fontSize: 12, fontWeight: '900', color: 'rgba(15,23,42,0.55)' },
  input2: {
    marginTop: 10,
    height: 48,
    borderRadius: 14,
    paddingHorizontal: 14,
    backgroundColor: '#F9F7F2',
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.12)',
    fontWeight: '900',
    color: '#0F172A',
  },

  button2: {
    marginTop: 16,
    height: 52,
    borderRadius: 18,
    backgroundColor: '#2B3A2E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  button2T: { color: '#FFFFFF', fontWeight: '900', fontSize: 16 },
  buttonDisabled: {
    opacity: 0.6,
  },

  statusBox: {
    marginTop: 12,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
  },
  statusBoxError: {
    backgroundColor: 'rgba(185,28,28,0.08)',
    borderColor: 'rgba(185,28,28,0.25)',
  },
  statusBoxInfo: {
    backgroundColor: 'rgba(47,107,78,0.10)',
    borderColor: 'rgba(47,107,78,0.25)',
  },
  statusText: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17,
  },
  secureRow: { marginTop: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  secureCheck: { width: 14, height: 14, borderRadius: 4, borderWidth: 1, borderColor: 'rgba(15,23,42,0.18)', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  secureCheckOn: { backgroundColor: '#2B3A2E', borderColor: '#2B3A2E' },
  secureT: { fontSize: 11, fontWeight: '800', color: 'rgba(15,23,42,0.55)' },
});

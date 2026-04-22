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
import { useRouter } from 'expo-router';
import { useAuth } from '@/lib/auth-context';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const router = useRouter();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusKind, setStatusKind] = useState<'error' | 'info' | null>(null);

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
      const result = await signIn(username.trim(), password);

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
      <View style={styles.inner}>
        <Text style={styles.icon}>🏛️</Text>
        <Text style={styles.title}>Cementerio Municipal</Text>
        <Text style={styles.subtitle}>Los Corrales de Buelna</Text>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Usuario o email"
            placeholderTextColor="#9CA3AF"
            value={username}
            onChangeText={setUsername}
            keyboardType="default"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TextInput
            style={styles.input}
            placeholder="Contraseña"
            placeholderTextColor="#9CA3AF"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          {statusMessage ? (
            <View
              style={[
                styles.statusBox,
                statusKind === 'error' ? styles.statusBoxError : styles.statusBoxInfo,
              ]}
            >
              <Text style={styles.statusText}>{statusMessage}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.buttonText}>
                Iniciar sesión
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  icon: {
    fontSize: 56,
    textAlign: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 40,
  },
  form: {
    gap: 14,
  },
  input: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#334155',
  },
  button: {
    backgroundColor: '#16A34A',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  switchText: {
    color: '#4ADE80',
    textAlign: 'center',
    marginTop: 8,
    fontSize: 14,
  },
  statusBox: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
  },
  statusBoxError: {
    backgroundColor: '#3F1D1D',
    borderColor: '#EF4444',
  },
  statusBoxInfo: {
    backgroundColor: '#0B2A1A',
    borderColor: '#22C55E',
  },
  statusText: {
    color: '#F9FAFB',
    fontSize: 13,
    lineHeight: 18,
  },
});

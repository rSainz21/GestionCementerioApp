import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/lib/auth-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { getLaravelBaseUrl } from '@/lib/laravel-api';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const router = useRouter();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusKind, setStatusKind] = useState<'error' | 'info' | null>(null);
  const [serverOk, setServerOk] = useState<boolean | null>(null);

  const passwordRef = useRef<TextInput>(null);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const base = useMemo(() => {
    return getLaravelBaseUrl();
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

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 40, useNativeDriver: true }),
    ]).start();
  };

  const handleSubmit = async () => {
    const user = username.trim();
    const pass = password.trim();

    if (!user || !pass) {
      setStatusKind('error');
      setStatusMessage(!user ? 'Introduce tu usuario o email' : 'Introduce tu contraseña');
      shake();
      return;
    }

    setStatusMessage(null);
    setStatusKind(null);
    setLoading(true);
    try {
      const result = await signIn(user, password, { persist: remember });

      if (result.error) {
        setStatusKind('error');
        setStatusMessage(result.error.message || 'Error desconocido al autenticar.');
        shake();
      } else {
        router.replace('/(tabs)/campo');
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setStatusKind('error');
      setStatusMessage(msg || 'Error inesperado.');
      shake();
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        bounces={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ flexGrow: 1, paddingBottom: Platform.OS === 'ios' ? 40 : 28 }}
        showsVerticalScrollIndicator
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

        <Animated.View style={[styles.sheet, { transform: [{ translateX: shakeAnim }] }]}>
          <Text style={styles.sheetTitle}>Acceso</Text>
          <Text style={styles.sheetSub}>Usa tus credenciales del sistema de gestión.</Text>

          <Text style={styles.label}>Usuario</Text>
          <TextInput
            style={styles.input2}
            placeholder="manuel.perez"
            placeholderTextColor="rgba(15,23,42,0.35)"
            value={username}
            onChangeText={(t) => { setUsername(t); setStatusMessage(null); }}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
            blurOnSubmit={false}
            accessibilityLabel="Campo de usuario"
          />

          <Text style={[styles.label, { marginTop: 12 }]}>Contraseña</Text>
          <View style={styles.passwordWrap}>
            <TextInput
              ref={passwordRef}
              style={styles.passwordInput}
              placeholder="••••••••"
              placeholderTextColor="rgba(15,23,42,0.35)"
              value={password}
              onChangeText={(t) => { setPassword(t); setStatusMessage(null); }}
              secureTextEntry={!showPassword}
              returnKeyType="go"
              onSubmitEditing={handleSubmit}
              accessibilityLabel="Campo de contraseña"
            />
            <TouchableOpacity
              style={styles.eyeBtn}
              onPress={() => setShowPassword(!showPassword)}
              activeOpacity={0.7}
              accessibilityLabel={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              <FontAwesome
                name={showPassword ? 'eye-slash' : 'eye'}
                size={18}
                color="rgba(15,23,42,0.45)"
              />
            </TouchableOpacity>
          </View>

          {/* Remember me toggle */}
          <TouchableOpacity
            style={styles.rememberRow}
            onPress={() => setRemember(!remember)}
            activeOpacity={0.85}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: remember }}
          >
            <View style={[styles.checkBox, remember && styles.checkBoxActive]}>
              {remember ? <FontAwesome name="check" size={10} color="#FFFFFF" /> : null}
            </View>
            <Text style={styles.rememberT}>Mantener sesión iniciada</Text>
          </TouchableOpacity>

          {statusMessage ? (
            <View style={[styles.statusBox, statusKind === 'error' ? styles.statusBoxError : styles.statusBoxInfo]}>
              <FontAwesome
                name={statusKind === 'error' ? 'exclamation-circle' : 'info-circle'}
                size={14}
                color={statusKind === 'error' ? '#B91C1C' : '#2F6B4E'}
                style={{ marginRight: 8 }}
              />
              <Text style={styles.statusText}>{statusMessage}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.button2, loading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.9}
            accessibilityRole="button"
            accessibilityLabel="Iniciar sesión"
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <View style={styles.btnContent}>
                <FontAwesome name="sign-in" size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.button2T}>Entrar</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.secureRow} activeOpacity={0.85} onPress={() => {}}>
            <View style={[styles.secureCheck, serverOk ? styles.secureCheckOn : serverOk === false ? styles.secureCheckOff : null]}>
              {serverOk ? <FontAwesome name="check" size={10} color="#FFFFFF" /> : null}
              {serverOk === false ? <FontAwesome name="times" size={10} color="#FFFFFF" /> : null}
            </View>
            <Text style={styles.secureT}>
              {serverOk === null
                ? 'Comprobando conexión…'
                : serverOk
                  ? `Conectado · ${base ? base.replace(/^https?:\/\//, '') : '—'}`
                  : `Sin conexión · ${base ? base.replace(/^https?:\/\//, '') : '—'}`}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3EFE6',
  },

  hero: {
    height: 300,
    backgroundColor: '#2B3A2E',
    paddingHorizontal: 22,
    paddingTop: 54,
    overflow: 'hidden',
  },
  heroOver: { color: 'rgba(255,255,255,0.70)', fontWeight: '900', letterSpacing: 2.2, fontSize: 11 },
  heroTitle: { marginTop: 14, fontSize: 40, lineHeight: 44, fontWeight: '900', color: '#FFFFFF' },
  heroSub: { marginTop: 10, fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.70)', lineHeight: 18, maxWidth: 340 },
  radar: { position: 'absolute', right: -30, top: 30, width: 360, height: 360 },
  radarRing: { position: 'absolute', right: 0, top: 0, width: 120, height: 120, borderRadius: 60, borderWidth: 2, borderColor: 'rgba(255,255,255,0.20)', opacity: 0.25 },
  radarCrossV: { position: 'absolute', right: 160, top: 0, bottom: 0, width: 2, backgroundColor: 'rgba(255,255,255,0.10)' },
  radarCrossH: { position: 'absolute', right: 0, top: 160, left: 0, height: 2, backgroundColor: 'rgba(255,255,255,0.10)' },

  sheet: {
    marginTop: -26,
    backgroundColor: '#F7F4EE',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: Platform.OS === 'ios' ? 34 : 22,
  },
  sheetTitle: { fontSize: 20, fontWeight: '900', color: '#0F172A' },
  sheetSub: { marginTop: 6, fontSize: 13, fontWeight: '700', color: 'rgba(15,23,42,0.55)' },

  label: { marginTop: 16, fontSize: 12, fontWeight: '900', color: 'rgba(15,23,42,0.55)', letterSpacing: 0.5 },
  input2: {
    marginTop: 8,
    height: 50,
    borderRadius: 14,
    paddingHorizontal: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.12)',
    fontWeight: '800',
    color: '#0F172A',
    fontSize: 15,
  },

  passwordWrap: {
    marginTop: 8,
    height: 50,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.12)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordInput: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 14,
    fontWeight: '800',
    color: '#0F172A',
    fontSize: 15,
  },
  eyeBtn: {
    width: 44,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },

  rememberRow: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkBox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: 'rgba(15,23,42,0.20)',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBoxActive: {
    backgroundColor: '#2B3A2E',
    borderColor: '#2B3A2E',
  },
  rememberT: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(15,23,42,0.65)',
  },

  button2: {
    marginTop: 18,
    height: 54,
    borderRadius: 16,
    backgroundColor: '#2B3A2E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  button2T: { color: '#FFFFFF', fontWeight: '900', fontSize: 16 },
  buttonDisabled: {
    opacity: 0.6,
  },

  statusBox: {
    marginTop: 14,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  statusBoxError: {
    backgroundColor: 'rgba(185,28,28,0.06)',
    borderColor: 'rgba(185,28,28,0.20)',
  },
  statusBoxInfo: {
    backgroundColor: 'rgba(47,107,78,0.08)',
    borderColor: 'rgba(47,107,78,0.20)',
  },
  statusText: {
    flex: 1,
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  secureRow: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  secureCheck: {
    width: 16,
    height: 16,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.18)',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secureCheckOn: { backgroundColor: '#16A34A', borderColor: '#16A34A' },
  secureCheckOff: { backgroundColor: '#EF4444', borderColor: '#EF4444' },
  secureT: { fontSize: 12, fontWeight: '700', color: 'rgba(15,23,42,0.50)' },
});

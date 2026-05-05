import { Link, Stack } from 'expo-router';
import { StyleSheet } from 'react-native';

import { Text, View } from '@/components/Themed';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'No encontrado' }} />
      <View style={styles.container}>
        <Text style={styles.kicker}>404</Text>
        <Text style={styles.title}>Esta pantalla no existe</Text>
        <Text style={styles.sub}>
          La ruta que has abierto no corresponde a ninguna vista de la app. Vuelve al inicio o inicia sesión de nuevo.
        </Text>

        <Link href="/(tabs)/inicio" style={styles.linkPrimary}>
          <Text style={styles.linkPrimaryText}>Ir al inicio</Text>
        </Link>

        <Link href="/login" style={styles.linkSecondary}>
          <Text style={styles.linkSecondaryText}>Ir al inicio de sesión</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  kicker: {
    fontSize: 13,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 2,
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 10,
  },
  sub: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
    maxWidth: 320,
  },
  linkPrimary: {
    marginTop: 4,
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: 12,
    backgroundColor: '#15803D',
    minWidth: 220,
    alignItems: 'center',
  },
  linkPrimaryText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  linkSecondary: {
    marginTop: 16,
    paddingVertical: 12,
  },
  linkSecondaryText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1266A3',
    textAlign: 'center',
  },
});

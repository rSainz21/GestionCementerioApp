import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useColorScheme } from '@/components/useColorScheme';
import { AuthProvider, useAuth } from '@/lib/auth-context';

export { ErrorBoundary } from 'expo-router';
/** Arrancar en login: sin sesión no se ve el mapa; con sesión se redirige a las pestañas. */
export const unstable_settings = { initialRouteName: 'login' };

SplashScreen.preventAutoHideAsync();

const LightTheme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, primary: '#15803D', background: '#F8FAFC', card: '#FFFFFF', text: '#1F2937', border: '#E5E7EB' },
};
const DarkThemeCustom = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, primary: '#4ADE80', background: '#0F172A', card: '#1E293B', text: '#F9FAFB', border: '#374151' },
};

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });
  useEffect(() => { if (error) throw error; }, [error]);
  useEffect(() => { if (loaded) SplashScreen.hideAsync(); }, [loaded]);
  if (!loaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <RootLayoutNav />
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  /** Solo la ruta de login es pública; el resto exige sesión (igual que las políticas RLS). */
  useEffect(() => {
    if (loading) return;

    const root = segments[0];
    const enLogin = root === 'login';

    if (!user && !enLogin) {
      router.replace('/login');
      return;
    }
    if (user && enLogin) {
      router.replace('/(tabs)/campo');
    }
  }, [user, loading, segments]); // router.replace estable (exhaustive-deps)

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' }}>
        <ActivityIndicator size="large" color="#15803D" />
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkThemeCustom : LightTheme}>
      <Stack screenOptions={{ headerBackTitle: 'Atrás' }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen name="mapa-editor" options={{ title: 'Editar números', presentation: 'modal' }} />
        <Stack.Screen name="numeros-editor" options={{ title: 'Editar números', presentation: 'modal' }} />
        <Stack.Screen name="osm-editor" options={{ title: 'OpenStreetMap', presentation: 'modal' }} />
        <Stack.Screen name="bloque/[id]" options={{ title: 'Bloque' }} />
        <Stack.Screen name="sepultura/[id]" options={{ title: 'Ficha de nicho' }} />
        <Stack.Screen name="asignar-difunto" options={{ title: 'Asignar difunto', presentation: 'modal' }} />
        <Stack.Screen name="exhumacion-traslado" options={{ title: 'Exhumación / Traslado', presentation: 'modal' }} />
        <Stack.Screen name="anadir-documento-foto" options={{ title: 'Añadir Documento/Foto', presentation: 'modal' }} />
        <Stack.Screen name="nuevo-suceso" options={{ title: 'Nuevo suceso', presentation: 'modal' }} />
        <Stack.Screen name="venta-concesion" options={{ title: 'Venta / Nueva concesión', presentation: 'modal' }} />
        <Stack.Screen name="herencia" options={{ title: 'Herencia', presentation: 'modal' }} />
        <Stack.Screen name="renovar-concesion" options={{ title: 'Renovar concesión', presentation: 'modal' }} />
        <Stack.Screen name="editar-sepultura" options={{ title: 'Editar nicho', presentation: 'modal' }} />
        <Stack.Screen name="nueva-concesion" options={{ title: 'Nueva concesión', presentation: 'modal' }} />
        <Stack.Screen name="buscar" options={{ title: 'Buscar', presentation: 'modal' }} />
        <Stack.Screen name="gestion-registros" options={{ title: 'Registros' }} />
        {/* Pantallas de gestión avanzada se activan en Fase 2 (evitar depender de backends antiguos). */}
      </Stack>
    </ThemeProvider>
  );
}

import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

function TabIcon(props: { name: React.ComponentProps<typeof FontAwesome>['name']; color: string }) {
  return <FontAwesome size={26} style={{ marginBottom: -2 }} {...props} />;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const c = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      initialRouteName="inicio"
      screenOptions={{
        tabBarActiveTintColor: c.tint,
        tabBarInactiveTintColor: c.tabIconDefault,
        tabBarStyle: {
          backgroundColor: c.surface,
          borderTopColor: c.border,
          // Evita que la barra del sistema (tablet) tape el menú inferior
          height: 60 + insets.bottom,
          paddingBottom: 10 + insets.bottom,
          paddingTop: 6,
          justifyContent: 'center',
          paddingHorizontal: 10,
        },
        tabBarItemStyle: { flex: 1, alignItems: 'center', justifyContent: 'center' },
        tabBarLabelStyle: { fontSize: 13, fontWeight: '700' },
        headerStyle: { backgroundColor: c.surface },
        headerTintColor: c.text,
        headerTitleStyle: { fontWeight: '700', fontSize: 18 },
      }}
    >
      <Tabs.Screen
        name="inicio"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color }) => <TabIcon name="home" color={color} />,
        }}
      />
      <Tabs.Screen
        name="mapa"
        options={{
          title: 'Mapa',
          tabBarIcon: ({ color }) => <TabIcon name="map-o" color={color} />,
        }}
      />
      <Tabs.Screen
        name="nfc"
        options={{
          title: '',
          tabBarLabel: '',
          headerShown: false,
          tabBarButton: (props) => (
            <View style={s.nfcBtnWrap}>
              <TouchableOpacity {...(props as any)} activeOpacity={0.9} style={s.nfcBtn}>
                <FontAwesome name="wifi" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="buscar"
        options={{
          title: 'Buscar',
          tabBarIcon: ({ color }) => <TabIcon name="search" color={color} />,
        }}
      />
      <Tabs.Screen
        name="mas"
        options={{
          title: 'Más',
          tabBarIcon: ({ color }) => <TabIcon name="bars" color={color} />,
        }}
      />
      <Tabs.Screen
        name="campo"
        options={{
          // Se accede desde Inicio / flujos, no como tab fijo.
          href: null,
        }}
      />
      <Tabs.Screen
        name="gestion"
        options={{
          // Pantalla “avanzada”: accesible desde "Más", pero no como tab principal.
          href: null,
        }}
      />
    </Tabs>
  );
}

const s = StyleSheet.create({
  nfcBtnWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nfcBtn: {
    width: 52,
    height: 52,
    borderRadius: 999,
    backgroundColor: '#2F3F35',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.9)',
    marginTop: -18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 8,
  },
});

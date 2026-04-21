import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function TabIcon(props: { name: React.ComponentProps<typeof FontAwesome>['name']; color: string }) {
  return <FontAwesome size={26} style={{ marginBottom: -2 }} {...props} />;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const c = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      initialRouteName="campo"
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
        },
        tabBarLabelStyle: { fontSize: 13, fontWeight: '700' },
        headerStyle: { backgroundColor: c.surface },
        headerTintColor: c.text,
        headerTitleStyle: { fontWeight: '700', fontSize: 18 },
      }}
    >
      <Tabs.Screen
        name="campo"
        options={{
          title: 'Campo',
          tabBarIcon: ({ color }) => <TabIcon name="flash" color={color} />,
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
    </Tabs>
  );
}

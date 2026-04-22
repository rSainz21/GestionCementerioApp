import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/laravel-api';

export default function MasScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [stats, setStats] = useState({ total: 0, ocupados: 0, libres: 0, bloques: 0 });

  useFocusEffect(
    useCallback(() => {
      async function fetchStats() {
        const [sRes, bRes] = await Promise.all([
          apiFetch<{ items: any[] }>('/api/cementerio/sepulturas/search?q=__all__'),
          apiFetch<{ items: any[] }>('/api/cementerio/bloques'),
        ]);
        // Nota: para fase 1 no tenemos endpoint "count" dedicado; usamos stats backend si está.
        const statsRes = await apiFetch<any>('/api/cementerio/stats');
        if (statsRes.ok && (statsRes.data as any)?.items) {
          const it = (statsRes.data as any).items;
          setStats({
            total: Number(it.total ?? 0),
            libres: Number(it.libres ?? 0),
            ocupados: Number(it.ocupadas ?? it.ocupados ?? 0),
            bloques: Number(it.bloques ?? 0),
          });
          return;
        }

        const seps = sRes.ok ? (sRes.data.items ?? []) : [];
        setStats({
          total: seps.length,
          libres: seps.filter((s: any) => s.estado === 'libre').length,
          ocupados: seps.filter((s: any) => s.estado !== 'libre').length,
          bloques: bRes.ok ? (bRes.data.items ?? []).length : 0,
        });
      }
      fetchStats();
    }, [])
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.statsCard}>
        <Text style={styles.statsTitle}>Resumen del cementerio</Text>
        <View style={styles.statsGrid}>
          <Stat value={stats.total} label="Total nichos" color="#22C55E" />
          <Stat value={stats.ocupados} label="Ocupados" color="#EF4444" />
          <Stat value={stats.libres} label="Libres" color="#22C55E" />
          <Stat value={stats.bloques} label="Bloques" color="#4ADE80" />
        </View>
      </View>

      <Text style={styles.sectionLabel}>Gestión</Text>

      <MenuItem
        icon="th-large"
        label="Gestionar bloques"
        sub="(Fase 2) Alta/edición avanzada desde móvil"
        onPress={() => Alert.alert('En preparación', 'Esta pantalla se activa en la Fase 2. Para las primeras pruebas usa Campo / Buscar / Mapa.')}
      />
      <MenuItem
        icon="users"
        label="Difuntos y concesiones"
        sub="(Fase 2) Gestión avanzada desde móvil"
        onPress={() => Alert.alert('En preparación', 'Esta pantalla se activa en la Fase 2.')}
      />

      <Text style={styles.sectionLabel}>Cuenta</Text>

      {user ? (
        <>
          <View style={styles.userRow}>
            <FontAwesome name="user-circle" size={22} color="#15803D" />
            <Text style={styles.userEmail}>{user.email}</Text>
          </View>
          <MenuItem icon="sign-out" label="Cerrar sesión" sub="" onPress={signOut} danger />
        </>
      ) : (
        <MenuItem icon="sign-in" label="Iniciar sesión" sub="Accede para guardar cambios" onPress={() => router.push('/login')} />
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function Stat({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <View style={styles.statBox}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function MenuItem({ icon, label, sub, onPress, danger }: {
  icon: React.ComponentProps<typeof FontAwesome>['name'];
  label: string;
  sub: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.6}>
      <View style={[styles.menuIcon, danger && { backgroundColor: '#FEE2E2' }]}>
        <FontAwesome name={icon} size={20} color={danger ? '#EF4444' : '#15803D'} />
      </View>
      <View style={styles.menuText}>
        <Text style={[styles.menuLabel, danger && { color: '#EF4444' }]}>{label}</Text>
        {sub ? <Text style={styles.menuSub}>{sub}</Text> : null}
      </View>
      <FontAwesome name="chevron-right" size={14} color="#D1D5DB" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 16 },
  statsCard: { backgroundColor: '#15803D', borderRadius: 16, padding: 20, marginBottom: 24 },
  statsTitle: { fontSize: 14, color: '#94A3B8', fontWeight: '600', marginBottom: 12 },
  statsGrid: { flexDirection: 'row', gap: 8 },
  statBox: { flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: 12, alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: '800' },
  statLabel: { fontSize: 11, color: '#CBD5E1', marginTop: 2, fontWeight: '600', textAlign: 'center' },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginTop: 8 },
  menuItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 14, padding: 16, marginBottom: 8, gap: 14, minHeight: 64 },
  menuIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center' },
  menuText: { flex: 1 },
  menuLabel: { fontSize: 16, fontWeight: '700', color: '#1F2937' },
  menuSub: { fontSize: 13, color: '#9CA3AF', marginTop: 2 },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#EFF6FF', borderRadius: 12, marginBottom: 8 },
  userEmail: { fontSize: 15, color: '#15803D', fontWeight: '600' },
});

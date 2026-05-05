import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/laravel-api';
import { normalizeCementerioStatsFromApi } from '@/lib/normalize-cementerio-stats';
import { Radius, Semantic, Shadow, Space } from '@/components/ui';

export default function MasScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [stats, setStats] = useState({ total: 0, ocupados: 0, libres: 0, reservadas: 0, bloques: 0 });

  useFocusEffect(
    useCallback(() => {
      async function fetchStats() {
        const [statsRes, bRes] = await Promise.all([
          apiFetch<any>('/api/cementerio/stats'),
          apiFetch<{ items?: any[] }>('/api/cementerio/bloques'),
        ]);
        const bloquesCount = bRes.ok ? ((bRes.data as any)?.items ?? []).length : 0;

        if (statsRes.ok) {
          const it = (statsRes.data as any)?.items ?? statsRes.data;
          const n = normalizeCementerioStatsFromApi(it);
          setStats({
            total: n.total,
            libres: n.libres,
            ocupados: n.ocupadas,
            reservadas: n.reservadas,
            bloques: bloquesCount,
          });
          return;
        }

        const sRes = await apiFetch<{ items: any[] }>('/api/cementerio/sepulturas/search?q=__all__');
        const seps = sRes.ok ? (sRes.data.items ?? []) : [];
        setStats({
          total: seps.length,
          libres: seps.filter((s: any) => s.estado === 'libre').length,
          ocupados: seps.filter((s: any) => String(s.estado ?? '').toLowerCase() === 'ocupada').length,
          reservadas: seps.filter((s: any) => String(s.estado ?? '').toLowerCase() === 'reservada').length,
          bloques: bloquesCount,
        });
      }
      fetchStats();
    }, [])
  );

  const userName = user?.name ?? user?.nombre ?? user?.email ?? 'Operario';
  const initials = (() => {
    const parts = String(userName).trim().split(/\s+/).filter(Boolean);
    const a = parts[0]?.[0] ?? 'U';
    const b = parts[1]?.[0] ?? parts[0]?.[1] ?? 'X';
    return (a + b).toUpperCase();
  })();

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      {/* Perfil de usuario */}
      {user ? (
        <View style={s.profileCard}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.profileName}>{userName}</Text>
            <Text style={s.profileEmail}>{user.email ?? '—'}</Text>
          </View>
        </View>
      ) : null}

      {/* Resumen rápido */}
      <View style={s.statsRow}>
        <Stat value={stats.total} label="Total" color="#0F172A" />
        <Stat value={stats.libres} label="Libres" color="#16A34A" />
        <Stat value={stats.ocupados} label="Ocupadas" color="#DC2626" />
      </View>
      {stats.reservadas > 0 ? (
        <Text style={s.statsHint}>
          Incluye {stats.reservadas} reservada{stats.reservadas === 1 ? '' : 's'} · {stats.bloques} bloque{stats.bloques === 1 ? '' : 's'}
        </Text>
      ) : stats.bloques > 0 ? (
        <Text style={s.statsHint}>{stats.bloques} bloque{stats.bloques === 1 ? '' : 's'} en catálogo</Text>
      ) : null}

      <Text style={s.sectionLabel}>ACCIONES</Text>

      <MenuItem icon="search" label="Buscar" sub="Difuntos, nichos, bloques" iconBg="rgba(34,197,94,0.12)" iconColor="#16A34A" onPress={() => router.push('/buscar')} />
      <MenuItem icon="th-large" label="Campo (Nichos)" sub="Vista por bloque" iconBg="rgba(59,130,246,0.12)" iconColor="#2563EB" onPress={() => router.push('/(tabs)/campo')} />
      <MenuItem icon="map-o" label="Mapa" sub="Vista del recinto" iconBg="rgba(139,92,246,0.12)" iconColor="#7C3AED" onPress={() => router.push('/(tabs)/mapa')} />

      <Text style={s.sectionLabel}>ADMINISTRACIÓN</Text>

      <MenuItem icon="cubes" label="Bloques" sub="Alta y edición" iconBg="rgba(245,158,11,0.14)" iconColor="#D97706" onPress={() => router.push('/admin-bloques')} />
      <MenuItem icon="users" label="Registros" sub="Concesiones, titulares y difuntos" iconBg="rgba(59,130,246,0.12)" iconColor="#2563EB" onPress={() => router.push('/gestion-registros')} />
      <MenuItem icon="folder-open-o" label="Gestión avanzada" sub="Pantalla técnica (opcional)" iconBg="rgba(15,23,42,0.06)" iconColor="#64748B" onPress={() => router.push('/(tabs)/gestion')} />

      <Text style={s.sectionLabel}>CUENTA</Text>

      {user ? (
        <MenuItem icon="sign-out" label="Cerrar sesión" sub="" danger onPress={signOut} />
      ) : (
        <MenuItem icon="sign-in" label="Iniciar sesión" sub="Accede para guardar cambios" iconBg="rgba(34,197,94,0.12)" iconColor="#16A34A" onPress={() => router.push('/login')} />
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function Stat({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <View style={s.statBox}>
      <Text style={[s.statValue, { color }]}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

function MenuItem({
  icon,
  label,
  sub,
  onPress,
  danger,
  iconBg,
  iconColor,
}: {
  icon: React.ComponentProps<typeof FontAwesome>['name'];
  label: string;
  sub: string;
  onPress: () => void;
  danger?: boolean;
  iconBg?: string;
  iconColor?: string;
}) {
  return (
    <TouchableOpacity style={s.menuItem} onPress={onPress} activeOpacity={0.85}>
      <View style={[s.menuIcon, { backgroundColor: danger ? 'rgba(239,68,68,0.10)' : (iconBg ?? 'rgba(15,23,42,0.06)') }]}>
        <FontAwesome name={icon} size={18} color={danger ? '#EF4444' : (iconColor ?? '#0F172A')} />
      </View>
      <View style={s.menuText}>
        <Text style={[s.menuLabel, danger && { color: '#DC2626' }]}>{label}</Text>
        {sub ? <Text style={s.menuSub}>{sub}</Text> : null}
      </View>
      <FontAwesome name="chevron-right" size={14} color="rgba(15,23,42,0.25)" />
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3EFE6' },
  content: { padding: 16 },

  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.lg,
    padding: Space.md,
    borderWidth: 1,
    borderColor: Semantic.border,
    marginBottom: 14,
    ...Shadow.subtle,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#2B3A2E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#FFFFFF', fontWeight: '900', fontSize: 16 },
  profileName: { fontSize: 16, fontWeight: '900', color: '#0F172A' },
  profileEmail: { marginTop: 2, fontSize: 13, fontWeight: '700', color: 'rgba(15,23,42,0.50)' },

  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Semantic.border,
    paddingVertical: 12,
    alignItems: 'center',
  },
  statValue: { fontSize: 22, fontWeight: '900' },
  statLabel: { marginTop: 2, fontSize: 11, fontWeight: '800', color: 'rgba(15,23,42,0.45)' },
  statsHint: {
    marginTop: -6,
    marginBottom: 10,
    paddingHorizontal: 4,
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(15,23,42,0.48)',
  },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: 'rgba(15,23,42,0.40)',
    letterSpacing: 1.4,
    marginBottom: 8,
    marginTop: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.md,
    padding: 14,
    marginBottom: 8,
    gap: 12,
    minHeight: 60,
    borderWidth: 1,
    borderColor: Semantic.border,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuText: { flex: 1 },
  menuLabel: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
  menuSub: { fontSize: 12, color: 'rgba(15,23,42,0.50)', marginTop: 2, fontWeight: '700' },
});

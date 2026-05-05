import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { apiFetch } from '@/lib/laravel-api';
import { normalizeCementerioStatsFromApi } from '@/lib/normalize-cementerio-stats';
import { useAuth } from '@/lib/auth-context';
import { AppCard, AppSkeleton, Radius, Semantic, Shadow, Space } from '@/components/ui';
import { useToast } from '@/lib/toast-context';

type Stats = {
  ocupadas: number;
  total: number;
  libres: number;
  reservadas: number;
  clausuradas?: number;
  mantenimiento?: number;
  porCaducar: number;
  sucesosAbiertos: number;
  actualizadoHaceMin: number | null;
};

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] ?? 'U';
  const b = parts[1]?.[0] ?? parts[0]?.[1] ?? 'X';
  return (a + b).toUpperCase();
}

/** Devuelve saludo según hora del día. */
function greetingForHour(hour: number): string {
  if (hour < 7) return 'Buenas noches';
  if (hour < 13) return 'Buenos días';
  if (hour < 20) return 'Buenas tardes';
  return 'Buenas noches';
}

export default function InicioScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<Stats>({
    ocupadas: 0,
    total: 0,
    libres: 0,
    reservadas: 0,
    clausuradas: 0,
    mantenimiento: 0,
    porCaducar: 0,
    sucesosAbiertos: 0,
    actualizadoHaceMin: null,
  });

  const nombreOperario = useMemo(() => {
    const n =
      user?.name ??
      user?.nombre ??
      user?.nombre_completo ??
      user?.email ??
      'Operario';
    return String(n);
  }, [user]);

  const initials = useMemo(() => initialsFromName(nombreOperario), [nombreOperario]);

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const greeting = useMemo(() => greetingForHour(now.getHours()), [now]);

  const fechaTop = useMemo(() => {
    const weekday = now.toLocaleDateString('es-ES', { weekday: 'long' }).toUpperCase();
    const day = String(now.getDate()).padStart(2, '0');
    const month = now.toLocaleDateString('es-ES', { month: 'short' }).replace('.', '').toUpperCase();
    return `${weekday} · ${day} ${month}`;
  }, [now]);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const r = await apiFetch<any>('/api/cementerio/stats');
      if (r.ok) {
        const it = (r.data as any)?.items ?? (r.data as any);
        const n = normalizeCementerioStatsFromApi(it);
        setStats({
          ocupadas: n.ocupadas,
          total: n.total,
          libres: n.libres,
          reservadas: n.reservadas,
          clausuradas: n.clausuradas,
          mantenimiento: n.mantenimiento,
          porCaducar: Number(it.por_caducar ?? it.porCaducar ?? it.caducan_12m ?? 0),
          sucesosAbiertos: Number(it.sucesos_abiertos ?? it.sucesosAbiertos ?? 0),
          actualizadoHaceMin: it.actualizado_hace_min != null ? Number(it.actualizado_hace_min) : null,
        });
      } else if (!silent) {
        toast.error('No se pudieron cargar las estadísticas');
      }
    } catch {
      if (!silent) toast.error('Error de conexión al cargar estadísticas');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toast]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load(true);
  }, [load]);

  const pctOcup = useMemo(() => {
    const libres = Number(stats.libres ?? 0);
    const ocupadas = Number(stats.ocupadas ?? 0);
    const reservadas = Number(stats.reservadas ?? 0);
    const clausuradas = Number(stats.clausuradas ?? 0);
    const mantenimiento = Number(stats.mantenimiento ?? 0);
    const sumEstados = libres + ocupadas + reservadas + clausuradas + mantenimiento;
    const totalReal = Math.max(Number(stats.total ?? 0), sumEstados);
    if (!totalReal) return 0;
    const noLibres = Math.max(0, totalReal - libres);
    return Math.max(0, Math.min(100, Math.round((noLibres / totalReal) * 100)));
  }, [stats.clausuradas, stats.libres, stats.mantenimiento, stats.ocupadas, stats.reservadas, stats.total]);

  const actualizado = stats.actualizadoHaceMin != null ? `Actualiz. hace ${stats.actualizadoHaceMin} min` : 'Ahora';

  return (
    <View style={s.screen}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#15803D" colors={['#15803D']} />
        }
      >
        {/* Header con avatar y saludo */}
        <View style={s.top}>
          <Text style={s.topOver}>{fechaTop}</Text>
          <View style={s.topRow}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={s.greet}>
                {greeting},{' '}
                <Text style={s.greetName}>{String(nombreOperario).split(' ')[0] ?? nombreOperario}</Text>
              </Text>
            </View>
            <View style={s.topActions}>
              <View style={s.onlinePill}>
                <View style={s.onlineDot} />
                <Text style={s.onlineT}>online</Text>
              </View>
              <View style={s.avatarCircle}>
                <Text style={s.avatarText}>{initials}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Tarjeta de ocupación */}
        {loading ? (
          <View style={s.occWrap}>
            <AppCard style={s.occCard} padded={false}>
              <View style={{ padding: Space.md }}>
                <AppSkeleton h={10} w={160} r={6} />
                <View style={{ height: 10 }} />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                  <AppSkeleton h={44} w={120} r={12} />
                  <View style={{ alignItems: 'flex-end' }}>
                    <AppSkeleton h={14} w={80} r={8} />
                    <View style={{ height: 8 }} />
                    <AppSkeleton h={10} w={60} r={6} />
                  </View>
                </View>
                <View style={{ height: 14 }} />
                <AppSkeleton h={6} w="100%" r={999} />
                <View style={{ height: 14 }} />
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                  <AppSkeleton h={12} w={90} r={8} />
                  <AppSkeleton h={12} w={95} r={8} />
                  <AppSkeleton h={12} w={105} r={8} />
                  <AppSkeleton h={12} w={110} r={8} />
                </View>
              </View>
            </AppCard>
          </View>
        ) : (
          <View style={s.occWrap}>
            <AppCard style={s.occCard} padded={false}>
              <View style={{ padding: Space.md }}>
                <Text style={s.occTitle}>OCUPACIÓN GENERAL</Text>
                <View style={s.occRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6 }}>
                    <Text style={s.occPct}>{pctOcup}</Text>
                    <Text style={s.occPctSym}>%</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={s.occRightBig}>
                      {stats.ocupadas}{' '}
                      <Text style={s.occRightSmall}>
                        de {stats.total > 0 ? stats.total : '—'}
                      </Text>
                    </Text>
                    <Text style={s.occRightLabel}>unidades</Text>
                  </View>
                </View>

                <View style={s.occBar}>
                  <View style={[s.occBarFill, { width: `${pctOcup}%` }]} />
                </View>

                <View style={s.legend}>
                  <LegendDot color="#2F6B4E" label={`Libres ${stats.libres}`} />
                  <LegendDot color="#8B5E34" label={`Ocupadas ${stats.ocupadas}`} />
                  <LegendDot color="#C9A227" label={`Reservadas ${stats.reservadas}`} />
                  <LegendDot color="#64748B" label={`Clausuradas ${stats.clausuradas ?? 0}`} />
                  {(stats.mantenimiento ?? 0) > 0 ? (
                    <LegendDot color="#1266A3" label={`Mantenimiento ${stats.mantenimiento}`} />
                  ) : null}
                </View>
              </View>
            </AppCard>
            <Text style={s.updated}>{actualizado}</Text>
          </View>
        )}

        {/* Barra de búsqueda */}
        <TouchableOpacity style={s.searchPill} onPress={() => router.push('/buscar')} activeOpacity={0.85}>
          <FontAwesome name="search" size={14} color="rgba(15,23,42,0.55)" />
          <Text style={s.searchPillT}>Buscar difunto, nicho o concesión…</Text>
        </TouchableOpacity>

        {/* Accesos rápidos */}
        <Text style={s.accTitle}>ACCESOS RÁPIDOS</Text>
        <View style={s.accGrid}>
          <AccCard
            title="Mapa nichos"
            sub="Vista por bloque"
            icon="th-large"
            iconBg="rgba(34,197,94,0.12)"
            iconColor="#16A34A"
            onPress={() => router.push('/(tabs)/campo')}
          />
          <AccCard
            title="Plano general"
            sub="Cementerio"
            icon="map-o"
            iconBg="rgba(59,130,246,0.12)"
            iconColor="#2563EB"
            onPress={() => router.push('/(tabs)/mapa')}
          />
          <AccCard
            title="Nuevo caso"
            sub="Registrar suceso"
            icon="plus-circle"
            iconBg="rgba(245,158,11,0.14)"
            iconColor="#D97706"
            onPress={() => router.push('/nuevo-suceso')}
          />
          <AccCard
            title="Gestión"
            sub="Expedientes"
            icon="folder-open-o"
            iconBg="rgba(139,92,246,0.12)"
            iconColor="#7C3AED"
            onPress={() => router.push('/(tabs)/gestion')}
          />
        </View>

        {/* Stats rápidos */}
        {!loading && (stats.porCaducar > 0 || stats.sucesosAbiertos > 0) ? (
          <View style={s.alertSection}>
            <Text style={s.accTitle}>ALERTAS</Text>
            {stats.porCaducar > 0 ? (
              <View style={s.alertCard}>
                <View style={[s.alertIcon, { backgroundColor: 'rgba(245,158,11,0.14)' }]}>
                  <FontAwesome name="clock-o" size={16} color="#D97706" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.alertTitle}>{stats.porCaducar} concesiones por caducar</Text>
                  <Text style={s.alertSub}>Próximos 12 meses</Text>
                </View>
                <FontAwesome name="chevron-right" size={12} color="rgba(15,23,42,0.35)" />
              </View>
            ) : null}
            {stats.sucesosAbiertos > 0 ? (
              <View style={s.alertCard}>
                <View style={[s.alertIcon, { backgroundColor: 'rgba(239,68,68,0.12)' }]}>
                  <FontAwesome name="exclamation-triangle" size={14} color="#DC2626" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.alertTitle}>{stats.sucesosAbiertos} sucesos abiertos</Text>
                  <Text style={s.alertSub}>Pendientes de resolución</Text>
                </View>
                <FontAwesome name="chevron-right" size={12} color="rgba(15,23,42,0.35)" />
              </View>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={s.legendItem}>
      <View style={[s.legendDot, { backgroundColor: color }]} />
      <Text style={s.legendT}>{label}</Text>
    </View>
  );
}

function AccCard({
  title,
  sub,
  icon,
  iconBg,
  iconColor,
  onPress,
}: {
  title: string;
  sub: string;
  icon: React.ComponentProps<typeof FontAwesome>['name'];
  iconBg?: string;
  iconColor?: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={s.accCard} onPress={onPress} activeOpacity={0.85}>
      <View style={[s.accIcon, iconBg ? { backgroundColor: iconBg } : null]}>
        <FontAwesome name={icon} size={18} color={iconColor ?? 'rgba(15,23,42,0.75)'} />
      </View>
      <Text style={s.accT}>{title}</Text>
      <Text style={s.accSub}>{sub}</Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F3EFE6' },
  top: { paddingTop: 10, paddingHorizontal: 16 },
  topOver: { fontSize: 11, fontWeight: '900', letterSpacing: 1.4, color: 'rgba(15,23,42,0.35)' },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  greet: { fontSize: 22, fontWeight: '900', color: '#0F172A' },
  greetName: { fontSize: 22, fontWeight: '900', color: 'rgba(15,23,42,0.50)' },
  topActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  onlinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    height: 28,
    borderRadius: 999,
    backgroundColor: 'rgba(34,197,94,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.20)',
  },
  onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#16A34A' },
  onlineT: { fontSize: 12, fontWeight: '800', color: '#166534', textTransform: 'lowercase' },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2B3A2E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#FFFFFF', fontWeight: '900', fontSize: 14 },
  occWrap: { paddingHorizontal: 16, paddingTop: 16 },
  occCard: { borderRadius: Radius.lg, borderWidth: 1, borderColor: Semantic.border, ...Shadow.card },
  occTitle: { fontSize: 11, fontWeight: '900', letterSpacing: 1.4, color: 'rgba(15,23,42,0.45)' },
  occRow: { marginTop: 10, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  occPct: { fontSize: 44, fontWeight: '900', color: '#0F172A', lineHeight: 48 },
  occPctSym: { fontSize: 16, fontWeight: '900', color: 'rgba(15,23,42,0.55)', marginBottom: 8 },
  occRightBig: { fontSize: 13, fontWeight: '900', color: '#0F172A' },
  occRightSmall: { fontSize: 13, fontWeight: '900', color: 'rgba(15,23,42,0.45)' },
  occRightLabel: { marginTop: 4, fontSize: 11, fontWeight: '800', color: 'rgba(15,23,42,0.45)' },
  occBar: { marginTop: 12, height: 6, borderRadius: 999, backgroundColor: 'rgba(15,23,42,0.10)', overflow: 'hidden' },
  occBarFill: { height: 6, borderRadius: 999, backgroundColor: '#8B5E34' },
  legend: { marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 3 },
  legendT: { fontSize: 11, fontWeight: '800', color: 'rgba(15,23,42,0.55)' },
  updated: { marginTop: 8, fontSize: 11, fontWeight: '800', color: 'rgba(15,23,42,0.35)' },

  searchPill: {
    marginTop: 14,
    marginHorizontal: 16,
    height: 46,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.10)',
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    ...Shadow.subtle,
  },
  searchPillT: { fontSize: 13, fontWeight: '800', color: 'rgba(15,23,42,0.45)' },

  accTitle: { marginTop: 18, paddingHorizontal: 16, fontSize: 11, fontWeight: '900', letterSpacing: 1.4, color: 'rgba(15,23,42,0.45)' },
  accGrid: {
    paddingHorizontal: 16,
    paddingTop: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    maxWidth: 560,
    width: '100%',
    alignSelf: 'center',
  },
  accCard: {
    width: '47.5%',
    maxWidth: 280,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.08)',
    padding: 14,
    minHeight: 124,
    ...Shadow.subtle,
  },
  accIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(15,23,42,0.06)', alignItems: 'center', justifyContent: 'center' },
  accT: { marginTop: 10, fontSize: 14, fontWeight: '900', color: '#0F172A' },
  accSub: { marginTop: 4, fontSize: 12, fontWeight: '700', color: 'rgba(15,23,42,0.45)' },

  alertSection: { paddingHorizontal: 16, paddingTop: 4 },
  alertCard: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.08)',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  alertIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertTitle: { fontSize: 13, fontWeight: '800', color: '#0F172A' },
  alertSub: { marginTop: 2, fontSize: 12, fontWeight: '700', color: 'rgba(15,23,42,0.50)' },
});

import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { apiFetch } from '@/lib/laravel-api';
import { useAuth } from '@/lib/auth-context';
import { AppCard, AppSkeleton, Radius, Semantic, Shadow, Space } from '@/components/ui';

type Stats = {
  ocupadas: number;
  total: number;
  libres: number;
  reservadas: number;
  clausuradas?: number;
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

export default function InicioScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({
    ocupadas: 0,
    total: 0,
    libres: 0,
    reservadas: 0,
    clausuradas: 0,
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

  const fechaTop = useMemo(() => {
    const d = new Date();
    const weekday = d.toLocaleDateString('es-ES', { weekday: 'long' }).toUpperCase();
    const day = String(d.getDate()).padStart(2, '0');
    const month = d.toLocaleDateString('es-ES', { month: 'short' }).replace('.', '').toUpperCase();
    return `${weekday} · ${day} ${month}`;
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await apiFetch<any>('/api/cementerio/stats');
    if (r.ok) {
      const it = (r.data as any)?.items ?? (r.data as any);
      setStats({
        ocupadas: Number(it.ocupadas ?? it.ocupados ?? 0),
        total: Number(it.total ?? 0),
        libres: Number(it.libres ?? 0),
        reservadas: Number(it.reservadas ?? 0),
        clausuradas: Number(it.clausuradas ?? 0),
        porCaducar: Number(it.por_caducar ?? it.porCaducar ?? it.caducan_12m ?? 0),
        sucesosAbiertos: Number(it.sucesos_abiertos ?? it.sucesosAbiertos ?? 0),
        actualizadoHaceMin: it.actualizado_hace_min != null ? Number(it.actualizado_hace_min) : null,
      });
      setLoading(false);
      return;
    }
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const pctOcup = useMemo(() => {
    const sum = Number(stats.libres ?? 0) + Number(stats.ocupadas ?? 0) + Number(stats.reservadas ?? 0) + Number(stats.clausuradas ?? 0);
    const totalReal = Math.max(Number(stats.total ?? 0), sum);
    if (!totalReal) return 0;
    // “Ocupación general” = todo lo que NO está libre (incluye reservadas/clausuradas)
    const noLibres = Math.max(0, totalReal - Number(stats.libres ?? 0));
    return Math.max(0, Math.min(100, Math.round((noLibres / totalReal) * 100)));
  }, [stats.clausuradas, stats.libres, stats.ocupadas, stats.reservadas, stats.total]);

  const actualizado = stats.actualizadoHaceMin != null ? `Actualiz. hace ${stats.actualizadoHaceMin} min` : 'Actualiz. —';

  return (
    <View style={s.screen}>
      <ScrollView contentContainerStyle={{ paddingBottom: 90 }}>
        <View style={s.top}>
          <Text style={s.topOver}>{fechaTop}</Text>
          <View style={s.topRow}>
            <Text style={s.greet}>
              Buenos días, <Text style={s.greetName}>{String(nombreOperario).split(' ')[0] ?? nombreOperario}</Text>
            </Text>
            <View style={s.topActions}>
              <View style={s.onlinePill}>
                <View style={s.onlineDot} />
                <Text style={s.onlineT}>online</Text>
              </View>
              <TouchableOpacity style={s.bell} onPress={() => {}} activeOpacity={0.85}>
                <FontAwesome name="bell-o" size={18} color="rgba(15,23,42,0.70)" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

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
            <AppSkeleton h={10} w={130} r={6} style={{ marginTop: 8, opacity: 0.6 }} />
          </View>
        ) : (
          <View style={s.occWrap}>
            <AppCard style={s.occCard} padded={false}>
              <View style={{ padding: Space.md }}>
              <Text style={s.occTitle}>OCUPACIÓN GENERAL</Text>
              <View style={s.occRow}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10 }}>
                  <Text style={s.occPct}>{pctOcup}</Text>
                  <Text style={s.occPctSym}>%</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={s.occRightBig}>
                    {stats.ocupadas} <Text style={s.occRightSmall}>de {stats.total}</Text>
                  </Text>
                  <Text style={s.occRightLabel}>sepulturas</Text>
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
              </View>
              </View>
            </AppCard>
            <Text style={s.updated}>{actualizado}</Text>
          </View>
        )}

        <TouchableOpacity style={s.searchPill} onPress={() => router.push('/buscar')} activeOpacity={0.85}>
          <FontAwesome name="search" size={14} color="rgba(15,23,42,0.55)" />
          <Text style={s.searchPillT}>Buscar difunto, nicho o concesión…</Text>
        </TouchableOpacity>

        <Text style={s.accTitle}>ACCESOS</Text>
        <View style={s.accGrid}>
          <AccCard
            title="Mapa nichos"
            sub="Por bloque"
            icon="map"
            onPress={() => router.push('/(tabs)/campo')}
          />
          <AccCard
            title="Plano general"
            sub="Cementerio"
            icon="globe"
            onPress={() => router.push('/(tabs)/mapa')}
          />
          <AccCard
            title="Nuevo caso"
            sub="Registrar"
            icon="plus"
            onPress={() => router.push('/nuevo-suceso')}
          />
          <AccCard title="Movimientos" sub="Histórico" icon="history" onPress={() => router.push('/(tabs)/gestion')} />
        </View>
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

function AccCard({ title, sub, icon, onPress }: { title: string; sub: string; icon: any; onPress: () => void }) {
  return (
    <TouchableOpacity style={s.accCard} onPress={onPress} activeOpacity={0.85}>
      <View style={s.accIcon}>
        <FontAwesome name={icon} size={18} color="rgba(15,23,42,0.75)" />
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
  greet: { fontSize: 24, fontWeight: '900', color: '#0F172A' },
  greetName: { fontSize: 24, fontWeight: '900', color: 'rgba(15,23,42,0.55)' },
  topActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  onlinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    height: 28,
    borderRadius: 999,
    backgroundColor: 'rgba(15,23,42,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.08)',
  },
  onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#16A34A' },
  onlineT: { fontSize: 12, fontWeight: '900', color: 'rgba(15,23,42,0.70)', textTransform: 'lowercase' },
  bell: { width: 40, height: 40, borderRadius: Radius.md, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: Semantic.border, alignItems: 'center', justifyContent: 'center' },
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
    height: 44,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.10)',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchPillT: { fontSize: 13, fontWeight: '800', color: 'rgba(15,23,42,0.45)' },

  accTitle: { marginTop: 16, paddingHorizontal: 16, fontSize: 11, fontWeight: '900', letterSpacing: 1.4, color: 'rgba(15,23,42,0.45)' },
  accGrid: { paddingHorizontal: 16, paddingTop: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  accCard: { width: '48%', backgroundColor: '#FFFFFF', borderRadius: 18, borderWidth: 1, borderColor: 'rgba(15,23,42,0.10)', padding: 14, minHeight: 110 },
  accIcon: { width: 44, height: 44, borderRadius: 16, backgroundColor: 'rgba(15,23,42,0.06)', alignItems: 'center', justifyContent: 'center' },
  accT: { marginTop: 10, fontSize: 14, fontWeight: '900', color: '#0F172A' },
  accSub: { marginTop: 4, fontSize: 12, fontWeight: '800', color: 'rgba(15,23,42,0.45)' },
});


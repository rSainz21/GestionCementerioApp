import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter } from 'expo-router';
import { apiFetch } from '@/lib/laravel-api';
import { AppCard, AppSkeleton } from '@/components/ui';
import { AppTopBar } from '@/components/ui';
import { colorParaEstadoSepulturaDb, etiquetaEstadoVisibleDb } from '@/lib/estado-sepultura';

type SepulturaHit = {
  id: number;
  codigo?: string | null;
  numero?: number | null;
  estado?: string | null;
  zona_nombre?: string | null;
  bloque_codigo?: string | null;
};

type DifuntoHit = {
  id: number;
  sepultura_id?: number | null;
  nombre_completo?: string | null;
  dni?: string | null;
  label?: string | null;
};

type BloqueHit = { id: number; codigo?: string | null; nombre?: string | null; zona_nombre?: string | null };

type ConcesionHit = {
  id: number;
  numero_expediente?: string | null;
  estado?: string | null;
  sepultura_id?: number | null;
  sepultura_codigo?: string | null;
  concesionario?: string | null;
  label?: string | null;
};

function debounceMs() {
  return 250;
}

export default function BuscarScreen() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'difuntos' | 'concesiones'>('difuntos');
  const [sepulturas, setSepulturas] = useState<SepulturaHit[]>([]);
  const [difuntos, setDifuntos] = useState<DifuntoHit[]>([]);
  const [bloques, setBloques] = useState<BloqueHit[]>([]);
  const [concesiones, setConcesiones] = useState<ConcesionHit[]>([]);

  const hasQuery = q.trim().length >= 2;

  useEffect(() => {
    let alive = true;
    const t = setTimeout(async () => {
      if (!alive) return;
      const qq = q.trim();
      if (qq.length < 2) {
        setSepulturas([]);
        setDifuntos([]);
        setBloques([]);
        setConcesiones([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      const [sRes, dRes, bRes, cRes] = await Promise.all([
        apiFetch<{ items: SepulturaHit[] }>(`/api/cementerio/sepulturas/search?q=${encodeURIComponent(qq)}`),
        apiFetch<{ items: DifuntoHit[] }>(`/api/cementerio/difuntos?q=${encodeURIComponent(qq)}`),
        apiFetch<{ items: BloqueHit[] }>(`/api/cementerio/bloques`),
        apiFetch<{ items: ConcesionHit[] }>(`/api/cementerio/concesiones?limit=80&q=${encodeURIComponent(qq)}`),
      ]);
      if (!alive) return;

      setSepulturas(sRes.ok ? ((sRes.data as any)?.items ?? []) : []);
      setDifuntos(dRes.ok ? ((dRes.data as any)?.items ?? []) : []);
      setConcesiones(cRes.ok ? ((cRes.data as any)?.items ?? []) : []);

      const allBloques: BloqueHit[] = bRes.ok ? (((bRes.data as any)?.items ?? []) as BloqueHit[]) : [];
      const qUpper = qq.toUpperCase();
      const bloquesFiltrados = allBloques
        .filter((b) => String(b?.codigo ?? '').toUpperCase().includes(qUpper) || String(b?.nombre ?? '').toUpperCase().includes(qUpper))
        .slice(0, 12);
      setBloques(bloquesFiltrados);

      setLoading(false);
    }, debounceMs());

    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [q]);

  const empty = useMemo(() => {
    if (!hasQuery || loading) return false;
    return tab === 'difuntos' ? difuntos.length === 0 : concesiones.length === 0;
  }, [concesiones.length, difuntos.length, hasQuery, loading, tab]);

  const headerHint = useMemo(() => {
    if (!hasQuery) return 'Personal y expedientes';
    return tab === 'difuntos' ? `Difuntos · ${difuntos.length} resultados` : `Concesiones · ${concesiones.length} resultados`;
  }, [concesiones.length, difuntos.length, hasQuery, tab]);

  const chipColor = (estado?: string | null) => {
    const e = String(estado ?? '').toLowerCase();
    if (e === 'vigente' || e === 'renovada') return { bg: 'rgba(34,197,94,0.16)', fg: '#166534' };
    if (e === 'caducada' || e === 'vencida') return { bg: 'rgba(239,68,68,0.14)', fg: '#B91C1C' };
    return { bg: 'rgba(245,158,11,0.18)', fg: '#92400E' };
  };

  return (
    <View style={s.screen}>
      <View style={s.top}>
        <AppTopBar
          title="Buscar"
          overline={headerHint}
          onBack={null}
          style={{ paddingTop: 12, paddingBottom: 8, backgroundColor: '#F3EFE6' }}
        />
        <View style={s.searchWrap}>
          <FontAwesome name="search" size={14} color="rgba(15,23,42,0.55)" />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Nombre, apellidos o DNI…"
            placeholderTextColor="rgba(15,23,42,0.40)"
            style={s.searchInput}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {loading ? <ActivityIndicator size="small" color="#15803D" /> : null}
        </View>

        <View style={s.segRow}>
          <TouchableOpacity
            style={[s.segBtn, tab === 'difuntos' && s.segBtnActive]}
            onPress={() => setTab('difuntos')}
            activeOpacity={0.85}
          >
            <Text style={[s.segT, tab === 'difuntos' && s.segTActive]}>Difuntos</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.segBtn, tab === 'concesiones' && s.segBtnActive]}
            onPress={() => setTab('concesiones')}
            activeOpacity={0.85}
          >
            <Text style={[s.segT, tab === 'concesiones' && s.segTActive]}>Concesiones</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={s.body}>
        {!hasQuery ? (
          <AppCard padded>
            <Text style={s.h1}>Buscar</Text>
            <Text style={s.p}>Escribe al menos 2 caracteres. Ejemplos: “García”, “12345678”, “B8”, “N23”.</Text>
          </AppCard>
        ) : null}

        {hasQuery && loading ? (
          <AppCard padded style={{ marginTop: 12 }}>
            <View style={{ gap: 10 }}>
              {Array.from({ length: 8 }).map((_, i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <AppSkeleton h={34} w={34} r={12} />
                  <View style={{ flex: 1 }}>
                    <AppSkeleton h={12} w="78%" r={8} />
                    <View style={{ height: 6 }} />
                    <AppSkeleton h={10} w="52%" r={8} style={{ opacity: 0.7 }} />
                  </View>
                </View>
              ))}
            </View>
          </AppCard>
        ) : null}

        {bloques.length > 0 || sepulturas.length > 0 ? (
          <View style={{ marginTop: 12 }}>
            <Text style={s.sectionTitle}>Accesos rápidos</Text>
            <AppCard padded style={{ marginTop: 8 }}>
              <View style={{ gap: 10 }}>
                {bloques.slice(0, 6).map((b) => (
                  <Row
                    key={`b-${b.id}`}
                    title={String(b.codigo ?? b.nombre ?? `Bloque ${b.id}`)}
                    subtitle={b.zona_nombre ? `Zona ${b.zona_nombre}` : 'Bloque'}
                    icon="th-large"
                    onPress={() => router.push(`/bloque/${encodeURIComponent(String(b.codigo ?? b.id))}`)}
                  />
                ))}
                {sepulturas.slice(0, 6).map((it) => (
                  <Row
                    key={`s-${it.id}`}
                    title={String(it.codigo ?? `Sepultura ${it.id}`)}
                    subtitle={[it.zona_nombre ? `Zona ${it.zona_nombre}` : null, it.bloque_codigo ? `Bloque ${it.bloque_codigo}` : null, it.numero ? `Nº ${it.numero}` : null]
                      .filter(Boolean)
                      .join(' · ')}
                    icon="square"
                    right={
                      <View
                        style={[
                          s.dot,
                          { backgroundColor: colorParaEstadoSepulturaDb(it.estado) },
                        ]}
                      />
                    }
                    onPress={() => router.push(`/sepultura/${it.id}`)}
                  />
                ))}
              </View>
            </AppCard>
          </View>
        ) : null}

        <View style={{ marginTop: 14 }}>
          <Text style={s.sectionTitle}>{headerHint}</Text>
          <AppCard padded style={{ marginTop: 8 }}>
            <View style={{ gap: 10 }}>
              {tab === 'difuntos'
                ? difuntos.slice(0, 18).map((d) => (
                    <Row
                      key={`d-${d.id}`}
                      title={String(d.nombre_completo ?? d.label ?? `Difunto ${d.id}`)}
                      subtitle={String(d.label ?? '')}
                      icon="user"
                      onPress={() => {
                        const sid = Number(d.sepultura_id);
                        if (Number.isFinite(sid) && sid > 0) router.push(`/sepultura/${sid}`);
                      }}
                    />
                  ))
                : concesiones.slice(0, 18).map((c) => {
                    const exp = c.numero_expediente ?? c.label ?? `Expediente ${c.id}`;
                    const sub = [c.sepultura_codigo ? `Sepultura ${c.sepultura_codigo}` : null, c.concesionario ? String(c.concesionario) : null]
                      .filter(Boolean)
                      .join(' · ');
                    const chip = chipColor(c.estado);
                    return (
                      <Row
                        key={`c-${c.id}`}
                        title={String(exp)}
                        subtitle={sub}
                        icon="file-text-o"
                        right={
                          <View style={[s.chip, { backgroundColor: chip.bg }]}>
                            <Text style={[s.chipT, { color: chip.fg }]}>{String(c.estado ?? '—')}</Text>
                          </View>
                        }
                        onPress={() => {
                          const sid = Number(c.sepultura_id);
                          if (Number.isFinite(sid) && sid > 0) router.push(`/sepultura/${sid}`);
                        }}
                      />
                    );
                  })}

              {empty ? <Text style={s.emptyT}>Sin resultados</Text> : null}
            </View>
          </AppCard>
        </View>
      </View>
    </View>
  );
}

function Row({
  title,
  subtitle,
  icon,
  onPress,
  right,
}: {
  title: string;
  subtitle?: string;
  icon: any;
  onPress: () => void;
  right?: any;
}) {
  return (
    <TouchableOpacity style={s.row} onPress={onPress} activeOpacity={0.85}>
      <View style={s.rowIcon}>
        <FontAwesome name={icon} size={14} color="#0F172A" />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={s.rowTitle} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={s.rowSub} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right ?? <FontAwesome name="chevron-right" size={14} color="rgba(15,23,42,0.45)" />}
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F3EFE6' },
  top: { paddingTop: 0, paddingHorizontal: 12, paddingBottom: 8 },
  searchWrap: {
    height: 40,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.10)',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchInput: { flex: 1, fontSize: 14, fontWeight: '800', color: '#0F172A' },
  segRow: {
    flexDirection: 'row',
    marginTop: 10,
    padding: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(15,23,42,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.08)',
    gap: 6,
  },
  segBtn: { flex: 1, height: 34, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  segBtnActive: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: 'rgba(15,23,42,0.12)' },
  segT: { fontSize: 12, fontWeight: '900', color: 'rgba(15,23,42,0.55)' },
  segTActive: { color: '#0F172A' },
  body: { paddingHorizontal: 12, paddingBottom: 20 },
  h1: { fontSize: 16, fontWeight: '900', color: '#0F172A' },
  p: { marginTop: 8, fontSize: 13, fontWeight: '700', color: 'rgba(15,23,42,0.60)', lineHeight: 18 },
  sectionTitle: { marginTop: 2, fontSize: 12, letterSpacing: 1.2, fontWeight: '900', color: 'rgba(15,23,42,0.65)' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowIcon: { width: 28, height: 28, borderRadius: 10, backgroundColor: 'rgba(21,128,61,0.10)', alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontWeight: '900', color: '#0F172A' },
  rowSub: { marginTop: 2, fontSize: 12, fontWeight: '700', color: 'rgba(15,23,42,0.55)' },
  dot: { width: 12, height: 12, borderRadius: 4 },
  chip: { paddingHorizontal: 10, height: 26, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  chipT: { fontSize: 11, fontWeight: '900', textTransform: 'lowercase' },
  emptyT: { textAlign: 'center', fontWeight: '900', color: 'rgba(15,23,42,0.55)' },
});


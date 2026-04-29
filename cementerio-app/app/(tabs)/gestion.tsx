import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter } from 'expo-router';
import { apiFetch } from '@/lib/laravel-api';
import { unwrapItem } from '@/lib/normalize';

type Seg = 'expedientes' | 'titulares' | 'difuntos';

function debounceMs() {
  return 450;
}

export default function GestionTabScreen() {
  const router = useRouter();
  const [seg, setSeg] = useState<Seg>('expedientes');
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<any[]>([]);
  const [loadedAll, setLoadedAll] = useState<Record<string, true>>({});
  const [lastError, setLastError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const baseForSeg = (s: Seg, limit: number) =>
    s === 'expedientes'
      ? `/api/cementerio/concesiones?limit=${limit}`
      : s === 'titulares'
        ? `/api/cementerio/terceros?limit=${limit}`
        : `/api/cementerio/difuntos?limit=${limit}`;

  const asItems = (data: any): any[] => {
    const d = unwrapItem<any>(data);
    if (!d) return [];
    if (Array.isArray(d)) return d;
    if (Array.isArray(d.items)) return d.items;
    if (Array.isArray(d.data)) return d.data;
    if (Array.isArray((d as any).result)) return (d as any).result;
    return [];
  };

  const fetchAllBySearch = async (s: Seg) => {
    const limit = 200;
    const base = baseForSeg(s, limit);
    // Muchos backends no devuelven nada con q vacío o de 1 carácter.
    // Usamos tokens comunes de 2+ chars para “volcar” la lista.
    const tokens = [
      'an', 'ar', 'al', 'as', 'de', 'la', 'el', 'ma', 'me', 'mi', 'mo',
      'jo', 'ju', 'pe', 'pa', 'po', 'ca', 'co', 'cr', 'sa', 'se', 'si',
      'ra', 're', 'ri', 'ro', 'ta', 'te', 'ti', 'to', 'na', 'ne', 'ni', 'no',
      '00', '01', '02', '10', '11', '20',
    ];
    const out: any[] = [];
    const seen = new Set<number>();

    for (const t of tokens) {
      const r = await apiFetch<any>(`${base}&q=${encodeURIComponent(t)}`);
      const items = r.ok ? asItems(r.data) : [];
      for (const it of items) {
        const id = Number(it?.id);
        if (!Number.isFinite(id)) continue;
        if (seen.has(id)) continue;
        seen.add(id);
        out.push(it);
      }
      // Corte por seguridad: no reventar UI si hay miles.
      if (out.length >= 1200) break;
    }
    return out;
  };

  const fetchRows = async (s: Seg, query: string) => {
    setLoading(true);
    setLastError(null);
    const t = query.trim();
    const limit = 200;

    const base = baseForSeg(s, limit);

    const tryFetch = async (url: string) => {
      const r = await apiFetch<any>(url);
      const items = r.ok ? asItems(r.data) : [];
      return {
        ok: r.ok,
        status: r.ok ? 200 : r.status,
        items,
        error: r.ok ? null : r.error,
      };
    };

    if (t) {
      setLoadedAll((p) => {
        const next = { ...p };
        delete (next as any)[s];
        return next;
      });
      const r1 = await tryFetch(`${base}&q=${encodeURIComponent(t)}`);
      if (!r1.ok) setLastError(typeof r1.error === 'string' ? r1.error : JSON.stringify(r1.error));
      setRows(r1.items);
      setLoading(false);
      return;
    }

    // Sin búsqueda: algunos backends devuelven vacío si no hay `q`.
    // Probamos: (1) q vacío (como PWA), (2) sin q, (3) comodín SQL `%`, (4) "*".
    const rEmpty = await tryFetch(`${base}&q=`);
    if (rEmpty.items.length > 0) {
      setRows(rEmpty.items);
      setLoading(false);
      return;
    }

    const r0 = await tryFetch(base);
    if (r0.items.length > 0) {
      setRows(r0.items);
      setLoading(false);
      return;
    }
    const rPct = await tryFetch(`${base}&q=${encodeURIComponent('%')}`);
    if (rPct.items.length > 0) {
      setRows(rPct.items);
      setLoading(false);
      return;
    }
    const rStar = await tryFetch(`${base}&q=*`);
    if (rStar.items.length > 0) {
      setRows(rStar.items);
      setLoading(false);
      return;
    }

    // Último recurso (backend tipo PWA): solo devuelve cosas si `q` tiene texto.
    // Hacemos una “carga total” por tokens (a/e/i/.. + números) y unificamos por id.
    const all = await fetchAllBySearch(s);
    setRows(all);
    if (all.length > 0) setLoadedAll((p) => ({ ...p, [s]: true }));
    if (all.length === 0 && (rEmpty.error || r0.error || rPct.error || rStar.error)) {
      const e = rEmpty.error ?? r0.error ?? rPct.error ?? rStar.error;
      setLastError(typeof e === 'string' ? e : JSON.stringify(e));
    }
    setLoading(false);
  };

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => fetchRows(seg, q), q.trim() ? debounceMs() : 0);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [seg, q]);

  const title = 'Gestión de datos';

  return (
    <View style={s.screen}>
      <View style={s.header}>
        <Text style={s.headerTitle}>{title}</Text>
      </View>

      <View style={s.searchWrap}>
        <FontAwesome name="search" size={14} color="rgba(15,23,42,0.55)" />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Buscar expedientes, titulares, difuntos…"
          placeholderTextColor="rgba(15,23,42,0.35)"
          style={s.search}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity style={s.filterBtn} onPress={() => Alert.alert('Filtros', 'Pendiente (igual que PWA)')} activeOpacity={0.85}>
          <FontAwesome name="sliders" size={14} color="rgba(15,23,42,0.55)" />
        </TouchableOpacity>
      </View>

      <View style={s.segRow}>
        {([
          ['expedientes', 'Expedientes'],
          ['titulares', 'Titulares'],
          ['difuntos', 'Difuntos'],
        ] as const).map(([k, label]) => (
          <TouchableOpacity
            key={k}
            style={[s.segBtn, seg === k && s.segBtnActive]}
            onPress={() => {
              setSeg(k);
              setQ('');
            }}
            activeOpacity={0.85}
          >
            <Text style={[s.segT, seg === k && s.segTActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={s.listHeader}>
        <Text style={s.listHeaderT}>{rows.length} {seg.toUpperCase()}</Text>
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
          {!q.trim() ? (
            <TouchableOpacity onPress={() => fetchRows(seg, '')} activeOpacity={0.85}>
              <Text style={s.filtersT}>{loadedAll[seg] ? 'recargar' : 'cargar todo'}</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity onPress={() => Alert.alert('Filtros', 'Pendiente')} activeOpacity={0.85}>
            <Text style={s.filtersT}>filtros</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color="#2F6B4E" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
          <View style={s.cardList}>
            {rows.map((it, idx) => (
              <View key={String(it.id ?? idx)}>
                {idx > 0 ? <View style={s.hr} /> : null}
                {seg === 'expedientes' ? (
                  <ExpedienteRow it={it} onOpenSepultura={(sid) => sid && router.push(`/sepultura/${sid}`)} />
                ) : seg === 'titulares' ? (
                  <TitularRow it={it} />
                ) : (
                  <DifuntoRow it={it} onOpenSepultura={(sid) => sid && router.push(`/sepultura/${sid}`)} />
                )}
              </View>
            ))}
            {rows.length === 0 ? (
              <View style={{ padding: 18 }}>
                <Text style={{ textAlign: 'center', color: 'rgba(15,23,42,0.55)', fontWeight: '700' }}>
                  {q.trim() ? `Sin resultados para "${q.trim()}"` : 'Sin datos'}
                </Text>
                {!q.trim() && lastError ? (
                  <TouchableOpacity onPress={() => setLastError(lastError)} activeOpacity={0.85} style={{ marginTop: 10, alignSelf: 'center' }}>
                    <Text style={{ textAlign: 'center', color: '#2F6B4E', fontWeight: '900' }}>Ver detalle del error</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : null}
          </View>
        </ScrollView>
      )}

      <Modal visible={!!lastError} transparent animationType="fade" onRequestClose={() => setLastError(null)}>
        <View style={s.errBackdrop}>
          <View style={s.errSheet}>
            <View style={s.errHead}>
              <Text style={s.errTitle}>Detalle del error</Text>
              <TouchableOpacity style={s.closeBtn} onPress={() => setLastError(null)} activeOpacity={0.85}>
                <FontAwesome name="times" size={18} color="rgba(15,23,42,0.65)" />
              </TouchableOpacity>
            </View>
            <Text style={s.errHint}>Copia/pega este texto aquí para poder arreglar el endpoint.</Text>
            <ScrollView style={s.errBox}>
              <Text selectable style={s.errText}>{lastError ?? ''}</Text>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function ChipEstado({ estado }: { estado: string }) {
  const e = String(estado ?? '').toLowerCase();
  const isOk = e === 'vigente' || e === 'renovada';
  const bg = isOk ? 'rgba(47,107,78,0.15)' : 'rgba(239,68,68,0.14)';
  const fg = isOk ? '#2F6B4E' : '#DC2626';
  return (
    <View style={[s.chip, { backgroundColor: bg }]}>
      <View style={[s.chipDot, { backgroundColor: fg }]} />
      <Text style={[s.chipT, { color: fg }]}>{estado ?? '—'}</Text>
    </View>
  );
}

function ExpedienteRow({ it, onOpenSepultura }: { it: any; onOpenSepultura: (id: number | null) => void }) {
  const exp = it.numero_expediente ?? it.label ?? '—';
  const titular = it.titular_nombre ?? it.titular ?? it.nombre_titular ?? '';
  const sep = it.sepultura_label ?? it.sepultura_codigo ?? it.sepultura_id ?? '';
  const meta = [it.tipo, it.bloque_codigo ?? it.bloque, it.fecha_inicio ?? it.fecha_alta].filter(Boolean).join(' · ');
  return (
    <TouchableOpacity style={s.row} onPress={() => onOpenSepultura(it.sepultura_id ?? null)} activeOpacity={0.85}>
      <View style={s.rowIcon}>
        <FontAwesome name="file-o" size={16} color="rgba(15,23,42,0.55)" />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={s.rowTopMono} numberOfLines={1}>{String(exp)}</Text>
        <Text style={s.rowTitle} numberOfLines={1}>{String(titular || '—')}</Text>
        <Text style={s.rowSub} numberOfLines={1}>{String(sep)}{meta ? ` · ${meta}` : ''}</Text>
      </View>
      <ChipEstado estado={it.estado ?? 'vigente'} />
    </TouchableOpacity>
  );
}

function TitularRow({ it }: { it: any }) {
  const name = it.nombre_completo ?? [it.nombre, it.apellido1, it.apellido2].filter(Boolean).join(' ');
  const dni = it.dni ?? '—';
  return (
    <View style={s.row}>
      <View style={[s.rowIcon, { borderRadius: 999 }]}>
        <FontAwesome name="user" size={16} color="#2F6B4E" />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={s.rowTitle} numberOfLines={1}>{String(name || '—')}</Text>
        <Text style={s.rowSub} numberOfLines={1}>DNI: {String(dni)}</Text>
      </View>
    </View>
  );
}

function DifuntoRow({ it, onOpenSepultura }: { it: any; onOpenSepultura: (id: number | null) => void }) {
  const name = it.nombre_completo ?? '—';
  const sub = [it.fecha_fallecimiento ? `✝ ${it.fecha_fallecimiento}` : null, it.fecha_inhumacion ? `Inhumado ${it.fecha_inhumacion}` : null].filter(Boolean).join(' · ');
  return (
    <TouchableOpacity style={s.row} onPress={() => onOpenSepultura(it.sepultura_id ?? null)} activeOpacity={0.85}>
      <View style={[s.rowIcon, { borderRadius: 999 }]}>
        <FontAwesome name="user" size={16} color="rgba(15,23,42,0.55)" />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={s.rowTitle} numberOfLines={1}>{String(name)}</Text>
        <Text style={s.rowSub} numberOfLines={1}>{sub || '—'}</Text>
      </View>
      {it.es_titular ? <View style={s.badgeTitular}><Text style={s.badgeTitularT}>titular</Text></View> : null}
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F3EFE6' },
  header: { paddingTop: 14, paddingHorizontal: 16, paddingBottom: 10 },
  headerTitle: { fontSize: 18, fontWeight: '900', color: '#0F172A' },
  searchWrap: {
    marginHorizontal: 16,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FBF7EE',
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.10)',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  search: { flex: 1, fontSize: 14, fontWeight: '800', color: '#0F172A' },
  filterBtn: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(15,23,42,0.04)' },
  segRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
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

  listHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 },
  listHeaderT: { fontSize: 12, fontWeight: '900', letterSpacing: 1.6, color: 'rgba(15,23,42,0.45)' },
  filtersT: { fontSize: 12, fontWeight: '800', color: 'rgba(15,23,42,0.45)' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  cardList: { marginHorizontal: 16, backgroundColor: '#FBF7EE', borderRadius: 18, borderWidth: 1, borderColor: 'rgba(15,23,42,0.10)', overflow: 'hidden' },
  hr: { height: 1, backgroundColor: 'rgba(15,23,42,0.08)' },
  row: { paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(15,23,42,0.06)', alignItems: 'center', justifyContent: 'center' },
  rowTopMono: { fontSize: 12, fontWeight: '900', color: '#0F172A' },
  rowTitle: { marginTop: 2, fontSize: 15, fontWeight: '900', color: '#0F172A' },
  rowSub: { marginTop: 4, fontSize: 12, fontWeight: '700', color: 'rgba(15,23,42,0.55)' },

  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, height: 26, borderRadius: 999 },
  chipDot: { width: 6, height: 6, borderRadius: 3 },
  chipT: { fontSize: 11, fontWeight: '900', textTransform: 'lowercase' },
  badgeTitular: { paddingHorizontal: 10, height: 26, borderRadius: 999, backgroundColor: 'rgba(15,23,42,0.06)', alignItems: 'center', justifyContent: 'center' },
  badgeTitularT: { fontSize: 11, fontWeight: '900', color: 'rgba(15,23,42,0.65)' },

  errBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  errSheet: {
    width: '100%',
    maxWidth: 720,
    backgroundColor: '#FBF7EE',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.12)',
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: Platform.OS === 'ios' ? 22 : 14,
  },
  closeBtn: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: 'rgba(15,23,42,0.10)' },
  errHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  errTitle: { fontSize: 16, fontWeight: '900', color: '#0F172A' },
  errHint: { marginTop: 6, fontSize: 12, fontWeight: '700', color: 'rgba(15,23,42,0.55)' },
  errBox: { marginTop: 12, maxHeight: 420, backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(15,23,42,0.10)', padding: 12 },
  errText: { fontSize: 12, fontWeight: '700', color: '#0F172A' },
});


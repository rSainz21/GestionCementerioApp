import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { Bloque, Sepultura } from '@/lib/types';
import { colorParaEstadoSepulturaDb, etiquetaEstadoVisible } from '@/lib/estado-sepultura';
import { NichoGrid } from '@/components/NichoGrid';
import { apiFetch } from '@/lib/laravel-api';
import { unwrapItem } from '@/lib/normalize';

type SucesoAction =
  | 'registrar_inhumacion_nuevo_difunto'
  | 'venta_nueva_concesion'
  | 'anadir_difunto_inhumacion_compartida'
  | 'exhumacion_traslado'
  | 'cambio_titular_herencia'
  | 'renovar_concesion'
  | 'anadir_documento_foto';

type Step = 'tipo' | 'objetivo';
type ObjetivoMode = 'buscar' | 'bloque';

type SepFull = Sepultura & { cemn_bloques?: { codigo: string } | null; cemn_zonas?: { nombre: string } | null };

function isNumeric(s: string) {
  return /^\d+$/.test(s.trim());
}

export default function NuevoSucesoModal() {
  const router = useRouter();
  const { sepultura_id, numero } = useLocalSearchParams<{ sepultura_id?: string; numero?: string }>();
  const preSepId = sepultura_id ? Number(sepultura_id) : null;
  const preNumero = (numero ?? '').trim();

  const [step, setStep] = useState<Step>('tipo');
  const [action, setAction] = useState<SucesoAction | null>(null);
  const [objetivoMode, setObjetivoMode] = useState<ObjetivoMode>('buscar');

  const [selected, setSelected] = useState<SepFull | null>(null);
  // Reservado para futuros workflows que requieran validaciones extra.

  // Buscar sepultura (código/número)
  const [q, setQ] = useState('');
  const [loadingBuscar, setLoadingBuscar] = useState(false);
  const [rows, setRows] = useState<SepFull[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Bloques + grid
  const [bloques, setBloques] = useState<(Bloque & { zona_nombre?: string })[]>([]);
  const [bloqueActivo, setBloqueActivo] = useState<number | null>(null);
  const [sepulturasBloque, setSepulturasBloque] = useState<Sepultura[]>([]);
  const [loadingBloque, setLoadingBloque] = useState(false);

  const requiereSepultura = useMemo(() => {
    // Solo los flujos hoy conectados + que realmente necesitan una sepultura.
    // Los de concesiones/titulares se implementan aparte y no deben bloquear el "Continuar".
    if (!action) return false;
    return (
      action === 'registrar_inhumacion_nuevo_difunto' ||
      action === 'anadir_difunto_inhumacion_compartida' ||
      action === 'exhumacion_traslado' ||
      action === 'anadir_documento_foto' ||
      action === 'venta_nueva_concesion' ||
      action === 'cambio_titular_herencia' ||
      action === 'renovar_concesion'
    );
  }, [action]);

  const title = useMemo(() => {
    switch (action) {
      case 'registrar_inhumacion_nuevo_difunto':
        return 'Registrar inhumación';
      case 'anadir_difunto_inhumacion_compartida':
        return 'Añadir difunto';
      case 'exhumacion_traslado':
        return 'Exhumación / traslado';
      case 'anadir_documento_foto':
        return 'Añadir documento/foto';
      case 'venta_nueva_concesion':
        return 'Venta / nueva concesión';
      case 'cambio_titular_herencia':
        return 'Herencia / cambio titular';
      case 'renovar_concesion':
        return 'Renovar concesión';
      default:
        return 'Nuevo suceso';
    }
  }, [action]);

  const fetchSepulturaById = useCallback(async (id: number) => {
    const res = await apiFetch<any>(`/api/cementerio/sepulturas/${id}`);
    if (res.ok) {
      const it = unwrapItem<SepFull>(res.data);
      if (it) setSelected(it);
    }
  }, []);

  useEffect(() => {
    if (preSepId && Number.isFinite(preSepId) && preSepId > 0) fetchSepulturaById(preSepId);
  }, [preSepId, fetchSepulturaById]);

  const goObjetivo = (a: SucesoAction) => {
    setAction(a);
    // Decidir por la acción seleccionada (no por el estado previo).
    const req =
      a === 'registrar_inhumacion_nuevo_difunto' ||
      a === 'anadir_difunto_inhumacion_compartida' ||
      a === 'exhumacion_traslado' ||
      a === 'anadir_documento_foto' ||
      a === 'venta_nueva_concesion' ||
      a === 'cambio_titular_herencia' ||
      a === 'renovar_concesion';
    if (req) {
      // Si ya venimos con sepultura (desde Campo/Ficha), NO pedir selección otra vez.
      const sid = selected?.id ?? preSepId;
      const num = (selected?.numero ?? preNumero ?? '') as any;
      if (sid) {
        switch (a) {
          case 'registrar_inhumacion_nuevo_difunto':
          case 'anadir_difunto_inhumacion_compartida':
            router.push(`/asignar-difunto?sepultura_id=${sid}&numero=${encodeURIComponent(String(num || sid))}`);
            return;
          case 'exhumacion_traslado':
            router.push(`/exhumacion-traslado?sepultura_id=${sid}&numero=${encodeURIComponent(String(num))}`);
            return;
          case 'anadir_documento_foto':
            router.push(`/anadir-documento-foto?sepultura_id=${sid}&numero=${encodeURIComponent(String(num))}`);
            return;
          case 'venta_nueva_concesion':
            router.push(`/venta-concesion?sepultura_id=${sid}&numero=${encodeURIComponent(String(num))}`);
            return;
          case 'cambio_titular_herencia':
            router.push(`/herencia?sepultura_id=${sid}&numero=${encodeURIComponent(String(num))}`);
            return;
          case 'renovar_concesion':
            router.push(`/renovar-concesion?sepultura_id=${sid}&numero=${encodeURIComponent(String(num))}`);
            return;
        }
      }
      setStep('objetivo');
      return;
    }
    setStep('tipo');
  };

  // Buscar
  const buscar = useCallback(async (query: string) => {
    const t = query.trim();
    if (t.length < 2) {
      setRows([]);
      return;
    }
    setLoadingBuscar(true);
    try {
      const res = await apiFetch<{ items: any[] }>(`/api/cementerio/sepulturas/search?q=${encodeURIComponent(t)}`);
      if (!res.ok) throw new Error(String(res.error ?? 'Error de búsqueda'));
      const mapped = (res.data.items ?? []).map((it: any) => ({
        ...it,
        cemn_bloques: it.bloque_codigo ? { codigo: it.bloque_codigo } : it.cemn_bloques ?? null,
        cemn_zonas: it.zona_nombre ? { nombre: it.zona_nombre } : it.cemn_zonas ?? null,
      }));
      setRows(mapped as SepFull[]);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? String(e));
      setRows([]);
    } finally {
      setLoadingBuscar(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => buscar(q), 250);
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    };
  }, [q, buscar]);

  // Bloques
  useEffect(() => {
    const run = async () => {
      const bloquesRes = await apiFetch<{ items?: any[] }>('/api/cementerio/bloques');
      let mapped: any[] = [];
      if (bloquesRes.ok) {
        mapped = (bloquesRes.data.items ?? []) as any[];
      } else {
        const catRes = await apiFetch<any>('/api/cementerio/catalogo');
        const zonas = catRes.ok ? ((catRes.data as any)?.zonas ?? []) : [];
        const zById = new Map<number, any>(zonas.map((z: any) => [Number(z.id), z]));
        mapped = catRes.ok
          ? (((catRes.data as any)?.bloques ?? []) as any[]).map((b: any) => ({
              ...b,
              zona_nombre: zById.get(Number(b.zona_id))?.nombre,
            }))
          : [];
      }
      setBloques(mapped);
      if (mapped.length > 0) setBloqueActivo((prev) => prev ?? mapped[0].id);
    };
    run();
  }, []);

  useEffect(() => {
    const run = async () => {
      if (!bloqueActivo) return;
      setLoadingBloque(true);
      const res = await apiFetch<{ items: Sepultura[] }>(`/api/cementerio/bloques/${bloqueActivo}/sepulturas`);
      setLoadingBloque(false);
      if (!res.ok) {
        Alert.alert('Error', String(res.error ?? 'No se pudieron cargar sepulturas'));
        setSepulturasBloque([]);
        return;
      }
      setSepulturasBloque((res.data.items ?? []) as Sepultura[]);
    };
    run();
  }, [bloqueActivo]);

  const ejecutar = async () => {
    if (!action) return;
    if (requiereSepultura && !selected) {
      Alert.alert('Falta sepultura', 'Selecciona una sepultura.');
      return;
    }
    const sid = selected?.id;
    const num = selected?.numero ?? '';

    switch (action) {
      case 'registrar_inhumacion_nuevo_difunto':
      case 'anadir_difunto_inhumacion_compartida':
        router.push(`/asignar-difunto?sepultura_id=${sid}&numero=${encodeURIComponent(String(num || sid))}`);
        return;
      case 'exhumacion_traslado':
        router.push(`/exhumacion-traslado?sepultura_id=${sid}&numero=${encodeURIComponent(String(num))}`);
        return;
      case 'anadir_documento_foto':
        router.push(`/anadir-documento-foto?sepultura_id=${sid}&numero=${encodeURIComponent(String(num))}`);
        return;
      case 'venta_nueva_concesion':
        router.push(`/venta-concesion?sepultura_id=${sid}&numero=${encodeURIComponent(String(num))}`);
        return;
      case 'cambio_titular_herencia':
        router.push(`/herencia?sepultura_id=${sid}&numero=${encodeURIComponent(String(num))}`);
        return;
      case 'renovar_concesion':
        router.push(`/renovar-concesion?sepultura_id=${sid}&numero=${encodeURIComponent(String(num))}`);
        return;
      default:
        Alert.alert('Pendiente', 'Este flujo aún no está conectado.');
        return;
    }
  };

  const TipoCard = ({ a, icon, t, sub }: { a: SucesoAction; icon: any; t: string; sub: string }) => (
    <TouchableOpacity style={s.card} onPress={() => goObjetivo(a)} activeOpacity={0.85}>
      <View style={s.iconWrap}>
        <FontAwesome name={icon} size={18} color="#15803D" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.cardT}>{t}</Text>
        <Text style={s.cardSub}>{sub}</Text>
      </View>
      <FontAwesome name="chevron-right" size={16} color="#94A3B8" />
    </TouchableOpacity>
  );

  return (
    <View style={s.screen}>
      <View style={s.top}>
        <TouchableOpacity onPress={() => (step === 'objetivo' ? setStep('tipo') : router.back())} style={s.back} hitSlop={10}>
          <FontAwesome name="chevron-left" size={18} color="#0F172A" />
        </TouchableOpacity>
        <Text style={s.h1}>{step === 'tipo' ? 'Nuevo suceso' : title}</Text>
        <View style={{ width: 36 }} />
      </View>

      {step === 'tipo' ? (
        <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 20 }}>
          <Text style={s.section}>Sobre sepultura</Text>
          <TipoCard a="registrar_inhumacion_nuevo_difunto" icon="plus-circle" t="Inhumación (nuevo difunto)" sub="Alta rápida en campo." />
          <TipoCard a="anadir_difunto_inhumacion_compartida" icon="users" t="Añadir difunto" sub="Inhumación compartida." />
          <TipoCard a="exhumacion_traslado" icon="exchange" t="Exhumación / traslado" sub="Selecciona difunto y registra movimiento." />
          <TipoCard a="anadir_documento_foto" icon="paperclip" t="Documento / foto" sub="Subir evidencia (lápida, certificado…)." />

          <Text style={[s.section, { marginTop: 18 }]}>Concesiones / titulares</Text>
          <TipoCard a="venta_nueva_concesion" icon="file-text-o" t="Venta / nueva concesión" sub="Alta de titular + contrato." />
          <TipoCard a="cambio_titular_herencia" icon="gavel" t="Herencia / cambio titular" sub="Añadir heredero a la concesión." />
          <TipoCard a="renovar_concesion" icon="calendar-check-o" t="Renovar concesión" sub="Actualizar vencimiento y estado." />
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }}>
          <View style={s.objTabs}>
            <TouchableOpacity style={[s.tab, objetivoMode === 'buscar' && s.tabActive]} onPress={() => setObjetivoMode('buscar')} activeOpacity={0.85}>
              <Text style={[s.tabT, objetivoMode === 'buscar' && s.tabTActive]}>Buscar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.tab, objetivoMode === 'bloque' && s.tabActive]} onPress={() => setObjetivoMode('bloque')} activeOpacity={0.85}>
              <Text style={[s.tabT, objetivoMode === 'bloque' && s.tabTActive]}>Bloque</Text>
            </TouchableOpacity>
          </View>

          <View style={s.selectedBox}>
            <Text style={s.selectedL}>Sepultura</Text>
            <Text style={s.selectedT}>
              {selected
                ? `${selected.cemn_zonas?.nombre ?? '—'} > ${selected.cemn_bloques?.codigo ?? '—'} > N.º ${selected.numero ?? selected.id}`
                : 'No seleccionada'}
            </Text>
            {selected ? (
              <View style={s.selectedRow}>
                <View style={s.badge}>
                  <Text style={s.badgeT}>{etiquetaEstadoVisible(selected.estado).toUpperCase()}</Text>
                </View>
              </View>
            ) : null}
          </View>

          {objetivoMode === 'buscar' ? (
            <View style={{ flex: 1 }}>
              <View style={s.searchRow}>
                <FontAwesome name="search" size={16} color="#64748B" />
                <TextInput
                  style={s.search}
                  value={q}
                  onChangeText={setQ}
                  placeholder="Código o número…"
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {loadingBuscar ? <ActivityIndicator color="#16A34A" /> : null}
              </View>
              <FlatList
                data={rows}
                keyExtractor={(it) => String(it.id)}
                contentContainerStyle={{ padding: 12, paddingBottom: 120 }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[s.row, selected?.id === item.id && s.rowActive]}
                    onPress={() => setSelected(item)}
                    activeOpacity={0.85}
                  >
                    <View style={[s.dot, { backgroundColor: colorParaEstadoSepulturaDb(item.estado) }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={s.rowT}>{item.cemn_bloques?.codigo ?? '—'} · N.º {item.numero ?? item.id}</Text>
                      <Text style={s.rowSub}>{item.cemn_zonas?.nombre ?? '—'} · {item.codigo ?? 'Sin código'}</Text>
                    </View>
                    <FontAwesome name="chevron-right" size={16} color="#94A3B8" />
                  </TouchableOpacity>
                )}
                ListEmptyComponent={<View style={{ padding: 16 }}><Text style={s.empty}>Escribe 2+ caracteres para buscar.</Text></View>}
              />
            </View>
          ) : (
            <View style={{ flex: 1 }}>
              <View style={s.bloqueRow}>
                <Text style={s.bloqueL}>Bloque</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 12 }}>
                  {bloques.map((b) => (
                    <TouchableOpacity
                      key={b.id}
                      style={[s.pill, bloqueActivo === b.id && s.pillActive]}
                      onPress={() => setBloqueActivo(b.id)}
                      activeOpacity={0.85}
                    >
                      <Text style={[s.pillT, bloqueActivo === b.id && s.pillTActive]}>{b.codigo}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              {loadingBloque ? (
                <View style={s.center}><ActivityIndicator size="large" color="#16A34A" /><Text style={s.centerT}>Cargando nichos…</Text></View>
              ) : (
                <NichoGrid
                  sepulturas={sepulturasBloque}
                  filas={bloques.find((b) => b.id === bloqueActivo)?.filas ?? 4}
                  columnas={bloques.find((b) => b.id === bloqueActivo)?.columnas ?? 1}
                  onNichoPress={async (sep) => {
                    const res = await apiFetch<any>(`/api/cementerio/sepulturas/${sep.id}`);
                    if (!res.ok) {
                      Alert.alert('Error', String(res.error ?? 'No se pudo cargar la sepultura'));
                      return;
                    }
                    const it = unwrapItem<SepFull>(res.data);
                    if (it) setSelected(it);
                  }}
                />
              )}
            </View>
          )}

          <View style={s.bottom}>
            <TouchableOpacity style={[s.btn, s.ghost]} onPress={() => router.back()} activeOpacity={0.85}>
              <Text style={s.ghostT}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.btn, s.primary, (!selected || !action) && { opacity: 0.55 }]}
              onPress={ejecutar}
              disabled={
                !action ||
                (requiereSepultura && !selected)
              }
              activeOpacity={0.85}
            >
              <Text style={s.primaryT}>Continuar</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F8FAFC' },
  top: { height: 54, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  back: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  h1: { fontSize: 16, fontWeight: '900', color: '#0F172A' },
  section: { marginTop: 6, marginBottom: 10, fontSize: 12, fontWeight: '900', color: '#334155', paddingHorizontal: 4 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 14, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 10 },
  iconWrap: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#DCFCE7', borderWidth: 1, borderColor: '#86EFAC', alignItems: 'center', justifyContent: 'center' },
  cardT: { fontSize: 14, fontWeight: '900', color: '#0F172A' },
  cardSub: { marginTop: 3, fontSize: 12, fontWeight: '700', color: '#64748B' },
  objTabs: { flexDirection: 'row', padding: 10, gap: 10, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  tab: { flex: 1, height: 40, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  tabActive: { backgroundColor: '#15803D', borderColor: '#15803D' },
  tabT: { fontWeight: '900', color: '#334155' },
  tabTActive: { color: '#FFFFFF' },
  selectedBox: { margin: 12, borderRadius: 16, padding: 12, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0' },
  selectedL: { fontSize: 12, fontWeight: '900', color: '#334155' },
  selectedT: { marginTop: 6, fontSize: 14, fontWeight: '900', color: '#0F172A' },
  selectedRow: { marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
  badge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: '#DCFCE7', borderWidth: 1, borderColor: '#86EFAC' },
  badgeT: { fontSize: 12, fontWeight: '900', color: '#15803D' },
  searchRow: { marginHorizontal: 12, marginTop: 0, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 14, paddingHorizontal: 12, height: 48 },
  search: { flex: 1, fontSize: 14, fontWeight: '700', color: '#0F172A' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 14, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 10 },
  rowActive: { borderColor: '#86EFAC', backgroundColor: '#ECFDF5' },
  dot: { width: 12, height: 12, borderRadius: 4 },
  rowT: { fontSize: 14, fontWeight: '900', color: '#0F172A' },
  rowSub: { marginTop: 3, fontSize: 12, fontWeight: '700', color: '#64748B' },
  empty: { color: '#94A3B8', fontWeight: '800' },
  bloqueRow: { paddingVertical: 10 },
  bloqueL: { paddingHorizontal: 12, fontSize: 12, fontWeight: '900', color: '#334155', marginBottom: 8 },
  pill: { paddingHorizontal: 14, height: 40, borderRadius: 12, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center' },
  pillActive: { backgroundColor: '#15803D', borderColor: '#15803D' },
  pillT: { fontWeight: '900', color: '#334155' },
  pillTActive: { color: '#FFFFFF' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  centerT: { color: '#64748B', fontWeight: '800' },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 14, paddingTop: 12, paddingBottom: Platform.OS === 'ios' ? 26 : 14, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E5E7EB', flexDirection: 'row', gap: 10 },
  btn: { flex: 1, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  ghost: { backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0' },
  ghostT: { color: '#0F172A', fontWeight: '900' },
  primary: { backgroundColor: '#16A34A' },
  primaryT: { color: '#fff', fontWeight: '900' },
});


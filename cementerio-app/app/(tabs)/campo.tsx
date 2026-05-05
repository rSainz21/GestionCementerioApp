import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as Clipboard from 'expo-clipboard';
import type { Bloque, Sepultura } from '@/lib/types';
import { getQueueCount, processAuditQueue } from '@/lib/auditoria-queue';
import {
  appendFieldNote,
  deleteFieldNote,
  formatFieldNotesExport,
  loadFieldNotes,
  type CampoFieldNote,
} from '@/lib/campo-field-notes';
import { loadRecientes, touchReciente, type CampoReciente } from '@/lib/campo-recientes';
import { useToast } from '@/lib/toast-context';
import { etiquetaEstadoVisible, normalizarEstadoDb } from '@/lib/estado-sepultura';
import { NichoGrid } from '@/components/NichoGrid';
import { apiFetch } from '@/lib/laravel-api';
import { unwrapItem } from '@/lib/normalize';
import { AppButton, AppCard, AppPill } from '@/components/ui';
import * as Location from 'expo-location';
type SepListRow = Sepultura & { cemn_bloques?: { codigo: string } | null; cemn_zonas?: { nombre: string } | null };

function isNumeric(s: string) {
  return /^\d+$/.test(s.trim());
}

export default function CampoScreen() {
  const router = useRouter();
  const toast = useToast();
  const [selected, setSelected] = useState<SepListRow | null>(null);

  const [bloques, setBloques] = useState<(Bloque & { zona_nombre?: string })[]>([]);
  const [bloqueActivo, setBloqueActivo] = useState<number | null>(null);
  const [zonaActiva, setZonaActiva] = useState<number | 'todas'>('todas');
  const [sepulturasBloque, setSepulturasBloque] = useState<Sepultura[]>([]);
  const [loadingBloque, setLoadingBloque] = useState(false);

  const [crearOpen, setCrearOpen] = useState(false);
  const [crearFila, setCrearFila] = useState<number | null>(null);
  const [crearCol, setCrearCol] = useState<number | null>(null);
  const [crearCodigo, setCrearCodigo] = useState('');
  const [crearEstado, setCrearEstado] = useState<'libre' | 'reservada' | 'ocupada'>('libre');
  const [crearNotas, setCrearNotas] = useState('');
  const [crearGps, setCrearGps] = useState<{ lat: number; lon: number } | null>(null);
  const [crearGpsAcc, setCrearGpsAcc] = useState<number | null>(null);
  const [crearGpsTs, setCrearGpsTs] = useState<number | null>(null);
  const [crearSaving, setCrearSaving] = useState(false);

  const [recientes, setRecientes] = useState<CampoReciente[]>([]);
  const [notesCount, setNotesCount] = useState(0);
  const [auditQueueCount, setAuditQueueCount] = useState(0);
  const [fieldModal, setFieldModal] = useState(false);
  const [fieldText, setFieldText] = useState('');
  const [fieldGps, setFieldGps] = useState<{ lat: number; lon: number; acc: number | null } | null>(null);
  const [fieldBusy, setFieldBusy] = useState(false);
  const [notesListOpen, setNotesListOpen] = useState(false);
  const [notesList, setNotesList] = useState<CampoFieldNote[]>([]);

  const seleccionarSepultura = useCallback(async (sepulturaId: number) => {
    const res = await apiFetch<any>(`/api/cementerio/sepulturas/${sepulturaId}`);
    if (!res.ok) {
      Alert.alert('Error', String(res.error ?? 'No se pudo cargar la sepultura.'));
      return;
    }
    const it = unwrapItem<SepListRow>(res.data);
    if (it) setSelected(it);
  }, []);

  const labelSelected = useMemo(() => {
    if (!selected) return 'Ninguna sepultura seleccionada';
    const b = selected.cemn_bloques?.codigo ?? '—';
    const z = selected.cemn_zonas?.nombre ?? '—';
    const num = selected.numero ?? selected.id;
    return `${z} > ${b} > N.º ${num}`;
  }, [selected]);

  const fetchBloques = useCallback(async () => {
    // Backend del compañero suele tener /cementerio/bloques, pero mantenemos fallback a /cementerio/catalogo.
    const bloquesRes = await apiFetch<{ items?: any[] }>('/api/cementerio/bloques');
    let mapped: any[] = [];
    if (bloquesRes.ok) {
      mapped = (bloquesRes.data.items ?? []) as any[];
    } else {
      const catRes = await apiFetch<any>('/api/cementerio/catalogo');
      if (!catRes.ok) {
        Alert.alert('Error', String(bloquesRes.error ?? catRes.error ?? 'No se pudieron cargar bloques'));
        setBloques([]);
        return;
      }
      const zonas = (catRes.data as any)?.zonas ?? [];
      const zById = new Map<number, any>(zonas.map((z: any) => [Number(z.id), z]));
      mapped = ((catRes.data as any)?.bloques ?? []).map((b: any) => ({
        ...b,
        zona_nombre: zById.get(Number(b.zona_id))?.nombre,
      }));
    }

    setBloques(mapped);
    if (mapped.length > 0) setBloqueActivo((prev) => prev ?? mapped[0].id);
  }, []);

  const bloqueActivoObj = useMemo(() => bloques.find((b) => b.id === bloqueActivo) ?? null, [bloques, bloqueActivo]);

  const refreshCampoTools = useCallback(async () => {
    try {
      const [rec, notes, aq] = await Promise.all([loadRecientes(), loadFieldNotes(), getQueueCount()]);
      setRecientes(rec);
      setNotesCount(notes.length);
      setAuditQueueCount(aq);
    } catch {
      setRecientes([]);
      setNotesCount(0);
      setAuditQueueCount(0);
    }
  }, []);

  const memorizarSepultura = useCallback(
    async (sep: Sepultura) => {
      if (!bloqueActivoObj) return;
      const cod = String((bloqueActivoObj as any)?.codigo ?? '?');
      const num = sep.numero ?? sep.id;
      const list = await touchReciente({ id: sep.id, label: `Bloque ${cod} · n.º ${num}`, updatedAt: Date.now() });
      setRecientes(list);
    },
    [bloqueActivoObj]
  );

  const irAFicha = useCallback(
    async (sep: Sepultura) => {
      await memorizarSepultura(sep);
      seleccionarSepultura(sep.id);
      router.push(`/sepultura/${sep.id}`);
    },
    [memorizarSepultura, router, seleccionarSepultura]
  );

  const irAExh = useCallback(
    async (sep: Sepultura) => {
      await memorizarSepultura(sep);
      seleccionarSepultura(sep.id);
      router.push(`/exhumacion-traslado?sepultura_id=${sep.id}&numero=${encodeURIComponent(String(sep.numero ?? ''))}`);
    },
    [memorizarSepultura, router, seleccionarSepultura]
  );

  const obtenerPosicionGps = useCallback(async (): Promise<{ lat: number; lon: number; acc: number | null } | null> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso GPS', 'Activa la ubicación para usar el GPS.');
        return null;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        mayShowUserSettingsDialog: true,
      });
      return {
        lat: pos.coords.latitude,
        lon: pos.coords.longitude,
        acc: pos.coords.accuracy ?? null,
      };
    } catch (e: any) {
      Alert.alert('GPS', e?.message ?? String(e));
      return null;
    }
  }, []);

  const abrirMenuGps = useCallback(() => {
    Alert.alert('GPS', 'Elige una acción (se pide la posición una vez).', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Copiar coordenadas',
        onPress: () => {
          void (async () => {
            const p = await obtenerPosicionGps();
            if (!p) return;
            const line = `${p.lat.toFixed(6)}, ${p.lon.toFixed(6)}${p.acc != null ? ` (±${Math.round(p.acc)} m)` : ''}`;
            await Clipboard.setStringAsync(line);
            toast.success('Coordenadas copiadas');
          })();
        },
      },
      {
        text: 'Ver en mapa',
        onPress: () => {
          void (async () => {
            const p = await obtenerPosicionGps();
            if (!p) return;
            const q = new URLSearchParams({
              focus_lat: String(p.lat),
              focus_lon: String(p.lon),
              ...(p.acc != null && Number.isFinite(p.acc) ? { focus_acc: String(p.acc) } : {}),
            });
            router.push(`/(tabs)/mapa?${q.toString()}`);
          })();
        },
      },
    ]);
  }, [obtenerPosicionGps, router, toast]);

  const abrirFotoUltimaFicha = useCallback(() => {
    const first = recientes[0];
    if (!first || !Number.isFinite(first.id) || first.id <= 0) {
      Alert.alert(
        'Evidencia / foto',
        'Abre antes una ficha de sepultura (desde el plano o búsqueda). La última visitada se usará aquí.'
      );
      return;
    }
    router.push(`/anadir-documento-foto?sepultura_id=${first.id}`);
  }, [recientes, router]);

  const abrirListaNotas = useCallback(async () => {
    const list = await loadFieldNotes();
    setNotesList(list);
    setNotesListOpen(true);
  }, []);

  const sincronizarColaCambios = useCallback(async () => {
    try {
      const { processed, remaining } = await processAuditQueue();
      const n = await getQueueCount();
      setAuditQueueCount(n);
      toast.success(processed > 0 ? `Enviados ${processed} · pendientes ${remaining}` : 'Cola de cambios al día');
    } catch (e: any) {
      toast.error(typeof e?.message === 'string' ? e.message : 'No se pudo sincronizar');
    }
  }, [toast]);

  const adjuntarGpsAlModal = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso GPS', 'Necesitamos ubicación para adjuntarla a la nota.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setFieldGps({
        lat: pos.coords.latitude,
        lon: pos.coords.longitude,
        acc: pos.coords.accuracy ?? null,
      });
      toast.success('Ubicación añadida a la nota');
    } catch (e: any) {
      Alert.alert('GPS', e?.message ?? String(e));
    }
  }, [toast]);

  const guardarNotaCampo = useCallback(async () => {
    const t = fieldText.trim();
    if (!t) {
      Alert.alert('Texto vacío', 'Describe la incidencia o la observación.');
      return;
    }
    setFieldBusy(true);
    try {
      const notes = await appendFieldNote(t, fieldGps, {
        contextLabel: selected ? labelSelected : null,
      });
      setNotesCount(notes.length);
      toast.success('Nota guardada en el dispositivo');
      setFieldModal(false);
      setFieldText('');
      setFieldGps(null);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? String(e));
    } finally {
      setFieldBusy(false);
    }
  }, [fieldGps, fieldText, labelSelected, selected, toast]);

  const capturarGpsCrear = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso GPS', 'Necesitamos permiso de ubicación para capturar coordenadas.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.BestForNavigation,
        mayShowUserSettingsDialog: true,
      });
      setCrearGpsAcc(pos.coords.accuracy ?? null);
      setCrearGps({ lat: pos.coords.latitude, lon: pos.coords.longitude });
      setCrearGpsTs(Date.now());
    } catch (e: any) {
      Alert.alert('GPS', e?.message ?? String(e));
    }
  }, []);

  const abrirCrear = useCallback(
    (pos: { fila: number; columna: number }) => {
      if (!bloqueActivoObj) return;
      // “Tiene sentido” crearlo dentro del bloque.
      router.push(`/bloque/${encodeURIComponent(String((bloqueActivoObj as any)?.codigo ?? bloqueActivoObj.id))}?crear=1&fila=${pos.fila}&columna=${pos.columna}`);
    },
    [bloqueActivoObj, router]
  );

  const crearSepultura = useCallback(async () => {
    if (!bloqueActivoObj || !crearFila || !crearCol) return;
    try {
      setCrearSaving(true);
      const res = await apiFetch<any>('/api/cementerio/sepulturas', {
        method: 'POST',
        body: {
          zona_id: (bloqueActivoObj as any).zona_id ?? null,
          bloque_id: bloqueActivoObj.id,
          tipo: 'nicho',
          fila: crearFila,
          columna: crearCol,
          codigo: crearCodigo.trim() || null,
          estado: crearEstado,
          lat: crearGps?.lat ?? null,
          lon: crearGps?.lon ?? null,
          notas: crearNotas.trim() || null,
        },
      });
      if (!res.ok) throw new Error(typeof res.error === 'string' ? res.error : 'No se pudo crear la sepultura.');
      setCrearOpen(false);
      // refrescar bloque
      setLoadingBloque(true);
      const r = await apiFetch<{ items: Sepultura[] }>(`/api/cementerio/bloques/${bloqueActivoObj.id}/sepulturas`);
      setLoadingBloque(false);
      if (r.ok) setSepulturasBloque((r.data.items ?? []) as Sepultura[]);
      Alert.alert('Creada', 'Sepultura creada correctamente.');
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? String(e));
    } finally {
      setCrearSaving(false);
    }
  }, [bloqueActivoObj, crearCodigo, crearCol, crearEstado, crearFila, crearGps, crearNotas]);

  const zonas = useMemo(() => {
    // Construimos lista de zonas desde los propios bloques (para no depender de catálogo si falla).
    const byId = new Map<number, { id: number; nombre: string }>();
    for (const b of bloques) {
      const zid = Number((b as any)?.zona_id);
      if (!Number.isFinite(zid)) continue;
      const nombre = String((b as any)?.zona_nombre ?? (b as any)?.zona?.nombre ?? `Zona ${zid}`);
      if (!byId.has(zid)) byId.set(zid, { id: zid, nombre });
    }
    return Array.from(byId.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [bloques]);

  const bloquesFiltrados = useMemo(() => {
    if (zonaActiva === 'todas') return bloques;
    return bloques.filter((b) => Number((b as any)?.zona_id) === Number(zonaActiva));
  }, [bloques, zonaActiva]);

  // Si cambiamos de zona, aseguramos bloque activo válido.
  useEffect(() => {
    if (bloquesFiltrados.length === 0) return;
    const exists = bloqueActivo != null && bloquesFiltrados.some((b) => b.id === bloqueActivo);
    if (!exists) setBloqueActivo(bloquesFiltrados[0].id);
  }, [bloqueActivo, bloquesFiltrados]);

  const fetchSepulturasBloque = useCallback(async (bid: number) => {
    setLoadingBloque(true);
    const res = await apiFetch<{ items: Sepultura[] }>(`/api/cementerio/bloques/${bid}/sepulturas`);
    setLoadingBloque(false);
    if (!res.ok) {
      Alert.alert('Error', String(res.error ?? 'No se pudieron cargar sepulturas'));
      setSepulturasBloque([]);
      return;
    }
    setSepulturasBloque((res.data.items ?? []) as Sepultura[]);
  }, []);

  const statsBloque = useMemo(() => {
    let libre = 0;
    let ocupada = 0;
    let reservada = 0;
    let clausurada = 0;
    let mantenimiento = 0;
    for (const s of sepulturasBloque) {
      const e = normalizarEstadoDb((s as any)?.estado);
      if (e === 'libre') libre++;
      else if (e === 'ocupada') ocupada++;
      else if (e === 'reservada') reservada++;
      else if (e === 'clausurada') clausurada++;
      else if (e === 'mantenimiento') mantenimiento++;
    }
    const otras = clausurada + mantenimiento;
    return { libre, ocupada, reservada, clausurada, mantenimiento, otras, total: sepulturasBloque.length };
  }, [sepulturasBloque]);

  // refresco al volver (p.ej. después de registrar un suceso)
  useFocusEffect(
    useCallback(() => {
      if (!selected) return;
      apiFetch<any>(`/api/cementerio/sepulturas/${selected.id}`).then((r) => {
        if (r.ok && (r.data as any)?.item) setSelected((r.data as any).item as SepListRow);
      });
    }, [selected?.id])
  );

  useFocusEffect(
    useCallback(() => {
      fetchBloques();
      void refreshCampoTools();
    }, [fetchBloques, refreshCampoTools])
  );

  useEffect(() => {
    if (!bloqueActivo) return;
    fetchSepulturasBloque(bloqueActivo);
  }, [bloqueActivo, fetchSepulturasBloque]);

  return (
    <View style={s.screen}>
      <View style={s.header}>
        <View style={s.headRow}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.h1}>Mapa de nichos</Text>
            <Text style={s.h2}>Somahoz · selecciona zona y bloque</Text>
          </View>
          <TouchableOpacity style={s.searchBtn} onPress={() => router.push('/buscar')} activeOpacity={0.85}>
            <FontAwesome name="search" size={16} color="#0F172A" />
          </TouchableOpacity>
        </View>

        <View style={s.statsRow}>
          <StatPill label="libres" value={statsBloque.libre} tone="ok" />
          <StatPill label="ocupadas" value={statsBloque.ocupada} tone="bad" />
          <StatPill label="reservadas" value={statsBloque.reservada} tone="warn" />
          {statsBloque.otras > 0 ? <StatPill label="cla./mant." value={statsBloque.otras} tone="neutral" /> : null}
        </View>

        <View style={s.toolsSection}>
          <Text style={s.toolsSectionTitle}>Herramientas de campo</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.toolsRow}>
            <ToolChip icon="map" label="Mapa" onPress={() => router.push('/(tabs)/mapa')} />
            <ToolChip icon="crosshairs" label="GPS" onPress={abrirMenuGps} />
            <ToolChip
              icon="pencil"
              label="Notas"
              onPress={() => void abrirListaNotas()}
              badge={notesCount > 0 ? notesCount : undefined}
            />
            {auditQueueCount > 0 ? (
              <ToolChip
                icon="cloud-upload"
                label="Subir cambios"
                onPress={() => void sincronizarColaCambios()}
                badge={auditQueueCount}
                variant="pending"
              />
            ) : null}
          </ScrollView>
        </View>

        {recientes.length > 0 ? (
          <View style={s.recSection}>
            <Text style={s.recSectionTitle}>Últimas fichas</Text>
            <FlatList
              horizontal
              data={recientes}
              keyExtractor={(it) => String(it.id)}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.recList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={s.recChip}
                  onPress={() => {
                    seleccionarSepultura(item.id);
                    router.push(`/sepultura/${item.id}`);
                  }}
                  activeOpacity={0.88}
                >
                  <FontAwesome name="clock-o" size={12} color="rgba(15,23,42,0.45)" style={{ marginRight: 6 }} />
                  <Text style={s.recChipT} numberOfLines={1}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        ) : null}
      </View>

      <View style={{ flex: 1 }}>
        {/* ZONAS */}
        {zonas.length > 0 ? (
          <View style={s.zoneStrip}>
            <FlatList
              data={[{ id: 'todas', nombre: 'Todas' }, ...zonas] as any[]}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(z) => String(z.id)}
              contentContainerStyle={s.zoneStripContent}
              renderItem={({ item }) => {
                const active = zonaActiva === item.id || (item.id !== 'todas' && Number(zonaActiva) === Number(item.id));
                return (
                  <AppPill
                    label={String(item.nombre)}
                    active={active}
                    onPress={() => setZonaActiva(item.id === 'todas' ? 'todas' : Number(item.id))}
                    style={{ maxWidth: 240 }}
                  />
                );
              }}
            />
          </View>
        ) : null}

        <View style={s.blockStrip}>
          <FlatList
            data={bloquesFiltrados}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(b) => String(b.id)}
            contentContainerStyle={s.blockStripContent}
            renderItem={({ item }) => (
              <View style={s.blockItem}>
                <AppPill
                  label={item.codigo}
                  active={bloqueActivo === item.id}
                  onPress={() => setBloqueActivo(item.id)}
                />
                <Text style={s.blockMeta} numberOfLines={1}>
                  {(item as any).zona_nombre ?? (item as any).zona?.nombre ?? '—'} · {item.filas}×{item.columnas}
                </Text>
              </View>
            )}
          />
        </View>

        <View style={s.gridHead}>
          <Text style={s.gridTitle}>PLANO DEL BLOQUE</Text>
          <Text style={s.gridSub} numberOfLines={1}>
            {bloqueActivoObj ? `Bloque ${bloqueActivoObj.codigo} · ${bloqueActivoObj.filas}×${bloqueActivoObj.columnas} · ${statsBloque.total} unidades` : '—'}
          </Text>
        </View>

        {loadingBloque ? (
          <View style={s.center}>
            <ActivityIndicator size="large" color="#16A34A" />
            <Text style={s.loadingT}>Cargando sepulturas…</Text>
          </View>
        ) : (
          <NichoGrid
            sepulturas={sepulturasBloque}
            filas={bloqueActivoObj?.filas ?? 4}
            columnas={bloqueActivoObj?.columnas ?? 1}
            sentidoNumeracion={String((bloqueActivoObj as any)?.sentido_numeracion ?? '') || null}
            showToolbar={false}
            onNichoPress={(sep) => {
              void irAFicha(sep);
            }}
            onNichoDoublePress={(sep) => {
              void irAFicha(sep);
            }}
            onNichoLongPress={(sep) => {
              void irAExh(sep);
            }}
            onEmptyPress={abrirCrear}
          />
        )}
      </View>

      {/* Crear sepultura se hace dentro de la pantalla del bloque */}

      <Modal visible={fieldModal} transparent animationType="fade" onRequestClose={() => !fieldBusy && setFieldModal(false)}>
        <View style={s.modalBg}>
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={() => !fieldBusy && setFieldModal(false)}
            accessibilityLabel="Cerrar"
          />
          <View style={s.modalCenter} pointerEvents="box-none">
            <View style={s.modalSheet} pointerEvents="auto">
            <Text style={s.modalOver}>NOTA DE CAMPO</Text>
            <Text style={s.modalTitle}>Incidencia u observación</Text>
            <Text style={s.modalSub}>
              Se guarda en este dispositivo. Si tienes una ficha abierta en el plano, se anexa su referencia a la nota.
            </Text>
            <TextInput
              style={s.modalInput}
              placeholder="Ej: rotura de placa, maleza, puerta…"
              placeholderTextColor="rgba(15,23,42,0.35)"
              value={fieldText}
              onChangeText={setFieldText}
              multiline
              textAlignVertical="top"
            />
            {fieldGps ? (
              <Text style={s.modalGpsOk}>
                Ubicación adjunta: {fieldGps.lat.toFixed(5)}, {fieldGps.lon.toFixed(5)}
                {fieldGps.acc != null ? ` (±${Math.round(fieldGps.acc)} m)` : ''}
              </Text>
            ) : (
              <TouchableOpacity style={s.modalGpsBtn} onPress={() => void adjuntarGpsAlModal()} activeOpacity={0.88}>
                <FontAwesome name="map-marker" size={14} color="#15803D" style={{ marginRight: 8 }} />
                <Text style={s.modalGpsBtnT}>Incluir ubicación actual</Text>
              </TouchableOpacity>
            )}
            <View style={s.modalActions}>
              <TouchableOpacity
                style={s.modalCancel}
                onPress={() => {
                  if (fieldBusy) return;
                  setFieldModal(false);
                  setFieldText('');
                  setFieldGps(null);
                }}
                disabled={fieldBusy}
              >
                <Text style={s.modalCancelT}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.modalSave, fieldBusy && { opacity: 0.7 }]}
                onPress={() => void guardarNotaCampo()}
                disabled={fieldBusy}
              >
                {fieldBusy ? <ActivityIndicator color="#FFF" /> : <Text style={s.modalSaveT}>Guardar</Text>}
              </TouchableOpacity>
            </View>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={notesListOpen} animationType="slide" onRequestClose={() => setNotesListOpen(false)}>
        <View style={s.notesModal}>
          <View style={s.notesHead}>
            <Text style={s.notesHeadTitle}>Notas de campo</Text>
            <TouchableOpacity onPress={() => setNotesListOpen(false)} style={s.notesCloseBtn} hitSlop={12}>
              <Text style={s.notesCloseBtnT}>Cerrar</Text>
            </TouchableOpacity>
          </View>
          <View style={s.notesActions}>
            <TouchableOpacity
              style={s.notesAddBtn}
              onPress={() => {
                setNotesListOpen(false);
                setFieldModal(true);
              }}
            >
              <FontAwesome name="plus" size={14} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={s.notesAddBtnT}>Añadir nota</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.notesShareAll}
              onPress={async () => {
                if (notesList.length === 0) return;
                try {
                  const body = formatFieldNotesExport(notesList);
                  await Share.share({ message: body, title: 'Notas de campo' });
                } catch {
                  toast.error('No se pudo compartir');
                }
              }}
              disabled={notesList.length === 0}
            >
              <FontAwesome name="share-alt" size={14} color="#0F172A" style={{ marginRight: 8 }} />
              <Text style={s.notesShareAllT}>Compartir todas</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={[...notesList].sort((a, b) => b.createdAt - a.createdAt)}
            keyExtractor={(it) => it.id}
            contentContainerStyle={s.notesListContent}
            ListEmptyComponent={
              <Text style={s.notesEmpty}>
                Sin notas todavía. Pulsa «Añadir nota» para incidencias u observaciones (se guardan en el dispositivo).
              </Text>
            }
            renderItem={({ item }) => {
              const d = new Date(item.createdAt);
              const head = `${d.toLocaleDateString('es-ES')} ${d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;
              const hasGps = item.lat != null && item.lon != null && Number.isFinite(item.lat) && Number.isFinite(item.lon);
              return (
                <View style={s.noteCard}>
                  <Text style={s.noteCardHead}>{head}</Text>
                  {item.contextLabel ? <Text style={s.noteCardCtx}>{item.contextLabel}</Text> : null}
                  <Text style={s.noteCardBody}>{item.text}</Text>
                  {hasGps ? (
                    <Text style={s.noteCardGps}>
                      {item.lat!.toFixed(5)}, {item.lon!.toFixed(5)}
                      {item.acc != null ? ` (±${Math.round(item.acc)} m)` : ''}
                    </Text>
                  ) : null}
                  <View style={s.noteCardRow}>
                    <TouchableOpacity
                      style={s.noteMiniBtn}
                      onPress={async () => {
                        const parts = [item.text];
                        if (item.contextLabel) parts.unshift(`Ficha: ${item.contextLabel}`);
                        if (hasGps)
                          parts.push(
                            `GPS: ${item.lat!.toFixed(6)}, ${item.lon!.toFixed(6)}${item.acc != null ? ` (±${Math.round(item.acc)} m)` : ''}`
                          );
                        await Clipboard.setStringAsync(parts.join('\n'));
                        toast.success('Copiado al portapapeles');
                      }}
                    >
                      <FontAwesome name="copy" size={13} color="#0F172A" />
                      <Text style={s.noteMiniBtnT}>Copiar</Text>
                    </TouchableOpacity>
                    {hasGps ? (
                      <TouchableOpacity
                        style={s.noteMiniBtn}
                        onPress={() => {
                          const q = new URLSearchParams({
                            focus_lat: String(item.lat),
                            focus_lon: String(item.lon),
                            ...(item.acc != null ? { focus_acc: String(item.acc) } : {}),
                          });
                          setNotesListOpen(false);
                          router.push(`/(tabs)/mapa?${q.toString()}`);
                        }}
                      >
                        <FontAwesome name="map" size={13} color="#15803D" />
                        <Text style={[s.noteMiniBtnT, { color: '#15803D' }]}>Mapa</Text>
                      </TouchableOpacity>
                    ) : null}
                    <TouchableOpacity
                      style={s.noteMiniBtn}
                      onPress={() => {
                        Alert.alert('Borrar nota', '¿Eliminar esta nota del dispositivo?', [
                          { text: 'Cancelar', style: 'cancel' },
                          {
                            text: 'Borrar',
                            style: 'destructive',
                            onPress: async () => {
                              const next = await deleteFieldNote(item.id);
                              setNotesList(next);
                              setNotesCount(next.length);
                            },
                          },
                        ]);
                      }}
                    >
                      <FontAwesome name="trash" size={13} color="#B91C1C" />
                      <Text style={[s.noteMiniBtnT, { color: '#B91C1C' }]}>Borrar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            }}
          />
        </View>
      </Modal>
    </View>
  );
}

function ToolChip(props: {
  icon: React.ComponentProps<typeof FontAwesome>['name'];
  label: string;
  onPress: () => void;
  loading?: boolean;
  badge?: number;
  variant?: 'default' | 'pending';
}) {
  const pending = props.variant === 'pending';
  return (
    <TouchableOpacity
      style={[s.toolChip, pending && s.toolChipPending]}
      onPress={props.onPress}
      activeOpacity={0.88}
      disabled={props.loading}
    >
      {props.loading ? (
        <ActivityIndicator size="small" color="#0F172A" />
      ) : (
        <FontAwesome name={props.icon} size={15} color={pending ? '#92400E' : '#0F172A'} />
      )}
      <Text style={[s.toolChipT, pending && s.toolChipTPending]}>{props.label}</Text>
      {props.badge != null && props.badge > 0 ? (
        <View style={[s.toolBadge, pending && s.toolBadgePending]}>
          <Text style={s.toolBadgeT}>{props.badge > 99 ? '99+' : String(props.badge)}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

function StatPill({ label, value, tone }: { label: string; value: number; tone: 'ok' | 'bad' | 'warn' | 'neutral' }) {
  const bg =
    tone === 'ok'
      ? 'rgba(34,197,94,0.14)'
      : tone === 'bad'
        ? 'rgba(239,68,68,0.14)'
        : tone === 'neutral'
          ? 'rgba(100,116,139,0.16)'
          : 'rgba(245,158,11,0.18)';
  const fg =
    tone === 'ok' ? '#166534' : tone === 'bad' ? '#B91C1C' : tone === 'neutral' ? '#475569' : '#92400E';
  return (
    <View style={[s.statPill, { backgroundColor: bg }]}>
      <Text style={[s.statVal, { color: fg }]}>{value}</Text>
      <Text style={[s.statLab, { color: fg }]}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F3EFE6' },
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, backgroundColor: '#F3EFE6' },
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  h1: { fontSize: 22, fontWeight: '900', color: '#0F172A' },
  h2: { marginTop: 6, color: 'rgba(15,23,42,0.55)', fontWeight: '800' },
  searchBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: { marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  toolsSection: { marginTop: 14 },
  toolsSectionTitle: { fontSize: 11, fontWeight: '900', letterSpacing: 1.4, color: 'rgba(15,23,42,0.45)', marginBottom: 8 },
  toolsRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingRight: 8 },
  toolChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    height: 42,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.10)',
  },
  toolChipPending: {
    backgroundColor: 'rgba(245,158,11,0.14)',
    borderColor: 'rgba(217,119,6,0.35)',
  },
  toolChipT: { fontSize: 13, fontWeight: '900', color: '#0F172A' },
  toolChipTPending: { color: '#92400E' },
  toolBadge: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    borderRadius: 10,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolBadgePending: { backgroundColor: '#C2410C' },
  toolBadgeT: { fontSize: 11, fontWeight: '900', color: '#FFFFFF' },

  recSection: { marginTop: 12 },
  recSectionTitle: { fontSize: 11, fontWeight: '900', letterSpacing: 1.4, color: 'rgba(15,23,42,0.45)', marginBottom: 8 },
  recList: { gap: 8, paddingRight: 8 },
  recChip: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: 220,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.10)',
  },
  recChipT: { flex: 1, fontSize: 12, fontWeight: '800', color: '#0F172A' },

  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  modalCenter: { flex: 1, justifyContent: 'center', paddingHorizontal: 20 },
  modalSheet: {
    backgroundColor: '#F7F4EE',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.10)',
  },
  modalOver: { fontSize: 11, fontWeight: '900', letterSpacing: 1.4, color: 'rgba(15,23,42,0.45)' },
  modalTitle: { marginTop: 6, fontSize: 20, fontWeight: '900', color: '#0F172A' },
  modalSub: { marginTop: 6, fontSize: 13, fontWeight: '600', color: 'rgba(15,23,42,0.55)', lineHeight: 18 },
  modalInput: {
    marginTop: 14,
    minHeight: 120,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.12)',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalGpsOk: { marginTop: 10, fontSize: 12, fontWeight: '800', color: '#166534' },
  modalGpsBtn: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 999,
    backgroundColor: 'rgba(21,128,61,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(21,128,61,0.25)',
  },
  modalGpsBtnT: { fontSize: 13, fontWeight: '900', color: '#15803D' },
  modalActions: { marginTop: 18, flexDirection: 'row', gap: 12 },
  modalCancel: { flex: 1, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(15,23,42,0.06)', borderWidth: 1, borderColor: 'rgba(15,23,42,0.10)' },
  modalCancelT: { fontWeight: '900', color: 'rgba(15,23,42,0.65)' },
  modalSave: { flex: 1.2, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#2F3F35' },
  modalSaveT: { fontWeight: '900', color: '#FFFFFF', fontSize: 15 },

  statPill: { flex: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 10, alignItems: 'center', justifyContent: 'center' },
  statVal: { fontSize: 14, fontWeight: '900' },
  statLab: { marginTop: 2, fontSize: 11, fontWeight: '900', textTransform: 'lowercase' },

  // (lista resultados eliminado)
  zoneStrip: { marginTop: 10 },
  zoneStripContent: { paddingHorizontal: 16, gap: 10 },

  blockStrip: { marginTop: 6 },
  blockStripContent: { paddingHorizontal: 16, paddingVertical: 8, gap: 10 },
  blockItem: { minWidth: 140, gap: 6 },
  blockMeta: { fontSize: 11, fontWeight: '800', color: 'rgba(15,23,42,0.45)' },
  gridHead: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 6 },
  gridTitle: { fontSize: 12, fontWeight: '900', letterSpacing: 1.6, color: 'rgba(15,23,42,0.45)' },
  gridSub: { marginTop: 4, fontSize: 12, fontWeight: '800', color: 'rgba(15,23,42,0.65)' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 24 },
  loadingT: { marginTop: 10, color: '#64748B', fontWeight: '800' },

  createBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  createSheet: { backgroundColor: '#F7F4EE', borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 16, paddingTop: 10, paddingBottom: Platform.OS === 'ios' ? 26 : 16 },
  handle: { width: 44, height: 5, borderRadius: 999, backgroundColor: 'rgba(15,23,42,0.18)', alignSelf: 'center', marginBottom: 10 },
  createOver: { fontSize: 11, fontWeight: '900', letterSpacing: 1.6, color: 'rgba(15,23,42,0.45)' },
  createTitle: { marginTop: 6, fontSize: 22, fontWeight: '900', color: '#0F172A' },
  createSub: { marginTop: 6, fontSize: 12, fontWeight: '800', color: 'rgba(15,23,42,0.55)' },
  createLabel: { marginTop: 14, fontSize: 12, fontWeight: '900', color: 'rgba(15,23,42,0.70)' },
  createInput: { marginTop: 8, minHeight: 46, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(15,23,42,0.10)', backgroundColor: '#FFFFFF', paddingHorizontal: 12, paddingVertical: 12, fontSize: 14, fontWeight: '700', color: '#0F172A' },
  estadoRow: { marginTop: 10, flexDirection: 'row', gap: 10 },
  estadoP: { flex: 1, height: 36, borderRadius: 999, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: 'rgba(15,23,42,0.10)', alignItems: 'center', justifyContent: 'center' },
  estadoPActive: { backgroundColor: 'rgba(47,63,53,0.10)', borderColor: 'rgba(47,63,53,0.45)' },
  estadoPT: { fontWeight: '900', color: 'rgba(15,23,42,0.65)', fontSize: 12 },
  estadoPTActive: { color: '#0F172A' },
  gpsCard: { marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 12, borderRadius: 16, backgroundColor: 'rgba(15,23,42,0.04)', borderWidth: 1, borderColor: 'rgba(15,23,42,0.08)' },
  gpsIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: 'rgba(15,23,42,0.10)', alignItems: 'center', justifyContent: 'center' },
  gpsLine: { fontWeight: '900', color: 'rgba(15,23,42,0.80)' },
  gpsSub: { marginTop: 4, fontWeight: '800', fontSize: 12, color: 'rgba(15,23,42,0.55)' },
  gpsRefresh: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: 'rgba(15,23,42,0.10)', alignItems: 'center', justifyContent: 'center' },
  createBtn: { marginTop: 14, height: 54, borderRadius: 999, backgroundColor: '#2F3F35', alignItems: 'center', justifyContent: 'center' },
  createBtnT: { color: '#FFFFFF', fontWeight: '900' },
  createCancel: { marginTop: 12, alignItems: 'center', justifyContent: 'center', paddingVertical: 10 },
  createCancelT: { fontWeight: '900', color: 'rgba(15,23,42,0.65)' },

  notesModal: { flex: 1, backgroundColor: '#F3EFE6', paddingTop: Platform.OS === 'ios' ? 52 : 40 },
  notesHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(15,23,42,0.08)',
  },
  notesHeadTitle: { fontSize: 20, fontWeight: '900', color: '#0F172A' },
  notesCloseBtn: { paddingVertical: 8, paddingHorizontal: 4 },
  notesCloseBtnT: { fontWeight: '900', color: '#15803D', fontSize: 16 },
  notesActions: { paddingHorizontal: 16, paddingTop: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center' },
  notesAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 999,
    backgroundColor: '#2F3F35',
  },
  notesAddBtnT: { fontWeight: '900', color: '#FFFFFF', fontSize: 14 },
  notesShareAll: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.10)',
  },
  notesShareAllT: { fontWeight: '900', color: '#0F172A', fontSize: 14 },
  notesListContent: { padding: 16, paddingBottom: 32, gap: 12 },
  notesEmpty: { fontSize: 14, fontWeight: '700', color: 'rgba(15,23,42,0.55)', lineHeight: 20, textAlign: 'center', marginTop: 24 },
  noteCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.10)',
  },
  noteCardHead: { fontSize: 12, fontWeight: '900', color: 'rgba(15,23,42,0.45)' },
  noteCardCtx: { marginTop: 6, fontSize: 12, fontWeight: '800', color: '#15803D' },
  noteCardBody: { marginTop: 8, fontSize: 15, fontWeight: '700', color: '#0F172A', lineHeight: 22 },
  noteCardGps: { marginTop: 6, fontSize: 12, fontWeight: '800', color: 'rgba(15,23,42,0.55)' },
  noteCardRow: { marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  noteMiniBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 999,
    backgroundColor: 'rgba(15,23,42,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.08)',
  },
  noteMiniBtnT: { fontSize: 12, fontWeight: '900', color: '#0F172A' },
});


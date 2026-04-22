import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
  TextInput,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as Location from 'expo-location';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { ESTADO_COLORS } from '@/constants/Colors';
import { colorParaEstadoSepultura, etiquetaEstadoVisible, normalizarEstadoEditable } from '@/lib/estado-sepultura';
import { generarHTMLExpediente } from '@/lib/pdf';
import { FotoGaleria } from '@/components/FotoGaleria';
import { NichoGrid } from '@/components/NichoGrid';
import { enqueueAuditPatch, getQueueCount, processAuditQueue } from '@/lib/auditoria-queue';
import type { Concesion, Difunto, EstadoSepultura, Sepultura } from '@/lib/types';
import { useFocusEffect } from '@react-navigation/native';
import { apiFetch } from '@/lib/laravel-api';

type SepFull = Sepultura & { cemn_bloques?: { codigo: string }; cemn_zonas?: { nombre: string } };
type DifFull = Difunto & { cemn_terceros?: { dni: string | null; nombre: string; apellido1: string | null; apellido2: string | null } };
type BloqueMeta = { id: number; filas: number; columnas: number; codigo?: string | null };

export default function SepulturaScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [sep, setSep] = useState<SepFull | null>(null);
  const [difuntos, setDifuntos] = useState<DifFull[]>([]);
  const [concesiones, setConcesiones] = useState<Concesion[]>([]);
  const [documentos, setDocumentos] = useState<any[]>([]);
  const [fotosRefresh, setFotosRefresh] = useState(0);
  const [loading, setLoading] = useState(true);
  const [savingAudit, setSavingAudit] = useState(false);
  const [auditEstado, setAuditEstado] = useState<EstadoSepultura>('libre');
  const [auditNotas, setAuditNotas] = useState('');
  const [auditUbicacion, setAuditUbicacion] = useState('');
  const [gps, setGps] = useState<{ lat: number; lon: number } | null>(null);
  const [gpsAcc, setGpsAcc] = useState<number | null>(null);
  const [queueCount, setQueueCount] = useState(0);
  const [sunMode, setSunMode] = useState(false);
  const [siblings, setSiblings] = useState<number[]>([]);
  const [siblingIdx, setSiblingIdx] = useState<number>(-1);
  const [listLoading, setListLoading] = useState(false);
  const [dictando, setDictando] = useState(false);
  const [dictadoTexto, setDictadoTexto] = useState('');
  const [bloqueMeta, setBloqueMeta] = useState<BloqueMeta | null>(null);
  const [bloqueSepulturas, setBloqueSepulturas] = useState<Sepultura[]>([]);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [fotoExpedienteError, setFotoExpedienteError] = useState(false);

  // Speech-to-text (dictado) — hooks SIEMPRE arriba (antes de returns condicionales)
  useSpeechRecognitionEvent('start', () => setDictando(true));
  useSpeechRecognitionEvent('end', () => setDictando(false));
  useSpeechRecognitionEvent('result', (event) => {
    const t = event.results?.[0]?.transcript ?? '';
    setDictadoTexto(t);
    if (t) setAuditNotas((prev) => (prev ? `${prev} ${t}` : t));
  });
  useSpeechRecognitionEvent('error', (event) => {
    console.warn('[stt]', event.error, event.message);
    setDictando(false);
  });

  const fetchAll = async () => {
    const res = await apiFetch<any>(`/api/cementerio/sepulturas/${Number(id)}`);
    if (!res.ok) {
      setSep(null);
      setDifuntos([]);
      setConcesiones([]);
      setDocumentos([]);
      setLoading(false);
      return;
    }

    const item = (res.data as any).item ?? null;
    if (!item) {
      setSep(null);
      setDifuntos([]);
      setConcesiones([]);
      setDocumentos([]);
      setLoading(false);
      return;
    }

    const bloqueCodigo = item?.bloque?.codigo ? String(item.bloque.codigo) : undefined;
    const zonaNombre = item?.zona?.nombre ? String(item.zona.nombre) : undefined;

    setSep({
      ...(item as any),
      cemn_bloques: bloqueCodigo ? { codigo: bloqueCodigo } : undefined,
      cemn_zonas: zonaNombre ? { nombre: zonaNombre } : undefined,
    } as SepFull);

    setDifuntos(((item?.difuntos ?? []) as DifFull[]) ?? []);
    setConcesiones(item?.concesion_vigente ? [item.concesion_vigente as Concesion] : []);
    setDocumentos((item?.documentos ?? []) as any[]);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, [id]);
  useFocusEffect(
    useCallback(() => {
      fetchAll();
    }, [id])
  );

  // Lista de nichos hermanos (mismo bloque) para swipe anterior/siguiente
  useEffect(() => {
    const run = async () => {
      if (!sep?.bloque_id) return;
      setListLoading(true);
      const res = await apiFetch<{ items: any[] }>(`/api/cementerio/bloques/${sep.bloque_id}/sepulturas`);
      const ids = res.ok ? (res.data.items ?? []).map((x: any) => Number(x.id)) : [];
      setSiblings(ids);
      const cur = Number(id);
      setSiblingIdx(ids.indexOf(cur));
      setListLoading(false);
    };
    run();
  }, [sep?.bloque_id, id]);

  // “Mapa” del nicho: cuadrícula del bloque con el nicho resaltado
  useEffect(() => {
    const run = async () => {
      if (!sep?.bloque_id) {
        setBloqueMeta(null);
        setBloqueSepulturas([]);
        return;
      }

      const bloquesRes = await apiFetch<{ items: any[] }>('/api/cementerio/bloques');
      const meta = bloquesRes.ok ? (bloquesRes.data.items ?? []).find((b: any) => Number(b.id) === Number(sep.bloque_id)) : null;
      if (meta) setBloqueMeta({ id: Number(meta.id), filas: Number(meta.filas), columnas: Number(meta.columnas), codigo: meta.codigo ?? null });
      else setBloqueMeta(null);

      const sRes = await apiFetch<{ items: Sepultura[] }>(`/api/cementerio/bloques/${sep.bloque_id}/sepulturas`);
      if (sRes.ok) setBloqueSepulturas((sRes.data.items ?? []) as Sepultura[]);
      else setBloqueSepulturas([]);
    };
    run();
  }, [sep?.bloque_id]);

  useEffect(() => {
    if (!sep) return;
    setAuditEstado(normalizarEstadoEditable(sep.estado));
    setAuditNotas(sep.notas ?? '');
    setAuditUbicacion(sep.ubicacion_texto ?? '');
    setGps(null);
    setGpsAcc(null);
  }, [sep?.id]);

  useEffect(() => {
    getQueueCount().then(setQueueCount);
  }, []);

  const exportarPDF = async () => {
    if (!sep) return;
    try {
      const html = generarHTMLExpediente({ sepultura: sep, difuntos, concesiones, documentos });
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: `Expediente N.º ${sep.numero}` });
      } else {
        Alert.alert('PDF generado', uri);
      }
    } catch (e: any) { Alert.alert('Error', e.message); }
  };

  // Hooks SIEMPRE antes de returns condicionales (Rules of Hooks)
  const theme = sunMode
    ? { bg: '#000000', surface: '#0B0B0B', text: '#FFFFFF', sub: '#C7D2FE', border: '#111827', neon: '#22C55E', neon2: '#22C55E' }
    : { bg: '#F8FAFC', surface: '#FFFFFF', text: '#1F2937', sub: '#6B7280', border: '#E5E7EB', neon: '#16A34A', neon2: '#15803D' };

  const fotoExpedienteUrl = useMemo(() => {
    const docs = (documentos ?? []) as any[];
    const f = docs.find(
      (d) =>
        String(d?.tipo ?? '').toLowerCase() === 'fotografia' ||
        String(d?.tipo ?? '').toLowerCase() === 'foto'
    );
    // En el schema nuevo: `ruta_archivo` (guardamos URL pública o ruta). En schema viejo: `url`.
    const u = f?.ruta_archivo ?? f?.url;
    return u ? String(u) : null;
  }, [documentos]);

  const isWide = width >= 980;

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color="#16A34A" /></View>;
  if (!sep) return <View style={s.center}><Text style={s.errorText}>No encontrada</Text></View>;

  const color = colorParaEstadoSepultura(sep.estado);
  const difuntoPrincipal = difuntos.find((d) => d.es_titular) ?? difuntos[0];

  const hasPending = queueCount > 0;
  const canSave = !!sep && !savingAudit;
  const codigoOk = !!sep.codigo && String(sep.codigo).trim().length > 0;
  const gpsOk = gpsAcc !== null && gpsAcc <= 5;

  const setEstadoQuick = (e: EstadoSepultura) => setAuditEstado(e);

  const capturarGPS = async () => {
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
      const acc = pos.coords.accuracy ?? null;
      setGpsAcc(acc);
      if (acc === null) {
        Alert.alert('GPS', 'No se pudo leer la precisión del GPS en este dispositivo.');
        return;
      }
      if (acc > 5) {
        setGps(null);
        Alert.alert('Precisión insuficiente', `Precisión actual: ${Math.round(acc)} m.\nAcércate a una zona abierta y vuelve a intentarlo (objetivo < 5 m).`);
        return;
      }
      setGps({ lat: pos.coords.latitude, lon: pos.coords.longitude });
      Alert.alert('GPS listo', `Precisión: ${Math.round(acc)} m\n${pos.coords.latitude.toFixed(7)}, ${pos.coords.longitude.toFixed(7)}`);
    } catch (e: any) {
      Alert.alert('Error GPS', e.message);
    }
  };

  const guardarAuditoria = async () => {
    if (!sep) return;
    setSavingAudit(true);

    const payload: any = {
      estado: auditEstado,
      notas: auditNotas.trim() ? auditNotas.trim() : null,
      ubicacion_texto: auditUbicacion.trim() ? auditUbicacion.trim() : null,
    };
    if (gps) {
      payload.lat = gps.lat;
      payload.lon = gps.lon;
    }

    try {
      // VALIDACIONES STRICT MODE
      if (!codigoOk) {
        throw new Error('No se puede guardar: la sepultura no tiene un código válido.');
      }
      if (!gpsOk) {
        throw new Error('GPS no válido: se requiere precisión < 5 m antes de guardar.');
      }

      // Patch simple (sin foto). Evidencias: "Documento/Foto".
      const res = await apiFetch<any>(`/api/cementerio/sepulturas/${sep.id}`, { method: 'PUT', body: payload });
      if (!res.ok) throw new Error(typeof res.error === 'string' ? res.error : 'No se pudo guardar la auditoría');
      await fetchAll();
      Alert.alert('Guardado', 'Auditoría guardada.');
    } catch (e: any) {
      // Offline: guardamos en cola
      await enqueueAuditPatch({
        sepulturaId: sep.id,
        estado: auditEstado,
        notas: payload.notas,
        ubicacion_texto: payload.ubicacion_texto,
        lat: gps?.lat ?? undefined,
        lon: gps?.lon ?? undefined,
        fotoLocalUri: null,
      });
      setQueueCount(await getQueueCount());
      Alert.alert('Sin conexión', 'Se guardó en cola y se sincronizará automáticamente.');
    } finally {
      setSavingAudit(false);
    }
  };

  const startDictado = async () => {
    try {
      const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permiso de micrófono', 'No se concedió permiso para dictado.');
        return;
      }
      setDictadoTexto('');
      ExpoSpeechRecognitionModule.start({
        lang: 'es-ES',
        interimResults: true,
        continuous: false,
      });
    } catch (e: any) {
      Alert.alert('Dictado', e.message ?? String(e));
    }
  };

  const stopDictado = async () => {
    try {
      await ExpoSpeechRecognitionModule.stop();
    } catch {}
  };

  const goSibling = async (dir: -1 | 1) => {
    if (listLoading) return;
    if (siblings.length === 0 || siblingIdx < 0) return;
    const nextIdx = siblingIdx + dir;
    if (nextIdx < 0 || nextIdx >= siblings.length) return;
    const nextId = siblings[nextIdx];
    setSiblingIdx(nextIdx);
    router.replace(`/sepultura/${nextId}`);
  };

  const swipe = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .failOffsetY([-20, 20])
    .onEnd((e) => {
      // Swipe horizontal: siguiente/anterior
      if (Math.abs(e.velocityX) < 600) return;
      if (e.velocityX < 0) goSibling(1);
      else goSibling(-1);
    });

  const sincronizar = async () => {
    const { processed, remaining } = await processAuditQueue();
    setQueueCount(remaining);
    Alert.alert('Sincronización', `Procesadas: ${processed}\nPendientes: ${remaining}`);
    if (processed > 0) fetchAll();
  };

  return (
    <GestureDetector gesture={swipe}>
      <View style={[s.screen, { backgroundColor: theme.bg }]}>
        <ScrollView style={[s.container, { backgroundColor: theme.bg }]} contentContainerStyle={{ paddingBottom: 110 }}>

      {/* EXPEDIENTE (layout “una hoja”) */}
      <View style={[s.sheet, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={s.sheetTop}>
          <View style={{ flex: 1 }}>
            <Text style={[s.sheetNicho, { color: theme.text }]}>N.º {sep.numero}</Text>
            <View style={s.sheetRow}>
              <View style={[s.sheetBadge, { backgroundColor: sunMode ? 'rgba(34,197,94,0.18)' : '#DCFCE7', borderColor: sunMode ? '#22C55E' : '#86EFAC' }]}>
                <Text style={[s.sheetBadgeT, { color: sunMode ? '#22C55E' : '#15803D' }]}>{etiquetaEstadoVisible(sep.estado).toUpperCase()}</Text>
              </View>
              <TouchableOpacity style={s.sunBtnSheet} onPress={() => setSunMode((v) => !v)} activeOpacity={0.8}>
                <FontAwesome name={sunMode ? 'sun-o' : 'moon-o'} size={16} color={theme.text} />
                <Text style={[s.sunBtnSheetT, { color: theme.text }]}>{sunMode ? 'Sol' : 'Normal'}</Text>
              </TouchableOpacity>
            </View>
            <Text style={[s.sheetMeta, { color: theme.sub }]}>
              {sep.cemn_zonas?.nombre ?? '—'} · {sep.cemn_bloques?.codigo ?? '—'} · F{sep.fila ?? '—'} · C{sep.columna ?? '—'}
            </Text>
          </View>

          {/* Foto arriba derecha */}
          <View style={s.sheetPhotoBox}>
            {fotoExpedienteUrl && !fotoExpedienteError ? (
              <TouchableOpacity style={s.sheetPhotoTouch} onPress={() => setFotoPreview(fotoExpedienteUrl)} activeOpacity={0.9}>
                <Image source={{ uri: fotoExpedienteUrl }} style={s.sheetPhoto} onError={() => setFotoExpedienteError(true)} />
                <View style={s.sheetPhotoHint}>
                  <FontAwesome name="search-plus" size={14} color="#FFF" />
                  <Text style={s.sheetPhotoHintT}>Ampliar</Text>
                </View>
              </TouchableOpacity>
            ) : (
              <View style={[s.sheetPhotoEmpty, { borderColor: theme.border }]}>
                <FontAwesome name="picture-o" size={18} color={theme.sub} />
                <Text style={[s.sheetPhotoEmptyT, { color: theme.sub }]}>
                  {fotoExpedienteUrl ? 'No se pudo cargar' : 'Sin foto'}
                </Text>
                <TouchableOpacity
                  style={[s.sheetPhotoAddBtn, { borderColor: theme.border }]}
                  onPress={() => router.push(`/anadir-documento-foto?sepultura_id=${sep.id}&numero=${encodeURIComponent(String(sep.numero ?? sep.id))}`)}
                  activeOpacity={0.85}
                >
                  <FontAwesome name="camera" size={14} color="#15803D" />
                  <Text style={s.sheetPhotoAddBtnT}>Añadir foto</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* Cuerpo: en tablet/ancho grande, 2 columnas reales */}
        <View style={[s.sheetBody, isWide && s.sheetBodyWide]}>
          <View style={[s.col, isWide && s.colLeft]}>
            <View style={[s.box, { borderColor: theme.border, backgroundColor: sunMode ? '#000' : '#F8FAFC' }]}>
            <View style={s.boxHead}>
              <Text style={[s.boxTitle, { color: theme.text }]}>Restos</Text>
              <TouchableOpacity
                style={[s.boxEdit, { borderColor: theme.border }]}
                onPress={() => router.push(`/nuevo-suceso?sepultura_id=${sep.id}`)}
                activeOpacity={0.85}
              >
                <FontAwesome name="edit" size={14} color="#15803D" />
                <Text style={s.boxEditT}>Editar</Text>
              </TouchableOpacity>
            </View>
            {difuntoPrincipal ? (
              <View style={{ gap: 6 }}>
                {difuntos.slice(0, 3).map((d) => (
                  <Text key={d.id} style={[s.boxLine, { color: theme.text }]} numberOfLines={1}>
                    {d.nombre_completo}{d.fecha_fallecimiento ? ` · ${d.fecha_fallecimiento}` : ''}
                  </Text>
                ))}
                {difuntos.length > 3 ? <Text style={[s.boxSub, { color: theme.sub }]}>+ {difuntos.length - 3} más…</Text> : null}
              </View>
            ) : (
              <Text style={[s.boxSub, { color: theme.sub }]}>Sin difuntos registrados.</Text>
            )}
            </View>

            {/* Mapa (ubicación en el bloque) */}
            <View style={[s.box, { borderColor: theme.border, backgroundColor: sunMode ? '#000' : '#F8FAFC' }]}>
          <View style={s.boxHead}>
            <Text style={[s.boxTitle, { color: theme.text }]}>Mapa (bloque)</Text>
            <TouchableOpacity style={[s.boxEdit, { borderColor: theme.border }]} onPress={() => router.push(`/bloque/${encodeURIComponent(sep.cemn_bloques?.codigo ?? '')}`)} activeOpacity={0.85}>
              <FontAwesome name="th" size={14} color="#15803D" />
              <Text style={s.boxEditT}>Abrir bloque</Text>
            </TouchableOpacity>
          </View>
          {bloqueMeta && bloqueSepulturas.length > 0 ? (
            <View style={{ height: 320 }}>
              <NichoGrid
                sepulturas={bloqueSepulturas}
                filas={bloqueMeta.filas}
                columnas={bloqueMeta.columnas}
                selectedSepulturaId={sep.id}
                onNichoPress={(s2) => router.push(`/sepultura/${s2.id}`)}
              />
            </View>
          ) : (
            <Text style={[s.boxSub, { color: theme.sub }]}>
              No disponible (falta bloque o no se pudo cargar la cuadrícula).
            </Text>
          )}
            </View>
          </View>

          <View style={[s.col, isWide && s.colRight]}>
            <View style={[s.box, { borderColor: theme.border, backgroundColor: sunMode ? '#000' : '#F8FAFC' }]}>
              <View style={s.boxHead}>
                <Text style={[s.boxTitle, { color: theme.text }]}>Concesión</Text>
                <TouchableOpacity
                  style={[s.boxEdit, { borderColor: theme.border }]}
                  onPress={() => router.push(`/venta-concesion?sepultura_id=${sep.id}&numero=${encodeURIComponent(String(sep.numero ?? sep.id))}`)}
                  activeOpacity={0.85}
                >
                  <FontAwesome name={concesiones?.[0] ? 'edit' : 'plus'} size={14} color="#15803D" />
                  <Text style={s.boxEditT}>{concesiones?.[0] ? 'Editar' : 'Crear'}</Text>
                </TouchableOpacity>
              </View>
              {concesiones?.[0] ? (
                <View style={{ gap: 6 }}>
                  <Text style={[s.boxLine, { color: theme.text }]} numberOfLines={1}>Estado: {String(concesiones[0].estado ?? '—')}</Text>
                  <Text style={[s.boxLine, { color: theme.text }]} numberOfLines={1}>Vence: {String((concesiones[0] as any).fecha_vencimiento ?? '—')}</Text>
                </View>
              ) : (
                <View style={{ gap: 10 }}>
                  <Text style={[s.boxSub, { color: theme.sub }]}>Sin concesión registrada.</Text>
                  <TouchableOpacity
                    style={[s.ctaBtn, { borderColor: theme.border }]}
                    onPress={() => router.push(`/venta-concesion?sepultura_id=${sep.id}&numero=${encodeURIComponent(String(sep.numero ?? sep.id))}`)}
                    activeOpacity={0.85}
                  >
                    <FontAwesome name="file-text-o" size={16} color="#15803D" />
                    <Text style={s.ctaBtnT}>Crear concesión</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <View style={[s.box, { borderColor: theme.border, backgroundColor: sunMode ? '#000' : '#F8FAFC' }]}>
              <View style={s.boxHead}>
                <Text style={[s.boxTitle, { color: theme.text }]}>Notas</Text>
                <TouchableOpacity style={[s.boxEdit, { borderColor: theme.border }]} onPress={() => router.push(`/editar-sepultura?sepultura_id=${sep.id}`)} activeOpacity={0.85}>
                  <FontAwesome name="edit" size={14} color="#15803D" />
                  <Text style={s.boxEditT}>Editar</Text>
                </TouchableOpacity>
              </View>
              <Text style={[s.boxSub, { color: theme.sub }]}>{(sep.notas ?? '').trim() ? sep.notas : '—'}</Text>
            </View>
          </View>
        </View>
      </View>

      <Modal visible={!!fotoPreview} transparent animationType="fade" onRequestClose={() => setFotoPreview(null)}>
        <View style={s.photoModal}>
          <TouchableOpacity style={s.photoModalClose} onPress={() => setFotoPreview(null)} activeOpacity={0.85}>
            <FontAwesome name="times" size={28} color="#FFF" />
          </TouchableOpacity>
          {fotoPreview ? <Image source={{ uri: fotoPreview }} style={s.photoModalImg} resizeMode="contain" /> : null}
        </View>
      </Modal>

      {/* MODO AUDITORÍA */}
      <View style={[s.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={s.auditHeader}>
          <Text style={[s.sectionTitle, { color: theme.text }]}>Trabajo de campo (Auditoría)</Text>
          {hasPending && (
            <View style={s.pendingPill}>
              <Text style={s.pendingText}>{queueCount} pendiente(s)</Text>
            </View>
          )}
        </View>

        <View style={s.auditRow}>
          <Text style={[s.auditLabel, { color: theme.text }]}>Estado</Text>
          <View style={s.estadoRow}>
            {(['libre', 'ocupada'] as EstadoSepultura[]).map((e) => (
              <TouchableOpacity
                key={e}
                style={[s.estadoPill, auditEstado === e && s.estadoPillActive]}
                onPress={() => setEstadoQuick(e)}
                activeOpacity={0.8}
              >
                <View style={[s.dot, { backgroundColor: ESTADO_COLORS[e] }]} />
                <Text style={[s.estadoText, auditEstado === e && s.estadoTextActive]}>{e}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <Text style={[s.auditLabel, { color: theme.text }]}>Notas (lo que pone la lápida)</Text>
        <View style={{ position: 'relative' }}>
          <TextInput
            style={[s.inputMultiline, { borderColor: theme.border, color: theme.text, backgroundColor: sunMode ? '#000' : '#FFF' }]}
          value={auditNotas}
          onChangeText={setAuditNotas}
          placeholder='Ej: "Lápida a nombre de Familia García"'
          placeholderTextColor={sunMode ? '#94A3B8' : '#9CA3AF'}
          multiline
          textAlignVertical="top"
          />
          <TouchableOpacity
            style={[s.micBtn, { borderColor: sunMode ? '#22C55E' : '#86EFAC', backgroundColor: sunMode ? 'rgba(34,197,94,0.18)' : '#DCFCE7' }]}
            onPress={() => (dictando ? stopDictado() : startDictado())}
            activeOpacity={0.85}
          >
            <FontAwesome name={dictando ? 'stop' : 'microphone'} size={18} color={sunMode ? '#22C55E' : '#15803D'} />
          </TouchableOpacity>
        </View>
        {!!dictadoTexto && <Text style={[s.dictadoHint, { color: theme.sub }]}>Dictado: {dictadoTexto}</Text>}

        <Text style={[s.auditLabel, { color: theme.text }]}>Ubicación (anomalías / aclaraciones)</Text>
        <TextInput
          style={[s.input, { borderColor: theme.border, color: theme.text, backgroundColor: sunMode ? '#000' : '#FFF' }]}
          value={auditUbicacion}
          onChangeText={setAuditUbicacion}
          placeholder='Ej: "Placa desplazada / numeración mal pintada"'
          placeholderTextColor={sunMode ? '#94A3B8' : '#9CA3AF'}
        />

        <Text style={s.gpsText}>
          Precisión GPS: {gpsAcc === null ? '—' : `${Math.round(gpsAcc)} m`} {gpsOk ? '✓' : '(requiere < 5 m)'}
        </Text>
        {gps && <Text style={s.gpsText}>GPS: {gps.lat.toFixed(7)}, {gps.lon.toFixed(7)}</Text>}
        {!codigoOk && (
          <View style={s.strictWarn}>
            <FontAwesome name="exclamation-triangle" size={16} color="#B45309" />
            <Text style={s.strictWarnText}>Bloqueado: esta sepultura no tiene `codigo`. Asigna/corrige el código antes de auditar.</Text>
          </View>
        )}

        <TouchableOpacity style={[s.syncBtn, hasPending ? null : { opacity: 0.5 }]} onPress={sincronizar} disabled={!hasPending} activeOpacity={0.75}>
          <FontAwesome name="refresh" size={18} color="#15803D" />
          <Text style={s.syncText}>Sincronizar pendientes</Text>
        </TouchableOpacity>
      </View>

      {/* DIFUNTO PRINCIPAL */}
      <View style={[s.section, { backgroundColor: theme.surface }]}>
        <Text style={[s.sectionTitle, { color: theme.text }]}>Difunto</Text>
        {difuntoPrincipal ? (
          <View style={s.difuntoCard}>
            <FontAwesome name="user" size={20} color="#15803D" />
            <View style={{ flex: 1 }}>
              <Text style={s.difuntoName}>{difuntoPrincipal.nombre_completo}</Text>
              {difuntoPrincipal.fecha_fallecimiento && (
                <Text style={s.difuntoSub}>Fallecido: {difuntoPrincipal.fecha_fallecimiento}</Text>
              )}
              {difuntoPrincipal.cemn_terceros?.dni && (
                <Text style={s.difuntoSub}>DNI: {difuntoPrincipal.cemn_terceros.dni}</Text>
              )}
            </View>
            {difuntoPrincipal.es_titular && (
              <View style={s.titularBadge}><Text style={s.titularText}>Titular</Text></View>
            )}
          </View>
        ) : (
          <Text style={s.emptyText}>Sin difuntos registrados</Text>
        )}
        {difuntos.length > 1 && (
          <Text style={s.moreText}>+ {difuntos.length - 1} más</Text>
        )}
      </View>

      {/* NOTAS */}
      {sep.notas && (
        <View style={[s.section, { backgroundColor: theme.surface }]}>
          <Text style={[s.sectionTitle, { color: theme.text }]}>Notas de campo</Text>
          <Text style={[s.notasText, { color: theme.sub }]}>{sep.notas}</Text>
        </View>
      )}

      {/* Acciones secundarias (para no saturar la ficha) */}
      <View style={[s.section, { backgroundColor: theme.surface }]}>
        <Text style={[s.sectionTitle, { color: theme.text }]}>Acciones</Text>
        <TouchableOpacity style={[s.softBtn, { borderColor: theme.border }]} onPress={exportarPDF} activeOpacity={0.8}>
          <FontAwesome name="file-pdf-o" size={18} color="#15803D" />
          <Text style={[s.softBtnText, { color: theme.text }]}>Exportar PDF</Text>
          <FontAwesome name="chevron-right" size={16} color="#94A3B8" />
        </TouchableOpacity>
      </View>

      <View style={{ height: 40 }} />
        </ScrollView>

        {/* Bottom Action Bar (Thumb-Zone) */}
        <View style={[s.bottomBar, { backgroundColor: sunMode ? '#000' : '#FFFFFF', borderTopColor: theme.border }]}>
          <TouchableOpacity
            style={[s.bbBtn, { backgroundColor: sunMode ? '#14532D' : '#16A34A' }]}
            onPress={capturarGPS}
            disabled={!canSave}
            activeOpacity={0.8}
          >
            <FontAwesome name="crosshairs" size={20} color="#FFF" />
            <Text style={s.bbText}>GPS</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.bbBtn, s.bbBtnPrimary, { backgroundColor: sunMode ? '#22C55E' : '#16A34A', borderColor: sunMode ? '#86EFAC' : '#15803D' }]}
            onPress={() => {
              const cod = sep.codigo ?? '(sin código)';
              Alert.alert(
                'Confirmar cambios',
                `¿Estás seguro de que deseas actualizar la sepultura con código ${cod}?`,
                [
                  { text: 'Cancelar', style: 'cancel' },
                  { text: 'Sí, guardar', style: 'destructive', onPress: () => guardarAuditoria() },
                ]
              );
            }}
            disabled={!canSave || !codigoOk || !gpsOk}
            activeOpacity={0.8}
          >
            <FontAwesome name="save" size={20} color="#FFF" />
            <Text style={s.bbText}>{savingAudit ? 'GUARDANDO…' : 'GUARDAR'}</Text>
          </TouchableOpacity>
        </View>

        {/* Entrada única a workflows */}
        <TouchableOpacity
          style={{
            position: 'absolute',
            right: 14,
            bottom: 92,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            paddingHorizontal: 16,
            height: 52,
            borderRadius: 999,
            backgroundColor: '#15803D',
            borderWidth: 2,
            borderColor: '#86EFAC',
            shadowColor: '#000',
            shadowOpacity: 0.2,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 6 },
            elevation: 6,
          }}
          onPress={() => router.push(`/nuevo-suceso?sepultura_id=${sep.id}`)}
          activeOpacity={0.9}
        >
          <FontAwesome name="flash" size={18} color="#fff" />
          <Text style={{ color: '#fff', fontSize: 13, fontWeight: '900', letterSpacing: 0.8 }}>NUEVO SUCESO</Text>
        </TouchableOpacity>
      </View>
    </GestureDetector>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 16, color: '#6B7280' },
  hero: { padding: 24, paddingTop: 20 },
  heroRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroNum: { fontSize: 36, fontWeight: '900', color: '#FFF' },
  heroEstado: { fontSize: 14, fontWeight: '800', color: 'rgba(255,255,255,0.85)', letterSpacing: 2, marginTop: 2 },
  heroLoc: { marginTop: 10, backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, alignSelf: 'flex-start' },
  heroLocText: { fontSize: 14, color: '#FFF', fontWeight: '600' },
  sunBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.25)' },
  sunBtnT: { color: '#FFF', fontWeight: '900', fontSize: 12 },
  section: { backgroundColor: '#FFF', marginHorizontal: 12, marginTop: 10, borderRadius: 14, padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1F2937', marginBottom: 10 },

  // “Expediente en una hoja”
  sheet: { marginHorizontal: 12, marginTop: 10, borderRadius: 16, padding: 14, borderWidth: 1 },
  sheetTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  sheetNicho: { fontSize: 28, fontWeight: '900' },
  sheetRow: { marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 10 },
  sheetBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
  sheetBadgeT: { fontSize: 12, fontWeight: '900', letterSpacing: 1.2 },
  sheetMeta: { marginTop: 10, fontSize: 13, fontWeight: '800' },
  sunBtnSheet: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, height: 34, borderRadius: 999, backgroundColor: 'rgba(148,163,184,0.18)' },
  sunBtnSheetT: { fontWeight: '900', fontSize: 12 },
  sheetPhotoBox: { width: 148 },
  sheetPhotoTouch: { width: 148, height: 112, borderRadius: 14, overflow: 'hidden', backgroundColor: '#0F172A' },
  sheetPhoto: { width: '100%', height: '100%' },
  sheetPhotoHint: { position: 'absolute', right: 8, bottom: 8, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(15,23,42,0.72)', paddingHorizontal: 10, height: 26, borderRadius: 999 },
  sheetPhotoHintT: { color: '#FFF', fontWeight: '900', fontSize: 11 },
  sheetPhotoEmpty: { width: 148, height: 112, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#F1F5F9' },
  sheetPhotoEmptyT: { fontWeight: '900', fontSize: 12 },
  sheetPhotoAddBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, height: 32, borderRadius: 12, borderWidth: 1, backgroundColor: '#FFFFFF' },
  sheetPhotoAddBtnT: { color: '#15803D', fontWeight: '900', fontSize: 12 },

  sheetBody: { marginTop: 12, gap: 12 },
  sheetBodyWide: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  col: { gap: 12 },
  colLeft: { flex: 1.55 },
  colRight: { flex: 1 },

  box: { borderWidth: 1, borderRadius: 14, padding: 12, gap: 10 },
  boxHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  boxTitle: { fontSize: 14, fontWeight: '900' },
  boxEdit: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, height: 34, borderRadius: 12, borderWidth: 1, backgroundColor: '#FFFFFF' },
  boxEditT: { color: '#15803D', fontWeight: '900', fontSize: 12 },
  boxLine: { fontSize: 13, fontWeight: '800' },
  boxSub: { fontSize: 13, fontWeight: '700', lineHeight: 18 },
  ctaBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, height: 44, borderRadius: 14, borderWidth: 1, backgroundColor: '#FFFFFF' },
  ctaBtnT: { color: '#15803D', fontWeight: '900', fontSize: 14 },

  photoModal: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
  photoModalClose: { position: 'absolute', top: 60, right: 20, zIndex: 10, padding: 10 },
  photoModalImg: { width: '92%', height: '78%' },

  difuntoCard: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  difuntoName: { fontSize: 17, fontWeight: '700', color: '#1F2937' },
  difuntoSub: { fontSize: 14, color: '#6B7280', marginTop: 2 },
  titularBadge: { backgroundColor: '#DCFCE7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  titularText: { fontSize: 12, color: '#15803D', fontWeight: '700' },
  emptyText: { fontSize: 15, color: '#9CA3AF', fontStyle: 'italic' },
  moreText: { fontSize: 13, color: '#15803D', fontWeight: '600', marginTop: 6 },
  notasText: { fontSize: 15, color: '#6B7280', lineHeight: 22 },
  softBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    backgroundColor: '#F8FAFC',
  },
  softBtnText: { flex: 1, fontSize: 15, fontWeight: '900' },

  auditHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pendingPill: { backgroundColor: '#FEF3C7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1, borderColor: '#F59E0B' },
  pendingText: { fontSize: 12, fontWeight: '900', color: '#B45309' },

  bigBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 14, paddingVertical: 16, minHeight: 56, marginTop: 8 },
  bigBtnText: { fontSize: 16, fontWeight: '800', color: '#FFF' },

  auditRow: { marginTop: 14 },
  auditLabel: { marginTop: 12, fontSize: 13, fontWeight: '900', color: '#334155' },
  estadoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  estadoPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 999, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0' },
  estadoPillActive: { backgroundColor: '#DCFCE7', borderColor: '#86EFAC' },
  estadoText: { fontSize: 13, fontWeight: '900', color: '#334155' },
  estadoTextActive: { color: '#15803D' },
  dot: { width: 10, height: 10, borderRadius: 3 },

  input: { marginTop: 8, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12, fontSize: 15, fontWeight: '600', color: '#111827', backgroundColor: '#FFF' },
  inputMultiline: { marginTop: 8, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12, fontSize: 15, fontWeight: '600', color: '#111827', backgroundColor: '#FFF', minHeight: 96 },
  micBtn: { position: 'absolute', right: 10, bottom: 10, width: 42, height: 42, borderRadius: 21, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  dictadoHint: { marginTop: 8, fontSize: 12, fontWeight: '700' },

  gpsRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  gpsText: { marginTop: 10, fontSize: 13, color: '#64748B', fontWeight: '700' },

  syncBtn: { marginTop: 12, paddingVertical: 12, borderRadius: 12, backgroundColor: '#DCFCE7', borderWidth: 1, borderColor: '#86EFAC', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  syncText: { fontSize: 14, fontWeight: '900', color: '#15803D' },

  strictWarn: { marginTop: 10, padding: 10, borderRadius: 12, borderWidth: 1, borderColor: '#F59E0B', backgroundColor: '#FFFBEB', flexDirection: 'row', alignItems: 'center', gap: 8 },
  strictWarnText: { flex: 1, fontSize: 13, fontWeight: '800', color: '#B45309', lineHeight: 18 },

  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 26 : 14,
    flexDirection: 'row',
    gap: 10,
  },
  bbBtn: { flex: 1, minHeight: 66, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  bbBtnPrimary: { borderWidth: 2 },
  bbText: { color: '#FFF', fontWeight: '900', fontSize: 18, letterSpacing: 0.8 },
});

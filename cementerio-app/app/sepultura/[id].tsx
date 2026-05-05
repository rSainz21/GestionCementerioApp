import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
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
import * as FileSystem from 'expo-file-system';
import * as Location from 'expo-location';
import * as Clipboard from 'expo-clipboard';
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
import { pickConcesionVigente, pickDifuntos, pickTitularFromConcesion, unwrapItem } from '@/lib/normalize';
import { AppCTAButton, AppSkeleton, Radius, Space } from '@/components/ui';

type SepFull = Sepultura & { cemn_bloques?: { codigo: string }; cemn_zonas?: { nombre: string } };
type DifFull = Difunto & { cemn_terceros?: { dni: string | null; nombre: string; apellido1: string | null; apellido2: string | null } };
type BloqueMeta = { id: number; filas: number; columnas: number; codigo?: string | null };
type EstadoDbLocal = 'libre' | 'ocupada' | 'reservada' | 'clausurada';

function etiquetaEstadoDb(estado: any): EstadoDbLocal {
  const e = String(estado ?? '')
    .trim()
    .toLowerCase();
  if (e === 'libre' || e === 'ocupada' || e === 'reservada' || e === 'clausurada') return e;
  return 'ocupada';
}

export default function SepulturaScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView | null>(null);
  const anchorsRef = useRef<Record<string, number>>({});
  const [activeTab, setActiveTab] = useState<'datos' | 'restos' | 'concesion' | 'sucesos' | 'docs'>('datos');
  const [sep, setSep] = useState<SepFull | null>(null);
  const [difuntos, setDifuntos] = useState<DifFull[]>([]);
  const [concesiones, setConcesiones] = useState<Concesion[]>([]);
  const [documentos, setDocumentos] = useState<any[]>([]);
  const [fotosRefresh, setFotosRefresh] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState<string | null>(null);
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
  const [sharePdfOpen, setSharePdfOpen] = useState(false);
  const [sharePdfBusy, setSharePdfBusy] = useState(false);
  const [sharePdfUri, setSharePdfUri] = useState<string | null>(null);

  const [estadoOpen, setEstadoOpen] = useState(false);
  const [estadoNuevo, setEstadoNuevo] = useState<EstadoDbLocal>('libre');
  const [estadoMotivo, setEstadoMotivo] = useState('');
  const [estadoSaving, setEstadoSaving] = useState(false);

  const [coordOpen, setCoordOpen] = useState(false);
  const [coordBusy, setCoordBusy] = useState(false);
  const [coordGps, setCoordGps] = useState<{ lat: number; lon: number } | null>(null);
  const [coordAcc, setCoordAcc] = useState<number | null>(null);
  const [syncGpsBusy, setSyncGpsBusy] = useState(false);

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
    setLoading(true);
    setLoadErr(null);
    const res = await apiFetch<any>(`/api/cementerio/sepulturas/${Number(id)}`);
    if (!res.ok) {
      setSep(null);
      setDifuntos([]);
      setConcesiones([]);
      setDocumentos([]);
      setLoadErr(typeof res.error === 'string' ? res.error : 'No se pudo cargar la sepultura.');
      setLoading(false);
      return;
    }

    const item = unwrapItem<any>(res.data);
    if (!item) {
      setSep(null);
      setDifuntos([]);
      setConcesiones([]);
      setDocumentos([]);
      setLoadErr('No se pudo resolver el detalle de la sepultura.');
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

    setDifuntos(pickDifuntos(item) as DifFull[]);

    let conc = pickConcesionVigente(item);
    if (!conc) {
      // Fallback: algunos endpoints de detalle no incluyen concesión/difuntos completos.
      const terms = Array.from(
        new Set(
          [item?.codigo, item?.numero ? `N${item.numero}` : null, item?.id].filter(Boolean).map((x) => String(x))
        )
      );
      for (const t of terms) {
        const s = await apiFetch<any>(`/api/cementerio/concesiones?q=${encodeURIComponent(t)}`);
        const found = s.ok ? (s.data as any)?.items?.[0] : null;
        if (found) {
          conc = found as Concesion;
          break;
        }
      }
    }

    setConcesiones(conc ? [conc as Concesion] : []);
    setDocumentos((item?.documentos ?? []) as any[]);
    setLoadErr(null);
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

  const prepararPdf = useCallback(async () => {
    if (!sep) return null;
    const html = generarHTMLExpediente({ sepultura: sep, difuntos, concesiones, documentos });
    const { uri } = await Print.printToFileAsync({ html, base64: false });
    return uri;
  }, [concesiones, difuntos, documentos, sep]);

  const ensurePdfReady = useCallback(async () => {
    if (sharePdfUri) return sharePdfUri;
    setSharePdfBusy(true);
    try {
      const uri = await prepararPdf();
      setSharePdfUri(uri);
      return uri;
    } finally {
      setSharePdfBusy(false);
    }
  }, [prepararPdf, sharePdfUri]);

  const abrirCompartirPdf = useCallback(async () => {
    if (!sep) return;
    try {
      setSharePdfOpen(true);
      // En web, `printToFileAsync` puede disparar la UI de impresión.
      // Generamos el PDF solo cuando el usuario pulsa una acción (Descargar/Imprimir/Compartir).
      if (Platform.OS !== 'web') {
        setSharePdfBusy(true);
        const uri = await prepararPdf();
        setSharePdfUri(uri);
      } else {
        setSharePdfUri(null);
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? String(e));
      setSharePdfOpen(false);
    } finally {
      setSharePdfBusy(false);
    }
  }, [prepararPdf, sep]);

  const compartirPdf = useCallback(async () => {
    const uri = await ensurePdfReady();
    if (!uri) return;
    if (!(await Sharing.isAvailableAsync())) {
      Alert.alert('Compartir', 'No está disponible en este dispositivo.');
      return;
    }
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: `Expediente N.º ${sep?.numero ?? sep?.id ?? ''}`,
    });
  }, [ensurePdfReady, sep?.id, sep?.numero]);

  const imprimirPdf = useCallback(async () => {
    try {
      const uri = await ensurePdfReady();
      if (!uri) return;
      await Print.printAsync({ uri });
    } catch (e: any) {
      Alert.alert('Imprimir', e?.message ?? String(e));
    }
  }, [ensurePdfReady]);

  const copiarLinkPdf = useCallback(async () => {
    const uri = await ensurePdfReady();
    if (!uri) return;
    await Clipboard.setStringAsync(uri);
    Alert.alert('Copiado', 'Enlace copiado al portapapeles.');
  }, [ensurePdfReady]);

  const descargarPdf = useCallback(async () => {
    const uri = await ensurePdfReady();
    if (!uri) return;
    try {
      // En web, abrir el PDF suele lanzar el visor/impresión: forzamos descarga.
      if (Platform.OS === 'web') {
        const a = globalThis.document?.createElement?.('a');
        if (a) {
          a.href = uri;
          a.download = `expediente-${sep?.codigo ?? sep?.id ?? ''}.pdf`;
          globalThis.document.body.appendChild(a);
          a.click();
          a.remove();
          return;
        }
      }

      // Evita abrir la hoja de “Compartir” (donde aparece “Imprimir”).
      if (Platform.OS === 'android') {
        const contentUri = await FileSystem.getContentUriAsync(uri);
        await Linking.openURL(contentUri);
      } else {
        await Linking.openURL(uri);
      }
    } catch (e: any) {
      // Fallback: si no se puede abrir, al menos permitir compartir/guardar
      try {
        if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: 'application/pdf' });
      } catch {}
      Alert.alert('PDF', e?.message ?? String(e));
    }
  }, [ensurePdfReady, sep?.codigo, sep?.id]);

  // Hooks SIEMPRE antes de returns condicionales (Rules of Hooks)
  const theme = sunMode
    ? { bg: '#000000', surface: '#0B0B0B', text: '#FFFFFF', sub: '#C7D2FE', border: '#111827', neon: '#22C55E', neon2: '#22C55E' }
    : { bg: '#F3EFE6', surface: '#FBF7EE', text: '#1F2937', sub: '#6B7280', border: 'rgba(15,23,42,0.10)', neon: '#2F6B4E', neon2: '#2F6B4E' };

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

  const fotoCount = useMemo(() => {
    const docs = (documentos ?? []) as any[];
    return docs.filter((d) => {
      const t = String(d?.tipo ?? '').toLowerCase();
      return t === 'fotografia' || t === 'foto' || t === 'imagen';
    }).length;
  }, [documentos]);

  const nfcInfo = useMemo(() => {
    const uid =
      (sep as any)?.nfc_uid ??
      (sep as any)?.nfc_tag_uid ??
      (sep as any)?.nfc_id ??
      (sep as any)?.tag_uid ??
      null;
    const tech = (sep as any)?.nfc_tech ?? (sep as any)?.nfc_tipo ?? (sep as any)?.nfc_proto ?? null;
    return { uid: uid ? String(uid) : null, tech: tech ? String(tech) : null };
  }, [sep]);

  const abrirCambiarEstado = useCallback(() => {
    if (!sep) return;
    const cur = String(sep.estado ?? 'libre').toLowerCase() as EstadoDbLocal;
    setEstadoNuevo((['libre', 'ocupada', 'reservada', 'clausurada'] as const).includes(cur) ? cur : 'libre');
    setEstadoMotivo('');
    setEstadoOpen(true);
  }, [sep]);

  const guardarCambioEstado = useCallback(async () => {
    if (!sep) return;
    try {
      setEstadoSaving(true);
      const res = await apiFetch<any>(`/api/cementerio/sepulturas/${sep.id}`, {
        method: 'PUT',
        body: {
          estado: estadoNuevo,
          motivo_cambio: estadoMotivo.trim() ? estadoMotivo.trim() : null,
        },
      });
      if (!res.ok) throw new Error(typeof res.error === 'string' ? res.error : 'No se pudo guardar el estado.');
      await fetchAll();
      setEstadoOpen(false);
      Alert.alert('Guardado', 'Estado actualizado.');
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? String(e));
    } finally {
      setEstadoSaving(false);
    }
  }, [estadoMotivo, estadoNuevo, fetchAll, sep]);

  function haversineMeters(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
    const R = 6371000;
    const toRad = (x: number) => (x * Math.PI) / 180;
    const dLat = toRad(b.lat - a.lat);
    const dLon = toRad(b.lon - a.lon);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const h =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
  }

  const abrirConfirmarCoords = useCallback(() => {
    setCoordGps(null);
    setCoordAcc(null);
    setCoordOpen(true);
  }, []);

  const capturarCoordsAhora = useCallback(async () => {
    try {
      setCoordBusy(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso GPS', 'Necesitamos permiso de ubicación para capturar coordenadas.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.BestForNavigation,
        mayShowUserSettingsDialog: true,
      });
      setCoordAcc(pos.coords.accuracy ?? null);
      setCoordGps({ lat: pos.coords.latitude, lon: pos.coords.longitude });
    } catch (e: any) {
      Alert.alert('GPS', e?.message ?? String(e));
    } finally {
      setCoordBusy(false);
    }
  }, []);

  const guardarCoords = useCallback(async () => {
    if (!sep || !coordGps) return;
    try {
      setCoordBusy(true);
      const res = await apiFetch<any>(`/api/cementerio/sepulturas/${sep.id}`, {
        method: 'PUT',
        body: { lat: coordGps.lat, lon: coordGps.lon },
      });
      if (!res.ok) throw new Error(typeof res.error === 'string' ? res.error : 'No se pudieron guardar las coordenadas.');
      await fetchAll();
      setCoordOpen(false);
      Alert.alert('Guardado', 'Coordenadas confirmadas/actualizadas.');
      // Atajo UX: al confirmar GPS, abrir el mapa con este nicho marcado
      router.push(
        `/(tabs)/mapa?focus_sepultura_id=${sep.id}&focus_lat=${coordGps.lat}&focus_lon=${coordGps.lon}${
          coordAcc != null ? `&focus_acc=${coordAcc}` : ''
        }`
      );
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? String(e));
    } finally {
      setCoordBusy(false);
    }
  }, [coordAcc, coordGps, fetchAll, router, sep]);

  const sincronizarGpsEnMapa = useCallback(async () => {
    if (!sep) return;
    try {
      setSyncGpsBusy(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso GPS', 'Necesitamos permiso de ubicación para sincronizar.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.BestForNavigation,
        mayShowUserSettingsDialog: true,
      });
      const acc = pos.coords.accuracy ?? null;
      router.push(
        `/(tabs)/mapa?focus_sepultura_id=${sep.id}&focus_lat=${pos.coords.latitude}&focus_lon=${pos.coords.longitude}${
          acc != null ? `&focus_acc=${acc}` : ''
        }`
      );
    } catch (e: any) {
      Alert.alert('GPS', e?.message ?? String(e));
    } finally {
      setSyncGpsBusy(false);
    }
  }, [router, sep]);

  const isWide = width >= 980;

  if (loading)
    return (
      <View style={{ flex: 1, backgroundColor: '#F3EFE6' }}>
        <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <AppSkeleton h={40} w={40} r={Radius.md} />
          <View style={{ flex: 1 }}>
            <AppSkeleton h={10} w={140} r={6} />
            <View style={{ height: 8 }} />
            <AppSkeleton h={18} w={220} r={8} />
          </View>
          <AppSkeleton h={40} w={40} r={Radius.md} />
        </View>
        <View style={{ paddingHorizontal: 16, paddingTop: 6 }}>
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: Radius.lg, borderWidth: 1, borderColor: 'rgba(15,23,42,0.10)', padding: Space.md }}>
            <AppSkeleton h={10} w={120} r={6} />
            <View style={{ height: 12 }} />
            <AppSkeleton h={44} w={180} r={12} />
            <View style={{ height: 12 }} />
            <AppSkeleton h={12} w="100%" r={10} />
            <View style={{ height: 8 }} />
            <AppSkeleton h={12} w="86%" r={10} />
          </View>
          <View style={{ height: 12 }} />
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: Radius.lg, borderWidth: 1, borderColor: 'rgba(15,23,42,0.10)', padding: Space.md }}>
            <AppSkeleton h={10} w={110} r={6} />
            <View style={{ height: 12 }} />
            <AppSkeleton h={14} w="92%" r={10} />
            <View style={{ height: 8 }} />
            <AppSkeleton h={14} w="72%" r={10} />
            <View style={{ height: 8 }} />
            <AppSkeleton h={14} w="84%" r={10} />
          </View>
        </View>
      </View>
    );

  if (!sep)
    return (
      <View style={s.center}>
        <Text style={s.errorText}>No se pudo cargar esta sepultura.</Text>
        {loadErr ? <Text style={[s.errorText, { marginTop: 8, opacity: 0.8 }]}>{loadErr}</Text> : null}
        <View style={{ height: 14 }} />
        <AppCTAButton label="Reintentar" onPress={() => fetchAll()} variant="primary" />
        <View style={{ height: 10 }} />
        <AppCTAButton label="Volver" onPress={() => router.back()} variant="ghost" />
      </View>
    );

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
      // NOTAS: deben poder guardarse aunque no haya GPS.
      // Solo exigimos precisión si el usuario intenta guardar coordenadas.
      if (!codigoOk) {
        Alert.alert('No se puede guardar', 'La sepultura no tiene un código válido.');
        return;
      }
      if (gps && !gpsOk) {
        Alert.alert('GPS no válido', 'Se requiere precisión < 5 m para guardar coordenadas.');
        return;
      }

      const res = await apiFetch<any>(`/api/cementerio/sepulturas/${sep.id}`, { method: 'PUT', body: payload });
      if (!res.ok) {
        Alert.alert('Error', typeof res.error === 'string' ? res.error : 'No se pudo guardar.');
        return;
      }
      await fetchAll();
      Alert.alert('Guardado', 'Cambios guardados.');
    } catch (e: any) {
      // Offline: solo en error real de red/cliente.
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

  const rememberAnchor = (key: string) => (e: any) => {
    anchorsRef.current[key] = e.nativeEvent.layout.y;
  };

  const goTab = (key: typeof activeTab) => {
    setActiveTab(key);
    const y = anchorsRef.current[key] ?? 0;
    scrollRef.current?.scrollTo({ y: Math.max(0, y - 10), animated: true });
  };

  return (
    <GestureDetector gesture={swipe}>
      <View style={[s.screen, { backgroundColor: theme.bg }]}>
        <View style={[s.topBar, { backgroundColor: '#2F3F35', paddingTop: 14, paddingBottom: 10 }]}>
          <TouchableOpacity style={s.fichaTopIconBtn} onPress={() => router.back()} activeOpacity={0.85}>
            <FontAwesome name="chevron-left" size={16} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
          <TouchableOpacity style={s.fichaTopIconBtn} onPress={abrirCompartirPdf} activeOpacity={0.85}>
            <FontAwesome name="share-alt" size={16} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity style={s.fichaTopIconBtn} onPress={() => Alert.alert('Acciones', 'Pendiente (menú)')} activeOpacity={0.85}>
            <FontAwesome name="ellipsis-h" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        <ScrollView ref={scrollRef as any} style={[s.container, { backgroundColor: theme.bg }]} contentContainerStyle={{ paddingBottom: 120 }}>
          {/* Hero verde + tabs como captura */}
          <View style={s.fichaHero}>
            <View style={s.fichaHeroRow}>
              <View style={s.fichaAvatar}>
                <Text style={s.fichaAvatarT}>
                  {String(pickTitularFromConcesion(concesiones?.[0] as any)?.nombre_completo ?? 'MG')
                    .split(/\s+/)
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((x: string) => x[0])
                    .join('')
                    .toUpperCase() || 'MG'}
                </Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.fichaHeroOver} numberOfLines={1}>
                  {(sep.cemn_zonas?.nombre ?? '—').toUpperCase()} · BLOQUE {String(sep.cemn_bloques?.codigo ?? '—').toUpperCase()}
                </Text>
                <Text style={s.fichaHeroName} numberOfLines={1}>
                  {String(pickTitularFromConcesion(concesiones?.[0] as any)?.nombre_completo ?? '—')}
                </Text>
                <View style={s.fichaHeroPills}>
                  <View style={s.fichaPillSoft}>
                    <Text style={s.fichaPillSoftT}>{etiquetaEstadoDb(sep.estado)}</Text>
                  </View>
                  <View style={s.fichaPillDark}>
                    <Text style={s.fichaPillDarkT} numberOfLines={1}>
                      {String(sep.codigo ?? `${sep.cemn_bloques?.codigo ?? ''}-F${sep.fila}-C${sep.columna}`)}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>

          <View style={s.fichaTabs}>
            {([
              ['datos', 'Ficha'],
              ['restos', 'Restos'],
              ['sucesos', 'Movimientos'],
              ['docs', 'Docs'],
            ] as const).map(([k, label]) => (
              <TouchableOpacity key={k} style={[s.fichaTab, activeTab === k && s.fichaTabActive]} onPress={() => setActiveTab(k)} activeOpacity={0.85}>
                <Text style={[s.fichaTabT, activeTab === k && s.fichaTabTActive]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {activeTab === 'datos' ? (
            <>
              <View style={s.fichaCard}>
                <Text style={s.fichaSectionOver}>SEPULTURA</Text>
                <Field label="Código" value={String(sep.codigo ?? '—')} />
                <Field label="Tipo" value={String(sep.tipo ?? 'nichos')} />
                <Field
                  label="Ubicación"
                  value={`${String(sep.cemn_zonas?.nombre ?? '—')} · Bloque ${String(sep.cemn_bloques?.codigo ?? '—')} · F${String(sep.fila ?? '—')} C${String(sep.columna ?? '—')}`}
                />
                <Text style={s.fichaInputLabel}>Ubicación (texto descriptivo)</Text>
                <TextInput
                  style={s.fichaInput}
                  value={auditUbicacion}
                  onChangeText={setAuditUbicacion}
                  placeholder="Muro sur, 3ª fila…"
                  placeholderTextColor="rgba(15,23,42,0.35)"
                />
                <Text style={s.fichaInputLabel}>Notas</Text>
                <TextInput
                  style={[s.fichaInput, s.fichaTextArea]}
                  value={auditNotas}
                  onChangeText={setAuditNotas}
                  placeholder="Observaciones…"
                  placeholderTextColor="rgba(15,23,42,0.35)"
                  multiline
                  textAlignVertical="top"
                />
                <TouchableOpacity
                  style={[s.fichaSaveBtn, savingAudit && { opacity: 0.6 }]}
                  onPress={guardarAuditoria}
                  disabled={savingAudit}
                  activeOpacity={0.9}
                >
                  {savingAudit ? <ActivityIndicator color="#FFFFFF" /> : <Text style={s.fichaSaveBtnT}>Guardar notas</Text>}
                </TouchableOpacity>
                <Field
                  label="Coordenadas GPS"
                  value={sep.lat && sep.lon ? `${Number(sep.lat).toFixed(6)}, ${Number(sep.lon).toFixed(6)}` : '—'}
                />
                <TouchableOpacity style={s.fichaInlineLink} onPress={abrirConfirmarCoords} activeOpacity={0.85}>
                  <Text style={s.fichaInlineL}>Confirmar coordenadas</Text>
                  <Text style={s.fichaInlineR}>Comparar / actualizar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={s.fichaInlineLink}
                  onPress={() => router.push(`/(tabs)/mapa?focus_sepultura_id=${sep.id}`)}
                  activeOpacity={0.85}
                >
                  <Text style={s.fichaInlineL}>Ver en mapa</Text>
                  <Text style={s.fichaInlineR}>Marcar este nicho</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.fichaInlineLink, syncGpsBusy && { opacity: 0.6 }]}
                  onPress={sincronizarGpsEnMapa}
                  disabled={syncGpsBusy}
                  activeOpacity={0.85}
                >
                  <Text style={s.fichaInlineL}>Sincronizar GPS</Text>
                  <Text style={s.fichaInlineR}>{syncGpsBusy ? 'Obteniendo…' : 'Mostrar mi posición'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={s.fichaInlineLink}
                  onPress={() => router.push(`/leer-nfc?sepultura_id=${sep.id}&codigo=${encodeURIComponent(String(sep.codigo ?? ''))}`)}
                  activeOpacity={0.85}
                >
                  <Text style={s.fichaInlineL}>NFC vinculado</Text>
                  <Text style={s.fichaInlineR}>{nfcInfo.uid ? 'Vinculado' : 'Sin pegatina · Vincular'}</Text>
                </TouchableOpacity>
              </View>

              {concesiones?.[0] ? (
                <View style={s.fichaCard}>
                  <Text style={s.fichaSectionOver}>CONCESIÓN</Text>
                  <Field label="Expediente" value={String((concesiones[0] as any)?.numero_expediente ?? (concesiones[0] as any)?.label ?? '—')} />
                </View>
              ) : null}
            </>
          ) : activeTab === 'restos' ? (
            <View style={s.fichaCard}>
              <Text style={s.fichaSectionOver}>DIFUNTOS EN ESTE NICHO</Text>
              {difuntos.length === 0 ? (
                <Text style={s.fichaEmpty}>Sin difuntos registrados.</Text>
              ) : (
                <View style={{ gap: 10 }}>
                  {difuntos.map((d) => (
                    <View key={d.id} style={s.fichaRow}>
                      <View style={s.fichaRowIcon}>
                        <FontAwesome name="user" size={14} color="rgba(15,23,42,0.65)" />
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={s.fichaRowT} numberOfLines={1}>
                          {String(d.nombre_completo ?? '—')}
                        </Text>
                        <Text style={s.fichaRowSub} numberOfLines={1}>
                          {[((d as any).fecha_nacimiento as any) ?? null, d.fecha_fallecimiento].filter(Boolean).join(' — ') || '—'}
                        </Text>
                      </View>
                      {d.es_titular ? (
                        <View style={s.fichaTitular}>
                          <Text style={s.fichaTitularT}>Titular</Text>
                        </View>
                      ) : null}
                    </View>
                  ))}
                </View>
              )}
              <TouchableOpacity style={s.fichaAdd} onPress={() => router.push(`/asignar-difunto?sepultura_id=${sep.id}`)} activeOpacity={0.85}>
                <FontAwesome name="plus" size={14} color="rgba(15,23,42,0.75)" />
                <Text style={s.fichaAddT}>Añadir difunto</Text>
              </TouchableOpacity>
            </View>
          ) : activeTab === 'docs' ? (
            <View style={s.fichaCard}>
              <View style={s.fichaDocsHead}>
                <Text style={s.fichaSectionOver}>DOCUMENTOS · {documentos.length}</Text>
                <TouchableOpacity style={s.fichaUpload} onPress={() => router.push(`/anadir-documento-foto?sepultura_id=${sep.id}`)} activeOpacity={0.85}>
                  <FontAwesome name="upload" size={14} color="rgba(15,23,42,0.75)" />
                  <Text style={s.fichaUploadT}>Subir</Text>
                </TouchableOpacity>
              </View>
              {documentos.length === 0 ? (
                <Text style={s.fichaEmpty}>Sin documentos.</Text>
              ) : (
                <View style={{ gap: 10 }}>
                  {documentos.slice(0, 10).map((d, idx) => {
                    const name = String(d?.nombre ?? d?.filename ?? d?.titulo ?? `Documento ${idx + 1}`);
                    const tipo = String(d?.tipo ?? '').toLowerCase();
                    const badge = tipo.includes('pdf') ? 'PDF' : tipo.includes('img') || tipo.includes('foto') || tipo.includes('imagen') ? 'IMG' : 'DOC';
                    return (
                      <View key={String(d?.id ?? idx)} style={s.fichaDocRow}>
                        <View style={s.fichaDocBadge}>
                          <Text style={s.fichaDocBadgeT}>{badge}</Text>
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={s.fichaDocT} numberOfLines={1}>
                            {name}
                          </Text>
                          <Text style={s.fichaDocSub} numberOfLines={1}>
                            {String(d?.fecha ?? d?.created_at ?? '').slice(0, 10)}
                          </Text>
                        </View>
                        <TouchableOpacity
                          onPress={async () => {
                            const url = (d as any)?.ruta_archivo ?? (d as any)?.url ?? (d as any)?.public_url ?? null;
                            if (!url) {
                              Alert.alert('Documento', 'Este documento no tiene URL disponible.');
                              return;
                            }
                            try {
                              await Linking.openURL(String(url));
                            } catch (e: any) {
                              Alert.alert('Documento', e?.message ?? String(e));
                            }
                          }}
                          activeOpacity={0.85}
                        >
                          <FontAwesome name="download" size={16} color="rgba(15,23,42,0.55)" />
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          ) : (
            <View style={s.fichaCard}>
              <Text style={s.fichaSectionOver}>HISTÓRICO</Text>
              <Text style={s.fichaEmpty}>Todavía no hay histórico disponible en esta pantalla.</Text>
              <TouchableOpacity
                style={[s.fichaAdd, { marginTop: 10 }]}
                onPress={() => router.push(`/exhumacion-traslado?sepultura_id=${sep.id}`)}
                activeOpacity={0.85}
              >
                <FontAwesome name="plus" size={14} color="rgba(15,23,42,0.75)" />
                <Text style={s.fichaAddT}>Registrar movimiento</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>

        {/* Compartir PDF (bottom sheet) */}
        <Modal visible={sharePdfOpen} transparent animationType="slide" onRequestClose={() => setSharePdfOpen(false)}>
          <View style={s.shareBackdrop}>
            <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setSharePdfOpen(false)} />
            <View style={s.shareSheet}>
              <View style={s.shareHandle} />
              <View style={s.shareHead}>
                <View style={{ flex: 1 }}>
                  <Text style={s.shareOver}>COMPARTIR EXPEDIENTE</Text>
                  <Text style={s.shareTitle}>Vista previa PDF</Text>
                </View>
              </View>

              <View style={s.previewCard}>
                <Text style={s.previewOver}>AYTO. DE CORRALES DE BUELNA</Text>
                <Text style={s.previewH}>Cementerio de Somahoz{'\n'}Ficha de expediente</Text>
                <View style={s.previewHr} />
                <Text style={s.previewLine}>
                  <Text style={s.previewKey}>Sepultura:</Text> {String(sep.codigo ?? `#${sep.id}`)}
                </Text>
                <Text style={s.previewLine}>
                  <Text style={s.previewKey}>Ubicación:</Text> {String(sep.cemn_zonas?.nombre ?? '—')} · Bloque {String(sep.cemn_bloques?.codigo ?? '—')} · F
                  {String(sep.fila ?? '—')} C{String(sep.columna ?? '—')}
                </Text>
                <Text style={s.previewLine}>
                  <Text style={s.previewKey}>Estado:</Text> {String(etiquetaEstadoDb(sep.estado))}
                </Text>
                {concesiones?.[0] ? (
                  <>
                    <Text style={s.previewLine}>
                      <Text style={s.previewKey}>Titular:</Text> {String(pickTitularFromConcesion(concesiones[0] as any)?.nombre_completo ?? '—')}
                    </Text>
                    {(pickTitularFromConcesion(concesiones[0] as any) as any)?.dni ? (
                      <Text style={s.previewLine}>
                        <Text style={s.previewKey}>DNI:</Text> {String((pickTitularFromConcesion(concesiones[0] as any) as any)?.dni)}
                      </Text>
                    ) : null}
                    {difuntoPrincipal?.nombre_completo ? (
                      <Text style={s.previewLine}>
                        <Text style={s.previewKey}>Defunción:</Text> {String(difuntoPrincipal.fecha_fallecimiento ?? '—')}
                      </Text>
                    ) : null}
                    <Text style={s.previewLine}>
                      <Text style={s.previewKey}>Concesión:</Text> {String((concesiones[0] as any)?.numero_expediente ?? (concesiones[0] as any)?.label ?? '—')}
                    </Text>
                    <Text style={s.previewLine}>
                      <Text style={s.previewKey}>Vigencia:</Text> {String((concesiones[0] as any)?.fecha_inicio ?? '—')} – {String((concesiones[0] as any)?.fecha_vencimiento ?? '—')}
                    </Text>
                  </>
                ) : null}
              </View>

              <Text style={s.shareOver2}>OPCIONES</Text>
              <View style={s.shareActions}>
                <TouchableOpacity
                  style={[s.actionBtn, sharePdfBusy && { opacity: 0.6 }]}
                  onPress={descargarPdf}
                  disabled={sharePdfBusy}
                  activeOpacity={0.9}
                >
                  <View style={s.actionIcon}>
                    <FontAwesome name="download" size={18} color="rgba(15,23,42,0.75)" />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={s.actionTitle}>Guardar PDF</Text>
                    <Text style={s.actionSub} numberOfLines={1}>
                      Guardar o abrir el archivo
                    </Text>
                  </View>
                  <FontAwesome name="chevron-right" size={16} color="rgba(15,23,42,0.35)" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[s.actionBtn, sharePdfBusy && { opacity: 0.6 }]}
                  onPress={compartirPdf}
                  disabled={sharePdfBusy}
                  activeOpacity={0.9}
                >
                  <View style={s.actionIcon}>
                    <FontAwesome name="share-alt" size={18} color="rgba(15,23,42,0.75)" />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={s.actionTitle}>Compartir…</Text>
                    <Text style={s.actionSub} numberOfLines={1}>
                      Elegir app y destino
                    </Text>
                  </View>
                  <FontAwesome name="chevron-right" size={16} color="rgba(15,23,42,0.35)" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[s.actionBtn, sharePdfBusy && { opacity: 0.6 }]}
                  onPress={imprimirPdf}
                  disabled={sharePdfBusy}
                  activeOpacity={0.9}
                >
                  <View style={s.actionIcon}>
                    <FontAwesome name="print" size={18} color="rgba(15,23,42,0.75)" />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={s.actionTitle}>Imprimir</Text>
                    <Text style={s.actionSub} numberOfLines={1}>
                      Abrir opciones de impresión
                    </Text>
                  </View>
                  <FontAwesome name="chevron-right" size={16} color="rgba(15,23,42,0.35)" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Confirmar coordenadas (bottom sheet) */}
        <Modal visible={coordOpen} transparent animationType="slide" onRequestClose={() => setCoordOpen(false)}>
          <View style={s.estadoBackdrop}>
            <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setCoordOpen(false)} />
            <View style={s.estadoSheet}>
              <View style={s.shareHandle} />
              <View style={{ marginBottom: 10 }}>
                <Text style={s.estadoOver}>COORDENADAS</Text>
                <Text style={s.estadoTitle}>Confirmar GPS</Text>
              </View>

              <View style={s.coordCard}>
                <Text style={s.coordOver}>COORDENADAS GUARDADAS (WEB)</Text>
                <Text style={s.coordVal}>
                  {sep.lat && sep.lon ? `${Number(sep.lat).toFixed(6)}, ${Number(sep.lon).toFixed(6)}` : '—'}
                </Text>

                <Text style={[s.coordOver, { marginTop: 12 }]}>GPS ACTUAL (MÓVIL)</Text>
                <Text style={s.coordVal}>
                  {coordGps ? `${coordGps.lat.toFixed(6)}, ${coordGps.lon.toFixed(6)}` : '—'}
                </Text>
                <Text style={s.coordSub}>
                  {coordAcc != null ? `Precisión ±${Math.round(coordAcc)} m` : 'Precisión —'}
                  {coordGps && sep.lat && sep.lon
                    ? ` · Distancia ≈ ${Math.round(
                        haversineMeters({ lat: Number(sep.lat), lon: Number(sep.lon) }, coordGps)
                      )} m`
                    : ''}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                <TouchableOpacity style={[s.coordBtn, coordBusy && { opacity: 0.6 }]} onPress={capturarCoordsAhora} disabled={coordBusy} activeOpacity={0.9}>
                  {coordBusy ? <ActivityIndicator color="#0F172A" /> : <Text style={s.coordBtnT}>Capturar GPS</Text>}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.coordBtnPrimary, (!coordGps || coordBusy) && { opacity: 0.6 }]}
                  onPress={guardarCoords}
                  disabled={!coordGps || coordBusy}
                  activeOpacity={0.9}
                >
                  <Text style={s.coordBtnPrimaryT}>Guardar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Cambiar estado (bottom sheet) */}
        <Modal visible={estadoOpen} transparent animationType="slide" onRequestClose={() => setEstadoOpen(false)}>
          <View style={s.estadoBackdrop}>
            <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setEstadoOpen(false)} />
            <View style={s.estadoSheet}>
              <View style={s.shareHandle} />
              <View style={{ marginBottom: 10 }}>
                <Text style={s.estadoOver}>MODIFICAR SEPULTURA</Text>
                <Text style={s.estadoTitle}>Cambiar estado</Text>
              </View>

              {([
                { k: 'libre', label: 'Libre', sub: 'Disponible para concesión', color: '#22C55E' },
                { k: 'ocupada', label: 'Ocupada', sub: 'Con difunto/s inhumado/s', color: '#EF4444' },
                { k: 'reservada', label: 'Reservada', sub: 'Apartada para una familia', color: '#F59E0B' },
                { k: 'clausurada', label: 'Clausurada', sub: 'Fuera de uso', color: '#64748B' },
              ] as const).map((it) => {
                const active = estadoNuevo === it.k;
                return (
                  <TouchableOpacity
                    key={it.k}
                    style={[s.estadoOpt, active && s.estadoOptActive]}
                    onPress={() => setEstadoNuevo(it.k as any)}
                    activeOpacity={0.9}
                  >
                    <View style={[s.estadoOptPill, { backgroundColor: `${it.color}22`, borderColor: `${it.color}33` }]}>
                      <Text style={[s.estadoOptPillT, { color: it.color }]}>{it.label}</Text>
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={s.estadoSub} numberOfLines={1}>
                        {it.sub}
                      </Text>
                    </View>
                    <FontAwesome name="chevron-right" size={16} color="rgba(15,23,42,0.28)" />
                  </TouchableOpacity>
                );
              })}

              <Text style={s.estadoLabel}>Motivo del cambio</Text>
              <TextInput
                style={s.estadoTextArea}
                value={estadoMotivo}
                onChangeText={setEstadoMotivo}
                placeholder="Anota el motivo…"
                placeholderTextColor="rgba(15,23,42,0.28)"
                multiline
                textAlignVertical="top"
              />

              <TouchableOpacity
                style={[s.estadoSave, estadoSaving && { opacity: 0.6 }]}
                onPress={guardarCambioEstado}
                disabled={estadoSaving}
                activeOpacity={0.9}
              >
                {estadoSaving ? <ActivityIndicator color="#FFF" /> : <Text style={s.estadoSaveT}>Guardar cambio</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Barra inferior como la captura */}
        <View style={s.fichaBottomBar}>
          <TouchableOpacity style={s.fichaBottomGhost} onPress={abrirCambiarEstado} activeOpacity={0.85}>
            <FontAwesome name="refresh" size={16} color="rgba(15,23,42,0.75)" />
            <Text style={s.fichaBottomGhostT}>Estado</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.fichaBottomPrimary}
            onPress={() => router.push(`/exhumacion-traslado?sepultura_id=${sep.id}&numero=${encodeURIComponent(String(sep.numero ?? sep.id))}`)}
            activeOpacity={0.85}
          >
            <FontAwesome name="plus" size={16} color="#FFF" />
            <Text style={s.fichaBottomPrimaryT}>Registrar{'\n'}movimiento</Text>
          </TouchableOpacity>
        </View>
      </View>
    </GestureDetector>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.fichaField}>
      <Text style={s.fichaFieldL}>{label}</Text>
      <Text style={s.fichaFieldV}>{value}</Text>
    </View>
  );
}

// (ShareBtn eliminado: ahora usamos acciones nativas: Guardar / Compartir / Imprimir)

const s = StyleSheet.create({
  screen: { flex: 1 },
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 16, color: '#6B7280' },
  topBar: { paddingTop: 12, paddingHorizontal: 12, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 12 },
  topBtn: { width: 38, height: 38, borderRadius: 14, backgroundColor: '#FFFFFF', borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  topTitle: { fontSize: 18, fontWeight: '900' },
  topSub: { marginTop: 2, fontSize: 12, fontWeight: '800' },
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
  segTabsWrap: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    padding: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(15,23,42,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.08)',
    alignSelf: 'flex-start',
  },
  segTab: {
    paddingHorizontal: 12,
    height: 34,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segTabActive: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.10)',
  },
  segTabT: { fontWeight: '900', fontSize: 12, color: '#334155' },
  segTabTActive: { color: '#0F172A' },

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

  heroPhoto: { height: 148, borderRadius: 16, overflow: 'hidden', backgroundColor: 'rgba(15,23,42,0.06)', borderWidth: 1, borderColor: 'rgba(15,23,42,0.10)' },
  heroPhotoTouch: { flex: 1 },
  heroPhotoImg: { width: '100%', height: '100%' },
  heroPhotoEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'rgba(15,23,42,0.06)', borderWidth: 1 },
  heroPhotoEmptyT: { fontSize: 12, fontWeight: '900', color: 'rgba(15,23,42,0.40)' },
  heroPhotoPill: { position: 'absolute', right: 10, top: 10, height: 28, paddingHorizontal: 12, borderRadius: 999, backgroundColor: 'rgba(15,23,42,0.78)', alignItems: 'center', justifyContent: 'center' },
  heroPhotoPillT: { color: '#FFF', fontWeight: '900', fontSize: 12 },
  heroAddBtn: { position: 'absolute', right: 12, bottom: 12, height: 40, paddingHorizontal: 14, borderRadius: 14, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: 'rgba(15,23,42,0.12)', flexDirection: 'row', alignItems: 'center', gap: 10 },
  heroAddBtnT: { fontWeight: '900', color: '#0F172A' },

  expId: { marginTop: 12, fontSize: 12, fontWeight: '900', letterSpacing: 1.2 },
  bigName: { marginTop: 2, fontSize: 26, fontWeight: '900' },
  smallName: { marginTop: 2, fontSize: 14, fontWeight: '800' },
  chipRow: { marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  chipOk: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, height: 28, borderRadius: 999, backgroundColor: 'rgba(34,197,94,0.14)' },
  chipDot: { width: 8, height: 8, borderRadius: 4 },
  chipOkT: { fontSize: 12, fontWeight: '900', color: '#166534', textTransform: 'lowercase' },
  chipWarn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, height: 28, borderRadius: 999, backgroundColor: 'rgba(251,191,36,0.22)' },
  chipWarnT: { fontSize: 12, fontWeight: '900', color: '#92400E', textTransform: 'lowercase' },

  miniMap: { marginTop: 12, borderRadius: 16, backgroundColor: 'rgba(15,23,42,0.04)', borderWidth: 1, borderColor: 'rgba(15,23,42,0.08)', padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  miniMapLeft: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 10 },
  miniBadge: { width: 44, height: 44, borderRadius: 999, backgroundColor: '#2F6B4E', alignItems: 'center', justifyContent: 'center' },
  miniBadgeT: { color: '#FFF', fontWeight: '900' },
  miniCoords: { fontSize: 12, fontWeight: '800' },
  miniMapBtn: { paddingHorizontal: 10, height: 34, borderRadius: 999, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: 'rgba(15,23,42,0.10)', alignItems: 'center', justifyContent: 'center' },
  miniMapBtnT: { fontWeight: '900', color: 'rgba(15,23,42,0.70)' },

  nfcCard: { marginTop: 12, borderRadius: 16, backgroundColor: 'rgba(34,197,94,0.12)', borderWidth: 1, borderColor: 'rgba(34,197,94,0.14)', padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  nfcIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: 'rgba(15,23,42,0.10)', alignItems: 'center', justifyContent: 'center' },
  nfcTitle: { fontSize: 13, fontWeight: '900', color: '#0F172A' },
  nfcSub: { marginTop: 4, fontSize: 12, fontWeight: '800', color: 'rgba(15,23,42,0.55)' },
  nfcOkPill: { height: 28, paddingHorizontal: 12, borderRadius: 999, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: 'rgba(15,23,42,0.10)', alignItems: 'center', justifyContent: 'center' },
  nfcOkPillT: { fontWeight: '900', color: 'rgba(15,23,42,0.65)' },

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

  shareBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  shareSheet: {
    backgroundColor: '#F7F4EE',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 26 : 16,
  },
  shareHandle: { width: 44, height: 5, borderRadius: 999, backgroundColor: 'rgba(15,23,42,0.18)', alignSelf: 'center', marginBottom: 10 },
  shareHead: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 10 },
  shareOver: { fontSize: 11, fontWeight: '900', letterSpacing: 1.6, color: 'rgba(15,23,42,0.45)' },
  shareTitle: { marginTop: 6, fontSize: 22, fontWeight: '900', color: '#0F172A' },
  shareClose: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: 'rgba(15,23,42,0.10)' },

  previewCard: { marginTop: 4, backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(15,23,42,0.10)', padding: 14 },
  previewOver: { textAlign: 'center', fontSize: 10, fontWeight: '900', letterSpacing: 1.4, color: 'rgba(15,23,42,0.45)' },
  previewH: { marginTop: 8, textAlign: 'center', fontSize: 12, fontWeight: '800', color: 'rgba(15,23,42,0.65)' },
  previewHr: { height: 1, backgroundColor: 'rgba(15,23,42,0.10)', marginTop: 12, marginBottom: 12 },
  previewLine: { fontSize: 12, fontWeight: '800', color: '#0F172A', lineHeight: 18 },
  previewKey: { fontWeight: '900', color: 'rgba(15,23,42,0.75)' },

  shareOver2: { marginTop: 14, fontSize: 11, fontWeight: '900', letterSpacing: 1.6, color: 'rgba(15,23,42,0.45)' },
  shareActions: { marginTop: 10, gap: 10 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.10)',
  },
  actionIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: 'rgba(15,23,42,0.06)', alignItems: 'center', justifyContent: 'center' },
  actionTitle: { fontSize: 14, fontWeight: '900', color: '#0F172A' },
  actionSub: { marginTop: 2, fontSize: 12, fontWeight: '800', color: 'rgba(15,23,42,0.55)' },

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
  bottomBtn: {
    flex: 1,
    height: 54,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  bottomBtnGhost: { backgroundColor: 'transparent', borderWidth: 1 },
  bottomBtnGhostT: { fontWeight: '900' },
  bottomBtnPrimary: {},
  bottomBtnPrimaryT: { color: '#FFF', fontWeight: '900' },

  // Ficha (capturas con pestañas)
  fichaHero: { marginHorizontal: 12, marginTop: 10, borderRadius: 18, backgroundColor: '#2F3F35', padding: 14 },
  fichaHeroRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  fichaAvatar: { width: 58, height: 58, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.10)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  fichaAvatarT: { color: '#FFFFFF', fontSize: 22, fontWeight: '900', fontStyle: 'italic' },
  fichaHeroOver: { color: 'rgba(255,255,255,0.70)', fontSize: 11, fontWeight: '900', letterSpacing: 1.4 },
  fichaHeroName: { color: '#FFFFFF', fontSize: 20, fontWeight: '900', marginTop: 2 },
  fichaHeroPills: { flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' },
  fichaPillSoft: { paddingHorizontal: 12, height: 28, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  fichaPillSoftT: { color: '#EDE7DA', fontWeight: '900', fontSize: 12, textTransform: 'lowercase' },
  fichaPillDark: { paddingHorizontal: 12, height: 28, borderRadius: 999, backgroundColor: 'rgba(15,23,42,0.26)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  fichaPillDarkT: { color: '#FFFFFF', fontWeight: '900', fontSize: 12 },

  fichaTabs: { marginHorizontal: 12, marginTop: 10, flexDirection: 'row', gap: 14, paddingHorizontal: 6 },
  fichaTab: { paddingVertical: 10, paddingHorizontal: 8, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  fichaTabActive: { borderBottomColor: '#2F3F35' },
  fichaTabT: { fontWeight: '900', fontSize: 13, color: 'rgba(15,23,42,0.45)' },
  fichaTabTActive: { color: '#0F172A' },

  fichaCard: { marginHorizontal: 12, marginTop: 12, borderRadius: 16, backgroundColor: '#F7F3EA', borderWidth: 1, borderColor: 'rgba(15,23,42,0.08)', padding: 14 },
  fichaSectionOver: { color: 'rgba(15,23,42,0.55)', fontSize: 11, fontWeight: '900', letterSpacing: 1.2, marginBottom: 10 },
  fichaField: { paddingVertical: 10, borderTopWidth: 1, borderTopColor: 'rgba(15,23,42,0.08)' },
  fichaFieldL: { color: 'rgba(15,23,42,0.55)', fontSize: 11, fontWeight: '800' },
  fichaFieldV: { color: '#0F172A', fontSize: 14, fontWeight: '900', marginTop: 4 },
  fichaInlineLink: { paddingTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, borderTopWidth: 1, borderTopColor: 'rgba(15,23,42,0.08)' },
  fichaInlineL: { color: 'rgba(15,23,42,0.55)', fontSize: 11, fontWeight: '800' },
  fichaInlineR: { color: '#0F172A', fontSize: 13, fontWeight: '900' },

  fichaInputLabel: { marginTop: 12, fontSize: 12, fontWeight: '900', color: 'rgba(15,23,42,0.65)' },
  fichaInput: {
    marginTop: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.10)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontWeight: '800',
    color: '#0F172A',
  },
  fichaTextArea: { minHeight: 92 },
  fichaSaveBtn: {
    marginTop: 12,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#2F6B4E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fichaSaveBtnT: { fontWeight: '900', color: '#FFFFFF' },

  fichaEmpty: { color: 'rgba(15,23,42,0.55)', fontWeight: '800' },
  fichaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderTopWidth: 1, borderTopColor: 'rgba(15,23,42,0.08)' },
  fichaRowIcon: { width: 34, height: 34, borderRadius: 12, backgroundColor: 'rgba(15,23,42,0.06)', alignItems: 'center', justifyContent: 'center' },
  fichaRowT: { fontSize: 14, fontWeight: '900', color: '#0F172A' },
  fichaRowSub: { fontSize: 12, fontWeight: '800', color: 'rgba(15,23,42,0.55)', marginTop: 2 },
  fichaTitular: { paddingHorizontal: 10, height: 26, borderRadius: 999, backgroundColor: 'rgba(34,197,94,0.14)', alignItems: 'center', justifyContent: 'center' },
  fichaTitularT: { fontSize: 12, fontWeight: '900', color: '#166534' },
  fichaAdd: { marginTop: 12, height: 44, borderRadius: 999, backgroundColor: 'rgba(15,23,42,0.06)', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10 },
  fichaAddT: { fontWeight: '900', color: 'rgba(15,23,42,0.75)' },

  fichaDocsHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 8 },
  fichaUpload: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, height: 32, borderRadius: 999, backgroundColor: 'rgba(15,23,42,0.06)' },
  fichaUploadT: { fontWeight: '900', color: 'rgba(15,23,42,0.75)', fontSize: 12 },
  fichaDocRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderTopWidth: 1, borderTopColor: 'rgba(15,23,42,0.08)' },
  fichaDocBadge: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(15,23,42,0.06)', alignItems: 'center', justifyContent: 'center' },
  fichaDocBadgeT: { fontWeight: '900', color: 'rgba(15,23,42,0.65)', fontSize: 12 },
  fichaDocT: { fontSize: 14, fontWeight: '900', color: '#0F172A' },
  fichaDocSub: { fontSize: 12, fontWeight: '800', color: 'rgba(15,23,42,0.55)', marginTop: 2 },

  fichaTopIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 999,
    backgroundColor: 'rgba(15,23,42,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  fichaBottomBar: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', gap: 12, backgroundColor: 'rgba(245,242,235,0.98)', borderTopWidth: 1, borderTopColor: 'rgba(15,23,42,0.10)' },
  fichaBottomGhost: { flex: 1, height: 56, borderRadius: 999, backgroundColor: 'rgba(15,23,42,0.06)', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10 },
  fichaBottomGhostT: { fontWeight: '900', color: 'rgba(15,23,42,0.75)' },
  fichaBottomPrimary: { flex: 1, height: 56, borderRadius: 999, backgroundColor: '#2F3F35', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10 },
  fichaBottomPrimaryT: { fontWeight: '900', color: '#FFFFFF', textAlign: 'center', lineHeight: 16 },

  estadoBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  estadoSheet: {
    backgroundColor: '#F7F4EE',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 26 : 16,
  },
  estadoOver: { fontSize: 11, fontWeight: '900', letterSpacing: 1.6, color: 'rgba(15,23,42,0.45)' },
  estadoTitle: { marginTop: 6, fontSize: 22, fontWeight: '900', color: '#0F172A' },
  estadoOpt: {
    marginTop: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.10)',
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  estadoOptActive: { borderColor: 'rgba(47,63,53,0.55)', backgroundColor: 'rgba(47,63,53,0.06)' },
  estadoOptPill: { paddingHorizontal: 12, height: 28, borderRadius: 999, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  estadoOptPillT: { fontWeight: '900', fontSize: 12 },
  estadoSub: { fontWeight: '800', color: 'rgba(15,23,42,0.65)' },
  estadoLabel: { marginTop: 14, fontSize: 12, fontWeight: '900', color: 'rgba(15,23,42,0.70)' },
  estadoTextArea: {
    marginTop: 8,
    minHeight: 92,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.10)',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  estadoSave: { marginTop: 14, height: 54, borderRadius: 999, backgroundColor: '#2F3F35', alignItems: 'center', justifyContent: 'center' },
  estadoSaveT: { color: '#FFFFFF', fontWeight: '900' },

  coordCard: { backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(15,23,42,0.10)', padding: 14 },
  coordOver: { fontSize: 11, fontWeight: '900', letterSpacing: 1.4, color: 'rgba(15,23,42,0.45)' },
  coordVal: { marginTop: 6, fontSize: 14, fontWeight: '900', color: '#0F172A' },
  coordSub: { marginTop: 6, fontSize: 12, fontWeight: '800', color: 'rgba(15,23,42,0.55)' },
  coordBtn: { flex: 1, height: 50, borderRadius: 999, backgroundColor: 'rgba(15,23,42,0.06)', alignItems: 'center', justifyContent: 'center' },
  coordBtnT: { fontWeight: '900', color: 'rgba(15,23,42,0.75)' },
  coordBtnPrimary: { flex: 1, height: 50, borderRadius: 999, backgroundColor: '#2F3F35', alignItems: 'center', justifyContent: 'center' },
  coordBtnPrimaryT: { fontWeight: '900', color: '#FFFFFF' },
});

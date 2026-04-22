import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import type { Bloque } from '@/lib/types';
import { NichoGrid } from '@/components/NichoGrid';
import { BLOQUES_OFICIALES } from '@/lib/bloques-oficiales';
import { OsmWebMap } from '@/components/OsmWebMap';
import * as Location from 'expo-location';
import { apiFetch } from '@/lib/laravel-api';

// Ortofoto PNOA (IGN/CNIG) descargada vía WMS (recorte del recinto)
const BASE_MAP_IMAGE = require('@/assets/images/mapa-somahoz-pnoa.jpg');

export default function MapaScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const [loading, setLoading] = useState(true);
  const [bloquesByCodigo, setBloquesByCodigo] = useState<Map<string, Bloque>>(new Map());
  const [bloquesById, setBloquesById] = useState<Map<number, Bloque>>(new Map());
  const [selectedCodigo, setSelectedCodigo] = useState<string | null>(null);
  // Solo OSM (fijo) por simplicidad operativa; en web usamos embed, en nativo MapView.
  const [mode] = useState<'osm'>('osm');
  const [osmPreset] = useState<'cerca'>('cerca');

  // Evitar que `react-native-maps` rompa en web (codegenNativeComponent).
  // Lo cargamos dinámicamente solo en nativo.
  const rnMaps = useMemo(() => {
    if (Platform.OS === 'web') return null;
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      return require('react-native-maps');
    } catch {
      return null;
    }
  }, []);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const MapView: any = rnMaps?.default ?? rnMaps?.MapView ?? null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const UrlTile: any = rnMaps?.UrlTile ?? null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Marker: any = rnMaps?.Marker ?? null;

  // Centro aproximado del cementerio (Somahoz). Ajustable si guardas GPS real.
  const CEMENTERIO_CENTER = useMemo(
    // Centrado exacto según vista OSM: https://www.openstreetmap.org/#map=19/43.248748/-4.057871
    () => ({ latitude: 43.248748, longitude: -4.057871 }),
    []
  );

  // En nativo: limitar navegación a un “marco” alrededor del cementerio.
  // (Evita que el usuario se pierda lejos, pero permite zoom/pan local.)
  const OSM_LIMIT = useMemo(() => ({ dLat: 0.0012, dLon: 0.0016 }), []);
  const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
  const clampRegion = useCallback(
    (r: any) => {
      const minLat = CEMENTERIO_CENTER.latitude - OSM_LIMIT.dLat;
      const maxLat = CEMENTERIO_CENTER.latitude + OSM_LIMIT.dLat;
      const minLon = CEMENTERIO_CENTER.longitude - OSM_LIMIT.dLon;
      const maxLon = CEMENTERIO_CENTER.longitude + OSM_LIMIT.dLon;
      return {
        ...r,
        latitude: clamp(r.latitude, minLat, maxLat),
        longitude: clamp(r.longitude, minLon, maxLon),
      };
    },
    [CEMENTERIO_CENTER.latitude, CEMENTERIO_CENTER.longitude, OSM_LIMIT.dLat, OSM_LIMIT.dLon]
  );

  const osmMapRef = useRef<any>(null);
  const [osmRegion] = useState<any>(() =>
    clampRegion({
      latitude: CEMENTERIO_CENTER.latitude,
      longitude: CEMENTERIO_CENTER.longitude,
      latitudeDelta: 0.0028,
      longitudeDelta: 0.0028,
    })
  );

  const [geoSepulturas, setGeoSepulturas] = useState<{ id: number; numero: number | null; lat: number; lon: number; estado?: string | null; bloque_id?: number | null; tipo?: string | null }[]>([]);
  const [loadingGeo, setLoadingGeo] = useState(false);
  const [q, setQ] = useState('');
  const [result, setResult] = useState<{ id: number; numero: number | null; codigo: string | null; estado: string | null } | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [lastAcc, setLastAcc] = useState<number | null>(null);
  const [manualLat, setManualLat] = useState('');
  const [manualLon, setManualLon] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerBloqueId, setPickerBloqueId] = useState<number | null>(null);
  const [pickerSepulturas, setPickerSepulturas] = useState<any[]>([]);
  const [loadingPicker, setLoadingPicker] = useState(false);
  const [pickerError, setPickerError] = useState<string | null>(null);
  const [osmTileError, setOsmTileError] = useState<string | null>(null);
  const [fEstado, setFEstado] = useState<'todas' | 'libre' | 'ocupada'>('todas');
  const [fTipo, setFTipo] = useState<'todos' | 'nicho' | 'columbario'>('todos');

  const totalNichos = useMemo(() => BLOQUES_OFICIALES.reduce((acc, b) => acc + b.filas * b.columnas, 0), []);

  const bloquesList = useMemo(() => {
    const arr = Array.from(bloquesByCodigo.values());
    arr.sort((a: any, b: any) => String(a.codigo ?? '').localeCompare(String(b.codigo ?? '')));
    return arr;
  }, [bloquesByCodigo]);

  const demoGeo = useMemo(() => {
    // Demo visual (si todavía no hay GPS en BD). IDs negativos para no navegar.
    const baseLat = CEMENTERIO_CENTER.latitude;
    const baseLon = CEMENTERIO_CENTER.longitude;
    const pts = [
      { dLat: 0.00010, dLon: 0.00005, estado: 'ocupada' },
      { dLat: 0.00008, dLon: -0.00004, estado: 'libre' },
      { dLat: 0.00004, dLon: 0.00010, estado: 'ocupada' },
      { dLat: -0.00006, dLon: 0.00002, estado: 'libre' },
      { dLat: -0.00009, dLon: -0.00007, estado: 'ocupada' },
      { dLat: 0.00002, dLon: -0.00012, estado: 'libre' },
    ];
    return pts.map((p, idx) => ({
      id: -(idx + 1),
      numero: 1000 + idx,
      lat: baseLat + p.dLat,
      lon: baseLon + p.dLon,
      estado: p.estado,
      bloque_id: null,
      tipo: 'nicho',
    }));
  }, [CEMENTERIO_CENTER.latitude, CEMENTERIO_CENTER.longitude]);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await apiFetch<{ items: any[] }>('/api/cementerio/bloques');
    if (!res.ok) {
      console.error('[mapa/bloques] ', res.error);
      Alert.alert('Error', String(res.error ?? 'No se pudieron cargar bloques'));
      setBloquesByCodigo(new Map());
      setLoading(false);
      return;
    }
    const map = new Map<string, Bloque>();
    const mapId = new Map<number, Bloque>();
    for (const b of (res.data.items ?? []) as any[]) {
      if (b?.codigo) map.set(String(b.codigo), b as Bloque);
      if (b?.id) mapId.set(Number(b.id), b as Bloque);
    }
    setBloquesByCodigo(map);
    setBloquesById(mapId);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  // Buscar nicho rápido por número/código/id (para asignar GPS sin abrir ficha)
  useFocusEffect(
    useCallback(() => {
      const run = async () => {
        const t = q.trim();
        if (t.length < 2) {
          setResult(null);
          return;
        }
        try {
          const res = await apiFetch<{ items: any[] }>(`/api/cementerio/sepulturas/search?q=${encodeURIComponent(t)}`);
          if (!res.ok) throw new Error();
          const row = (res.data.items ?? [])[0] as any;
          setResult(row ? { id: row.id, numero: row.numero ?? null, codigo: row.codigo ?? null, estado: row.estado ?? null } : null);
        } catch {
          setResult(null);
        }
      };
      const to = setTimeout(run, 250);
      return () => clearTimeout(to);
    }, [q])
  );

  const capturarYAsignar = useCallback(async () => {
    if (!result) {
      Alert.alert('Selecciona un nicho', 'Busca un número o código para asignar GPS.');
      return;
    }
    try {
      setAssigning(true);
      if (Platform.OS === 'web') {
        const lat = Number(manualLat);
        const lon = Number(manualLon);
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
          Alert.alert('Coordenadas', 'En web usa lat/lon manual (números).');
          return;
        }
        const up = await apiFetch(`/api/cementerio/sepulturas/${result.id}`, { method: 'PUT', body: { lat, lon } });
        if (!up.ok) throw new Error(String(up.error ?? 'No se pudo guardar.'));
        Alert.alert('GPS asignado', `Nicho ${result.numero ?? result.id} guardado.`);
        return;
      }
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
      setLastAcc(acc);
      if (acc === null) throw new Error('No se pudo leer la precisión del GPS.');
      if (acc > 5) {
        Alert.alert('Precisión insuficiente', `Precisión actual: ${Math.round(acc)} m.\nAcércate y vuelve a intentarlo (objetivo < 5 m).`);
        return;
      }
      const payload = { lat: pos.coords.latitude, lon: pos.coords.longitude };
      const up = await apiFetch(`/api/cementerio/sepulturas/${result.id}`, { method: 'PUT', body: payload });
      if (!up.ok) throw new Error(String(up.error ?? 'No se pudo guardar.'));
      Alert.alert('GPS asignado', `Nicho ${result.numero ?? result.id} guardado con precisión ${Math.round(acc)} m.`);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? String(e));
    } finally {
      setAssigning(false);
    }
  }, [result]);

  const abrirPicker = useCallback(async () => {
    if (bloquesList.length === 0) return;
    setPickerOpen(true);
    setPickerBloqueId((prev) => prev ?? bloquesList[0].id);
  }, [bloquesList, pickerBloqueId]);

  const cerrarPicker = useCallback(() => setPickerOpen(false), []);

  useEffect(() => {
    const run = async () => {
      if (!pickerOpen) return;
      if (!pickerBloqueId) return;
      setLoadingPicker(true);
      setPickerError(null);
      try {
          const res = await apiFetch<{ items: any[] }>(`/api/cementerio/bloques/${pickerBloqueId}/sepulturas`);
          if (!res.ok) throw new Error();
          setPickerSepulturas(res.data.items ?? []);
      } catch {
        setPickerSepulturas([]);
        setPickerError('No se pudieron cargar nichos (revisa sesión/RLS o conexión).');
      } finally {
        setLoadingPicker(false);
      }
    };
    run();
  }, [pickerOpen, pickerBloqueId]);

  // Cargar nichos con GPS (para pintarlos sobre OSM en nativo)
  useFocusEffect(
    useCallback(() => {
      const run = async () => {
        if (mode !== 'osm') return;
        // En web también cargamos para poder dibujar en MapLibre.
        if (Platform.OS !== 'web' && (!MapView || !Marker)) return;
        setLoadingGeo(true);
        try {
          const res = await apiFetch<{ items: any[] }>(`/api/cementerio/sepulturas/geo?limit=2000`);
          if (!res.ok) throw new Error();
          const rows = (res.data.items ?? []) as any[];
          const mapped = rows
            .map((r) => ({
              id: Number(r.id),
              numero: r.numero == null ? null : Number(r.numero),
              lat: Number(r.lat),
              lon: Number(r.lon),
              estado: r.estado ?? null,
              bloque_id: r.bloque_id ?? null,
              tipo: r.tipo ?? null,
            }))
            .filter((r) => Number.isFinite(r.lat) && Number.isFinite(r.lon));
          setGeoSepulturas(mapped.length > 0 ? mapped : demoGeo);
        } catch (e: any) {
          console.warn('[mapa/osm] geo load failed', e?.message ?? e);
          setGeoSepulturas(demoGeo);
        } finally {
          setLoadingGeo(false);
        }
      };
      run();
    }, [MapView, Marker, mode, demoGeo])
  );

  const webMarkers = useMemo(() => {
    // En web también dibujamos (MapLibre). Color por estado.
    return geoSepulturas.map((r) => ({
      id: r.id,
      lat: r.lat,
      lon: r.lon,
      label: r.id < 0 ? `DEMO N.º ${r.numero ?? ''}` : (r.numero != null ? `N.º ${r.numero}` : `ID ${r.id}`),
      color: (String(r.estado ?? '').toLowerCase() === 'libre') ? '#22C55E' : '#EF4444',
    }));
  }, [geoSepulturas]);

  const filteredGeo = useMemo(() => {
    return geoSepulturas.filter((r) => {
      const est = String(r.estado ?? '').toLowerCase();
      const tipo = String(r.tipo ?? '').toLowerCase();
      if (fEstado !== 'todas' && est !== fEstado) return false;
      if (fTipo !== 'todos' && tipo !== fTipo) return false;
      return true;
    });
  }, [geoSepulturas, fEstado, fTipo]);

  const filteredWebMarkers = useMemo(() => {
    return filteredGeo.map((r) => ({
      id: r.id,
      lat: r.lat,
      lon: r.lon,
      label: r.id < 0 ? `DEMO N.º ${r.numero ?? ''}` : (r.numero != null ? `N.º ${r.numero}` : `ID ${r.id}`),
      color: (String(r.estado ?? '').toLowerCase() === 'libre') ? '#22C55E' : '#EF4444',
    }));
  }, [filteredGeo]);

  const statsGeo = useMemo(() => {
    const total = geoSepulturas.length;
    const libre = geoSepulturas.filter((r) => String(r.estado ?? '').toLowerCase() === 'libre').length;
    const ocupada = geoSepulturas.filter((r) => String(r.estado ?? '').toLowerCase() === 'ocupada').length;
    const col = geoSepulturas.filter((r) => String(r.tipo ?? '').toLowerCase() === 'columbario').length;
    return { total, libre, ocupada, col };
  }, [geoSepulturas]);

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color="#16A34A" />
        <Text style={s.loadingText}>Cargando mapa…</Text>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <View style={s.top}>
        <View style={s.topRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.title}>Mapa</Text>
            <Text style={s.sub}>Somahoz (Corrales de Buelna) · 10 bloques · {totalNichos} nichos</Text>
          </View>
        </View>

        <View style={s.presetRow} />
      </View>

      <View style={s.mapWrap}>
        <View style={{ width: '100%', maxWidth: Math.min(width - 32, 920), alignSelf: 'center', height: Math.min(760, Math.max(420, Math.round(height * 0.55))) }}>
          {Platform.OS === 'web' ? (
            <OsmWebMap
              height={Math.min(760, Math.max(420, Math.round(height * 0.55)))}
              center={CEMENTERIO_CENTER}
              label="Cementerio de Somahoz"
              preset={osmPreset}
              markers={filteredWebMarkers}
              onPressMarker={(sepulturaId) => {
                // Orden operativo: ir al bloque (vista nichos). Si no hay bloque, abrir ficha.
                if (sepulturaId <= 0) {
                  // DEMO: enviar a un bloque conocido para que se vea la “vista nichos”.
                  const demoCodigo = BLOQUES_OFICIALES[0]?.codigo ?? 'B8';
                  router.push(`/bloque/${encodeURIComponent(demoCodigo)}`);
                  return;
                }
                const row = geoSepulturas.find((x) => x.id === sepulturaId);
                const bloqueId = row?.bloque_id ?? null;
                const b = bloqueId != null ? bloquesById.get(Number(bloqueId)) : null;
                const codigo = (b as any)?.codigo ? String((b as any).codigo) : null;
                if (codigo) router.push(`/bloque/${encodeURIComponent(codigo)}`);
                else router.push(`/sepultura/${sepulturaId}`);
              }}
            />
          ) : MapView && UrlTile ? (
            <View style={{ flex: 1 }}>
              {osmTileError ? (
                <View style={s.osmMissing}>
                  <Text style={s.osmMissingT}>Mapa no disponible</Text>
                  <Text style={s.osmMissingSub}>{osmTileError}</Text>
                  <TouchableOpacity style={s.retryBtn} onPress={() => setOsmTileError(null)} activeOpacity={0.85}>
                    <Text style={s.retryBtnT}>Reintentar</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <MapView
                  ref={osmMapRef}
                  style={{ flex: 1, borderRadius: 14 }}
                  region={{
                    ...osmRegion,
                    latitudeDelta: osmPreset === 'cerca' ? 0.0016 : osmPreset === 'amplio' ? 0.0042 : 0.0028,
                    longitudeDelta: osmPreset === 'cerca' ? 0.0016 : osmPreset === 'amplio' ? 0.0042 : 0.0028,
                  }}
                  minZoomLevel={16}
                  maxZoomLevel={20}
                  scrollEnabled={false}
                  zoomEnabled={false}
                  rotateEnabled={false}
                  pitchEnabled={false}
                  toolbarEnabled={false}
                >
                  <UrlTile
                    urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                    maximumZ={19}
                    flipY={false}
                    // Algunos dispositivos muestran "Retry" si fallan tiles. Capturamos el fallo y mostramos UI propia.
                    onError={(e: any) => setOsmTileError(e?.nativeEvent?.error ?? 'Fallo cargando tiles OSM. Comprueba conexión.')}
                  />
                  {Marker ? (
                    <Marker
                      coordinate={CEMENTERIO_CENTER}
                      title="Cementerio de Somahoz"
                      description="Centro"
                    />
                  ) : null}
                  {Marker && filteredGeo.map((r) => (
                    <Marker
                      key={r.id}
                      coordinate={{ latitude: r.lat, longitude: r.lon }}
                      title={r.numero != null ? `N.º ${r.numero}` : `ID ${r.id}`}
                      description={r.estado ? String(r.estado) : undefined}
                      onPress={() => router.push(`/sepultura/${r.id}`)}
                    />
                  ))}
                </MapView>
              )}
            </View>
          ) : (
            <View style={s.osmMissing}>
              <Text style={s.osmMissingT}>OSM no disponible en este dispositivo.</Text>
              <Text style={s.osmMissingSub}>Recompila la app para nativo.</Text>
            </View>
          )}
        </View>
      </View>

      <View style={s.filters}>
        <View style={s.filtersRow}>
          <Text style={s.filtersLabel}>Estado</Text>
          {(['todas', 'libre', 'ocupada'] as const).map((k) => (
            <TouchableOpacity key={k} style={[s.fChip, fEstado === k && s.fChipActive]} onPress={() => setFEstado(k)} activeOpacity={0.85}>
              <Text style={[s.fChipT, fEstado === k && s.fChipTActive]}>{k}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={s.filtersRow}>
          <Text style={s.filtersLabel}>Tipo</Text>
          {(['todos', 'nicho', 'columbario'] as const).map((k) => (
            <TouchableOpacity key={k} style={[s.fChip, fTipo === k && s.fChipActive]} onPress={() => setFTipo(k)} activeOpacity={0.85}>
              <Text style={[s.fChipT, fTipo === k && s.fChipTActive]}>{k}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={s.filtersHint}>
          GPS en mapa: {statsGeo.total} · libres {statsGeo.libre} · ocupadas {statsGeo.ocupada} · columbarios {statsGeo.col}
          {loadingGeo ? ' · cargando…' : ''}
        </Text>
      </View>

      {/* Panel operario: asignación rápida de GPS */}
      <View style={s.opsBar}>
        <View style={s.opsHeader}>
          <Text style={s.opsTitle}>Asignar GPS rápido</Text>
          <Text style={s.opsSub}>Busca o elige en “NICHOS” y guarda coordenadas</Text>
        </View>
        <View style={s.opsRow}>
          <TextInput
            style={s.opsInput}
            value={q}
            onChangeText={setQ}
            placeholder="N.º o código…"
            placeholderTextColor="#94A3B8"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity style={s.opsMiniBtn} onPress={abrirPicker} activeOpacity={0.85}>
            <Text style={s.opsMiniBtnT}>NICHOS</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.opsBtn, assigning && { opacity: 0.6 }]} onPress={capturarYAsignar} disabled={assigning} activeOpacity={0.85}>
            {assigning ? <ActivityIndicator color="#fff" /> : <Text style={s.opsBtnT}>{Platform.OS === 'web' ? 'GUARDAR' : 'CAPTURAR'}</Text>}
          </TouchableOpacity>
        </View>

        {Platform.OS === 'web' ? (
          <View style={s.opsRow}>
            <TextInput
              style={s.opsInput}
              value={manualLat}
              onChangeText={setManualLat}
              placeholder="lat (ej: 43.248748)"
              placeholderTextColor="#94A3B8"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TextInput
              style={s.opsInput}
              value={manualLon}
              onChangeText={setManualLon}
              placeholder="lon (ej: -4.057871)"
              placeholderTextColor="#94A3B8"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        ) : null}

        <Text style={s.opsHint}>
          {result
            ? `Objetivo: N.º ${result.numero ?? '—'} · ${result.codigo ?? `ID ${result.id}`} · ${result.estado ?? ''}`
            : 'Escribe 2+ caracteres para encontrar el nicho.'}
          {lastAcc != null ? ` · Últ. precisión: ${Math.round(lastAcc)} m` : ''}
          {Platform.OS === 'web' ? ' · En web es manual (sin GPS).' : ''}
        </Text>

      </View>

      {/* Modal picker (evita problemas de scroll en web) */}
      <Modal visible={pickerOpen} transparent animationType="fade" onRequestClose={cerrarPicker}>
        <View style={s.modalBg}>
          <View style={s.modalCard}>
            <View style={s.pickerHeader}>
              <Text style={s.pickerHeaderT}>Elegir nicho</Text>
              <TouchableOpacity style={s.pickerClose} onPress={cerrarPicker} activeOpacity={0.85}>
                <Text style={s.pickerCloseT}>Cerrar</Text>
              </TouchableOpacity>
            </View>
            <Text style={s.modalHint}>Tap = seleccionar para asignar GPS · Doble tap = abrir ficha</Text>
            {pickerError ? <Text style={s.modalErr}>{pickerError}</Text> : null}

            <View style={s.pickerPills}>
              {bloquesList.slice(0, 18).map((b: any) => (
                <TouchableOpacity
                  key={b.id}
                  style={[s.pickerPill, pickerBloqueId === b.id && s.pickerPillActive]}
                  onPress={() => setPickerBloqueId(b.id)}
                  activeOpacity={0.85}
                >
                  <Text style={[s.pickerPillT, pickerBloqueId === b.id && s.pickerPillTActive]}>{String(b.codigo ?? b.id)}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {loadingPicker ? (
              <View style={s.pickerLoading}>
                <ActivityIndicator color="#16A34A" />
                <Text style={s.pickerLoadingT}>Cargando nichos…</Text>
              </View>
            ) : pickerBloqueId ? (
              <View style={{ height: 320 }}>
                <NichoGrid
                  sepulturas={pickerSepulturas as any}
                  filas={(bloquesById.get(pickerBloqueId) as any)?.filas ?? 4}
                  columnas={(bloquesById.get(pickerBloqueId) as any)?.columnas ?? 1}
                  onNichoPress={(sep: any) => {
                    setResult({ id: sep.id, numero: sep.numero ?? null, codigo: sep.codigo ?? null, estado: sep.estado ?? null });
                    setQ(String(sep.numero ?? sep.id));
                    setPickerOpen(false);
                  }}
                  onNichoDoublePress={(sep: any) => router.push(`/sepultura/${sep.id}`)}
                />
              </View>
            ) : null}
          </View>
        </View>
      </Modal>

      {/* Espacio para que la barra inferior no tape el final */}
      <View style={{ height: 120 }} />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  loadingText: { marginTop: 12, fontSize: 16, color: '#6B7280' },
  top: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { fontSize: 22, fontWeight: '900', color: '#15803D' },
  sub: { marginTop: 4, fontSize: 13, color: '#6B7280', fontWeight: '600' },
  presetRow: { marginTop: 10, flexDirection: 'row', gap: 8 },
  presetBtn: { flex: 1, height: 34, borderRadius: 12, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center' },
  presetBtnActive: { backgroundColor: '#15803D', borderColor: '#15803D' },
  presetBtnT: { fontWeight: '900', fontSize: 12, color: '#0F172A' },
  presetBtnTActive: { color: '#FFF' },
  mapWrap: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4, alignItems: 'center' },
  osmMissing: { flex: 1, borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', padding: 16, gap: 8 },
  osmMissingT: { fontWeight: '900', color: '#0F172A' },
  osmMissingSub: { fontWeight: '700', color: '#64748B', textAlign: 'center', lineHeight: 18 },
  // Barra operativa (sticky) para GPS rápido
  opsBar: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 12,
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  opsHeader: { gap: 2 },
  opsTitle: { fontSize: 16, fontWeight: '900', color: '#0F172A' },
  opsSub: { fontSize: 12, fontWeight: '800', color: '#64748B' },
  opsRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  opsInput: { flex: 1, height: 48, borderRadius: 14, borderWidth: 1, borderColor: '#CBD5E1', backgroundColor: '#F8FAFC', paddingHorizontal: 14, fontWeight: '900', color: '#0F172A' },
  opsMiniBtn: { height: 48, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1, borderColor: '#0F172A', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  opsMiniBtnT: { fontWeight: '900', color: '#0F172A', fontSize: 12, letterSpacing: 0.8 },
  opsBtn: { height: 48, paddingHorizontal: 16, borderRadius: 14, backgroundColor: '#15803D', alignItems: 'center', justifyContent: 'center' },
  opsBtnT: { color: '#FFF', fontWeight: '900', letterSpacing: 1.1 },
  opsHint: { color: '#475569', fontWeight: '800', lineHeight: 18 },
  filters: { marginHorizontal: 16, marginTop: 10, backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#E5E7EB', padding: 12, gap: 10 },
  filtersRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  filtersLabel: { fontWeight: '900', color: '#0F172A', fontSize: 12, marginRight: 4 },
  fChip: { height: 32, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center' },
  fChipActive: { backgroundColor: '#0F172A', borderColor: '#0F172A' },
  fChipT: { fontWeight: '900', color: '#0F172A', fontSize: 12 },
  fChipTActive: { color: '#FFF' },
  filtersHint: { color: '#64748B', fontWeight: '700', lineHeight: 18 },
  pickerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  pickerHeaderT: { flex: 1, fontWeight: '900', color: '#0F172A', fontSize: 12 },
  pickerClose: { paddingHorizontal: 10, height: 30, borderRadius: 10, backgroundColor: '#0F172A', alignItems: 'center', justifyContent: 'center' },
  pickerCloseT: { color: '#FFF', fontWeight: '900', fontSize: 12 },
  pickerPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pickerPill: { height: 34, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center' },
  pickerPillActive: { backgroundColor: '#15803D', borderColor: '#15803D' },
  pickerPillT: { fontWeight: '900', color: '#0F172A', fontSize: 12 },
  pickerPillTActive: { color: '#FFF' },
  pickerLoading: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  pickerLoadingT: { color: '#64748B', fontWeight: '800' },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', padding: 16, justifyContent: 'center' },
  modalCard: { backgroundColor: '#FFF', borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB', padding: 12, gap: 10, maxHeight: '90%' as any },
  modalHint: { color: '#64748B', fontWeight: '700', fontSize: 12, lineHeight: 16 },
  modalErr: { color: '#B45309', fontWeight: '900', fontSize: 12, lineHeight: 16 },
  retryBtn: { marginTop: 10, height: 44, paddingHorizontal: 14, borderRadius: 12, backgroundColor: '#15803D', alignItems: 'center', justifyContent: 'center' },
  retryBtnT: { color: '#FFF', fontWeight: '900', letterSpacing: 0.6 },
});


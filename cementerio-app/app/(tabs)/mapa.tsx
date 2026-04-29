import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter } from 'expo-router';
import { useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { apiFetch } from '@/lib/laravel-api';
import { BLOQUES_OFICIALES, type ZonaLabel, formatRango } from '@/lib/bloques-oficiales';
import { unwrapItem } from '@/lib/normalize';
import { CementerioMapaOSM } from '@/components/CementerioMapaOSM';
import { PlanoGeneralMapa, type PlanoGeneralMapaHandle } from '@/components/PlanoGeneralMapa';
import { normalizarEstadoEditable } from '@/lib/estado-sepultura';
import { AppButton, AppCard, AppPill, AppSkeleton, Radius, Semantic, Space } from '@/components/ui';
import { POLIGONOS_BLOQUES_SOMAHOZ } from '@/lib/mapa-somahoz';
import { buildPlanoBlocksSomahoz } from '@/lib/plano-somahoz';
import { SOMAHOZ_HOTSPOTS, type SomahozHotspotId } from '@/lib/mapa-somahoz-hotspots';
import { loadDibujos } from '@/lib/mapa-dibujo-store';
import { SOMAHOZ_YELLOW_MARKERS } from '@/lib/somahoz-yellow-markers';

export default function MapaScreen() {
  const params = useLocalSearchParams<{ focus_sepultura_id?: string; focus_lat?: string; focus_lon?: string; focus_acc?: string }>();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const planoRef = useRef<PlanoGeneralMapaHandle | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [searching, setSearching] = useState(false);
  const [selectedCodigo, setSelectedCodigo] = useState<string | null>(null);
  const [bloqueCodes, setBloqueCodes] = useState<Set<string>>(new Set());
  const [bloquesRaw, setBloquesRaw] = useState<any[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [viewMode, setViewMode] = useState<'satelite' | 'plano'>('plano');
  const [zona, setZona] = useState<'ALL' | ZonaLabel>('ALL');
  const [highlightSepId, setHighlightSepId] = useState<number | null>(null);
  const [activeHotspot, setActiveHotspot] = useState<SomahozHotspotId | null>(null);
  const [ampliacionesOpen, setAmpliacionesOpen] = useState(false);
  const [gpsHere, setGpsHere] = useState<{ lat: number; lon: number; acc: number | null } | null>(null);
  const [gpsDetected, setGpsDetected] = useState<string | null>(null);
  const [customBloques, setCustomBloques] = useState<Array<{ codigo: string; coordinates: Array<{ latitude: number; longitude: number }> }> | null>(null);
  const [yellowNonce, setYellowNonce] = useState(0);

  // Al volver del editor de números, fuerza recarga desde storage
  useFocusEffect(
    useCallback(() => {
      setYellowNonce(Date.now());
      return () => {};
    }, [])
  );

  // Ajuste “encuadre”: si el contenedor es muy alto respecto al ancho (móvil),
  // con `meet` queda mucho margen blanco arriba/abajo. Mejor un alto casi cuadrado.
  const mapH = useMemo(() => {
    const w = Number(width || 0);
    if (!Number.isFinite(w) || w <= 0) return 520;
    return Math.min(520, Math.max(320, Math.round(w * 0.92)));
  }, [width]);

  const abrirBloquePorCodigo = useCallback(
    async (codigo: string) => {
      const b = (bloquesRaw ?? []).find((x) => String((x as any)?.codigo) === String(codigo));
      const id = Number((b as any)?.id);
      if (!Number.isFinite(id) || id <= 0) {
        Alert.alert('Bloque', `No se encontró el bloque ${codigo} en la base de datos.`);
        return;
      }
      router.push(`/bloque/${id}`);
    },
    [bloquesRaw, router]
  );

  const gpsPointInPoly = useCallback((lat: number, lon: number, poly: Array<{ latitude: number; longitude: number }>) => {
    // Ray casting sobre plano lon/lat
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i].longitude;
      const yi = poly[i].latitude;
      const xj = poly[j].longitude;
      const yj = poly[j].latitude;
      const intersect = yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi + 1e-7) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  }, []);

  const gpsNearestBlock = useCallback(
    (lat: number, lon: number) => {
      // Distancia aproximada (en metros) punto->segmento en proyección equirectangular local
      const lat0 = lat;
      const mPerDegLat = 111_320;
      const mPerDegLon = 111_320 * Math.cos((lat0 * Math.PI) / 180);

      const toXY = (p: { latitude: number; longitude: number }) => ({
        x: (p.longitude - lon) * mPerDegLon,
        y: (p.latitude - lat) * mPerDegLat,
      });

      const distPointToSeg = (p: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }) => {
        const abx = b.x - a.x;
        const aby = b.y - a.y;
        const apx = p.x - a.x;
        const apy = p.y - a.y;
        const ab2 = abx * abx + aby * aby;
        const t = ab2 > 0 ? Math.max(0, Math.min(1, (apx * abx + apy * aby) / ab2)) : 0;
        const cx = a.x + t * abx;
        const cy = a.y + t * aby;
        const dx = p.x - cx;
        const dy = p.y - cy;
        return Math.hypot(dx, dy);
      };

      let best: { codigo: string; meters: number } | null = null;
      const P = { x: 0, y: 0 }; // punto está en origen (toXY es relativo)

      for (const poly of POLIGONOS_BLOQUES_SOMAHOZ) {
        const ll = poly.puntos.map(vbToLatLon);
        if (ll.length < 2) continue;
        let dmin = Number.POSITIVE_INFINITY;
        for (let i = 0; i < ll.length; i++) {
          const a = toXY(ll[i]);
          const b = toXY(ll[(i + 1) % ll.length]);
          dmin = Math.min(dmin, distPointToSeg(P, a, b));
        }
        if (!Number.isFinite(dmin)) continue;
        if (!best || dmin < best.meters) best = { codigo: String(poly.codigo), meters: dmin };
      }
      return best;
    },
    [vbToLatLon]
  );

  // Coordenadas OSM (mismo bbox que `CementerioMapaOSM.native`)
  const vbToLatLon = useCallback((p: { x: number; y: number }) => {
    const south = 43.2483426;
    const north = 43.2491123;
    const west = -4.0582794;
    const east = -4.0575471;
    const longitude = west + (p.x / 1000) * (east - west);
    const latitude = north - (p.y / 1000) * (north - south);
    return { latitude, longitude };
  }, []);

  const onPressHotspot = useCallback(
    (id: SomahozHotspotId) => {
      setActiveHotspot(id);
      const run = async () => {
        if (id === 'TANATORIO') {
          Alert.alert('Tanatorio', 'Tanatorio (Fuera de recinto)');
          return;
        }
        if (id === 'A_B6') return abrirBloquePorCodigo('B6');
        if (id === 'B_B7') return abrirBloquePorCodigo('B7');
        if (id === 'C_B8') return abrirBloquePorCodigo('B8');
        if (id === 'D_AMPLIACIONES') {
          setAmpliacionesOpen(true);
          return;
        }
        if (id === 'E_COLUMBARIOS') {
          Alert.alert('Columbarios', 'Pendiente: vista especial de columbarios.');
        }
      };
      setTimeout(() => {
        run();
      }, 180);
    },
    [abrirBloquePorCodigo]
  );

  const blocksAll = useMemo(() => {
    const all = BLOQUES_OFICIALES;
    if (!bloqueCodes || bloqueCodes.size === 0) return all;
    const filtered = all.filter((b) => bloqueCodes.has(String(b.codigo)));
    return filtered.length > 0 ? filtered : all;
  }, [bloqueCodes]);
  const blocks = useMemo(() => {
    if (zona === 'ALL') return blocksAll;
    return blocksAll.filter((b) => b.zonaLabel === zona);
  }, [blocksAll, zona]);

  const selectedBloque = useMemo(() => {
    if (!selectedCodigo) return null;
    const byCode = bloquesRaw.find((b) => String(b?.codigo) === String(selectedCodigo));
    return byCode ?? null;
  }, [bloquesRaw, selectedCodigo]);

  const selectedBloqueOficial = useMemo(() => {
    if (!selectedCodigo) return null;
    return (blocksAll ?? []).find((b) => String(b.codigo) === String(selectedCodigo)) ?? null;
  }, [blocksAll, selectedCodigo]);

  const selectedBloqueId = useMemo(() => {
    const id = Number((selectedBloque as any)?.id);
    return Number.isFinite(id) && id > 0 ? id : null;
  }, [selectedBloque]);

  const schematicBlocks = useMemo(() => {
    return buildPlanoBlocksSomahoz({
      bloquesOficiales: blocks as any,
      bloquesRaw,
      poligonos: POLIGONOS_BLOQUES_SOMAHOZ,
      crop: { x: 255, y: 205, w: 500, h: 500 },
      margin: 70,
      pad: 14,
    });
  }, [bloquesRaw, blocks]);

  const [createOpen, setCreateOpen] = useState(false);
  const [createSaving, setCreateSaving] = useState(false);
  const [createErr, setCreateErr] = useState<string | null>(null);
  const [createZonaCodigo, setCreateZonaCodigo] = useState<string>('Z');
  const [createNumero, setCreateNumero] = useState<string>('1');
  const [createFila, setCreateFila] = useState<string>('1');
  const [createCol, setCreateCol] = useState<string>('1');
  const [createCodigo, setCreateCodigo] = useState<string>('');

  const load = useCallback(async () => {
    setLoading(true);
    const r = await apiFetch<{ items?: any[] }>('/api/cementerio/bloques');
    if (r.ok) {
      const items = (r.data.items ?? []) as any[];
      setBloquesRaw(items);
      const s = new Set<string>(items.map((b) => String(b.codigo)));
      setBloqueCodes(s);
      setLoading(false);
      return;
    }
    const cat = await apiFetch<any>('/api/cementerio/catalogo');
    if (cat.ok) {
      const items = ((cat.data as any)?.bloques ?? []) as any[];
      setBloquesRaw(items);
      const s = new Set<string>(items.map((b: any) => String(b.codigo)));
      setBloqueCodes(s);
      setLoading(false);
      return;
    }
    setBloquesRaw([]);
    setBloqueCodes(new Set());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Cargar dibujos del usuario (bloques pintados)
  useEffect(() => {
    loadDibujos().then((items) => {
      const blocks = (items ?? []).filter((f: any) => f.type === 'bloque' && Array.isArray(f.coordinates) && f.coordinates.length >= 3);
      if (blocks.length === 0) {
        setCustomBloques(null);
        return;
      }
      setCustomBloques(blocks.map((b: any) => ({ codigo: String(b.codigo), coordinates: b.coordinates })));
    });
  }, []);

  // Si venimos desde la ficha de un nicho: enfocar bloque y resaltar
  useEffect(() => {
    const sid = Number(params.focus_sepultura_id);
    if (!Number.isFinite(sid) || sid <= 0) return;
    setHighlightSepId(sid);
    // Preferimos satélite para que el operario “vea” dónde está
    setViewMode('satelite');
    apiFetch<any>(`/api/cementerio/sepulturas/${sid}`)
      .then((r) => {
        if (!r.ok) return;
        const item = unwrapItem<any>(r.data) ?? (r.data as any)?.item ?? (r.data as any);
        const code = item?.bloque?.codigo ?? item?.cemn_bloques?.codigo ?? item?.bloque_codigo ?? null;
        if (code) setSelectedCodigo(String(code));
      })
      .catch(() => null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.focus_sepultura_id]);

  // Si venimos con GPS: centrar y detectar bloque más probable
  useEffect(() => {
    const lat = Number(params.focus_lat);
    const lon = Number(params.focus_lon);
    const acc = params.focus_acc != null ? Number(params.focus_acc) : null;
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
    setGpsHere({ lat, lon, acc: Number.isFinite(acc as any) ? (acc as number) : null });
    setViewMode('satelite');

    // Detectar bloque por punto dentro de polígono
    for (const p of POLIGONOS_BLOQUES_SOMAHOZ) {
      const polyLL = p.puntos.map(vbToLatLon);
      if (gpsPointInPoly(lat, lon, polyLL)) {
        setGpsDetected(String(p.codigo));
        // Si no hay bloque seleccionado, seleccionamos el detectado
        setSelectedCodigo((prev) => prev ?? String(p.codigo));
        return;
      }
    }
    // Si no cae dentro de ningún bloque: sugerir el más cercano
    const nearest = gpsNearestBlock(lat, lon);
    if (nearest) {
      setGpsDetected(`${nearest.codigo}~${Math.round(nearest.meters)}`);
      setSelectedCodigo((prev) => prev ?? String(nearest.codigo));
    } else {
      setGpsDetected(null);
    }
  }, [gpsNearestBlock, gpsPointInPoly, params.focus_acc, params.focus_lat, params.focus_lon, vbToLatLon]);

  const onPressBlock = (codigo: string) => {
    // UX como captura: seleccionar bloque y mostrar barra inferior.
    setSelectedCodigo(codigo);
  };

  const onPressZona = (z: 'ALL' | ZonaLabel) => {
    setZona(z);
    // si el bloque seleccionado queda fuera del filtro, lo deseleccionamos
    if (z !== 'ALL' && selectedBloqueOficial && selectedBloqueOficial.zonaLabel !== z) {
      setSelectedCodigo(null);
    }
  };

  // Preparar modal de creación al abrir o cambiar bloque seleccionado
  useEffect(() => {
    if (!createOpen) return;
    setCreateErr(null);

    const b = selectedBloque;
    const numDefault = '1';
    setCreateNumero(numDefault);
    setCreateFila('1');
    setCreateCol('1');

    const tryLoadZonaCode = async () => {
      try {
        const cat = await apiFetch<any>('/api/cementerio/catalogo');
        if (!cat.ok) return;
        const zs = ((cat.data as any)?.zonas ?? []) as any[];
        const z = b?.zona_id ? zs.find((x) => Number(x?.id) === Number(b.zona_id)) : null;
        const zc = (z?.codigo ?? z?.siglas ?? z?.nombre ?? 'Z').toString().trim();
        if (zc) setCreateZonaCodigo(zc);
      } catch {}
    };
    tryLoadZonaCode();

    const baseCode = b?.codigo ? String(b.codigo).trim() : selectedCodigo ? String(selectedCodigo).trim() : 'B?';
    setCreateCodigo(`${createZonaCodigo}-${baseCode}-N${numDefault}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createOpen, selectedBloque]);

  // Recalcular código sugerido cuando cambien zona/bloque/numero
  useEffect(() => {
    if (!createOpen) return;
    const b = selectedBloque;
    const baseCode = b?.codigo ? String(b.codigo).trim() : selectedCodigo ? String(selectedCodigo).trim() : 'B?';
    const n = String(createNumero || '1').trim();
    setCreateCodigo(`${(createZonaCodigo || 'Z').trim()}-${baseCode}-N${n || '1'}`);
  }, [createNumero, createOpen, createZonaCodigo, selectedBloque, selectedCodigo]);

  const saveNicho = useCallback(async () => {
    const b = selectedBloque;
    if (!b?.id) {
      setCreateErr('No se pudo resolver el bloque seleccionado (sin id).');
      return;
    }

    const numero = Number(String(createNumero).trim());
    const fila = Number(String(createFila).trim());
    const columna = Number(String(createCol).trim());
    if (!Number.isFinite(numero) || numero <= 0) {
      setCreateErr('Número inválido.');
      return;
    }
    if (!Number.isFinite(fila) || fila <= 0) {
      setCreateErr('Fila inválida.');
      return;
    }
    if (!Number.isFinite(columna) || columna <= 0) {
      setCreateErr('Columna inválida.');
      return;
    }

    setCreateSaving(true);
    setCreateErr(null);
    const payload: any = {
      zona_id: Number(b.zona_id),
      bloque_id: Number(b.id),
      tipo: 'nicho',
      numero,
      fila,
      columna,
      codigo: String(createCodigo || '').trim() || null,
      estado: 'libre',
    };

    const res = await apiFetch<any>('/api/cementerio/admin/sepulturas', { method: 'POST', body: payload });
    setCreateSaving(false);
    if (!res.ok) {
      setCreateErr(typeof res.error === 'string' ? res.error : JSON.stringify(res.error));
      return;
    }

    const created = unwrapItem<any>(res.data) ?? (res.data as any)?.item ?? (res.data as any)?.data ?? res.data;
    const id = Number(created?.id);
    setCreateOpen(false);
    if (Number.isFinite(id) && id > 0) {
      router.push(`/sepultura/${id}`);
    } else {
      Alert.alert('Creado', 'Nicho creado, pero no se pudo abrir automáticamente (respuesta sin id).');
    }
  }, [createCodigo, createCol, createFila, createNumero, router, selectedBloque]);

  const doSearch = useCallback(
    async (text: string) => {
      const t = text.trim();
      if (t.length < 2) return;
      setSearching(true);
      const r = await apiFetch<{ items?: any[] }>(`/api/cementerio/sepulturas/search?q=${encodeURIComponent(t)}`);
      setSearching(false);
      if (!r.ok) {
        Alert.alert('Error', String(r.error ?? 'No se pudo buscar'));
        return;
      }
      const row = (r.data.items ?? [])[0];
      if (!row?.id) {
        Alert.alert('Sin resultados', 'No se encontró ningún nicho con esa búsqueda.');
        return;
      }
      router.push(`/sepultura/${row.id}`);
    },
    [router]
  );

  const [sepulturasBloque, setSepulturasBloque] = useState<any[]>([]);
  const [sepulturasLoading, setSepulturasLoading] = useState(false);
  useEffect(() => {
    const run = async () => {
      if (!selectedBloqueId) {
        setSepulturasBloque([]);
        return;
      }
      setSepulturasLoading(true);
      const res = await apiFetch<{ items: any[] }>(`/api/cementerio/bloques/${selectedBloqueId}/sepulturas`);
      setSepulturasLoading(false);
      if (!res.ok) {
        setSepulturasBloque([]);
        return;
      }
      setSepulturasBloque(((res.data as any)?.items ?? []) as any[]);
    };
    run();
  }, [selectedBloqueId]);

  const statsSelected = useMemo(() => {
    let libre = 0;
    let ocupada = 0;
    for (const s of sepulturasBloque) {
      const e = normalizarEstadoEditable((s as any)?.estado);
      if (e === 'libre') libre++;
      else if (e === 'ocupada') ocupada++;
    }
    return { libre, ocupada, total: sepulturasBloque.length };
  }, [sepulturasBloque]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const t = q.trim();
      if (t.length >= 3) doSearch(t);
    }, 650);
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    };
  }, [q, doSearch]);

  return (
    <View style={s.screen}>
      <View style={s.topBar}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.85}>
          <FontAwesome name="chevron-left" size={18} color="#0F172A" />
        </TouchableOpacity>
        <View style={s.searchWrap}>
          <FontAwesome name="search" size={14} color="rgba(15,23,42,0.55)" />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Buscar nicho, titular o expediente"
            placeholderTextColor="rgba(15,23,42,0.45)"
            style={s.search}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searching ? <ActivityIndicator color="#2F6B4E" /> : null}
        </View>
        <TouchableOpacity style={s.editBtn} onPress={() => router.push('/mapa-editor')} activeOpacity={0.85}>
          <FontAwesome name="pencil" size={18} color="#0F172A" />
          <Text style={s.editBtnT}>Editar</Text>
        </TouchableOpacity>
      </View>

      <View style={[s.mapStage, viewMode === 'satelite' && { paddingHorizontal: 0 }]}>
        {loading ? (
          <View style={s.center}>
            <View style={{ width: '100%', padding: 14 }}>
              <View style={{ backgroundColor: '#FFFFFF', borderRadius: Radius.lg, borderWidth: 1, borderColor: 'rgba(15,23,42,0.10)', padding: Space.md }}>
                <AppSkeleton h={12} w={140} r={8} />
                <View style={{ height: 10 }} />
                <AppSkeleton h={14} w={220} r={10} />
                <View style={{ height: 16 }} />
                <AppSkeleton h={420} w="100%" r={18} />
              </View>
            </View>
          </View>
        ) : (
          <View style={[s.pwaMapWrap, { height: mapH }, viewMode === 'satelite' && { borderRadius: 0, borderWidth: 0 }]}>
            {viewMode === 'plano' ? (
              <PlanoGeneralMapa
                ref={planoRef as any}
                height={mapH}
                selectedCodigo={selectedCodigo}
                onPressBlock={onPressBlock}
                blocks={schematicBlocks as any}
                selectedSepulturas={sepulturasBloque as any}
                selectedGrid={
                  (selectedBloque as any)?.filas && (selectedBloque as any)?.columnas
                    ? { filas: Number((selectedBloque as any).filas), columnas: Number((selectedBloque as any).columnas) }
                    : null
                }
                highlightSepulturaId={highlightSepId}
                // Misma disposición “real”, pero sin satélite: UX más limpio.
                viewBox={{ x: 0, y: 0, w: 1000, h: 1000 }}
                decorations={false}
              />
            ) : (
              <CementerioMapaOSM
                height={mapH}
                hotspots={SOMAHOZ_HOTSPOTS}
                activeHotspotId={activeHotspot}
                onPressHotspot={onPressHotspot}
                onPressYellowMarker={(n) => {
                  const m = SOMAHOZ_YELLOW_MARKERS.find((x) => x.id === n);
                  if (!m) return;
                  if (m.action === 'bloque' && m.codigoBloque) abrirBloquePorCodigo(m.codigoBloque);
                  else if (m.action === 'columbarios') Alert.alert('Columbarios', 'Pendiente: vista especial de columbarios.');
                  else Alert.alert('Tanatorio', 'Tanatorio (Fuera de recinto)');
                }}
                blocks={blocks as any}
                selectedCodigo={selectedCodigo}
                onPressBlock={onPressBlock}
                customBloques={customBloques}
                allGrids={bloquesRaw.map((b) => ({
                  codigo: String((b as any)?.codigo ?? ''),
                  filas: Number((b as any)?.filas ?? 0),
                  columnas: Number((b as any)?.columnas ?? 0),
                }))}
                selectedSepulturas={sepulturasBloque as any}
                selectedGrid={
                  (selectedBloque as any)?.filas && (selectedBloque as any)?.columnas
                    ? { filas: Number((selectedBloque as any).filas), columnas: Number((selectedBloque as any).columnas) }
                    : null
                }
                highlightSepulturaId={highlightSepId}
                yellowReloadNonce={yellowNonce}
                userLocation={gpsHere ? { latitude: gpsHere.lat, longitude: gpsHere.lon } : null}
                userAccuracyM={gpsHere?.acc ?? null}
              />
            )}

            <View style={s.modePill}>
              <AppPill label="foto" active={viewMode === 'satelite'} onPress={() => setViewMode('satelite')} />
              <AppPill label="plano" active={viewMode === 'plano'} onPress={() => setViewMode('plano')} />
            </View>
          </View>
        )}

        <View style={s.floatRight}>
          <FloatBtn
            icon="search-plus"
            onPress={() => planoRef.current?.zoomIn()}
          />
          <FloatBtn
            icon="crosshairs"
            onPress={() => planoRef.current?.reset()}
          />
          {gpsHere ? (
            <View style={s.gpsBadge}>
              <Text style={s.gpsBadgeOver}>GPS</Text>
              <Text style={s.gpsBadgeT} numberOfLines={1}>
                {gpsDetected
                  ? gpsDetected.includes('~')
                    ? `Bloque más cercano: ${gpsDetected.split('~')[0]} (${gpsDetected.split('~')[1]} m)`
                    : `Bloque detectado: ${gpsDetected}`
                  : 'Fuera de bloques'}
              </Text>
              {selectedCodigo ? (
                <Text style={s.gpsBadgeSub} numberOfLines={1}>
                  Nicho en: {selectedCodigo}{' '}
                  {gpsDetected && !gpsDetected.includes('~') && String(gpsDetected) === String(selectedCodigo) ? '✓' : ''}
                </Text>
              ) : null}
            </View>
          ) : null}
          <FloatBtn icon="clone" onPress={() => Alert.alert('Capas', 'Pendiente: selector de capas')} />
          <FloatBtn icon="pencil" onPress={() => router.push('/mapa-editor')} />
        </View>
      </View>

      {/* Barra inferior */}
      {selectedCodigo ? (
        <View style={s.bottomBar}>
          <View style={s.bottomIcon}>
            <FontAwesome name="th-large" size={16} color="rgba(15,23,42,0.75)" />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.bottomTitle} numberOfLines={1}>
              Bloque {selectedCodigo} · {(selectedBloque as any)?.zona_nombre ?? (selectedBloque as any)?.zona?.nombre ?? '—'}
            </Text>
            <Text style={s.bottomSub} numberOfLines={1}>
              {sepulturasLoading ? 'Cargando…' : `${statsSelected.total} nichos · ${statsSelected.ocupada} ocupadas · ${statsSelected.libre} libres`}
            </Text>
          </View>
          <TouchableOpacity
            style={s.openBtn}
            onPress={() => selectedCodigo && abrirBloquePorCodigo(selectedCodigo)}
            activeOpacity={0.9}
          >
            <Text style={s.openBtnT}>Abrir</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Submenú ampliaciones (hotspot D) */}
      <Modal visible={ampliacionesOpen} transparent animationType="fade" onRequestClose={() => setAmpliacionesOpen(false)}>
        <View style={s.overlayBackdrop}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setAmpliacionesOpen(false)} />
          <View style={s.overlaySheet}>
            <Text style={s.overlayOver}>ZONA NUEVA</Text>
            <Text style={s.overlayTitle}>Ampliaciones</Text>
            <View style={{ height: 10 }} />
            {[
              { codigo: 'B2001', label: 'B2001 · Muro Norte' },
              { codigo: 'B2007', label: 'B2007 · Exento' },
              { codigo: 'BD', label: 'BD · Ampliación D' },
              { codigo: 'B2017', label: 'B2017' },
              { codigo: 'B2020', label: 'B2020' },
            ].map((it) => (
              <TouchableOpacity
                key={it.codigo}
                style={s.overlayRow}
                onPress={async () => {
                  setAmpliacionesOpen(false);
                  setSelectedCodigo(it.codigo);
                  await abrirBloquePorCodigo(it.codigo);
                }}
                activeOpacity={0.9}
              >
                <Text style={s.overlayRowT}>{it.label}</Text>
                <FontAwesome name="chevron-right" size={16} color="rgba(15,23,42,0.35)" />
              </TouchableOpacity>
            ))}
            <View style={{ height: 10 }} />
            <AppButton label="Cerrar" variant="ghost" onPress={() => setAmpliacionesOpen(false)} />
          </View>
        </View>
      </Modal>

      {/* Panel inferior de sucesos (como captura) */}
      <View style={s.sheet}>
        <View style={s.sheetHead}>
          <Text style={s.sheetTitle}>SUCESOS EN MAPA</Text>
          <TouchableOpacity style={s.markBtn} onPress={() => router.push('/nuevo-suceso')} activeOpacity={0.85}>
            <FontAwesome name="plus" size={16} color="#FFF" />
            <Text style={s.markBtnT}>Marcar aquí</Text>
          </TouchableOpacity>
        </View>

        <View style={s.zoneRow}>
          <Text style={s.zoneRowTitle}>ZONA</Text>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
            <AppPill label="Todas" active={zona === 'ALL'} onPress={() => onPressZona('ALL')} />
            <AppPill label="Zona vieja" active={zona === 'ZONA VIEJA'} onPress={() => onPressZona('ZONA VIEJA')} />
            <AppPill label="Zona nueva" active={zona === 'ZONA NUEVA'} onPress={() => onPressZona('ZONA NUEVA')} />
          </View>
          <Text style={s.zoneRowHint} numberOfLines={2}>
            {selectedBloqueOficial
              ? `Rango ${formatRango(selectedBloqueOficial.rango)} · ${selectedBloqueOficial.nombre}`
              : zona === 'ALL'
                ? 'Pulsa un bloque para ver su rango.'
                : zona === 'ZONA VIEJA'
                  ? `Rango ${formatRango([1, 224])} · Muro Sur`
                  : `Rango ${formatRango([225, 520])} · Ampliaciones`}
          </Text>
        </View>

        <View style={s.sheetRow}>
          <View style={s.dot} />
          <Text style={s.sheetRowT}>Anomalías abiertas</Text>
          <Text style={s.sheetRowBadge}>—</Text>
        </View>
        {/* Leyenda: estados */}
        <View style={s.legend}>
          <LegendItem color="#22C55E" label="Libre" />
          <LegendItem color="#EF4444" label="Ocupada" />
          <LegendItem color="#F59E0B" label="Reservada" />
          <LegendItem color="#64748B" label="Clausurada" />
        </View>
      </View>

      <Modal visible={createOpen} transparent animationType="slide" onRequestClose={() => setCreateOpen(false)}>
        <View style={s.modalBackdrop}>
          <View style={s.modalSheet}>
            <View style={s.modalHandle} />
            <View style={s.modalHead}>
              <View style={{ flex: 1 }}>
                <Text style={s.modalTitle}>Crear nicho</Text>
                <Text style={s.modalSub}>
                  {selectedCodigo ? `Bloque ${selectedCodigo}` : 'Selecciona un bloque'}
                </Text>
              </View>
              <TouchableOpacity style={s.modalClose} onPress={() => setCreateOpen(false)} activeOpacity={0.85}>
                <FontAwesome name="times" size={18} color="rgba(15,23,42,0.65)" />
              </TouchableOpacity>
            </View>

            <Text style={s.label}>NÚMERO</Text>
            <TextInput value={createNumero} onChangeText={setCreateNumero} keyboardType="numeric" style={s.input} placeholder="Ej: 225" placeholderTextColor="rgba(15,23,42,0.35)" />

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>FILA</Text>
                <TextInput value={createFila} onChangeText={setCreateFila} keyboardType="numeric" style={s.input} placeholder="1" placeholderTextColor="rgba(15,23,42,0.35)" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>COLUMNA</Text>
                <TextInput value={createCol} onChangeText={setCreateCol} keyboardType="numeric" style={s.input} placeholder="1" placeholderTextColor="rgba(15,23,42,0.35)" />
              </View>
            </View>

            <Text style={s.label}>CÓDIGO</Text>
            <TextInput value={createCodigo} onChangeText={setCreateCodigo} style={s.input} placeholder="Z-BA-N225" placeholderTextColor="rgba(15,23,42,0.35)" autoCapitalize="characters" />

            {createErr ? (
              <View style={s.errBox}>
                <Text style={s.errText}>{createErr}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[s.saveBtn, createSaving && { opacity: 0.6 }]}
              onPress={saveNicho}
              disabled={createSaving}
              activeOpacity={0.9}
            >
              {createSaving ? <ActivityIndicator color="#FFF" /> : <Text style={s.saveBtnT}>Crear nicho</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <View style={s.legendItem}>
      <View style={[s.legendDot, { backgroundColor: color }]} />
      <Text style={s.legendText}>{label}</Text>
    </View>
  );
}

function FloatBtn({ icon, onPress }: { icon: any; onPress: () => void }) {
  return (
    <TouchableOpacity style={s.fbtn} onPress={onPress} activeOpacity={0.85}>
      <FontAwesome name={icon} size={16} color="#0F172A" />
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Semantic.screenBg },
  topBar: {
    paddingTop: 14,
    paddingHorizontal: 12,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Semantic.screenBg,
  },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center' },
  searchWrap: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFF',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  search: { flex: 1, fontSize: 14, fontWeight: '800', color: '#0F172A' },
  editBtn: {
    height: 40,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Semantic.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  editBtnT: { fontWeight: '900', color: '#0F172A' },
  mapStage: { flex: 1, paddingBottom: 10, justifyContent: 'center' },
  pwaMapWrap: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: Semantic.surface,
    borderWidth: 1,
    borderColor: Semantic.border,
    position: 'relative',
  },
  pwaMapBg: {
    position: 'absolute',
    inset: 0,
    opacity: 0.9,
    backgroundColor: '#263325',
  },
  center: { alignItems: 'center', justifyContent: 'center', gap: 10, padding: 24 },
  centerT: { color: 'rgba(15,23,42,0.65)', fontWeight: '900' },
  floatRight: { position: 'absolute', right: 18, top: 74, gap: 10 },
  fbtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.08)',
  },
  gpsBadge: {
    marginTop: 6,
    width: 170,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: Semantic.surface,
    borderWidth: 1,
    borderColor: Semantic.border,
  },
  gpsBadgeOver: { fontSize: 10, fontWeight: '900', letterSpacing: 1.4, color: Semantic.textSecondary },
  gpsBadgeT: { marginTop: 4, fontSize: 13, fontWeight: '900', color: Semantic.text },
  gpsBadgeSub: { marginTop: 2, fontSize: 12, fontWeight: '800', color: Semantic.textSecondary },

  modePill: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    flexDirection: 'row',
    gap: 10,
    padding: 6,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.10)',
  },

  bottomBar: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 150,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.10)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bottomIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(15,23,42,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomTitle: { fontSize: 16, fontWeight: '900', color: '#0F172A' },
  bottomSub: { marginTop: 4, fontSize: 12, fontWeight: '800', color: 'rgba(15,23,42,0.55)' },
  openBtn: { height: 38, paddingHorizontal: 16, borderRadius: 14, backgroundColor: '#2F3F35', alignItems: 'center', justifyContent: 'center' },
  openBtnT: { color: '#FFFFFF', fontWeight: '900' },

  overlayBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  overlaySheet: {
    backgroundColor: Semantic.surface,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 26 : 16,
    borderTopWidth: 1,
    borderColor: Semantic.border,
  },
  overlayOver: { fontSize: 11, fontWeight: '900', letterSpacing: 1.6, color: Semantic.textSecondary },
  overlayTitle: { marginTop: 6, fontSize: 20, fontWeight: '900', color: Semantic.text },
  overlayRow: {
    marginTop: 10,
    backgroundColor: Semantic.surface2,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Semantic.border,
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  overlayRowT: { fontSize: 14, fontWeight: '900', color: Semantic.text },

  sheet: { backgroundColor: Semantic.surface, borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 14, borderTopWidth: 1, borderTopColor: Semantic.border },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sheetTitle: { fontWeight: '900', color: Semantic.text, letterSpacing: 1.2, fontSize: 12 },
  markBtn: { height: 40, borderRadius: 14, backgroundColor: Semantic.primary, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  markBtnT: { color: '#FFF', fontWeight: '900' },
  sheetRow: { marginTop: 12, backgroundColor: Semantic.surface, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: Semantic.border, flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#EF4444' },
  sheetRowT: { flex: 1, fontWeight: '900', color: Semantic.text },
  sheetRowBadge: { fontWeight: '900', color: Semantic.subText },
  zoneRow: { marginTop: 12, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: Semantic.border, backgroundColor: Semantic.surface },
  zoneRowTitle: { fontSize: 11, fontWeight: '900', letterSpacing: 1.2, color: Semantic.subText },
  zoneRowHint: { marginTop: 10, fontSize: 12, fontWeight: '800', color: Semantic.subText, lineHeight: 16 },
  legend: { marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 3 },
  legendText: { fontSize: 11, fontWeight: '800', color: 'rgba(15,23,42,0.55)' },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#FBF7EE', borderTopLeftRadius: 18, borderTopRightRadius: 18, paddingHorizontal: 16, paddingTop: 10, paddingBottom: Platform.OS === 'ios' ? 24 : 16 },
  modalHandle: { width: 44, height: 5, borderRadius: 999, backgroundColor: 'rgba(15,23,42,0.18)', alignSelf: 'center', marginBottom: 10 },
  modalHead: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 10 },
  modalTitle: { fontSize: 18, fontWeight: '900', color: '#0F172A' },
  modalSub: { marginTop: 4, fontSize: 12, fontWeight: '700', color: 'rgba(15,23,42,0.55)' },
  modalClose: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: 'rgba(15,23,42,0.10)' },

  label: { marginTop: 12, fontSize: 12, fontWeight: '900', letterSpacing: 1.4, color: 'rgba(15,23,42,0.45)' },
  input: { marginTop: 10, height: 44, borderRadius: 14, paddingHorizontal: 12, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: 'rgba(15,23,42,0.10)', fontWeight: '900', color: '#0F172A' },
  errBox: { marginTop: 12, padding: 10, borderRadius: 12, backgroundColor: 'rgba(185,28,28,0.08)', borderWidth: 1, borderColor: 'rgba(185,28,28,0.25)' },
  errText: { fontSize: 12, fontWeight: '800', color: '#0F172A' },
  saveBtn: { marginTop: 14, height: 52, borderRadius: 16, backgroundColor: '#2F6B4E', alignItems: 'center', justifyContent: 'center' },
  saveBtnT: { color: '#FFF', fontWeight: '900', fontSize: 16 },
});


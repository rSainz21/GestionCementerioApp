import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Platform, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { apiFetch } from '@/lib/laravel-api';
import { BLOQUES_OFICIALES, type ZonaLabel, formatRango } from '@/lib/bloques-oficiales';
import { CementerioMapaOSM } from '@/components/CementerioMapaOSM';
import { PlanoGeneralMapa, type PlanoGeneralMapaHandle } from '@/components/PlanoGeneralMapa';
import { normalizarEstadoDb } from '@/lib/estado-sepultura';
import { AppSkeleton, Radius, Semantic, Space } from '@/components/ui';
import { AppPill } from '@/components/ui';
import { POLIGONOS_BLOQUES_SOMAHOZ } from '@/lib/mapa-somahoz';
import { buildPlanoBlocksSomahoz } from '@/lib/plano-somahoz';
import { SOMAHOZ_HOTSPOTS, type SomahozHotspotId } from '@/lib/mapa-somahoz-hotspots';
import { SOMAHOZ_YELLOW_MARKERS } from '@/lib/somahoz-yellow-markers';

export default function MapaScreenWeb() {
  const params = useLocalSearchParams<{ focus_sepultura_id?: string }>();
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const planoRef = useRef<PlanoGeneralMapaHandle | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCodigo, setSelectedCodigo] = useState<string | null>(null);
  const [bloqueCodes, setBloqueCodes] = useState<Set<string>>(new Set());
  const [bloquesRaw, setBloquesRaw] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'satelite' | 'plano'>('satelite');
  const [zona, setZona] = useState<'ALL' | ZonaLabel>('ALL');
  const [highlightSepId, setHighlightSepId] = useState<number | null>(null);
  const [activeHotspot, setActiveHotspot] = useState<SomahozHotspotId | null>(null);
  const [ampliacionesOpen, setAmpliacionesOpen] = useState(false);
  const [yellowNonce, setYellowNonce] = useState(0);

  // Al volver del editor de números, fuerza recarga desde storage
  useFocusEffect(
    useCallback(() => {
      setYellowNonce(Date.now());
      return () => {};
    }, [])
  );

  const mapH = useMemo(() => {
    const w = Number(width || 0);
    const h = Number(height || 0);
    if (!Number.isFinite(w) || w <= 0) return 420;
    if (!Number.isFinite(h) || h <= 0) return Math.min(520, Math.max(320, Math.round(w * 0.55)));

    const available = h - 64 - 12 - 150 - 12 - 56;
    const byWidth = Math.round(w * 0.62);
    return Math.max(260, Math.min(byWidth, available));
  }, [width, height]);

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

  const selectedBloqueId = useMemo(() => {
    const id = Number((selectedBloque as any)?.id);
    return Number.isFinite(id) && id > 0 ? id : null;
  }, [selectedBloque]);

  const selectedBloqueOficial = useMemo(() => {
    if (!selectedCodigo) return null;
    return (blocksAll ?? []).find((b) => String(b.codigo) === String(selectedCodigo)) ?? null;
  }, [blocksAll, selectedCodigo]);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await apiFetch<{ items?: any[] }>('/api/cementerio/bloques');
    if (r.ok) {
      const items = (r.data.items ?? []) as any[];
      setBloquesRaw(items);
      setBloqueCodes(new Set<string>(items.map((b) => String(b.codigo))));
      setLoading(false);
      return;
    }
    const cat = await apiFetch<any>('/api/cementerio/catalogo');
    if (cat.ok) {
      const items = ((cat.data as any)?.bloques ?? []) as any[];
      setBloquesRaw(items);
      setBloqueCodes(new Set<string>(items.map((b: any) => String(b.codigo))));
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

  useEffect(() => {
    const sid = Number(params.focus_sepultura_id);
    if (!Number.isFinite(sid) || sid <= 0) return;
    setHighlightSepId(sid);
    setViewMode('satelite');
    apiFetch<any>(`/api/cementerio/sepulturas/${sid}`)
      .then((r) => {
        if (!r.ok) return;
        const item = (r.data as any)?.item ?? (r.data as any)?.data ?? r.data;
        const code = item?.bloque?.codigo ?? item?.cemn_bloques?.codigo ?? item?.bloque_codigo ?? null;
        if (code) setSelectedCodigo(String(code));
      })
      .catch(() => null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.focus_sepultura_id]);

  const onPressBlock = (codigo: string) => {
    setSelectedCodigo(codigo);
  };

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
    let reservada = 0;
    let otras = 0;
    for (const s of sepulturasBloque) {
      const e = normalizarEstadoDb((s as any)?.estado);
      if (e === 'libre') libre++;
      else if (e === 'ocupada') ocupada++;
      else if (e === 'reservada') reservada++;
      else if (e === 'clausurada' || e === 'mantenimiento') otras++;
    }
    return { libre, ocupada, reservada, otras, total: sepulturasBloque.length };
  }, [sepulturasBloque]);

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

  const onPressZona = (z: 'ALL' | ZonaLabel) => {
    setZona(z);
    if (z !== 'ALL' && selectedBloqueOficial && selectedBloqueOficial.zonaLabel !== z) {
      setSelectedCodigo(null);
    }
  };

  return (
    <View style={s.screen}>
      <View style={s.topBar}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.85}>
          <FontAwesome name="chevron-left" size={18} color="#0F172A" />
        </TouchableOpacity>
        <View style={s.searchWrap}>
          <FontAwesome name="search" size={14} color="rgba(15,23,42,0.55)" />
          <Text style={s.searchT}>Buscar nicho, titular o expediente</Text>
        </View>
        <TouchableOpacity style={s.editBtn} onPress={() => router.push('/mapa-editor')} activeOpacity={0.85}>
          <FontAwesome name="pencil" size={18} color="#0F172A" />
          <Text style={s.editBtnT}>Editar</Text>
        </TouchableOpacity>
      </View>

      <View style={s.mapStage}>
        {loading ? (
          <View style={s.center}>
            <View style={{ width: '100%', padding: 14 }}>
              <View
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: Radius.lg,
                  borderWidth: 1,
                  borderColor: 'rgba(15,23,42,0.10)',
                  padding: Space.md,
                }}
              >
                <AppSkeleton h={12} w={140} r={8} />
                <View style={{ height: 10 }} />
                <AppSkeleton h={14} w={220} r={10} />
                <View style={{ height: 16 }} />
                <AppSkeleton h={420} w="100%" r={18} />
              </View>
            </View>
          </View>
        ) : (
          <View style={[s.pwaMapWrap, { height: mapH }]}>
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
                onPressYellowMarker={(m: any) => {
                  if (m?.action === 'bloque' && m?.codigoBloque) abrirBloquePorCodigo(String(m.codigoBloque));
                  else if (m?.action === 'columbarios') Alert.alert('Columbarios', 'Pendiente: vista especial de columbarios.');
                  else Alert.alert('Tanatorio', 'Tanatorio (Fuera de recinto)');
                }}
                blocks={blocks as any}
                selectedCodigo={selectedCodigo}
                onPressBlock={onPressBlock}
                yellowReloadNonce={yellowNonce}
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
              />
            )}

            <View style={s.modePill}>
              <AppPill label="satélite" active={viewMode === 'satelite'} onPress={() => setViewMode('satelite')} />
              <AppPill label="plano" active={viewMode === 'plano'} onPress={() => setViewMode('plano')} />
            </View>
          </View>
        )}

        <View style={s.floatRight}>
          {viewMode === 'plano' ? (
            <>
              <FloatBtn icon="search-plus" onPress={() => planoRef.current?.zoomIn()} />
              <FloatBtn icon="crosshairs" onPress={() => planoRef.current?.reset()} />
            </>
          ) : null}
          <FloatBtn icon="clone" onPress={() => Alert.alert('Capas', 'Pendiente: selector de capas')} />
          {/* "Editar" ya existe arriba: evitamos duplicado */}
        </View>
      </View>

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
              {sepulturasLoading
                ? 'Cargando…'
                : `${statsSelected.total} nichos · ${statsSelected.ocupada} ocup. · ${statsSelected.libre} libres${
                    statsSelected.reservada || statsSelected.otras
                      ? ` · ${statsSelected.reservada} reserv. · ${statsSelected.otras} claus./mant.`
                      : ''
                  }`}
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
            <TouchableOpacity style={s.overlayCloseBtn} onPress={() => setAmpliacionesOpen(false)} activeOpacity={0.9}>
              <Text style={s.overlayCloseBtnT}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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

        <View style={s.legend}>
          <LegendItem color="#22C55E" label="Libre" />
          <LegendItem color="#EF4444" label="Ocupada" />
          <LegendItem color="#F59E0B" label="Reservada" />
          <LegendItem color="#64748B" label="Clausurada" />
        </View>
      </View>
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

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <View style={s.legendItem}>
      <View style={[s.legendDot, { backgroundColor: color }]} />
      <Text style={s.legendText}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Semantic.screenBg },
  topBar: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    zIndex: 50,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.10)',
    boxShadow: '0 10px 28px rgba(0,0,0,0.12)',
  } as any,
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center' },
  searchWrap: { flex: 1, height: 40, borderRadius: 12, backgroundColor: '#FFF', paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  searchT: { flex: 1, fontSize: 13, fontWeight: '800', color: 'rgba(15,23,42,0.55)' },
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
  mapStage: { flex: 1, paddingHorizontal: 12, paddingTop: 68, paddingBottom: 130, justifyContent: 'center' },
  pwaMapWrap: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: Semantic.surface,
    borderWidth: 1,
    borderColor: Semantic.border,
    position: 'relative',
  },
  center: { alignItems: 'center', justifyContent: 'center', gap: 10, padding: 24 },
  floatRight: { position: 'absolute', right: 14, top: 84, gap: 10 },
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
    paddingBottom: 16,
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
  overlayCloseBtn: {
    height: 44,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15,23,42,0.06)',
    borderWidth: 1,
    borderColor: Semantic.border,
  },
  overlayCloseBtnT: { fontWeight: '900', color: Semantic.textSecondary },

  sheet: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 10,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.10)',
  },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sheetTitle: { fontWeight: '900', color: Semantic.text, letterSpacing: 1.2, fontSize: 12 },
  markBtn: { height: 40, borderRadius: 14, backgroundColor: Semantic.primary, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  markBtnT: { color: '#FFF', fontWeight: '900' },
  sheetRow: { marginTop: 12, backgroundColor: Semantic.surface, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: Semantic.border, flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#EF4444' },
  sheetRowT: { flex: 1, fontWeight: '900', color: Semantic.text },
  sheetRowBadge: { fontWeight: '900', color: Semantic.subText },
  legend: { marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 3 },
  legendText: { fontSize: 11, fontWeight: '800', color: Semantic.subText },
  zoneRow: { marginTop: 12, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: Semantic.border, backgroundColor: Semantic.surface },
  zoneRowTitle: { fontSize: 11, fontWeight: '900', letterSpacing: 1.2, color: Semantic.subText },
  zoneRowHint: { marginTop: 10, fontSize: 12, fontWeight: '800', color: Semantic.subText, lineHeight: 16 },
});


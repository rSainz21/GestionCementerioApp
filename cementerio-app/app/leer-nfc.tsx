import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useLocalSearchParams, useRouter } from 'expo-router';
import NfcManager, { NfcTech } from 'react-native-nfc-manager';
import { apiFetch } from '@/lib/laravel-api';
import { hapticSuccess, hapticWarning } from '@/lib/haptics';

function safeString(v: any) {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

function extractTagSummary(tag: any) {
  const id = tag?.id ?? tag?.tagID ?? null;
  const techs: string[] = Array.isArray(tag?.techTypes) ? tag.techTypes : [];
  const ndef = tag?.ndefMessage ?? tag?.ndef ?? null;
  return { id, techs, ndef };
}

export default function LeerNfcScreen() {
  const router = useRouter();
  const { sepultura_id } = useLocalSearchParams<{ sepultura_id?: string }>();
  const preSepId = sepultura_id ? Number(sepultura_id) : null;
  const [supported, setSupported] = useState<boolean | null>(null);
  const [active, setActive] = useState(false);
  const [lastTag, setLastTag] = useState<any | null>(null);
  const [scanKey, setScanKey] = useState(0);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkBusy, setLinkBusy] = useState(false);
  const [linkTagId, setLinkTagId] = useState<string>('');
  const [q, setQ] = useState('');
  const [results, setResults] = useState<any[]>([]);

  const ring1 = useRef(new Animated.Value(0)).current;
  const ring2 = useRef(new Animated.Value(0)).current;
  const ring3 = useRef(new Animated.Value(0)).current;

  const statusText = useMemo(() => (active ? 'ACTIVO' : supported ? 'INACTIVO' : 'NO DISPONIBLE'), [active, supported]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.stagger(250, [
        Animated.timing(ring1, { toValue: 1, duration: 1600, useNativeDriver: true }),
        Animated.timing(ring2, { toValue: 1, duration: 1600, useNativeDriver: true }),
        Animated.timing(ring3, { toValue: 1, duration: 1600, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [ring1, ring2, ring3]);

  useEffect(() => {
    if (Platform.OS === 'web') {
      setSupported(false);
      return;
    }
    let mounted = true;
    NfcManager.isSupported()
      .then((ok) => mounted && setSupported(Boolean(ok)))
      .catch(() => mounted && setSupported(false));
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!supported) return;
    let cancelled = false;

    const start = async () => {
      try {
        await NfcManager.start();
        if (cancelled) return;
        setActive(true);
        await NfcManager.requestTechnology(NfcTech.Ndef, {
          alertMessage: 'Acerca el móvil a la etiqueta NFC',
        } as any);
        if (cancelled) return;
        const tag = await NfcManager.getTag();
        if (cancelled) return;
        setLastTag(tag);

        const { id, techs } = extractTagSummary(tag);
        const tagId = safeString(id).trim();
        if (!tagId) {
          Alert.alert('NFC', `No se pudo leer el ID.\nTech: ${techs.join(', ') || '—'}`);
        }

        if (tagId) {
          const lookup = await apiFetch<any>(`/api/cementerio/nfc-tags/${encodeURIComponent(tagId)}`);
          if (lookup.ok) {
            const sepulturaId = Number((lookup.data as any)?.item?.sepultura_id);
            if (Number.isFinite(sepulturaId) && sepulturaId > 0) {
              void hapticSuccess();
              router.push(`/sepultura/${sepulturaId}`);
              return;
            }
          }

          // Si venimos desde una ficha, vinculamos directo a esa sepultura.
          if (preSepId && Number.isFinite(preSepId) && preSepId > 0) {
            setLinkBusy(true);
            const r = await apiFetch<any>('/api/cementerio/nfc-tags', {
              method: 'POST',
              body: { tag_id: tagId, sepultura_id: preSepId },
            });
            setLinkBusy(false);
            if (!r.ok) {
              void hapticWarning();
              Alert.alert('NFC', typeof r.error === 'string' ? r.error : 'No se pudo vincular.');
              // fallback a vinculación manual
              setLinkTagId(tagId);
              setLinkOpen(true);
              return;
            }
            void hapticSuccess();
            router.push(`/sepultura/${preSepId}`);
            return;
          }

          // No vinculada aún: abrimos vinculación rápida manual
          setLinkTagId(tagId);
          setLinkOpen(true);
        }
      } catch (e: any) {
        if (!cancelled) {
          const msg = e?.message ?? String(e);
          if (!/cancel/i.test(msg)) Alert.alert('NFC', msg);
        }
      } finally {
        try {
          await NfcManager.cancelTechnologyRequest();
        } catch {}
        if (!cancelled) setActive(false);
      }
    };

    start();
    return () => {
      cancelled = true;
      try {
        NfcManager.cancelTechnologyRequest();
      } catch {}
    };
  }, [preSepId, router, scanKey, supported]);

  const tagSummary = useMemo(() => (lastTag ? extractTagSummary(lastTag) : null), [lastTag]);

  const doSearch = async (next: string) => {
    const qq = next.trim();
    setQ(next);
    if (qq.length < 2) {
      setResults([]);
      return;
    }
    const r = await apiFetch<any>(`/api/cementerio/sepulturas/search?q=${encodeURIComponent(qq)}`);
    setResults(r.ok ? ((r.data as any)?.items ?? []) : []);
  };

  const linkToSepultura = async (sepulturaId: number) => {
    if (!linkTagId) return;
    setLinkBusy(true);
    const r = await apiFetch<any>('/api/cementerio/nfc-tags', {
      method: 'POST',
      body: { tag_id: linkTagId, sepultura_id: sepulturaId },
    });
    setLinkBusy(false);
    if (!r.ok) {
      void hapticWarning();
      Alert.alert('NFC', typeof r.error === 'string' ? r.error : 'No se pudo vincular.');
      return;
    }
    void hapticSuccess();
    setLinkOpen(false);
    router.push(`/sepultura/${sepulturaId}`);
  };

  return (
    <View style={s.screen}>
      <View style={s.top}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.85}>
          <FontAwesome name="chevron-left" size={16} color="#E5E7EB" />
        </TouchableOpacity>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.title}>Lectura NFC</Text>
          <Text style={s.sub}>ISO 14443 · NTAG213</Text>
        </View>
        <View style={s.pill}>
          <View style={[s.pillDot, { backgroundColor: active ? '#22C55E' : 'rgba(229,231,235,0.40)' }]} />
          <Text style={s.pillT}>{statusText}</Text>
        </View>
      </View>

      <View style={s.center}>
        <View style={s.rings}>
          <Ring v={ring1} />
          <Ring v={ring2} />
          <Ring v={ring3} />
          <View style={s.core}>
            <FontAwesome name="wifi" size={28} color="rgba(229,231,235,0.95)" />
          </View>
        </View>

        <Text style={s.h1}>Acerca el móvil a la etiqueta</Text>
        <Text style={s.p}>
          Las tiras NFC están pegadas en el lateral inferior derecho de cada nicho.
          {Platform.OS === 'web' ? ' (En web no se puede leer NFC)' : ''}
        </Text>

        {tagSummary ? (
          <View style={s.debugBox}>
            <Text style={s.debugTitle}>Última lectura</Text>
            <Text style={s.debugText}>ID: {safeString(tagSummary.id) || '—'}</Text>
            <Text style={s.debugText}>Tech: {tagSummary.techs.join(', ') || '—'}</Text>
          </View>
        ) : null}

        {supported && !active ? (
          <TouchableOpacity
            style={[s.btnGhost, { marginTop: 16, height: 44, paddingHorizontal: 16 }]}
            onPress={() => {
              setLastTag(null);
              setScanKey((k) => k + 1);
            }}
            activeOpacity={0.85}
          >
            <Text style={s.btnGhostT}>Leer otra etiqueta</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <Modal visible={linkOpen} transparent animationType="fade" onRequestClose={() => setLinkOpen(false)}>
        <View style={s.modalBackdrop}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Vincular etiqueta</Text>
            <Text style={s.modalSub}>Etiqueta: {linkTagId || '—'}</Text>

            <View style={s.searchWrap}>
              <FontAwesome name="search" size={14} color="rgba(229,231,235,0.70)" />
              <TextInput
                style={s.searchInput}
                placeholder="Busca sepultura (código o nº)…"
                placeholderTextColor="rgba(229,231,235,0.45)"
                value={q}
                onChangeText={(t) => doSearch(t)}
                editable={!linkBusy}
              />
            </View>

            <View style={{ marginTop: 10, gap: 8, maxHeight: 260 }}>
              {results.map((it) => (
                <TouchableOpacity
                  key={String(it?.id)}
                  style={[s.row, linkBusy && { opacity: 0.6 }]}
                  onPress={() => linkToSepultura(Number(it.id))}
                  disabled={linkBusy}
                  activeOpacity={0.85}
                >
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={s.rowT} numberOfLines={1}>
                      {String(it?.codigo ?? `Sepultura ${it?.id}`)}
                    </Text>
                    <Text style={s.rowSub} numberOfLines={1}>
                      {String(it?.zona_nombre ?? '—')}
                      {it?.bloque_codigo ? ` · ${String(it.bloque_codigo)}` : ''}
                      {it?.numero ? ` · Nº ${String(it.numero)}` : ''}
                    </Text>
                  </View>
                  <FontAwesome name="link" size={16} color="#22C55E" />
                </TouchableOpacity>
              ))}
              {q.trim().length >= 2 && results.length === 0 ? (
                <Text style={s.emptyT}>Sin resultados. Prueba con el número o parte del código.</Text>
              ) : null}
            </View>

            <View style={s.modalBtns}>
              <TouchableOpacity style={s.btnGhost} onPress={() => setLinkOpen(false)} activeOpacity={0.85} disabled={linkBusy}>
                <Text style={s.btnGhostT}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Ring({ v }: { v: Animated.Value }) {
  const scale = v.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1.25] });
  const opacity = v.interpolate({ inputRange: [0, 0.25, 1], outputRange: [0, 0.22, 0] });
  return <Animated.View style={[s.ring, { transform: [{ scale }], opacity }]} />;
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0B0F10' },
  top: {
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: 'rgba(229,231,235,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(229,231,235,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 16, fontWeight: '900', color: '#F9FAFB' },
  sub: { marginTop: 2, fontSize: 11, fontWeight: '700', color: 'rgba(229,231,235,0.55)' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 28,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(34,197,94,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.12)',
  },
  pillDot: { width: 8, height: 8, borderRadius: 4 },
  pillT: { fontSize: 11, fontWeight: '900', color: '#A7F3D0' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 22 },
  rings: { width: 220, height: 220, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  ring: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.30)',
  },
  core: {
    width: 78,
    height: 78,
    borderRadius: 999,
    backgroundColor: 'rgba(229,231,235,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(229,231,235,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  h1: { fontSize: 20, fontWeight: '900', color: '#F9FAFB', textAlign: 'center' },
  p: { marginTop: 10, fontSize: 13, fontWeight: '700', color: 'rgba(229,231,235,0.65)', textAlign: 'center', lineHeight: 19 },

  debugBox: {
    marginTop: 18,
    width: '100%',
    maxWidth: 520,
    backgroundColor: 'rgba(229,231,235,0.06)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(229,231,235,0.10)',
    padding: 12,
  },
  debugTitle: { fontSize: 12, fontWeight: '900', color: 'rgba(229,231,235,0.80)' },
  debugText: { marginTop: 6, fontSize: 12, fontWeight: '700', color: 'rgba(229,231,235,0.65)' },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', padding: 18 },
  modalCard: {
    width: '100%',
    maxWidth: 560,
    backgroundColor: '#0B0F10',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(229,231,235,0.10)',
    padding: 14,
  },
  modalTitle: { fontSize: 16, fontWeight: '900', color: '#F9FAFB' },
  modalSub: { marginTop: 6, fontSize: 12, fontWeight: '700', color: 'rgba(229,231,235,0.60)' },
  searchWrap: {
    marginTop: 12,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(229,231,235,0.12)',
    backgroundColor: 'rgba(229,231,235,0.06)',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchInput: { flex: 1, color: '#F9FAFB', fontWeight: '800' },
  row: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(229,231,235,0.10)',
    backgroundColor: 'rgba(229,231,235,0.05)',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowT: { fontWeight: '900', color: '#F9FAFB' },
  rowSub: { marginTop: 4, fontSize: 12, fontWeight: '700', color: 'rgba(229,231,235,0.60)' },
  emptyT: { marginTop: 6, fontSize: 12, fontWeight: '800', color: 'rgba(229,231,235,0.55)' },
  modalBtns: { marginTop: 12, flexDirection: 'row', justifyContent: 'flex-end' },
  btnGhost: {
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(229,231,235,0.14)',
    backgroundColor: 'rgba(229,231,235,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnGhostT: { fontWeight: '900', color: 'rgba(229,231,235,0.85)' },
});


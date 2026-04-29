import { useEffect, useMemo, useState } from 'react';
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
import { apiFetch } from '@/lib/laravel-api';
import { unwrapItem } from '@/lib/normalize';

type Sentido = 'horiz_r' | 'horiz_l' | 'vert_d' | 'vert_u';
type Origen = 'tl' | 'tr' | 'bl' | 'br';
type Recorrido = 'horiz' | 'vert';

export function CrearBloqueModal({
  open,
  onClose,
  onSaved,
  onError,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  onError?: (msg: string) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [zonas, setZonas] = useState<any[]>([]);
  const [zonaId, setZonaId] = useState<number | null>(null);
  const [codigo, setCodigo] = useState('');
  const [filas, setFilas] = useState(5);
  const [cols, setCols] = useState(5);
  const [origen, setOrigen] = useState<Origen>('tl');
  const [recorrido, setRecorrido] = useState<Recorrido>('horiz');
  const [inicio, setInicio] = useState(501);
  const [saving, setSaving] = useState(false);

  const sentido = useMemo<Sentido>(() => {
    if (recorrido === 'horiz') return origen === 'tr' || origen === 'br' ? 'horiz_l' : 'horiz_r';
    return origen === 'bl' || origen === 'br' ? 'vert_u' : 'vert_d';
  }, [origen, recorrido]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    apiFetch<any>('/api/cementerio/catalogo')
      .then((r) => {
        const zs = r.ok ? ((r.data as any)?.zonas ?? []) : [];
        setZonas(zs);
        setZonaId((prev) => prev ?? zs?.[0]?.id ?? null);
      })
      .finally(() => setLoading(false));
  }, [open]);

  const coords = useMemo(() => {
    const f = Math.max(1, Math.min(200, filas || 1));
    const c = Math.max(1, Math.min(200, cols || 1));
    const out: Array<[number, number]> = [];
    const rows = origen === 'bl' || origen === 'br' ? Array.from({ length: f }, (_, i) => f - i) : Array.from({ length: f }, (_, i) => i + 1);
    const colsArr = origen === 'tr' || origen === 'br' ? Array.from({ length: c }, (_, i) => c - i) : Array.from({ length: c }, (_, i) => i + 1);

    if (recorrido === 'horiz') {
      const cs = sentido === 'horiz_l' ? [...colsArr].sort((a, b) => b - a) : [...colsArr].sort((a, b) => a - b);
      for (const r of rows) for (const cc of cs) out.push([r, cc]);
      return out;
    }

    const rs = sentido === 'vert_u' ? [...rows].sort((a, b) => b - a) : [...rows].sort((a, b) => a - b);
    for (const cc of colsArr) for (const r of rs) out.push([r, cc]);
    return out;
  }, [cols, filas, origen, recorrido, sentido]);

  const grid = useMemo(() => {
    const f = Math.max(1, Math.min(8, filas || 1));
    const c = Math.max(1, Math.min(8, cols || 1));
    const map = new Map<string, number>();
    let n = Number(inicio) || 1;
    coords.forEach(([fi, co]) => {
      if (fi <= f && co <= c) map.set(`${fi}-${co}`, n);
      n++;
    });
    return { f, c, map };
  }, [cols, coords, filas, inicio]);

  const save = async () => {
    try {
      if (!zonaId) throw new Error('Selecciona zona');
      if (!codigo.trim()) throw new Error('Pon un código');
      setSaving(true);

      const nuevoBloqueRes = await apiFetch<any>('/api/cementerio/admin/bloques', {
        method: 'POST',
        body: {
          zona_id: zonaId,
          codigo: codigo.trim(),
          nombre: `Bloque ${codigo.trim()}`,
          tipo: 'nichos',
          filas,
          columnas: cols,
          sentido_numeracion: sentido,
          numero_inicio: inicio,
        },
      });
      const created =
        nuevoBloqueRes.ok
          ? (unwrapItem<any>(nuevoBloqueRes.data) ??
            (nuevoBloqueRes.data as any)?.data ??
            (nuevoBloqueRes.data as any)?.result ??
            (nuevoBloqueRes.data as any))
          : null;
      const bidRaw =
        (created as any)?.id ?? (created as any)?.bloque?.id ?? (created as any)?.item?.id ?? null;
      const bid = bidRaw != null ? Number(bidRaw) : NaN;

      if (!nuevoBloqueRes.ok || !Number.isFinite(bid) || bid <= 0) {
        const detail =
          !nuevoBloqueRes.ok
            ? typeof nuevoBloqueRes.error === 'string'
              ? nuevoBloqueRes.error
              : JSON.stringify(nuevoBloqueRes.error)
            : `Respuesta sin id: ${JSON.stringify(nuevoBloqueRes.data)}`;
        const status = !nuevoBloqueRes.ok ? nuevoBloqueRes.status : 0;
        throw new Error(`No se pudo crear el bloque (HTTP ${status}). ${detail}`);
      }

      let generados = false;
      if (origen === 'tl') {
        const gen1 = await apiFetch<any>(`/api/cementerio/admin/bloques/${bid}/generar-sepulturas`, { method: 'POST' });
        if (gen1.ok) generados = true;
      }
      if (!generados) {
        const zonaCod = (zonas.find((z) => Number(z.id) === Number(zonaId)) as any)?.codigo ?? '';
        const items: any[] = [];
        let num = Number(inicio) || 1;
        coords.forEach(([fi, co]) => {
          items.push({
            zona_id: zonaId,
            bloque_id: bid,
            tipo: 'nicho',
            numero: num,
            fila: fi,
            columna: co,
            codigo: `${zonaCod}-${codigo.trim()}-N${num}`,
            estado: 'libre',
          });
          num++;
        });
        const bulk = await apiFetch<any>('/api/cementerio/admin/sepulturas/bulk', { method: 'POST', body: { items } });
        if (bulk.ok) generados = true;
      }

      Alert.alert('Bloque creado', generados ? 'Guardado y nichos generados.' : 'Guardado. Ojo: no se pudieron generar nichos automáticamente.');
      onSaved();
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      Alert.alert('Error', msg);
      onError?.(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <View style={ms.modalBackdrop}>
        <View style={ms.modalSheet}>
          <View style={ms.modalHandle} />
          <View style={ms.modalHead}>
            <View style={{ flex: 1 }}>
              <Text style={ms.modalTitle}>Crear bloque</Text>
              <Text style={ms.modalSub}>Define la disposición y previsualízala antes de guardar</Text>
            </View>
            <TouchableOpacity style={ms.closeBtn} onPress={onClose} activeOpacity={0.85}>
              <FontAwesome name="times" size={18} color="rgba(15,23,42,0.65)" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={{ padding: 24, alignItems: 'center', gap: 10 }}>
              <ActivityIndicator color="#2F6B4E" />
              <Text style={{ color: 'rgba(15,23,42,0.55)', fontWeight: '800' }}>Cargando…</Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={{ paddingBottom: 18 }}>
              <Text style={ms.label}>ZONA</Text>
              <View style={ms.zonaRow}>
                {zonas.map((z) => {
                  const active = Number(zonaId) === Number(z.id);
                  const code = (z.codigo ?? z.siglas ?? z.nombre ?? `Z${z.id}`).toString().slice(0, 2).toUpperCase();
                  return (
                    <TouchableOpacity
                      key={String(z.id)}
                      style={[ms.zonaPill, active && ms.zonaPillActive]}
                      onPress={() => setZonaId(Number(z.id))}
                      activeOpacity={0.85}
                    >
                      <Text style={[ms.zonaPillT, active && ms.zonaPillTActive]}>{code}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={ms.label}>CÓDIGO</Text>
              <TextInput
                style={ms.input}
                value={codigo}
                onChangeText={setCodigo}
                placeholder="B-C"
                placeholderTextColor="rgba(15,23,42,0.35)"
                autoCapitalize="characters"
              />

              <Text style={ms.label}>DIMENSIONES</Text>
              <View style={ms.dimRow}>
                <DimStepper label="Filas" value={filas} onChange={setFilas} />
                <DimStepper label="Columnas" value={cols} onChange={setCols} />
              </View>

              <Text style={ms.label}>NÚMERO INICIAL</Text>
              <TextInput
                style={ms.input}
                value={String(inicio)}
                onChangeText={(t) => setInicio(parseInt(t.replace(/\D/g, ''), 10) || 1)}
                keyboardType="number-pad"
                placeholder="501"
                placeholderTextColor="rgba(15,23,42,0.35)"
              />

              <Text style={ms.label}>SENTIDO DE NUMERACIÓN</Text>
              <Text style={ms.dimLabel}>Inicio</Text>
              <View style={ms.originGrid}>
                <OriginBtn active={origen === 'tl'} label="↖" onPress={() => setOrigen('tl')} />
                <OriginBtn active={origen === 'tr'} label="↗" onPress={() => setOrigen('tr')} />
                <OriginBtn active={origen === 'bl'} label="↙" onPress={() => setOrigen('bl')} />
                <OriginBtn active={origen === 'br'} label="↘" onPress={() => setOrigen('br')} />
              </View>

              <Text style={ms.dimLabel}>Dirección</Text>
              <View style={ms.sentGrid}>
                <SentBtn active={recorrido === 'horiz'} label="Horizontal" onPress={() => setRecorrido('horiz')} />
                <SentBtn active={recorrido === 'vert'} label="Vertical" onPress={() => setRecorrido('vert')} />
              </View>
              <Text style={{ marginTop: 6, fontSize: 12, fontWeight: '800', color: 'rgba(15,23,42,0.45)' }}>
                Resultado:{' '}
                {sentido === 'horiz_r' ? 'Horizontal →' : sentido === 'horiz_l' ? 'Horizontal ←' : sentido === 'vert_d' ? 'Vertical ↓' : 'Vertical ↑'}
              </Text>

              <Text style={ms.label}>
                PREVISUALIZACIÓN · {grid.f * grid.c} SEPULTURAS
              </Text>
              <View style={ms.previewWrap}>
                <View style={ms.previewHeadRow}>
                  <View style={{ width: 28 }} />
                  {Array.from({ length: grid.c }, (_, i) => (
                    <Text key={i} style={ms.previewHeadT}>
                      C{i + 1}
                    </Text>
                  ))}
                </View>
                {Array.from({ length: grid.f }, (_, fi) => (
                  <View key={fi} style={ms.previewRow}>
                    <Text style={ms.previewSideT}>F{fi + 1}</Text>
                    {Array.from({ length: grid.c }, (_, ci) => {
                      const n = grid.map.get(`${fi + 1}-${ci + 1}`) ?? null;
                      return (
                        <View key={ci} style={ms.cell}>
                          <Text style={ms.cellT}>{n ?? ''}</Text>
                        </View>
                      );
                    })}
                  </View>
                ))}
              </View>

              <TouchableOpacity style={[ms.saveBtn, saving && { opacity: 0.6 }]} onPress={save} disabled={saving} activeOpacity={0.85}>
                {saving ? <ActivityIndicator color="#FFF" /> : <Text style={ms.saveBtnT}>Guardar bloque</Text>}
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

function DimStepper({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={ms.dimLabel}>{label}</Text>
      <View style={ms.stepRow}>
        <TouchableOpacity style={ms.stepBtnGhost} onPress={() => onChange(Math.max(1, value - 1))} activeOpacity={0.85}>
          <Text style={ms.stepBtnGhostT}>−</Text>
        </TouchableOpacity>
        <View style={ms.stepValue}>
          <Text style={ms.stepValueT}>{value}</Text>
        </View>
        <TouchableOpacity style={ms.stepBtn} onPress={() => onChange(Math.min(200, value + 1))} activeOpacity={0.85}>
          <Text style={ms.stepBtnT}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function SentBtn({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={[ms.sentBtn, active && ms.sentBtnActive]} onPress={onPress} activeOpacity={0.85}>
      <Text style={[ms.sentBtnT, active && ms.sentBtnTActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function OriginBtn({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={[ms.originBtn, active && ms.originBtnActive]} onPress={onPress} activeOpacity={0.85}>
      <Text style={[ms.originBtnT, active && ms.originBtnTActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const ms = StyleSheet.create({
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#FBF7EE',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
    maxHeight: '92%',
  },
  modalHandle: { width: 44, height: 5, borderRadius: 999, backgroundColor: 'rgba(15,23,42,0.18)', alignSelf: 'center', marginBottom: 10 },
  modalHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  modalTitle: { fontSize: 18, fontWeight: '900', color: '#0F172A' },
  modalSub: { marginTop: 4, fontSize: 12, fontWeight: '700', color: 'rgba(15,23,42,0.55)' },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.10)',
  },
  label: { marginTop: 12, fontSize: 12, fontWeight: '900', letterSpacing: 1.4, color: 'rgba(15,23,42,0.45)' },
  zonaRow: { flexDirection: 'row', gap: 10, marginTop: 10, flexWrap: 'wrap' },
  zonaPill: {
    width: 46,
    height: 34,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15,23,42,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.08)',
  },
  zonaPillActive: { backgroundColor: '#FFFFFF', borderColor: 'rgba(15,23,42,0.14)' },
  zonaPillT: { fontWeight: '900', color: 'rgba(15,23,42,0.60)' },
  zonaPillTActive: { color: '#0F172A' },
  input: {
    marginTop: 10,
    height: 44,
    borderRadius: 14,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.10)',
    fontWeight: '900',
    color: '#0F172A',
  },
  dimRow: { flexDirection: 'row', gap: 12, marginTop: 10 },
  dimLabel: { marginTop: 8, fontSize: 12, fontWeight: '800', color: 'rgba(15,23,42,0.55)' },
  stepRow: { marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepBtnGhost: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnGhostT: { fontSize: 20, fontWeight: '900', color: 'rgba(15,23,42,0.55)' },
  stepValue: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepValueT: { fontSize: 16, fontWeight: '900', color: '#0F172A' },
  stepBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#2F6B4E', alignItems: 'center', justifyContent: 'center' },
  stepBtnT: { fontSize: 18, fontWeight: '900', color: '#FFF' },
  sentGrid: { marginTop: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  sentBtn: {
    flexBasis: '48%',
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.10)',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sentBtnActive: { backgroundColor: '#0F172A' },
  sentBtnT: { fontWeight: '900', color: '#0F172A' },
  sentBtnTActive: { color: '#FFFFFF' },
  originGrid: { marginTop: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  originBtn: {
    flexBasis: '22%',
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.10)',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  originBtnActive: { backgroundColor: '#0F172A' },
  originBtnT: { fontWeight: '900', color: '#0F172A', fontSize: 18 },
  originBtnTActive: { color: '#FFFFFF' },
  previewWrap: {
    marginTop: 10,
    padding: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(15,23,42,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.08)',
  },
  previewHeadRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  previewHeadT: { width: 44, textAlign: 'center', fontSize: 10, fontWeight: '900', color: 'rgba(15,23,42,0.45)' },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  previewSideT: { width: 28, fontSize: 10, fontWeight: '900', color: 'rgba(15,23,42,0.45)' },
  cell: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellT: { fontSize: 12, fontWeight: '900', color: 'rgba(15,23,42,0.65)' },
  saveBtn: { marginTop: 14, height: 52, borderRadius: 16, backgroundColor: '#2F6B4E', alignItems: 'center', justifyContent: 'center' },
  saveBtnT: { color: '#FFF', fontWeight: '900', fontSize: 16 },
});

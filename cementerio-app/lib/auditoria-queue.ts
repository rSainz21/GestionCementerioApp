import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { supabase } from '@/lib/supabase';
import { patchSepulturaWithFoto } from '@/lib/auditoria-api';
import type { EstadoSepultura } from '@/lib/types';

export type AuditPatch = {
  sepulturaId: number;
  estado?: EstadoSepultura;
  notas?: string | null;
  ubicacion_texto?: string | null;
  lat?: number | null;
  lon?: number | null;
  fotoLocalUri?: string | null;
  createdAt: number;
};

const KEY = 'auditoria_queue_v1';

async function readQueue(): Promise<AuditPatch[]> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as AuditPatch[]) : [];
  } catch {
    return [];
  }
}

async function writeQueue(items: AuditPatch[]) {
  await AsyncStorage.setItem(KEY, JSON.stringify(items));
}

export async function enqueueAuditPatch(patch: Omit<AuditPatch, 'createdAt'>) {
  const q = await readQueue();
  q.unshift({ ...patch, createdAt: Date.now() });
  await writeQueue(q);
}

export async function getQueueCount(): Promise<number> {
  const q = await readQueue();
  return q.length;
}

async function applySepulturaUpdate(p: AuditPatch) {
  const payload: Record<string, any> = {};
  if (p.estado) payload.estado = p.estado;
  if (p.notas !== undefined) payload.notas = p.notas;
  if (p.ubicacion_texto !== undefined) payload.ubicacion_texto = p.ubicacion_texto;
  if (p.lat !== undefined) payload.lat = p.lat;
  if (p.lon !== undefined) payload.lon = p.lon;

  if (Object.keys(payload).length === 0) return;

  const res = await supabase.from('cemn_sepulturas').update(payload).eq('id', p.sepulturaId);
  if (!res.error) return;

  // Si la BD aún no tiene lat/lon, reintentamos sin esos campos.
  const msg = (res.error.message ?? '').toLowerCase();
  const mentionsLatLon = msg.includes('lat') || msg.includes('lon') || msg.includes('column');
  if (mentionsLatLon && ('lat' in payload || 'lon' in payload)) {
    delete payload.lat;
    delete payload.lon;
    const res2 = await supabase.from('cemn_sepulturas').update(payload).eq('id', p.sepulturaId);
    if (res2.error) throw res2.error;
    return;
  }
  throw res.error;
}

export async function processAuditQueue(): Promise<{ processed: number; remaining: number }> {
  const net = await NetInfo.fetch();
  if (!net.isConnected) {
    const q0 = await readQueue();
    return { processed: 0, remaining: q0.length };
  }

  const q = await readQueue();
  if (q.length === 0) return { processed: 0, remaining: 0 };

  const kept: AuditPatch[] = [];
  let ok = 0;

  for (const item of q) {
    try {
      if (item.fotoLocalUri) {
        const apiRes = await patchSepulturaWithFoto({
          sepulturaId: item.sepulturaId,
          estado: item.estado,
          notas: item.notas,
          ubicacion_texto: item.ubicacion_texto,
          lat: item.lat ?? null,
          lon: item.lon ?? null,
          fotoLocalUri: item.fotoLocalUri,
          guardarEnDocumentos: true,
          fotoDescripcion: 'Auditoría (cola)',
          source: 'queue',
        });
        if (!apiRes.ok) throw new Error(apiRes.error);
      } else {
        await applySepulturaUpdate(item);
      }
      ok++;
    } catch {
      kept.push(item);
    }
  }

  await writeQueue(kept);
  return { processed: ok, remaining: kept.length };
}


import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import type { EstadoSepultura } from '@/lib/types';
import { apiFetch } from '@/lib/laravel-api';

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

  const res = await apiFetch(`/api/cementerio/sepulturas/${p.sepulturaId}`, { method: 'PUT', body: payload });
  if (res.ok) return;
  throw new Error(typeof res.error === 'string' ? res.error : 'No se pudo actualizar sepultura');
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
      await applySepulturaUpdate(item);
      ok++;
    } catch {
      kept.push(item);
    }
  }

  await writeQueue(kept);
  return { processed: ok, remaining: kept.length };
}


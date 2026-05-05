import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'campo_notas_campo_v1';
const MAX = 80;

export type CampoFieldNote = {
  id: string;
  text: string;
  lat: number | null;
  lon: number | null;
  acc: number | null;
  createdAt: number;
  /** Sepultura en pantalla al guardar (solo referencia local). */
  contextLabel?: string | null;
};

export async function loadFieldNotes(): Promise<CampoFieldNote[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const p = JSON.parse(raw);
    if (!Array.isArray(p)) return [];
    return p.filter((x: any) => x && typeof x.id === 'string' && typeof x.text === 'string') as CampoFieldNote[];
  } catch {
    return [];
  }
}

export async function appendFieldNote(
  text: string,
  gps: { lat: number; lon: number; acc: number | null } | null,
  opts?: { contextLabel?: string | null }
): Promise<CampoFieldNote[]> {
  const trimmed = String(text ?? '').trim();
  if (!trimmed) {
    const cur = await loadFieldNotes();
    return cur;
  }
  const ctx = String(opts?.contextLabel ?? '').trim();
  const id = `nf_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const item: CampoFieldNote = {
    id,
    text: trimmed.slice(0, 4000),
    lat: gps?.lat ?? null,
    lon: gps?.lon ?? null,
    acc: gps?.acc ?? null,
    createdAt: Date.now(),
    contextLabel: ctx ? ctx.slice(0, 200) : null,
  };
  const cur = await loadFieldNotes();
  const next = [item, ...cur].slice(0, MAX);
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export async function deleteFieldNote(id: string): Promise<CampoFieldNote[]> {
  const cur = await loadFieldNotes();
  const next = cur.filter((x) => x.id !== id);
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

/** Texto plano para WhatsApp / correo (más reciente primero). */
export function formatFieldNotesExport(notes: CampoFieldNote[]): string {
  const sorted = [...notes].sort((a, b) => b.createdAt - a.createdAt);
  const lines: string[] = ['Notas de campo (Conect@ cementerio)', '—'];
  for (const n of sorted) {
    const d = new Date(n.createdAt);
    const ds = `${d.toLocaleDateString('es-ES')} ${d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;
    lines.push(`[${ds}]`);
    if (n.contextLabel) lines.push(`Ficha: ${n.contextLabel}`);
    lines.push(n.text);
    if (n.lat != null && n.lon != null) {
      lines.push(`GPS: ${n.lat.toFixed(6)}, ${n.lon.toFixed(6)}${n.acc != null ? ` (±${Math.round(n.acc)} m)` : ''}`);
    }
    lines.push('—');
  }
  return lines.join('\n');
}

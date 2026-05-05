import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'campo_recientes_sepulturas_v1';
const MAX = 12;

export type CampoReciente = {
  id: number;
  label: string;
  updatedAt: number;
};

export async function loadRecientes(): Promise<CampoReciente[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const p = JSON.parse(raw);
    if (!Array.isArray(p)) return [];
    return p
      .filter((x: any) => x && Number.isFinite(Number(x.id)))
      .map((x: any) => ({
        id: Number(x.id),
        label: String(x.label ?? `Sepultura ${x.id}`).slice(0, 80),
        updatedAt: Number(x.updatedAt) || 0,
      }));
  } catch {
    return [];
  }
}

/** Guarda o actualiza al frente (más reciente primero). */
export async function touchReciente(entry: CampoReciente): Promise<CampoReciente[]> {
  const cur = await loadRecientes();
  const next = [{ ...entry, updatedAt: Date.now() }, ...cur.filter((x) => x.id !== entry.id)].slice(0, MAX);
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export async function clearRecientes(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}

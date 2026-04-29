import AsyncStorage from '@react-native-async-storage/async-storage';

export type DibujoFeatureType = 'bloque' | 'hotspot' | 'exclusion';
export type DibujoFeature = {
  id: string;
  type: DibujoFeatureType;
  codigo: string; // p.ej. B6, B7, B8...
  label?: string;
  zona_id?: number | null;
  coordinates: Array<{ latitude: number; longitude: number }>; // polígono cerrado NO requerido
  updatedAt: number;
};

const KEY = 'cemn:mapa:dibujo:v1';

export async function loadDibujos(): Promise<DibujoFeature[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as DibujoFeature[]) : [];
  } catch {
    return [];
  }
}

export async function saveDibujos(all: DibujoFeature[]) {
  await AsyncStorage.setItem(KEY, JSON.stringify(all ?? []));
}

export async function upsertDibujo(feature: DibujoFeature) {
  const all = await loadDibujos();
  const next = [...all.filter((f) => f.id !== feature.id), feature];
  await saveDibujos(next);
  return next;
}

export async function removeDibujo(id: string) {
  const all = await loadDibujos();
  const next = all.filter((f) => f.id !== id);
  await saveDibujos(next);
  return next;
}


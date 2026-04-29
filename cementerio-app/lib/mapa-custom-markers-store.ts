import AsyncStorage from '@react-native-async-storage/async-storage';

export type CustomMarkerKind = 'nicho' | 'columbario' | 'sepultura' | 'panteon';

export type CustomMarker = {
  id: string;
  kind: CustomMarkerKind;
  label: string; // número o texto corto
  note?: string;
  latitude: number;
  longitude: number;
  updatedAt: number;
};

const KEY = 'cemn:mapa:custom-markers:v1';

export async function loadCustomMarkers(): Promise<CustomMarker[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CustomMarker[]) : [];
  } catch {
    return [];
  }
}

export async function saveCustomMarkers(all: CustomMarker[]) {
  await AsyncStorage.setItem(KEY, JSON.stringify(all ?? []));
}

export async function upsertCustomMarker(marker: Omit<CustomMarker, 'updatedAt'>) {
  const all = await loadCustomMarkers();
  const next: CustomMarker[] = [...all.filter((m) => String(m.id) !== String(marker.id)), { ...marker, updatedAt: Date.now() }];
  await saveCustomMarkers(next);
  return next;
}

export async function removeCustomMarker(id: string) {
  const all = await loadCustomMarkers();
  const next = all.filter((m) => String(m.id) !== String(id));
  await saveCustomMarkers(next);
  return next;
}


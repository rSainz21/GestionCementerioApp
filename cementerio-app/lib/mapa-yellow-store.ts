import AsyncStorage from '@react-native-async-storage/async-storage';

export type YellowMarkerPosition = {
  id: string; // '1'..'8'
  latitude: number;
  longitude: number;
  updatedAt: number;
};

const KEY = 'cemn:mapa:yellow-markers:v1';

export async function loadYellowMarkerPositions(): Promise<YellowMarkerPosition[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as YellowMarkerPosition[]) : [];
  } catch {
    return [];
  }
}

export async function saveYellowMarkerPositions(all: YellowMarkerPosition[]) {
  await AsyncStorage.setItem(KEY, JSON.stringify(all ?? []));
}

export async function upsertYellowMarkerPosition(pos: Omit<YellowMarkerPosition, 'updatedAt'>) {
  const all = await loadYellowMarkerPositions();
  const next: YellowMarkerPosition[] = [
    ...all.filter((p) => String(p.id) !== String(pos.id)),
    { ...pos, updatedAt: Date.now() },
  ];
  await saveYellowMarkerPositions(next);
  return next;
}

export async function resetYellowMarkerPositions() {
  await AsyncStorage.removeItem(KEY);
}


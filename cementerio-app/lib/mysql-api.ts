import { Platform } from 'react-native';

type ApiOk<T> = { ok: true } & T;
type ApiErr = { ok: false; error: any };

function getBase(): string | null {
  // Expo: solo variables EXPO_PUBLIC_* llegan al cliente
  // En web/android/ios se resuelven igual.
  // @ts-expect-error - process.env está en Metro/Expo
  const b = (process.env.EXPO_PUBLIC_API_BASE as string | undefined) ?? '';
  const base = String(b).trim();
  return base ? base.replace(/\/+$/, '') : null;
}

function getToken(): string | null {
  // @ts-expect-error - process.env está en Metro/Expo
  const t = (process.env.EXPO_PUBLIC_API_TOKEN as string | undefined) ?? '';
  const tok = String(t).trim();
  return tok || null;
}

async function postJson<T>(path: string, body: any): Promise<ApiOk<T> | ApiErr> {
  const base = getBase();
  if (!base) return { ok: false, error: 'API base no configurada (EXPO_PUBLIC_API_BASE)' };
  const token = getToken();
  if (!token) return { ok: false, error: 'API token no configurado (EXPO_PUBLIC_API_TOKEN)' };

  const url = `${base}${path.startsWith('/') ? '' : '/'}${path}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`,
      'x-client-platform': Platform.OS,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, error: data?.error ?? data ?? `HTTP ${res.status}` };
  return data as any;
}

export async function apiInhumacion(input: {
  sepultura_id: number;
  nombre_completo: string;
  fecha_fallecimiento?: string | null;
  fecha_inhumacion?: string | null;
  es_titular?: boolean;
  parentesco?: string | null;
  notas?: string | null;
}): Promise<{ ok: true; difunto_id: number; movimiento_id: number } | { ok: false; error: any }> {
  return postJson('/workflows/inhumacion', input);
}

export async function apiExhumacion(input: {
  sepultura_id: number;
  difunto_id: number;
  tipo: 'exhumacion' | 'traslado';
  fecha?: string | null;
  notas?: string | null;
  sepultura_destino_id?: number | null;
}): Promise<{ ok: true; movimiento_id: number; restantes: number } | { ok: false; error: any }> {
  return postJson('/workflows/exhumacion', input);
}


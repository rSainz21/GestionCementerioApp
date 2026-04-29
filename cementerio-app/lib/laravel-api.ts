import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export const AUTH_TOKEN_KEY = 'cementerio_laravel_token';

let volatileToken: string | null = null;

function getBase(): string {
  const b = (process.env.EXPO_PUBLIC_LARAVEL_BASE as string | undefined) ?? '';
  const base = String(b).trim().replace(/\/+$/, '');
  if (!base) {
    throw new Error('Falta EXPO_PUBLIC_LARAVEL_BASE (base URL del backend Laravel)');
  }
  return base;
}

/** Base pública del backend (sin barra final). No lanza si falta env. */
export function getLaravelBaseUrl(): string {
  const b = (process.env.EXPO_PUBLIC_LARAVEL_BASE as string | undefined) ?? '';
  return String(b).trim().replace(/\/+$/, '');
}

/**
 * Convierte rutas de ficheros de la API en URL absoluta para `<Image source={{ uri }} />`.
 * Acepta `/storage/...`, `storage/...` o rutas relativas al disco (`cementerio/...`).
 */
export function resolveMediaUrl(href: string | null | undefined): string {
  if (href == null) return '';
  const t = String(href).trim();
  if (!t) return '';
  if (/^https?:\/\//i.test(t)) return t;
  const base = getLaravelBaseUrl();
  const normalized = t.replace(/^\/+/, '');
  const path = normalized.startsWith('storage/') ? `/${normalized}` : `/storage/${normalized}`;
  return base ? `${base}${path}` : path;
}

async function getToken(): Promise<string | null> {
  if (volatileToken && volatileToken.trim()) return volatileToken.trim();
  const tok = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
  return tok && tok.trim() ? tok.trim() : null;
}

export async function setToken(token: string | null, opts: { persist?: boolean } = {}) {
  const persist = opts.persist !== false;
  volatileToken = token && token.trim() ? token.trim() : null;

  if (!persist) {
    // Sesión “temporal”: no dejar token persistido en el dispositivo.
    await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
    return;
  }

  if (!volatileToken) {
    await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
    return;
  }

  await AsyncStorage.setItem(AUTH_TOKEN_KEY, volatileToken);
}

export async function apiFetch<T>(
  path: string,
  opts: { method?: string; body?: any; headers?: Record<string, string>; isMultipart?: boolean } = {}
): Promise<{ ok: true; data: T } | { ok: false; status: number; error: any }> {
  const base = getBase();
  const url = `${base}${path.startsWith('/') ? '' : '/'}${path}`;
  const token = await getToken();

  const headers: Record<string, string> = {
    accept: 'application/json',
    ...opts.headers,
  };
  // En web, headers custom suelen disparar CORS preflight (OPTIONS) y fallar con "Failed to fetch".
  // En móvil nativo no aplica CORS.
  if (Platform.OS !== 'web') headers['x-client-platform'] = Platform.OS;
  if (token) headers.authorization = `Bearer ${token}`;

  let body: any = undefined;
  if (opts.body !== undefined) {
    if (opts.isMultipart) {
      body = opts.body;
      // fetch asigna boundary automáticamente
    } else {
      headers['content-type'] = 'application/json';
      body = JSON.stringify(opts.body);
    }
  }

  let res: Response;
  try {
    res = await fetch(url, {
      method: opts.method ?? 'GET',
      headers,
      body,
    });
  } catch (e: any) {
    const method = (opts.method ?? 'GET').toUpperCase();
    const msg = e?.message ?? String(e);
    console.error(`[apiFetch] ${method} ${url} -> NETWORK_ERROR`, msg);
    return {
      ok: false,
      status: 0,
      error: `NETWORK_ERROR: ${msg}\nURL: ${url}\nSi estás en web, suele ser CORS (OPTIONS) o que el backend no es accesible desde tu red.`,
    };
  }

  if (res.status === 204) return { ok: true, data: {} as T };

  const contentType = res.headers.get('content-type') ?? '';
  const method = (opts.method ?? 'GET').toUpperCase();

  const rawText = contentType.includes('application/json')
    ? null
    : await res.text().catch(() => '');

  const parsedJson = contentType.includes('application/json')
    ? await res.json().catch(() => ({}))
    : (() => {
        const t = (rawText ?? '').trim();
        if (t.startsWith('{') || t.startsWith('[')) {
          try { return JSON.parse(t); } catch { /* ignore */ }
        }
        return null;
      })();

  const payload = parsedJson ?? rawText ?? {};

  if (!res.ok) {
    const msg = (payload as any)?.message ?? payload;
    const trimmed =
      typeof msg === 'string' && msg.length > 1200
        ? `${msg.slice(0, 1200)}…`
        : msg;
    // Log detallado para poder ver el error real (500, validaciones, etc.)
    console.error(`[apiFetch] ${method} ${url} -> ${res.status}`, payload);
    return { ok: false, status: res.status, error: trimmed };
  }

  return { ok: true, data: payload as T };
}


import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export const AUTH_TOKEN_KEY = 'cementerio_laravel_token';

let volatileToken: string | null = null;

function readPublicBase(): string {
  // Orden de preferencia:
  // 1) EXPO_PUBLIC_LARAVEL_BASE (histórico)
  // 2) EXPO_PUBLIC_API_BASE (nuevo: muchos builds lo usan)
  const b1 = (process.env.EXPO_PUBLIC_LARAVEL_BASE as string | undefined) ?? '';
  const b2 = (process.env.EXPO_PUBLIC_API_BASE as string | undefined) ?? '';
  const base = String(b1 || b2).trim().replace(/\/+$/, '');
  return base;
}

function getBase(): string {
  const base = readPublicBase();
  if (!base) {
    throw new Error('Falta base del backend. Define EXPO_PUBLIC_LARAVEL_BASE o EXPO_PUBLIC_API_BASE (URL del Laravel, sin / final).');
  }
  return base;
}

/** Base pública del backend (sin barra final). No lanza si falta env. */
export function getLaravelBaseUrl(): string {
  return readPublicBase();
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

/** Mensaje legible para toasts / login (422, 403, etc.). */
function extractLaravelErrorMessage(payload: unknown, status: number): string {
  if (typeof payload === 'string' && payload.trim()) return payload.trim();
  if (payload == null || typeof payload !== 'object') {
    return status === 0 ? 'Sin conexión con el servidor.' : `Error ${status}`;
  }
  const p = payload as Record<string, unknown>;
  const m = p.message;
  if (typeof m === 'string' && m.trim()) return m.trim();
  const errors = p.errors;
  if (errors && typeof errors === 'object') {
    for (const v of Object.values(errors)) {
      const arr = Array.isArray(v) ? v : [v];
      const first = arr.find((x) => x != null && String(x).trim());
      if (first != null) return String(first).trim();
    }
  }
  if (status === 401) return 'Sesión no válida o caducada.';
  if (status === 403) return 'No tienes permiso para esta acción.';
  if (status === 404) return 'Recurso no encontrado.';
  if (status === 422) return 'Datos no válidos.';
  if (status >= 500) return 'Error en el servidor. Inténtalo más tarde.';
  return `Error ${status}`;
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

  const MAX_RETRIES = 2;
  let res: Response | null = null;
  let lastNetErr: string = '';

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      res = await fetch(url, {
        method: opts.method ?? 'GET',
        headers,
        body,
      });
      break; // Éxito: salir del bucle de reintentos
    } catch (e: any) {
      lastNetErr = e?.message ?? String(e);
      const isLastAttempt = attempt === MAX_RETRIES;
      if (isLastAttempt) {
        const method = (opts.method ?? 'GET').toUpperCase();
        console.error(`[apiFetch] ${method} ${url} -> NETWORK_ERROR (${attempt + 1} intentos)`, lastNetErr);
        return {
          ok: false,
          status: 0,
          error: `NETWORK_ERROR: ${lastNetErr}\nURL: ${url}\nSe reintentó ${MAX_RETRIES} veces.\nSi estás en web, suele ser CORS (OPTIONS) o que el backend no es accesible desde tu red.`,
        };
      }
      // Esperar antes de reintentar (backoff exponencial corto)
      await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
    }
  }

  if (!res) {
    return { ok: false, status: 0, error: 'NETWORK_ERROR: no se obtuvo respuesta del servidor' };
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
    const extracted = extractLaravelErrorMessage(payload, res.status);
    const trimmed =
      typeof extracted === 'string' && extracted.length > 1200
        ? `${extracted.slice(0, 1200)}…`
        : extracted;
    // Log detallado para poder ver el error real (500, validaciones, etc.)
    console.error(`[apiFetch] ${method} ${url} -> ${res.status}`, payload);
    return { ok: false, status: res.status, error: trimmed };
  }

  return { ok: true, data: payload as T };
}


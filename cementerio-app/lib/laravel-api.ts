import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export const AUTH_TOKEN_KEY = 'cementerio_laravel_token';

function getBase(): string {
  // @ts-expect-error - process.env existe en Expo/Metro
  const b = (process.env.EXPO_PUBLIC_LARAVEL_BASE as string | undefined) ?? '';
  const base = String(b).trim().replace(/\/+$/, '');
  if (!base) {
    throw new Error('Falta EXPO_PUBLIC_LARAVEL_BASE (base URL del backend Laravel)');
  }
  return base;
}

async function getToken(): Promise<string | null> {
  const tok = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
  return tok && tok.trim() ? tok.trim() : null;
}

export async function setToken(token: string | null) {
  if (!token) {
    await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
    return;
  }
  await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
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
    'x-client-platform': Platform.OS,
    ...opts.headers,
  };
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

  const res = await fetch(url, {
    method: opts.method ?? 'GET',
    headers,
    body,
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, status: res.status, error: json?.message ?? json };
  return { ok: true, data: json as T };
}


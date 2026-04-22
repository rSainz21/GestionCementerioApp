import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // No imprimimos la key por seguridad
  // eslint-disable-next-line no-console
  console.error('[supabase] Faltan variables EXPO_PUBLIC_SUPABASE_URL/EXPO_PUBLIC_SUPABASE_ANON_KEY');
} else {
  // eslint-disable-next-line no-console
  console.log('[supabase] URL:', SUPABASE_URL, '| anonKey:', SUPABASE_ANON_KEY.slice(0, 8) + '…');
}

let storage: any = undefined;
if (Platform.OS !== 'web') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  storage = require('@react-native-async-storage/async-storage').default;
} else {
  // En web, usar localStorage para persistir sesión (si está disponible).
  // Supabase espera un storage con getItem/setItem/removeItem.
  try {
    // eslint-disable-next-line no-undef
    if (typeof window !== 'undefined' && window.localStorage) {
      storage = window.localStorage;
    }
  } catch {
    // Si falla (p. ej. modo privado estricto), dejamos el storage por defecto.
    storage = undefined;
  }
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage,
    autoRefreshToken: true,
    // Persistir también en web para no pedir login cada vez.
    persistSession: true,
    detectSessionInUrl: false,
  },
});

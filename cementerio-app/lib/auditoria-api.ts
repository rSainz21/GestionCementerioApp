import { supabase } from '@/lib/supabase';
import type { EstadoSepultura } from '@/lib/types';
import { Platform } from 'react-native';

type Params = {
  sepulturaId: number;
  estado?: EstadoSepultura;
  notas?: string | null;
  ubicacion_texto?: string | null;
  lat?: number | null;
  lon?: number | null;
  fotoLocalUri?: string | null;
  fotoDescripcion?: string | null;
  guardarEnDocumentos?: boolean;
  actorUid?: string | null;
  source?: 'app' | 'queue';
};

function toFormValue(v: unknown): string {
  if (v === null || v === undefined) return '';
  return String(v);
}

export async function patchSepulturaWithFoto(params: Params): Promise<{ ok: true; foto_url?: string | null } | { ok: false; error: string }> {
  try {
    const { data: sessionRes } = await supabase.auth.getSession();
    const token = sessionRes.session?.access_token;
    if (!token) return { ok: false, error: 'No hay sesión activa' };

    const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
    if (!SUPABASE_URL) return { ok: false, error: 'Falta EXPO_PUBLIC_SUPABASE_URL' };

    const fd = new FormData();
    fd.append('sepultura_id', String(params.sepulturaId));
    if (params.actorUid) fd.append('actor_uid', params.actorUid);
    fd.append('source', params.source ?? 'app');
    if (params.estado) fd.append('estado', params.estado);
    if (params.notas !== undefined) fd.append('notas', params.notas ?? '');
    if (params.ubicacion_texto !== undefined) fd.append('ubicacion_texto', params.ubicacion_texto ?? '');
    if (params.lat !== undefined) fd.append('lat', toFormValue(params.lat));
    if (params.lon !== undefined) fd.append('lon', toFormValue(params.lon));
    if (params.fotoDescripcion !== undefined && params.fotoDescripcion !== null) fd.append('foto_descripcion', params.fotoDescripcion);
    if (params.guardarEnDocumentos) fd.append('guardar_en_documentos', 'true');

    if (params.fotoLocalUri) {
      if (Platform.OS === 'web') {
        const blob = await fetch(params.fotoLocalUri).then((r) => r.blob());
        fd.append('foto', blob, 'foto.jpg');
      } else {
        // React Native FormData file
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        fd.append('foto', { uri: params.fotoLocalUri, name: 'foto.jpg', type: 'image/jpeg' } as any);
      }
    }

    const res = await fetch(`${SUPABASE_URL}/functions/v1/sepulturas-auditoria`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: fd,
    });

    const body = await res.json().catch(() => ({}));
    if (!res.ok || !body?.ok) {
      return { ok: false, error: body?.error ?? `HTTP ${res.status}` };
    }
    return { ok: true, foto_url: body?.foto_url ?? null };
  } catch (e: any) {
    return { ok: false, error: e.message ?? String(e) };
  }
}


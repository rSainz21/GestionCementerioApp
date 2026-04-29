import * as ImagePicker from 'expo-image-picker';
import { Alert, Platform } from 'react-native';
import { apiFetch, resolveMediaUrl } from './laravel-api';
import { unwrapItem } from './normalize';

export interface Foto {
  id: number;
  sepultura_id: number;
  url: string;
  descripcion: string | null;
  tomada_en: string;
}

type DocumentoFoto = {
  id: number;
  sepultura_id: number;
  tipo: string;
  ruta_archivo?: string | null;
  url?: string | null;
  descripcion: string | null;
  created_at?: string;
  creado_en?: string;
};

function documentoToAbsoluteUrl(doc: { url?: string | null; ruta_archivo?: string | null } | null): string {
  if (!doc) return '';
  const rel =
    (typeof doc.url === 'string' && doc.url.trim() !== '' && doc.url) ||
    (doc.ruta_archivo ? String(doc.ruta_archivo) : '');
  return resolveMediaUrl(rel);
}

async function requestCameraPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return true;
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Permiso necesario', 'Necesitamos acceso a la cámara para hacer fotos.');
    return false;
  }
  return true;
}

async function requestLibraryPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return true;
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Permiso necesario', 'Necesitamos acceso a la galería para elegir una foto.');
    return false;
  }
  return true;
}

export async function tomarFoto(): Promise<string | null> {
  const ok = await requestCameraPermission();
  if (!ok) return null;

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    quality: 0.85,
    allowsEditing: false,
  });

  if (result.canceled || !result.assets?.[0]) return null;
  return result.assets[0].uri;
}

export async function elegirDeGaleria(): Promise<string | null> {
  const ok = await requestLibraryPermission();
  if (!ok) return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.85,
    allowsEditing: false,
  });

  if (result.canceled || !result.assets?.[0]) return null;
  return result.assets[0].uri;
}

export async function subirFoto(sepulturaId: number, localUri: string, descripcion?: string): Promise<Foto | null> {
  const r = await subirDocumentoFoto(sepulturaId, localUri, descripcion);
  if (!r.ok) {
    Alert.alert('Error al subir foto', r.error);
    return null;
  }
  return {
    id: r.documentoId ?? 0,
    sepultura_id: sepulturaId,
    url: r.url,
    descripcion: descripcion ?? null,
    tomada_en: new Date().toISOString(),
  };
}

function inferFilePart(localUri: string): { name: string; type: string } {
  const path = localUri.split('?')[0];
  const extMatch = path.match(/\.([a-z0-9]+)$/i);
  const ext = (extMatch?.[1] ?? 'jpg').toLowerCase();
  const mime =
    ext === 'png'
      ? 'image/png'
      : ext === 'webp'
        ? 'image/webp'
        : ext === 'heic' || ext === 'heif'
          ? 'image/heic'
          : 'image/jpeg';
  return { name: `foto.${ext}`, type: mime };
}

export async function subirDocumentoFoto(
  sepulturaId: number,
  localUri: string,
  descripcion?: string
): Promise<{ ok: true; url: string; documentoId?: number } | { ok: false; error: string }> {
  try {
    const fd = new FormData();
    fd.append('tipo', 'fotografia');
    if (descripcion) fd.append('descripcion', descripcion);

    if (Platform.OS === 'web') {
      const resBlob = await fetch(localUri);
      const blob = await resBlob.blob();
      const mime = blob.type && blob.type !== 'application/octet-stream' ? blob.type : 'image/jpeg';
      const file =
        typeof File !== 'undefined' ? new File([blob], 'foto.jpg', { type: mime }) : (blob as Blob);
      fd.append('archivo', file as any);
    } else {
      const { name, type } = inferFilePart(localUri);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fd.append('archivo', { uri: localUri, name, type } as any);
    }

    const res = await apiFetch<{ item: any }>(`/api/cementerio/sepulturas/${sepulturaId}/documentos`, {
      method: 'POST',
      body: fd,
      isMultipart: true,
    });

    if (!res.ok) return { ok: false, error: String(res.error ?? 'No se pudo subir el documento') };

    const doc =
      unwrapItem<any>(res.data) ??
      (res.data as any)?.item ??
      null;
    const url = documentoToAbsoluteUrl(doc);
    const idRaw = doc?.id;
    return { ok: true, url, documentoId: idRaw != null ? Number(idRaw) : undefined };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? String(e) };
  }
}

export async function obtenerFotos(sepulturaId: number): Promise<Foto[]> {
  const r = await apiFetch<any>(`/api/cementerio/sepulturas/${sepulturaId}`);
  if (!r.ok) return [];

  const docs = (r.data as any)?.item?.documentos ?? [];
  const fotos = (docs as DocumentoFoto[])
    .filter((d) => {
      const tipo = String(d?.tipo ?? '').toLowerCase();
      return tipo === 'fotografia' || tipo === 'foto' || tipo.includes('foto');
    })
    .map((d) => ({
      id: d.id,
      sepultura_id: sepulturaId,
      url: documentoToAbsoluteUrl(d),
      descripcion: d.descripcion,
      tomada_en: String((d as any).created_at ?? d.created_at ?? d.creado_en ?? ''),
    }));

  return fotos;
}

export async function eliminarFoto(fotoId: number): Promise<void> {
  void fotoId;
}

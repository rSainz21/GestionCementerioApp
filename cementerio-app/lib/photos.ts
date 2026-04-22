import * as ImagePicker from 'expo-image-picker';
import { Alert, Platform } from 'react-native';
import { apiFetch } from './laravel-api';

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
  url?: string | null; // compat schema viejo
  descripcion: string | null;
  created_at?: string;
  creado_en?: string; // compat schema viejo
};

async function requestPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return true;
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Permiso necesario', 'Necesitamos acceso a la cámara para hacer fotos.');
    return false;
  }
  return true;
}

export async function tomarFoto(): Promise<string | null> {
  const ok = await requestPermission();
  if (!ok) return null;

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    quality: 0.7,
    allowsEditing: false,
  });

  if (result.canceled || !result.assets?.[0]) return null;
  return result.assets[0].uri;
}

export async function elegirDeGaleria(): Promise<string | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.7,
    allowsEditing: false,
  });

  if (result.canceled || !result.assets?.[0]) return null;
  return result.assets[0].uri;
}

export async function subirFoto(sepulturaId: number, localUri: string, descripcion?: string): Promise<Foto | null> {
  try {
    const filename = `sep_${sepulturaId}_${Date.now()}.jpg`;
    const path = `sepulturas/${sepulturaId}/${filename}`;

    const response = await fetch(localUri);
    const blob = await response.blob();

    const { error: uploadError } = await supabase.storage
      .from('fotos-cementerio')
      .upload(path, blob, { contentType: 'image/jpeg', upsert: false });

    if (uploadError) {
      console.warn('Upload error:', uploadError.message);
      const { data: foto } = await supabase
        .from('cemn_fotos')
        .insert({ sepultura_id: sepulturaId, url: localUri, descripcion: descripcion ?? null })
        .select()
        .single();
      return foto as Foto | null;
    }

    const { data: urlData } = supabase.storage.from('fotos-cementerio').getPublicUrl(path);

    const { data: foto } = await supabase
      .from('cemn_fotos')
      .insert({ sepultura_id: sepulturaId, url: urlData.publicUrl, descripcion: descripcion ?? null })
      .select()
      .single();

    return foto as Foto | null;
  } catch (e: any) {
    Alert.alert('Error al subir foto', e.message);
    return null;
  }
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
      const blob = await fetch(localUri).then((r) => r.blob());
      fd.append('archivo', blob, 'foto.jpg');
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fd.append('archivo', { uri: localUri, name: 'foto.jpg', type: 'image/jpeg' } as any);
    }

    const res = await apiFetch<{ item: any }>(`/api/cementerio/sepulturas/${sepulturaId}/documentos`, {
      method: 'POST',
      body: fd,
      isMultipart: true,
    });

    if (!res.ok) return { ok: false, error: String(res.error ?? 'No se pudo subir el documento') };

    const item = (res.data as any).item;
    const url = item?.url ? String(item.url) : '';
    return { ok: true, url, documentoId: item?.id };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? String(e) };
  }
}

export async function obtenerFotos(sepulturaId: number): Promise<Foto[]> {
  const r = await apiFetch<any>(`/api/cementerio/sepulturas/${sepulturaId}`);
  if (!r.ok) return [];

  const docs = (r.data as any)?.item?.documentos ?? [];
  const fotos = (docs as DocumentoFoto[])
    .filter((d) => String(d?.tipo ?? '').toLowerCase() === 'fotografia' || String(d?.tipo ?? '').toLowerCase() === 'foto')
    .map((d) => ({
      id: d.id,
      sepultura_id: sepulturaId,
      url: String((d as any).url ?? d.ruta_archivo ?? d.url ?? ''),
      descripcion: d.descripcion,
      tomada_en: String((d as any).created_at ?? d.created_at ?? d.creado_en ?? ''),
    }));

  return fotos;
}

export async function eliminarFoto(fotoId: number): Promise<void> {
  // Todavía no hay endpoint de borrado: no-op (fase 1 pruebas).
  void fotoId;
}

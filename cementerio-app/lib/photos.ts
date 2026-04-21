import * as ImagePicker from 'expo-image-picker';
import { Alert, Platform } from 'react-native';
import { supabase } from './supabase';

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
    const filename = `sep_${sepulturaId}_${Date.now()}.jpg`;
    const path = `sepulturas/${sepulturaId}/${filename}`;

    const response = await fetch(localUri);
    const blob = await response.blob();

    const { error: uploadError } = await supabase.storage
      .from('fotos-cementerio')
      .upload(path, blob, { contentType: 'image/jpeg', upsert: false });

    if (uploadError) {
      return { ok: false, error: `Storage: ${uploadError.message}` };
    }

    const { data: urlData } = supabase.storage.from('fotos-cementerio').getPublicUrl(path);
    const url = urlData.publicUrl;

    // Preferente: documentos
    const docRes = await supabase
      .from('cemn_documentos')
      .insert({
        sepultura_id: sepulturaId,
        tipo: 'fotografia',
        nombre_original: filename,
        ruta_archivo: url,
        mime_type: 'image/jpeg',
        tamano_bytes: (blob as any)?.size ?? null,
        descripcion: descripcion ?? null,
      })
      .select('id, ruta_archivo, url')
      .single();

    if (!docRes.error && docRes.data) {
      const u = (docRes.data as any).ruta_archivo ?? (docRes.data as any).url ?? url;
      return { ok: true, url: u, documentoId: docRes.data.id };
    }

    // Fallback legacy: fotos
    const fotoRes = await supabase
      .from('cemn_fotos')
      .insert({ sepultura_id: sepulturaId, url, descripcion: descripcion ?? null })
      .select('id, url')
      .single();

    if (fotoRes.error || !fotoRes.data) {
      return { ok: false, error: `DB: ${(docRes.error?.message ?? '').trim()} ${(fotoRes.error?.message ?? '').trim()}`.trim() };
    }

    return { ok: true, url: fotoRes.data.url ?? url };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? String(e) };
  }
}

export async function obtenerFotos(sepulturaId: number): Promise<Foto[]> {
  // Preferente: `cemn_documentos` tipo=fotografia
  const docRes = await supabase
    .from('cemn_documentos')
    .select('*')
    .eq('sepultura_id', sepulturaId)
    .eq('tipo', 'fotografia')
    .order('created_at', { ascending: false });

  if (!docRes.error) {
    const docs = (docRes.data ?? []) as unknown as DocumentoFoto[];
    return docs.map((d) => ({
      id: d.id,
      sepultura_id: d.sepultura_id,
      url: String(d.ruta_archivo ?? d.url ?? ''),
      descripcion: d.descripcion,
      tomada_en: String(d.created_at ?? d.creado_en ?? ''),
    }));
  }

  // Fallback legacy: `cemn_fotos`
  const { data } = await supabase
    .from('cemn_fotos')
    .select('*')
    .eq('sepultura_id', sepulturaId)
    .order('tomada_en', { ascending: false });
  return (data ?? []) as Foto[];
}

export async function eliminarFoto(fotoId: number): Promise<void> {
  // Intentar borrar primero en documentos, luego en fotos legacy
  const d1 = await supabase.from('cemn_documentos').delete().eq('id', fotoId);
  if (!d1.error) return;
  await supabase.from('cemn_fotos').delete().eq('id', fotoId);
}

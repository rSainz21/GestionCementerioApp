import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { tomarFoto, elegirDeGaleria, subirDocumentoFoto } from '@/lib/photos';
import { patchSepulturaWithFoto } from '@/lib/auditoria-api';
import { supabase } from '@/lib/supabase';

export default function AnadirDocumentoFotoModal() {
  const { sepultura_id, numero } = useLocalSearchParams<{ sepultura_id?: string; numero?: string }>();
  const router = useRouter();
  const sepulturaId = Number(sepultura_id);

  const [descripcion, setDescripcion] = useState('');
  const [fotoUri, setFotoUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const capturar = async () => {
    const uri = await tomarFoto();
    if (uri) setFotoUri(uri);
  };
  const galeria = async () => {
    const uri = await elegirDeGaleria();
    if (uri) setFotoUri(uri);
  };

  const guardar = async () => {
    try {
      if (!Number.isFinite(sepulturaId) || sepulturaId <= 0) throw new Error('sepultura_id no válido.');
      if (!fotoUri) throw new Error('Primero añade una foto.');
      setSaving(true);
      const actorUid = (await supabase.auth.getUser()).data.user?.id ?? null;
      const res = await patchSepulturaWithFoto({
        sepulturaId,
        fotoLocalUri: fotoUri,
        guardarEnDocumentos: true,
        fotoDescripcion: descripcion.trim() ? descripcion.trim() : 'Evidencia',
        actorUid,
        source: 'app',
      });
      if (!res.ok) {
        // Fallback: si la Edge Function no está desplegada (404) o falla, intentamos subir desde el cliente.
        const msg = String(res.error ?? '');
        const m = msg.toLowerCase();
        const looksLikeMissingFn = m.includes('http 404') || m.includes(' 404') || m.includes('not found');
        // En web, si la función no existe o no está accesible, el navegador puede fallar en el preflight (CORS)
        // y fetch lanza "Failed to fetch" / "Network request failed" sin darnos el status.
        const looksLikeCorsOrNetwork =
          m.includes('cors') ||
          m.includes('failed to fetch') ||
          m.includes('network request failed') ||
          m.includes('err_failed');

        if (looksLikeMissingFn || looksLikeCorsOrNetwork) {
          const up = await subirDocumentoFoto(sepulturaId, fotoUri, descripcion.trim() ? descripcion.trim() : 'Evidencia');
          if (!up.ok) throw new Error(`Edge Function no disponible y fallback falló: ${up.error}`);
        } else {
          throw new Error(res.error);
        }
      }
      Alert.alert('Guardado', 'Documento/foto añadido.');
      router.back();
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={s.screen} contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
      <Text style={s.h1}>Añadir Documento/Foto</Text>
      <Text style={s.sub}>Sepultura {numero ? `N.º ${numero}` : `ID ${sepulturaId}`}</Text>

      <View style={s.card}>
        <Text style={s.label}>Descripción (opcional)</Text>
        <TextInput
          style={s.input}
          value={descripcion}
          onChangeText={setDescripcion}
          placeholder="Ej: Foto de lápida / certificado…"
          placeholderTextColor="#9CA3AF"
        />

        <View style={s.row}>
          <TouchableOpacity style={s.btn} onPress={capturar} activeOpacity={0.85}>
            <FontAwesome name="camera" size={18} color="#fff" />
            <Text style={s.btnT}>Cámara</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.btn, { backgroundColor: '#0F172A' }]} onPress={galeria} activeOpacity={0.85}>
            <FontAwesome name="image" size={18} color="#fff" />
            <Text style={s.btnT}>Galería</Text>
          </TouchableOpacity>
        </View>

        {fotoUri ? (
          <View style={s.okBox}>
            <FontAwesome name="check-circle" size={18} color="#16A34A" />
            <Text style={s.okT}>Foto lista para subir</Text>
          </View>
        ) : (
          <Text style={s.hint}>Añade una foto (cámara o galería) y guarda.</Text>
        )}
      </View>

      <View style={s.bottom}>
        <TouchableOpacity style={[s.bottomBtn, s.ghost]} onPress={() => router.back()} activeOpacity={0.85}>
          <Text style={s.ghostT}>Cancelar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.bottomBtn, s.primary, (saving || !fotoUri) && { opacity: 0.6 }]}
          onPress={guardar}
          disabled={saving || !fotoUri}
          activeOpacity={0.85}
        >
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryT}>Guardar</Text>}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F8FAFC' },
  h1: { fontSize: 20, fontWeight: '900', color: '#0F172A' },
  sub: { marginTop: 6, color: '#475569', fontWeight: '700' },
  card: { marginTop: 14, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#E5E7EB', gap: 10 },
  label: { marginTop: 6, fontSize: 12, fontWeight: '900', color: '#334155' },
  input: { marginTop: 8, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12, fontSize: 14, fontWeight: '700', color: '#111827', backgroundColor: '#FFF' },
  row: { flexDirection: 'row', gap: 10, marginTop: 12 },
  btn: { flex: 1, height: 52, borderRadius: 14, backgroundColor: '#15803D', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  btnT: { color: '#fff', fontWeight: '900' },
  okBox: { marginTop: 12, borderRadius: 14, padding: 12, backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#86EFAC', flexDirection: 'row', alignItems: 'center', gap: 10 },
  okT: { color: '#15803D', fontWeight: '900' },
  hint: { marginTop: 12, color: '#64748B', fontWeight: '700' },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 14, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E5E7EB', flexDirection: 'row', gap: 10 },
  bottomBtn: { flex: 1, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  ghost: { backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0' },
  ghostT: { color: '#0F172A', fontWeight: '900' },
  primary: { backgroundColor: '#16A34A' },
  primaryT: { color: '#fff', fontWeight: '900' },
});


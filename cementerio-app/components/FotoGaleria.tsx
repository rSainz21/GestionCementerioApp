import { useEffect, useState } from 'react';
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { type Foto, eliminarFoto, elegirDeGaleria, obtenerFotos, subirFoto, tomarFoto } from '@/lib/photos';

interface Props {
  sepulturaId: number;
  refreshToken?: number;
  pendingUris?: string[];
  showAdd?: boolean;
}

export function FotoGaleria({ sepulturaId, refreshToken, pendingUris, showAdd = false }: Props) {
  const [fotos, setFotos] = useState<Foto[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [failed, setFailed] = useState<Record<string, true>>({});

  useEffect(() => {
    setLoading(true);
    obtenerFotos(sepulturaId).then((f) => { setFotos(f); setLoading(false); });
  }, [sepulturaId, refreshToken]);

  const handleAddPhoto = () => {
    const options = ['Hacer foto', 'Elegir de galería', 'Cancelar'];
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: 2, title: 'Añadir foto' },
        (idx) => { if (idx === 0) doCamera(); if (idx === 1) doGallery(); }
      );
    } else {
      Alert.alert('Añadir foto', '', [
        { text: 'Hacer foto', onPress: doCamera },
        { text: 'Elegir de galería', onPress: doGallery },
        { text: 'Cancelar', style: 'cancel' },
      ]);
    }
  };

  const doCamera = async () => {
    const uri = await tomarFoto();
    if (uri) await upload(uri);
  };

  const doGallery = async () => {
    const uri = await elegirDeGaleria();
    if (uri) await upload(uri);
  };

  const upload = async (uri: string) => {
    setUploading(true);
    try {
      const foto = await subirFoto(sepulturaId, uri);
      if (foto) {
        const list = await obtenerFotos(sepulturaId);
        setFotos(list);
      }
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = (foto: Foto) => {
    Alert.alert('Eliminar foto', '¿Seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive',
        onPress: async () => {
          await eliminarFoto(foto.id);
          setFotos((prev) => prev.filter((f) => f.id !== foto.id));
        },
      },
    ]);
  };

  const heroUrl = fotos[0]?.url ?? null;
  const thumbSize = 104;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Fotos ({fotos.length})</Text>
        {showAdd ? (
          <TouchableOpacity style={[styles.addSmallBtn, uploading && { opacity: 0.6 }]} onPress={handleAddPhoto} disabled={uploading} activeOpacity={0.85}>
            {uploading ? <ActivityIndicator color="#16A34A" /> : <FontAwesome name="camera" size={18} color="#16A34A" />}
            <Text style={styles.addSmallText}>Añadir</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {heroUrl && !failed[heroUrl] ? (
        <TouchableOpacity style={styles.heroWrap} onPress={() => setPreview(heroUrl)} activeOpacity={0.9}>
          <Image source={{ uri: heroUrl }} style={styles.heroImg} onError={() => setFailed((p) => ({ ...p, [heroUrl]: true }))} />
          <View style={styles.heroOverlay}>
            <FontAwesome name="search-plus" size={16} color="#FFF" />
            <Text style={styles.heroOverlayT}>Ver grande</Text>
          </View>
        </TouchableOpacity>
      ) : (
        <View style={styles.emptyBox}>
          <FontAwesome name="picture-o" size={18} color="#64748B" />
          <Text style={styles.emptyT}>Sin fotos todavía.</Text>
          {!showAdd ? <Text style={styles.emptySub}>Añádelas desde “Nuevo suceso → Documento/foto”.</Text> : null}
        </View>
      )}

      <View style={{ marginTop: 10 }}>
        {loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color="#16A34A" />
            <Text style={styles.loadingT}>Cargando…</Text>
          </View>
        ) : (
          <FlatList
            data={[
              ...(pendingUris?.map((uri) => ({ kind: 'pending' as const, uri })) ?? []),
              ...fotos.map((f) => ({ kind: 'foto' as const, foto: f })),
            ]}
            keyExtractor={(it) => (it.kind === 'pending' ? `p_${it.uri}` : `f_${it.foto.id}`)}
            numColumns={3}
            scrollEnabled={false}
            columnWrapperStyle={{ gap: 10 }}
            contentContainerStyle={{ gap: 10 }}
            renderItem={({ item }) => {
              if (item.kind === 'pending') {
                return (
                  <View style={[styles.gridTile, { width: thumbSize, height: thumbSize }]}>
                    <Image source={{ uri: item.uri }} style={[styles.gridImg, { opacity: 0.9 }]} />
                    <View style={styles.pendingBadge}><Text style={styles.pendingText}>Pendiente</Text></View>
                  </View>
                );
              }

              const f = item.foto;
              const isBad = !!failed[f.url];
              return (
                <TouchableOpacity
                  style={[styles.gridTile, { width: thumbSize, height: thumbSize }]}
                  onPress={() => !isBad && setPreview(f.url)}
                  onLongPress={() => handleDelete(f)}
                  activeOpacity={0.9}
                >
                  {isBad ? (
                    <View style={styles.badImg}>
                      <FontAwesome name="exclamation-triangle" size={18} color="#B45309" />
                      <Text style={styles.badImgT}>No carga</Text>
                    </View>
                  ) : (
                    <Image source={{ uri: f.url }} style={styles.gridImg} onError={() => setFailed((p) => ({ ...p, [f.url]: true }))} />
                  )}
                </TouchableOpacity>
              );
            }}
          />
        )}
      </View>

      {/* Preview modal */}
      <Modal visible={!!preview} transparent animationType="fade" onRequestClose={() => setPreview(null)}>
        <View style={styles.modal}>
          <TouchableOpacity style={styles.modalClose} onPress={() => setPreview(null)}>
            <FontAwesome name="times" size={28} color="#FFF" />
          </TouchableOpacity>
          {preview && <Image source={{ uri: preview }} style={styles.modalImg} resizeMode="contain" />}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 4 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  title: { fontSize: 16, fontWeight: '700', color: '#1F2937' },
  addSmallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#86EFAC',
    paddingHorizontal: 12,
    height: 34,
    borderRadius: 999,
  },
  addSmallText: { color: '#15803D', fontWeight: '900', fontSize: 12 },
  heroWrap: {
    width: '100%',
    maxWidth: 260,
    alignSelf: 'flex-start',
    height: 140,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  heroImg: { width: '100%', height: '100%' },
  heroOverlay: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(15,23,42,0.72)',
    paddingHorizontal: 10,
    height: 30,
    borderRadius: 999,
  },
  heroOverlayT: { color: '#FFF', fontWeight: '900', fontSize: 12 },
  emptyBox: {
    width: '100%',
    minHeight: 110,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    gap: 8,
  },
  emptyT: { color: '#334155', fontWeight: '900' },
  emptySub: { color: '#64748B', fontWeight: '700', textAlign: 'center', lineHeight: 18 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  loadingT: { color: '#64748B', fontWeight: '800' },
  gridTile: { borderRadius: 12, overflow: 'hidden', backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0' },
  gridImg: { width: '100%', height: '100%' },
  badImg: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#FFFBEB' },
  badImgT: { fontWeight: '900', color: '#B45309', fontSize: 11 },
  pendingBadge: { position: 'absolute', left: 6, bottom: 6, backgroundColor: 'rgba(17,24,39,0.85)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  pendingText: { fontSize: 10, color: '#FFF', fontWeight: '800' },
  modal: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
  modalClose: { position: 'absolute', top: 60, right: 20, zIndex: 10, padding: 10 },
  modalImg: { width: '90%', height: '70%' },
});

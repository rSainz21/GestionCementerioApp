import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Semantic } from '@/components/ui';

const OSM_EDIT_URL = 'https://www.openstreetmap.org/edit#map=19/43.248717/-4.057732';

export default function OSMEditorWeb() {
  const router = useRouter();
  return (
    <View style={s.screen}>
      <View style={s.top}>
        <button style={s.btn as any} onClick={() => router.back()}>
          Cerrar
        </button>
      </View>
      <iframe title="OSM editor" src={OSM_EDIT_URL} style={s.iframe as any} />
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Semantic.screenBg },
  top: { padding: 12, backgroundColor: Semantic.screenBg, borderBottomWidth: 1, borderBottomColor: Semantic.border },
  // RN-web no soporta padding "10px 14px" ni "background" shorthand
  btn: {
    paddingTop: 10,
    paddingBottom: 10,
    paddingLeft: 14,
    paddingRight: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Semantic.border,
    backgroundColor: '#fff',
    fontWeight: 900,
  },
  iframe: { width: '100%', height: '100%', borderWidth: 0 },
});


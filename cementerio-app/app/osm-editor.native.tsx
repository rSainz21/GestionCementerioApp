import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as WebBrowser from 'expo-web-browser';
import { Semantic } from '@/components/ui';

const OSM_EDIT_URL = 'https://www.openstreetmap.org/edit#map=19/43.248717/-4.057732';

export default function OSMEditorNative() {
  const router = useRouter();
  return (
    <View style={s.screen}>
      <View style={s.top}>
        <TouchableOpacity style={s.closeBtn} onPress={() => router.back()} activeOpacity={0.9}>
          <FontAwesome name="times" size={18} color="#0F172A" />
          <Text style={s.closeBtnT}>Cerrar</Text>
        </TouchableOpacity>
      </View>
      <View style={s.body}>
        <Text style={s.h1}>OpenStreetMap (integrado)</Text>
        <Text style={s.p}>
          En móvil lo abrimos dentro de la app (Chrome Custom Tabs / Safari View) para evitar problemas de compatibilidad.
        </Text>
        <TouchableOpacity
          style={s.openBtn}
          onPress={() => WebBrowser.openBrowserAsync(OSM_EDIT_URL, { presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN })}
          activeOpacity={0.9}
        >
          <FontAwesome name="external-link" size={18} color="#0F172A" />
          <Text style={s.openBtnT}>Abrir editor OSM</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Semantic.screenBg },
  top: {
    paddingTop: 12,
    paddingHorizontal: 12,
    paddingBottom: 10,
    backgroundColor: Semantic.screenBg,
    borderBottomWidth: 1,
    borderBottomColor: Semantic.border,
  },
  closeBtn: {
    height: 44,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Semantic.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    alignSelf: 'flex-start',
  },
  closeBtnT: { fontWeight: '900', color: '#0F172A' },
  body: { flex: 1, padding: 16, gap: 12 },
  h1: { fontSize: 18, fontWeight: '900', color: Semantic.text },
  p: { fontSize: 14, fontWeight: '700', color: Semantic.subText, lineHeight: 20 },
  openBtn: {
    height: 54,
    borderRadius: 999,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255,230,0,0.98)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    alignSelf: 'flex-start',
  },
  openBtnT: { fontWeight: '900', color: '#0F172A', letterSpacing: 0.6 },
});


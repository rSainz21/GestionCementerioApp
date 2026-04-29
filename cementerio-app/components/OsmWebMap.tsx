import { StyleSheet, Text, View } from 'react-native';

type Props = {
  height: number;
  center: { latitude: number; longitude: number };
  label?: string;
  preset?: 'cerca' | 'medio' | 'amplio';
  markers?: {
    id: number;
    lat: number;
    lon: number;
    label: string;
    color?: string;
  }[];
  onPressMarker?: (id: number) => void;
  interactive?: boolean;
};

/** En nativo el mapa web no aplica; solo se usa desde `mapa.web.tsx` en web. */
export function OsmWebMap({ height, label }: Props) {
  return (
    <View style={[styles.box, { height }]}>
      <Text style={styles.text}>{label ?? 'Mapa solo disponible en web.'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  text: { color: '#666', padding: 12, textAlign: 'center' },
});

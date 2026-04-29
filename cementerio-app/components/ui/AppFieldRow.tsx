import { memo } from 'react';
import { StyleSheet, Text, View, ViewProps } from 'react-native';
import { Semantic } from './tokens';

export const AppFieldRow = memo(function AppFieldRow({
  label,
  value,
  style,
}: {
  label: string;
  value: string;
  style?: ViewProps['style'];
}) {
  return (
    <View style={[s.row, style]}>
      <Text style={s.l}>{label}</Text>
      <Text style={s.v}>{value}</Text>
    </View>
  );
});

const s = StyleSheet.create({
  row: { paddingVertical: 10, borderTopWidth: 1, borderTopColor: 'rgba(15,23,42,0.08)' },
  l: { color: 'rgba(15,23,42,0.55)', fontSize: 11, fontWeight: '800' },
  v: { color: Semantic.text, fontSize: 14, fontWeight: '900', marginTop: 4 },
});


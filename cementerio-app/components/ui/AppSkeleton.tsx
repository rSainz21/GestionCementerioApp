import { memo } from 'react';
import { DimensionValue, StyleSheet, View, ViewProps } from 'react-native';

export const AppSkeleton = memo(function AppSkeleton({
  h = 12,
  w = '100%',
  r = 10,
  style,
}: {
  h?: number;
  w?: DimensionValue;
  r?: number;
  style?: ViewProps['style'];
}) {
  return <View style={[s.base, { height: h, width: w, borderRadius: r }, style]} />;
});

const s = StyleSheet.create({
  base: { backgroundColor: 'rgba(15,23,42,0.08)' },
});


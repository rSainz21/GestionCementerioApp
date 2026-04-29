import { memo } from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';
import { Radius, Shadow } from './tokens';

function AppCardBase(props: ViewProps & { padded?: boolean }) {
  const { style, padded = true, ...rest } = props;
  return (
    <View
      {...rest}
      style={[
        s.base,
        padded && s.padded,
        style,
      ]}
    />
  );
}

export const AppCard = memo(AppCardBase);

const s = StyleSheet.create({
  base: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.10)',
    ...Shadow.card,
  },
  padded: { padding: 14 },
});


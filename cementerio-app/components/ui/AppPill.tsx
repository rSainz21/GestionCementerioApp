import { memo } from 'react';
import { StyleSheet, Text, TextStyle, TouchableOpacity, ViewStyle } from 'react-native';
import { Radius, Semantic, Type } from './tokens';

function AppPillBase(props: {
  label: string;
  active?: boolean;
  onPress?: () => void;
  style?: ViewStyle | TextStyle;
}) {
  const active = !!props.active;
  const pressable = typeof props.onPress === 'function';
  const Comp: any = pressable ? TouchableOpacity : Text;

  if (!pressable) {
    return (
      <Text style={[s.base, active && s.active, props.style as TextStyle | undefined, active && s.tActive]}>
        {props.label}
      </Text>
    );
  }

  return (
    <TouchableOpacity
      style={[s.base, active && s.active, props.style as ViewStyle | undefined]}
      onPress={props.onPress}
      activeOpacity={0.85}
    >
      <Text style={[s.t, active && s.tActive]} numberOfLines={1}>
        {props.label}
      </Text>
    </TouchableOpacity>
  );
}

export const AppPill = memo(AppPillBase);

const s = StyleSheet.create({
  base: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: Radius.pill,
    backgroundColor: Semantic.surface2,
    borderWidth: 1,
    borderColor: Semantic.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  active: { backgroundColor: Semantic.accent, borderColor: Semantic.accent },
  t: { ...Type.sub, color: 'rgba(15,23,42,0.75)', textTransform: 'capitalize' },
  tActive: { color: '#FFFFFF' },
});


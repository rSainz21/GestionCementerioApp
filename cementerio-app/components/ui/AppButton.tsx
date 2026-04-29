import { memo } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, ViewStyle } from 'react-native';
import { ButtonColors } from '@/constants/Colors';
import { Radius, Type } from './tokens';

type Variant = 'primary' | 'secondary' | 'ghost';

function AppButtonBase(props: {
  label: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const variant = props.variant ?? 'primary';
  const disabled = !!props.disabled || !!props.loading;

  return (
    <TouchableOpacity
      style={[
        s.base,
        variant === 'primary' && s.primary,
        variant === 'secondary' && s.secondary,
        variant === 'ghost' && s.ghost,
        disabled && { opacity: 0.6 },
        props.style,
      ]}
      onPress={props.onPress}
      activeOpacity={0.9}
      disabled={disabled}
    >
      {props.loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#fff' : ButtonColors.solidDark} />
      ) : (
        <Text style={[s.t, variant === 'primary' ? s.tOn : s.tOff]} numberOfLines={1}>
          {props.label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

export const AppButton = memo(AppButtonBase);

const s = StyleSheet.create({
  base: { height: 52, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14, borderWidth: 1 },
  primary: { backgroundColor: ButtonColors.solidDark, borderColor: ButtonColors.solidDark },
  secondary: { backgroundColor: ButtonColors.soft, borderColor: ButtonColors.softBorder },
  ghost: { backgroundColor: '#FFFFFF', borderColor: 'rgba(15,23,42,0.10)' },
  t: { ...Type.body, letterSpacing: 0.2 },
  tOn: { color: '#FFFFFF' },
  tOff: { color: 'rgba(15,23,42,0.80)' },
});


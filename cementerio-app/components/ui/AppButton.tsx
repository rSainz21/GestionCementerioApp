import { memo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import { ButtonColors } from '@/constants/Colors';
import { Radius, Semantic, Shadow, Type } from './tokens';

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
    <Pressable
      style={({ pressed }) => [
        s.base,
        variant === 'primary' && s.primary,
        variant === 'secondary' && s.secondary,
        variant === 'ghost' && s.ghost,
        (disabled || pressed) && { opacity: disabled ? 0.55 : 0.88 },
        props.style,
      ]}
      onPress={props.onPress}
      disabled={disabled}
    >
      {props.loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#fff' : Semantic.primary} />
      ) : (
        <Text style={[s.t, variant === 'primary' ? s.tOn : s.tOff]} numberOfLines={1}>
          {props.label}
        </Text>
      )}
    </Pressable>
  );
}

export const AppButton = memo(AppButtonBase);

const s = StyleSheet.create({
  base: {
    height: 52,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderWidth: 1,
  },
  primary: { backgroundColor: Semantic.primary, borderColor: Semantic.primary, ...Shadow.subtle },
  secondary: { backgroundColor: Semantic.primarySoft, borderColor: Semantic.primarySoftBorder },
  ghost: { backgroundColor: Semantic.surface, borderColor: Semantic.border },
  t: { ...Type.body, letterSpacing: 0.2 },
  tOn: { color: '#FFFFFF' },
  tOff: { color: 'rgba(15,23,42,0.80)' },
});


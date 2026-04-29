import { memo } from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { Radius, Type } from './tokens';

function AppInputBase(props: TextInputProps & { label?: string; hint?: string; error?: string }) {
  const { label, hint, error, style, ...rest } = props;
  return (
    <View style={{ gap: 8 }}>
      {label ? <Text style={s.label}>{label}</Text> : null}
      <TextInput
        {...rest}
        style={[s.input, error && s.inputError, style]}
        placeholderTextColor={props.placeholderTextColor ?? 'rgba(15,23,42,0.40)'}
      />
      {error ? <Text style={s.error}>{error}</Text> : hint ? <Text style={s.hint}>{hint}</Text> : null}
    </View>
  );
}

export const AppInput = memo(AppInputBase);

const s = StyleSheet.create({
  label: { ...Type.label, color: 'rgba(15,23,42,0.50)' },
  input: {
    height: 44,
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.10)',
    fontWeight: '800',
    color: '#0F172A',
  },
  inputError: { borderColor: 'rgba(185,28,28,0.45)' },
  hint: { ...Type.sub, color: 'rgba(15,23,42,0.45)' },
  error: { ...Type.sub, color: 'rgba(185,28,28,0.90)' },
});


import { memo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ViewProps } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Radius, Semantic, Space, Type } from './tokens';

export function AppTopBar({
  title,
  overline,
  onBack,
  right,
  style,
}: {
  title: string;
  overline?: string | null;
  onBack?: (() => void) | null;
  right?: React.ReactNode;
  style?: ViewProps['style'];
}) {
  return (
    <View style={[s.wrap, style]}>
      {onBack ? (
        <TouchableOpacity style={s.btn} onPress={onBack} activeOpacity={0.85}>
          <FontAwesome name="chevron-left" size={16} color="rgba(15,23,42,0.75)" />
        </TouchableOpacity>
      ) : (
        <View style={{ width: 40 }} />
      )}

      <View style={{ flex: 1, minWidth: 0 }}>
        {overline ? (
          <Text style={s.over} numberOfLines={1}>
            {overline}
          </Text>
        ) : null}
        <Text style={s.title} numberOfLines={1}>
          {title}
        </Text>
      </View>

      <View style={s.right}>{right}</View>
    </View>
  );
}

export const AppIconBtn = memo(function AppIconBtn({
  icon,
  onPress,
}: {
  icon: React.ComponentProps<typeof FontAwesome>['name'];
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={s.btn} onPress={onPress} activeOpacity={0.85}>
      <FontAwesome name={icon} size={16} color="rgba(15,23,42,0.75)" />
    </TouchableOpacity>
  );
});

const s = StyleSheet.create({
  wrap: {
    paddingTop: 14,
    paddingHorizontal: 12,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
    backgroundColor: Semantic.screenBg,
  },
  btn: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Semantic.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  right: { minWidth: 40, alignItems: 'flex-end' },
  over: { ...Type.label, color: 'rgba(15,23,42,0.35)' },
  title: { fontSize: 18, fontWeight: '900', color: Semantic.text },
});


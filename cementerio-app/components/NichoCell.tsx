import { memo, useRef } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colorParaEstadoSepulturaDb } from '@/lib/estado-sepultura';
import type { Sepultura } from '@/lib/types';

interface Props {
  sepultura: Sepultura | null;
  size: number;
  selected?: boolean;
  dimmed?: boolean;
  onPress?: (sepultura: Sepultura) => void;
  onDoublePress?: (sepultura: Sepultura) => void;
  onLongPress?: (sepultura: Sepultura) => void;
  onEmptyPress?: () => void;
}

function NichoCellBase({ sepultura, size, selected, dimmed, onPress, onDoublePress, onLongPress, onEmptyPress }: Props) {
  const bgColor = sepultura ? colorParaEstadoSepulturaDb(sepultura.estado) : '#E2E8F0';
  const isEmpty = !sepultura;
  const tipo = sepultura?.tipo ?? null;
  const lastTapRef = useRef<number>(0);

  return (
    <TouchableOpacity
      style={[
        styles.cell,
        {
          width: size,
          height: size,
          backgroundColor: bgColor,
          opacity: isEmpty ? 0.18 : dimmed ? 0.35 : 1,
          borderWidth: selected ? 3 : 1,
          borderColor: selected ? '#0F172A' : 'rgba(15,23,42,0.10)',
        },
      ]}
      onPress={() => {
        if (!sepultura) {
          onEmptyPress?.();
          return;
        }
        const now = Date.now();
        const delta = now - lastTapRef.current;
        lastTapRef.current = now;
        if (delta > 0 && delta < 280) {
          onDoublePress?.(sepultura);
        } else {
          onPress?.(sepultura);
        }
      }}
      onLongPress={() => sepultura && onLongPress?.(sepultura)}
      disabled={isEmpty && !onEmptyPress}
      activeOpacity={0.7}
      delayLongPress={400}
    >
      {sepultura && (
        <View style={styles.inner}>
          {tipo === 'columbario' && (
            <View style={styles.tipoBadge}>
              <Text style={styles.tipoText}>C</Text>
            </View>
          )}
          <Text style={[styles.number, { fontSize: size > 44 ? 12 : 9 }]} numberOfLines={1}>
            {sepultura.numero}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export const NichoCell = memo(NichoCellBase);

const styles = StyleSheet.create({
  cell: {
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 1.5,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.15, shadowRadius: 2, elevation: 2,
  },
  inner: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  tipoBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 6,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  tipoText: { color: '#FFFFFF', fontWeight: '900', fontSize: 9 },
  number: { color: '#FFFFFF', fontWeight: '700', textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
});

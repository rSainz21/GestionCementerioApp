import { useMemo } from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, View } from 'react-native';
import { NichoCell } from './NichoCell';
import { ESTADO_COLORS } from '@/constants/Colors';
import type { Sepultura } from '@/lib/types';
import { normalizarEstadoEditable } from '@/lib/estado-sepultura';

interface Props {
  sepulturas: Sepultura[];
  filas: number;
  columnas: number;
  selectedSepulturaId?: number | null;
  onNichoPress?: (sepultura: Sepultura) => void;
  onNichoDoublePress?: (sepultura: Sepultura) => void;
  onNichoLongPress?: (sepultura: Sepultura) => void;
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const LABEL_WIDTH = 32;
const PADDING = 12;
const GAP = 3;

function calculateCellSize(columnas: number): number {
  const available = SCREEN_WIDTH - LABEL_WIDTH - PADDING * 2;
  const maxVisible = Math.min(columnas, 8);
  const size = Math.floor((available - maxVisible * GAP) / maxVisible);
  return Math.max(44, Math.min(56, size));
}

export function NichoGrid({
  sepulturas,
  filas,
  columnas,
  selectedSepulturaId,
  onNichoPress,
  onNichoDoublePress,
  onNichoLongPress,
}: Props) {
  const cellSize = useMemo(() => calculateCellSize(columnas), [columnas]);

  const grid = useMemo(() => {
    const matrix: (Sepultura | null)[][] = Array.from({ length: filas }, () =>
      Array.from<Sepultura | null>({ length: columnas }).fill(null)
    );
    for (const s of sepulturas) {
      if (s.fila && s.columna && s.fila >= 1 && s.fila <= filas && s.columna >= 1 && s.columna <= columnas) {
        matrix[filas - s.fila][s.columna - 1] = s;
      }
    }
    return matrix;
  }, [sepulturas, filas, columnas]);

  const stats = useMemo(() => {
    let libre = 0;
    let ocupada = 0;
    for (const s of sepulturas) {
      if (normalizarEstadoEditable(s.estado) === 'libre') libre++;
      else ocupada++;
    }
    return { libre, ocupada };
  }, [sepulturas]);

  return (
    <View style={styles.container}>
      <View style={styles.legend}>
        {(Object.entries(ESTADO_COLORS) as [string, string][]).map(([key, color]) => (
          <View key={key} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: color }]} />
            <Text style={styles.legendLabel}>{key} ({stats[key as 'libre' | 'ocupada']})</Text>
          </View>
        ))}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={styles.scrollContent}>
        <View>
          <View style={styles.colHeaders}>
            <View style={{ width: LABEL_WIDTH }} />
            {Array.from({ length: columnas }, (_, c) => (
              <View key={c} style={[styles.colHeader, { width: cellSize + GAP }]}>
                <Text style={styles.headerText}>{c + 1}</Text>
              </View>
            ))}
          </View>

          {grid.map((row, rowIdx) => (
            <View key={rowIdx} style={styles.row}>
              <View style={[styles.rowLabel, { height: cellSize }]}>
                <Text style={styles.rowLabelText}>F{filas - rowIdx}</Text>
              </View>
              {row.map((cell, colIdx) => (
                <NichoCell
                  key={colIdx}
                  sepultura={cell}
                  size={cellSize}
                  selected={!!cell && selectedSepulturaId != null && cell.id === selectedSepulturaId}
                  onPress={onNichoPress}
                  onDoublePress={onNichoDoublePress}
                  onLongPress={onNichoLongPress}
                />
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: PADDING, paddingVertical: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 12, height: 12, borderRadius: 3 },
  legendLabel: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
  scrollContent: { paddingHorizontal: PADDING, paddingBottom: 20 },
  colHeaders: { flexDirection: 'row', marginBottom: 2 },
  colHeader: { alignItems: 'center', justifyContent: 'center' },
  headerText: { fontSize: 10, color: '#9CA3AF', fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowLabel: { width: LABEL_WIDTH, justifyContent: 'center', alignItems: 'center' },
  rowLabelText: { fontSize: 11, color: '#6B7280', fontWeight: '700' },
});

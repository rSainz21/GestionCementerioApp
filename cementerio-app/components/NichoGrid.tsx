import { useMemo, useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { NichoCell } from './NichoCell';
import { ESTADO_COLORS } from '@/constants/Colors';
import type { Sepultura } from '@/lib/types';
import { normalizarEstadoDb } from '@/lib/estado-sepultura';

interface Props {
  sepulturas: Sepultura[];
  filas: number;
  columnas: number;
  /**
   * Sentido de numeración del bloque (para que la cuadrícula tenga "sentido").
   * Formatos soportados (backend/creación web):
   * - fila_lr_tb | fila_rl_tb | fila_lr_bt | fila_rl_bt
   * - col_tb_lr | col_bt_lr | col_tb_rl | col_bt_rl
   *
   * Si no se pasa, se usa el comportamiento histórico: fila 1 abajo, columna 1 izquierda.
   */
  sentidoNumeracion?: string | null;
  selectedSepulturaId?: number | null;
  onNichoPress?: (sepultura: Sepultura) => void;
  onNichoDoublePress?: (sepultura: Sepultura) => void;
  onNichoLongPress?: (sepultura: Sepultura) => void;
  onEmptyPress?: (pos: { fila: number; columna: number }) => void;
  /**
   * Si es `true`, muestra barra de filtros/búsqueda encima de la rejilla.
   * Por defecto: `true` (mejora la vista en todas las pantallas).
   */
  showToolbar?: boolean;
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

function mapToGridIndex(opts: {
  fila: number;
  columna: number;
  filas: number;
  columnas: number;
  sentido?: string | null;
}) {
  const { fila, columna, filas, columnas } = opts;
  const s = String(opts.sentido ?? '').toLowerCase();

  // Defaults (histórico): fila 1 abajo, columna 1 izquierda
  let row = filas - fila; // 0 arriba
  let col = columna - 1; // 0 izquierda

  // Por filas
  if (s.startsWith('fila_')) {
    const leftToRight = s.includes('_lr_');
    const topToBottom = s.endsWith('_tb');
    // En nuestro grid, row=0 es arriba. Si el bloque "empieza arriba" => fila 1 arriba => row = fila-1
    row = topToBottom ? fila - 1 : filas - fila;
    col = leftToRight ? columna - 1 : columnas - columna;
    return { row, col };
  }

  // Por columnas (se interpreta como que el eje primario cambia, pero fila/col de la BD siguen existiendo).
  // Lo importante para UX es la orientación: dónde está el (fila=1,col=1) en pantalla.
  if (s.startsWith('col_')) {
    const topToBottom = s.includes('tb');
    const leftToRight = s.endsWith('_lr');
    row = topToBottom ? fila - 1 : filas - fila;
    col = leftToRight ? columna - 1 : columnas - columna;
    return { row, col };
  }

  return { row, col };
}

function gridIndexToFilaCol(opts: {
  row: number;
  col: number;
  filas: number;
  columnas: number;
  sentido?: string | null;
}) {
  const { row, col, filas, columnas } = opts;
  const s = String(opts.sentido ?? '').toLowerCase();

  // Defaults (histórico): fila 1 abajo, columna 1 izquierda
  let fila = filas - row;
  let columna = col + 1;

  if (s.startsWith('fila_')) {
    const leftToRight = s.includes('_lr_');
    const topToBottom = s.endsWith('_tb');
    fila = topToBottom ? row + 1 : filas - row;
    columna = leftToRight ? col + 1 : columnas - col;
    return { fila, columna };
  }

  if (s.startsWith('col_')) {
    const topToBottom = s.includes('tb');
    const leftToRight = s.endsWith('_lr');
    fila = topToBottom ? row + 1 : filas - row;
    columna = leftToRight ? col + 1 : columnas - col;
    return { fila, columna };
  }

  return { fila, columna };
}

export function NichoGrid({
  sepulturas,
  filas,
  columnas,
  sentidoNumeracion,
  selectedSepulturaId,
  onNichoPress,
  onNichoDoublePress,
  onNichoLongPress,
  onEmptyPress,
  showToolbar = true,
}: Props) {
  const cellSize = useMemo(() => calculateCellSize(columnas), [columnas]);
  const [filter, setFilter] = useState<'todos' | 'libre' | 'ocupada' | 'reservada' | 'clausurada'>('todos');
  const [q, setQ] = useState('');

  const grid = useMemo(() => {
    const matrix: (Sepultura | null)[][] = Array.from({ length: filas }, () =>
      Array.from<Sepultura | null>({ length: columnas }).fill(null)
    );
    for (const s of sepulturas) {
      if (s.fila && s.columna && s.fila >= 1 && s.fila <= filas && s.columna >= 1 && s.columna <= columnas) {
        const idx = mapToGridIndex({
          fila: Number(s.fila),
          columna: Number(s.columna),
          filas,
          columnas,
          sentido: sentidoNumeracion,
        });
        if (idx.row >= 0 && idx.row < filas && idx.col >= 0 && idx.col < columnas) {
          matrix[idx.row][idx.col] = s;
        }
      }
    }
    return matrix;
  }, [sepulturas, filas, columnas, sentidoNumeracion]);

  const stats = useMemo(() => {
    let libre = 0;
    let ocupada = 0;
    let reservada = 0;
    let clausurada = 0;
    for (const s of sepulturas) {
      const e = normalizarEstadoDb(s.estado);
      if (e === 'libre') libre++;
      else if (e === 'ocupada') ocupada++;
      else if (e === 'reservada') reservada++;
      else clausurada++;
    }
    return { libre, ocupada, reservada, clausurada };
  }, [sepulturas]);

  return (
    <View style={styles.container}>
      {showToolbar ? (
        <View style={styles.toolbar}>
          <View style={styles.legend}>
            {(Object.entries(ESTADO_COLORS) as [string, string][]).map(([key, color]) => (
              <View key={key} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: color }]} />
                <Text style={styles.legendLabel}>
                  {key} ({stats[key as 'libre' | 'ocupada']})
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.searchRow}>
            <TextInput
              value={q}
              onChangeText={setQ}
              placeholder="Filtrar por número/código…"
              placeholderTextColor="rgba(15,23,42,0.40)"
              style={styles.search}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <View style={styles.filterRow}>
              <TouchableOpacity style={[styles.fPill, filter === 'todos' && styles.fPillActive]} onPress={() => setFilter('todos')} activeOpacity={0.85}>
                <Text style={[styles.fPillT, filter === 'todos' && styles.fPillTActive]}>todos</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.fPill, filter === 'libre' && styles.fPillActive]} onPress={() => setFilter('libre')} activeOpacity={0.85}>
                <Text style={[styles.fPillT, filter === 'libre' && styles.fPillTActive]}>libres</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.fPill, filter === 'ocupada' && styles.fPillActive]} onPress={() => setFilter('ocupada')} activeOpacity={0.85}>
                <Text style={[styles.fPillT, filter === 'ocupada' && styles.fPillTActive]}>ocupadas</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.fPill, filter === 'reservada' && styles.fPillActive]} onPress={() => setFilter('reservada')} activeOpacity={0.85}>
                <Text style={[styles.fPillT, filter === 'reservada' && styles.fPillTActive]}>reservadas</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.fPill, filter === 'clausurada' && styles.fPillActive]} onPress={() => setFilter('clausurada')} activeOpacity={0.85}>
                <Text style={[styles.fPillT, filter === 'clausurada' && styles.fPillTActive]}>clausuradas</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ) : null}

      <ScrollView
        horizontal
        nestedScrollEnabled
        showsHorizontalScrollIndicator
        style={styles.hScroll}
        contentContainerStyle={styles.scrollContent}
      >
        <ScrollView nestedScrollEnabled showsVerticalScrollIndicator style={styles.vScroll} contentContainerStyle={styles.vScrollContent}>
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
                {row.map((cell, colIdx) => {
                  const isDimByFilter =
                    !!cell && filter !== 'todos' && normalizarEstadoDb(cell.estado) !== filter;
                  const isDimByQuery =
                    !!cell &&
                    q.trim() &&
                    !String(cell.numero ?? '').includes(q.trim()) &&
                    !String(cell.codigo ?? '').toLowerCase().includes(q.trim().toLowerCase());
                  const dimmed = Boolean(isDimByFilter || isDimByQuery);
                  return (
                    <NichoCell
                      key={colIdx}
                      sepultura={cell}
                      size={cellSize}
                      selected={!!cell && selectedSepulturaId != null && cell.id === selectedSepulturaId}
                      dimmed={dimmed}
                      onPress={onNichoPress}
                      onDoublePress={onNichoDoublePress}
                      onLongPress={onNichoLongPress}
                      onEmptyPress={
                        !cell && onEmptyPress
                          ? () => {
                              const pos = gridIndexToFilaCol({
                                row: rowIdx,
                                col: colIdx,
                                filas,
                                columnas,
                                sentido: sentidoNumeracion,
                              });
                              onEmptyPress(pos);
                            }
                          : undefined
                      }
                    />
                  );
                })}
              </View>
            ))}
          </View>
        </ScrollView>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  toolbar: { paddingHorizontal: PADDING, paddingTop: 10, paddingBottom: 10, gap: 10 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 12, height: 12, borderRadius: 3 },
  legendLabel: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  search: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.10)',
    fontWeight: '800',
    color: '#0F172A',
  },
  filterRow: { flexDirection: 'row', gap: 8 },
  fPill: { height: 36, paddingHorizontal: 12, borderRadius: 999, backgroundColor: 'rgba(15,23,42,0.06)', borderWidth: 1, borderColor: 'rgba(15,23,42,0.08)', alignItems: 'center', justifyContent: 'center' },
  fPillActive: { backgroundColor: '#0F172A', borderColor: '#0F172A' },
  fPillT: { fontSize: 12, fontWeight: '900', color: 'rgba(15,23,42,0.70)', textTransform: 'lowercase' },
  fPillTActive: { color: '#FFFFFF' },
  hScroll: { flex: 1 },
  vScroll: { flex: 1 },
  vScrollContent: { paddingBottom: 16 },
  scrollContent: { paddingHorizontal: PADDING, paddingBottom: 20 },
  colHeaders: { flexDirection: 'row', marginBottom: 2 },
  colHeader: { alignItems: 'center', justifyContent: 'center' },
  headerText: { fontSize: 10, color: '#9CA3AF', fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowLabel: { width: LABEL_WIDTH, justifyContent: 'center', alignItems: 'center' },
  rowLabelText: { fontSize: 11, color: '#6B7280', fontWeight: '700' },
});

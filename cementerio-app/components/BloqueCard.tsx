import { memo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ESTADO_COLORS } from '@/constants/Colors';
import type { Bloque, Sepultura } from '@/lib/types';
import { normalizarEstadoDb } from '@/lib/estado-sepultura';

interface Props {
  bloque: Bloque;
  sepulturas: Sepultura[];
}

function BloqueCardBase({ bloque, sepulturas }: Props) {
  const router = useRouter();

  let libre = 0;
  let ocupada = 0;
  let reservada = 0;
  let otras = 0;
  for (const s of sepulturas) {
    const e = normalizarEstadoDb(s.estado);
    if (e === 'libre') libre++;
    else if (e === 'ocupada') ocupada++;
    else if (e === 'reservada') reservada++;
    else if (e === 'clausurada' || e === 'mantenimiento') otras++;
  }
  const stats = { total: sepulturas.length, libre, ocupada, reservada, otras };

  const ocupacion = stats.total > 0 ? Math.max(0, Math.min(100, (100 * (stats.total - stats.libre)) / stats.total)) : 0;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/bloque/${bloque.id}`)}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <Text style={styles.title}>{bloque.codigo}</Text>
        <Text style={styles.dimensions}>
          {bloque.filas}F x {bloque.columnas}C
        </Text>
      </View>

      <View style={styles.barContainer}>
        {stats.ocupada > 0 ? (
          <View style={[styles.barSegment, { flex: stats.ocupada, backgroundColor: ESTADO_COLORS.ocupada }]} />
        ) : null}
        {stats.reservada > 0 ? (
          <View style={[styles.barSegment, { flex: stats.reservada, backgroundColor: ESTADO_COLORS.reservada }]} />
        ) : null}
        {stats.otras > 0 ? (
          <View style={[styles.barSegment, { flex: stats.otras, backgroundColor: ESTADO_COLORS.clausurada }]} />
        ) : null}
        {stats.libre > 0 ? (
          <View style={[styles.barSegment, { flex: stats.libre, backgroundColor: ESTADO_COLORS.libre }]} />
        ) : null}
      </View>

      <View style={styles.stats}>
        {stats.ocupada > 0 ? (
          <View style={styles.statItem}>
            <View style={[styles.dot, { backgroundColor: ESTADO_COLORS.ocupada }]} />
            <Text style={styles.statText}>{stats.ocupada}</Text>
          </View>
        ) : null}
        {stats.reservada > 0 ? (
          <View style={styles.statItem}>
            <View style={[styles.dot, { backgroundColor: ESTADO_COLORS.reservada }]} />
            <Text style={styles.statText}>{stats.reservada}</Text>
          </View>
        ) : null}
        {stats.otras > 0 ? (
          <View style={styles.statItem}>
            <View style={[styles.dot, { backgroundColor: ESTADO_COLORS.clausurada }]} />
            <Text style={styles.statText}>{stats.otras}</Text>
          </View>
        ) : null}
        {stats.libre > 0 ? (
          <View style={styles.statItem}>
            <View style={[styles.dot, { backgroundColor: ESTADO_COLORS.libre }]} />
            <Text style={styles.statText}>{stats.libre}</Text>
          </View>
        ) : null}
        {stats.total > 0 ? <Text style={styles.ocupacion}>{ocupacion.toFixed(0)}% no libre</Text> : null}
      </View>
    </TouchableOpacity>
  );
}

export const BloqueCard = memo(BloqueCardBase);

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#15803D',
  },
  dimensions: {
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  barContainer: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
    marginBottom: 10,
  },
  barSegment: {
    height: '100%',
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  ocupacion: {
    fontSize: 12,
    color: '#9CA3AF',
    marginLeft: 'auto',
    fontWeight: '600',
  },
});

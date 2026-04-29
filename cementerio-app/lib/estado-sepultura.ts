import { ESTADO_COLORS } from '@/constants/Colors';
import type { EstadoSepultura, EstadoSepulturaDb } from '@/lib/types';

/** Convierte cualquier valor de BD al estado editable en la app (solo libre / ocupada). */
export function normalizarEstadoEditable(estado: string | null | undefined): EstadoSepultura {
  const e = String(estado ?? '')
    .trim()
    .toLowerCase();
  if (e === 'libre') return 'libre';
  return 'ocupada';
}

/** Devuelve el estado real (BD) normalizado a los valores soportados. */
export function normalizarEstadoDb(estado: string | null | undefined): EstadoSepulturaDb {
  const e = String(estado ?? '')
    .trim()
    .toLowerCase();
  if (e === 'libre' || e === 'ocupada' || e === 'reservada' || e === 'clausurada') return e;
  return 'ocupada';
}

export function colorParaEstadoSepultura(estado: string | null | undefined): string {
  return normalizarEstadoEditable(estado) === 'libre' ? ESTADO_COLORS.libre : ESTADO_COLORS.ocupada;
}

/** Color por estado real (incluye reservada/clausurada si existen). */
export function colorParaEstadoSepulturaDb(estado: string | null | undefined): string {
  const e = normalizarEstadoDb(estado);
  return (ESTADO_COLORS as any)[e] ?? ESTADO_COLORS.ocupada;
}

export function etiquetaEstadoVisible(estado: string | null | undefined): string {
  return normalizarEstadoEditable(estado);
}

export function etiquetaEstadoVisibleDb(estado: string | null | undefined): string {
  return normalizarEstadoDb(estado);
}

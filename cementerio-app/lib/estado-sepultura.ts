import { ESTADO_COLORS } from '@/constants/Colors';
import type { EstadoSepultura } from '@/lib/types';

/** Convierte cualquier valor de BD al estado editable en la app (solo libre / ocupada). */
export function normalizarEstadoEditable(estado: string | null | undefined): EstadoSepultura {
  const e = String(estado ?? '')
    .trim()
    .toLowerCase();
  if (e === 'libre') return 'libre';
  return 'ocupada';
}

export function colorParaEstadoSepultura(estado: string | null | undefined): string {
  return normalizarEstadoEditable(estado) === 'libre' ? ESTADO_COLORS.libre : ESTADO_COLORS.ocupada;
}

export function etiquetaEstadoVisible(estado: string | null | undefined): string {
  return normalizarEstadoEditable(estado);
}

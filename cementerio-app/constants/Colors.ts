export const ESTADO_COLORS = {
  libre: '#22C55E',
  ocupada: '#EF4444',
  reservada: '#F59E0B',
  clausurada: '#64748B',
  mantenimiento: '#EF4444',
} as const;

/** Botones y acentos principales (verde) */
export const ButtonColors = {
  solid: '#16A34A',
  solidDark: '#15803D',
  solidDarker: '#166534',
  soft: '#DCFCE7',
  softBorder: '#86EFAC',
  onSolid: '#FFFFFF',
} as const;

const primary = ButtonColors.solidDark;
const accent = ButtonColors.solid;

export default {
  light: {
    text: '#1F2937',
    textSecondary: '#6B7280',
    background: '#F8FAFC',
    surface: '#FFFFFF',
    surfaceElevated: '#FFFFFF',
    tint: primary,
    accent,
    tabIconDefault: '#9CA3AF',
    tabIconSelected: primary,
    border: '#E5E7EB',
    success: ESTADO_COLORS.libre,
    danger: ESTADO_COLORS.ocupada,
    warning: '#F59E0B',
  },
  dark: {
    text: '#F9FAFB',
    textSecondary: '#9CA3AF',
    background: '#0F172A',
    surface: '#1E293B',
    surfaceElevated: '#334155',
    tint: '#4ADE80',
    accent: '#4ADE80',
    tabIconDefault: '#6B7280',
    tabIconSelected: '#4ADE80',
    border: '#374151',
    success: '#4ADE80',
    danger: '#F87171',
    warning: '#FBBF24',
  },
};

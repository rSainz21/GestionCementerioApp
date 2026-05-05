import Colors, { ButtonColors } from '@/constants/Colors';

export const Radius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 22,
  pill: 999,
} as const;

export const Space = {
  xxs: 4,
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  xxl: 32,
} as const;

export const Type = {
  h1: { fontSize: 22, fontWeight: '900' as const },
  h2: { fontSize: 14, fontWeight: '800' as const },
  label: { fontSize: 12, fontWeight: '900' as const, letterSpacing: 1.2 as number },
  body: { fontSize: 14, fontWeight: '800' as const },
  sub: { fontSize: 12, fontWeight: '800' as const },
  caption: { fontSize: 11, fontWeight: '700' as const },
  overline: { fontSize: 11, fontWeight: '900' as const, letterSpacing: 1.4 as number },
} as const;

export const Shadow = {
  card: {
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  elevated: {
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  subtle: {
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
} as const;

export const Semantic = {
  // Light defaults (dark mode se resuelve por `Colors`)
  screenBg: '#F3EFE6',
  surface: Colors.light.surface,
  surface2: 'rgba(15,23,42,0.03)',
  border: 'rgba(15,23,42,0.10)',
  borderStrong: 'rgba(15,23,42,0.18)',
  text: Colors.light.text,
  textSecondary: 'rgba(15,23,42,0.55)',
  subText: Colors.light.textSecondary,
  primary: ButtonColors.solidDark,
  primarySoft: ButtonColors.soft,
  primarySoftBorder: ButtonColors.softBorder,
  accent: '#2F3F35',
  danger: '#B91C1C',
  dangerSoft: 'rgba(185,28,28,0.08)',
  dangerSoftBorder: 'rgba(185,28,28,0.25)',
  success: '#166534',
  successSoft: 'rgba(34,197,94,0.14)',
  warning: '#92400E',
  warningSoft: 'rgba(245,158,11,0.18)',
  info: '#1E40AF',
  infoSoft: 'rgba(59,130,246,0.12)',
} as const;

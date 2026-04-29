import Colors, { ButtonColors } from '@/constants/Colors';

export const Radius = {
  sm: 10,
  md: 14,
  lg: 18,
  pill: 999,
} as const;

export const Space = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
} as const;

export const Type = {
  h1: { fontSize: 22, fontWeight: '900' as const },
  h2: { fontSize: 14, fontWeight: '800' as const },
  label: { fontSize: 12, fontWeight: '900' as const, letterSpacing: 1.2 as any },
  body: { fontSize: 14, fontWeight: '800' as const },
  sub: { fontSize: 12, fontWeight: '800' as const },
} as const;

export const Shadow = {
  card: {
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
} as const;

export const Semantic = {
  // Light defaults (dark mode se resuelve por `Colors`)
  screenBg: Colors.light.background,
  surface: Colors.light.surface,
  border: 'rgba(15,23,42,0.10)',
  text: Colors.light.text,
  subText: Colors.light.textSecondary,
  primary: ButtonColors.solidDark,
  primarySoft: ButtonColors.soft,
  primarySoftBorder: ButtonColors.softBorder,
} as const;


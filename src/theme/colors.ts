export const Colors = {
  // WikaPlay Brand Colors
  skyBlue: '#38BDF8',
  skyBlueLight: '#E0F2FE',
  skyBlueDark: '#0284C7',

  sunYellow: '#FBBF24',
  sunYellowDark: '#D97706',
  sunYellowLight: '#FEF3C7',

  grassGreen: '#22C55E',
  grassGreenDark: '#15803D',
  grassGreenLight: '#DCFCE7',

  coralPink: '#F43F5E',
  coralPinkDark: '#BE123C',
  coralPinkLight: '#FFE4E6',

  vibrantPurple: '#8B5CF6',
  vibrantPurpleDark: '#6D28D9',
  vibrantPurpleLight: '#EDE9FE',

  vibrantOrange: '#F97316',
  vibrantOrangeDark: '#C2410C',
  vibrantOrangeLight: '#FFEDD5',

  // UI Neutrals
  white: '#FFFFFF',
  cardBg: '#FFFFFF',
  background: '#F0F9FF',
  text: '#1E293B',
  textLight: '#64748B',
  textMuted: '#94A3B8',
  border: '#E2E8F0',
  whiteBorder: '#FFFFFF',

  // Feedback Colors
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',

  // Card Borders & Shadows
  cardBorder: 'rgba(255, 255, 255, 0.9)',
  shadowColor: '#0369A1',
};

export const Shadows = {
  soft: {
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  card: {
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
    elevation: 6,
  },
  button: {
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 4,
    elevation: 5,
  },
};

export const Typography = {
  sizes: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 22,
    xxl: 28,
    hero: 34,
  },
  weights: {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    heavy: '800' as const,
  },
};

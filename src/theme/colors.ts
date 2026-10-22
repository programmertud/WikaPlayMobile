export const Colors = {
  // WikaPlay Brand Colors - Sky Blue
  skyBlue: '#38BDF8',
  skyBlueLight: '#E0F2FE',
  skyBlueDark: '#0284C7',
  skyBlue50: '#F0F9FF',
  skyBlue100: '#E0F2FE',
  skyBlue500: '#38BDF8',
  skyBlue600: '#0284C7',

  // Sun Yellow
  sunYellow: '#FBBF24',
  sunYellowDark: '#D97706',
  sunYellowLight: '#FEF3C7',
  sunYellow50: '#FFFBEB',

  // Grass Green
  grassGreen: '#22C55E',
  grassGreenDark: '#15803D',
  grassGreenLight: '#DCFCE7',
  grassGreen50: '#F0FDF4',

  // Coral Pink
  coralPink: '#F43F5E',
  coralPinkDark: '#BE123C',
  coralPinkLight: '#FFE4E6',
  coralPink50: '#FFF1F2',

  // Vibrant Purple
  vibrantPurple: '#8B5CF6',
  vibrantPurpleDark: '#6D28D9',
  vibrantPurpleLight: '#EDE9FE',
  vibrantPurpleBg: '#F5F3FF',

  // Teacher Purple (integrated into palette)
  teacherPurple: '#7C3AED',
  teacherPurpleDark: '#6D28D9',
  teacherPurpleLight: '#EDE9FE',
  teacherPurpleBg: '#F5F3FF',
  teacherPurpleBorder: '#DDD6FE',

  // Vibrant Orange
  vibrantOrange: '#F97316',
  vibrantOrangeDark: '#C2410C',
  vibrantOrangeLight: '#FFEDD5',

  // UI Neutrals
  white: '#FFFFFF',
  cardBg: '#FFFFFF',
  background: '#F0F9FF',
  backgroundLight: '#F8FAFC',
  surface: '#FFFFFF',
  text: '#1E293B',
  textLight: '#64748B',
  textMuted: '#94A3B8',
  border: '#E2E8F0',
  whiteBorder: '#FFFFFF',
  hairline: 'rgba(0, 0, 0, 0.06)',
  cardBorder: 'rgba(255, 255, 255, 0.85)',
  shadowColor: '#0F172A',

  // Feedback Colors
  success: '#10B981',
  error: '#EF4444',
  coralRed: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',

  // Theme Compatibility (for useTheme)
  light: {
    text: '#1E293B',
    background: '#F0F9FF',
    backgroundElement: '#E0F2FE',
    backgroundSelected: '#BAE6FD',
    textSecondary: '#64748B',
  },
  dark: {
    text: '#F8FAFC',
    background: '#0F172A',
    backgroundElement: '#1E293B',
    backgroundSelected: '#334155',
    textSecondary: '#94A3B8',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

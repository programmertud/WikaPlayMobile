import { Platform } from 'react-native';

export const Fonts = {
  display: 'Baloo2_700Bold',
  displaySemiBold: 'Baloo2_600SemiBold',
  displayExtraBold: 'Baloo2_800ExtraBold',
  bold: 'Baloo2_700Bold',
  semiBold: 'Baloo2_600SemiBold',
  extraBold: 'Baloo2_800ExtraBold',
  medium: 'Baloo2_600SemiBold',
  regular: Platform.select({
    ios: 'System',
    android: 'sans-serif',
    web: 'system-ui, -apple-system, sans-serif',
    default: 'normal',
  }),
  body: Platform.select({
    ios: 'System',
    android: 'sans-serif',
    web: 'system-ui, -apple-system, sans-serif',
    default: 'normal',
  }),
  // For backwards compatibility
  sans: 'system-ui',
  serif: 'serif',
  rounded: 'Baloo2_700Bold',
  mono: 'monospace',
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
    display: 40,
  },
  weights: {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    heavy: '800' as const,
    black: '900' as const,
  },
  family: Fonts,
};

export const Spacing = {
  // Legacy spacing
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
  // Scale
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
} as const;

export const Radius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  xxl: 32,
  pill: 9999,
  round: 9999,
} as const;

export const Gradients = {
  sky: ['#38BDF8', '#0284C7'] as const,
  skyLight: ['#E0F2FE', '#BAE6FD'] as const,
  skySoft: ['#F0F9FF', '#E0F2FE'] as const,
  sun: ['#FBBF24', '#F59E0B'] as const,
  sunLight: ['#FEF3C7', '#FDE68A'] as const,
  grass: ['#22C55E', '#16A34A'] as const,
  grassLight: ['#DCFCE7', '#BBF7D0'] as const,
  coral: ['#F43F5E', '#E11D48'] as const,
  candy: ['#FB7185', '#F43F5E'] as const,
  candyLight: ['#FFE4E6', '#FECDD3'] as const,
  purple: ['#8B5CF6', '#7C3AED'] as const,
  purpleLight: ['#F5F3FF', '#EDE9FE'] as const,
  teacher: ['#8B5CF6', '#6D28D9'] as const,
  teacherSoft: ['#FAF5FF', '#F3E8FF'] as const,
  orange: ['#FB923C', '#EA580C'] as const,
  orangeLight: ['#FFEDD5', '#FED7AA'] as const,
  ocean: ['#06B6D4', '#0284C7'] as const,
  sunset: ['#F43F5E', '#FBBF24'] as const,
  cardGlass: ['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.85)'] as const,
  cardGlassSubtle: ['rgba(255, 255, 255, 0.85)', 'rgba(255, 255, 255, 0.65)'] as const,
  cardGlassDark: ['rgba(30, 41, 59, 0.9)', 'rgba(15, 23, 42, 0.85)'] as const,
  gold: ['#F59E0B', '#D97706'] as const,
  silver: ['#94A3B8', '#64748B'] as const,
  bronze: ['#D97706', '#92400E'] as const,
};

export const Shadows = {
  sm: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
  },
  lg: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.09,
    shadowRadius: 12,
    elevation: 4,
  },
  xl: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 7,
  },
  hairline: {
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  hairlineWhite: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  soft: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
  },
  card: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.09,
    shadowRadius: 12,
    elevation: 4,
  },
  button: {
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 4,
  },
  floating: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 7,
  },
  subtle: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  colored: (color: string, opacity = 0.25) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: opacity,
    shadowRadius: 8,
    elevation: 4,
  }),
};


export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;

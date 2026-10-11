export const colorTokens = {
  light: {
    background: '#FFFFFF',
    surface: '#F4F6F8',
    textPrimary: '#111827',
    textSecondary: '#6B7280',
    textInverse: '#FFFFFF',
    border: '#E5E7EB',
    accent: '#2563EB',
    accentMuted: '#DBEAFE',
    error: '#DC2626',
    warning: '#D97706',
    success: '#059669',
    skeleton: '#E5E7EB',
    offlineBanner: '#FEF3C7',
    offlineBannerText: '#92400E',
  },
  dark: {
    background: '#0B0F14',
    surface: '#151B23',
    textPrimary: '#F9FAFB',
    textSecondary: '#9CA3AF',
    textInverse: '#0B0F14',
    border: '#374151',
    accent: '#60A5FA',
    accentMuted: '#1E3A5F',
    error: '#F87171',
    warning: '#FBBF24',
    success: '#34D399',
    skeleton: '#374151',
    offlineBanner: '#422006',
    offlineBannerText: '#FDE68A',
  },
} as const;

export const spacingTokens = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const radiusTokens = {
  sm: 6,
  md: 10,
  lg: 16,
} as const;

export const borderTokens = {
  width: 1,
  widthStrong: 2,
} as const;

export const elevationTokens = {
  none: 0,
  low: 2,
} as const;

export const iconSizeTokens = {
  sm: 16,
  md: 20,
  lg: 24,
} as const;

export const touchTargetTokens = {
  min: 44,
} as const;

export const typographyTokens = {
  title: { fontSize: 24, lineHeight: 32, fontWeight: '700' as const },
  subtitle: { fontSize: 18, lineHeight: 26, fontWeight: '600' as const },
  body: { fontSize: 16, lineHeight: 22, fontWeight: '400' as const },
  bodyStrong: { fontSize: 16, lineHeight: 22, fontWeight: '600' as const },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '400' as const },
  label: { fontSize: 14, lineHeight: 20, fontWeight: '500' as const },
} as const;

export type ColorSchemeName = keyof typeof colorTokens;
export type AppColors = (typeof colorTokens)[ColorSchemeName];
export type TypographyVariant = keyof typeof typographyTokens;

export const colorTokens = {
  light: {
    background: '#FFFFFF',
    surface: '#F4F6F8',
    text: '#111827',
    textSecondary: '#6B7280',
    border: '#E5E7EB',
    primary: '#2563EB',
    danger: '#DC2626',
    success: '#059669',
  },
  dark: {
    background: '#0B0F14',
    surface: '#151B23',
    text: '#F9FAFB',
    textSecondary: '#9CA3AF',
    border: '#374151',
    primary: '#60A5FA',
    danger: '#F87171',
    success: '#34D399',
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

export const typographyTokens = {
  title: 24,
  body: 16,
  caption: 13,
} as const;

export type ColorSchemeName = keyof typeof colorTokens;

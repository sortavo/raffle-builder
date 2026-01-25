/**
 * Color palette for the Sortavo mobile app
 * Design tokens for consistent color usage across the application
 */

export const colors = {
  // Primary brand colors
  primary: '#6366F1',
  primaryLight: '#818CF8',
  primaryLighter: '#EEF2FF',

  // Background colors
  background: '#F9FAFB',
  surface: '#FFFFFF',
  surfaceSecondary: '#F3F4F6',

  // Text colors
  text: '#111827',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  textLight: '#374151',

  // Border colors
  border: '#E5E7EB',
  borderLight: '#F3F4F6',

  // Semantic colors
  error: '#EF4444',
  errorLight: '#FEE2E2',
  success: '#10B981',
  successLight: '#D1FAE5',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',

  // Common colors
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
} as const;

// Type for color keys
export type ColorKey = keyof typeof colors;

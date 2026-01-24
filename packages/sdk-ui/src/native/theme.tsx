// Theme system for SDK UI components
import React, { createContext, useContext, useMemo } from 'react';
import type { SortavoTheme } from '@sortavo/sdk';
import type { ThemeProviderProps } from '../types';

const defaultTheme: Required<SortavoTheme> = {
  colors: {
    primary: '#6366F1',
    secondary: '#8B5CF6',
    accent: '#F59E0B',
    background: '#FFFFFF',
    surface: '#F3F4F6',
    text: '#111827',
    textSecondary: '#6B7280',
    error: '#EF4444',
    success: '#10B981',
    warning: '#F59E0B',
  },
  fonts: {
    regular: 'System',
    medium: 'System',
    bold: 'System',
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
};

const ThemeContext = createContext<Required<SortavoTheme>>(defaultTheme);

export function ThemeProvider({ theme, children }: ThemeProviderProps) {
  const mergedTheme = useMemo<Required<SortavoTheme>>(
    () => ({
      colors: { ...defaultTheme.colors, ...theme?.colors },
      fonts: { ...defaultTheme.fonts, ...theme?.fonts },
      borderRadius: { ...defaultTheme.borderRadius, ...theme?.borderRadius },
      spacing: { ...defaultTheme.spacing, ...theme?.spacing },
    }),
    [theme]
  );

  return (
    <ThemeContext.Provider value={mergedTheme}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): Required<SortavoTheme> {
  return useContext(ThemeContext);
}

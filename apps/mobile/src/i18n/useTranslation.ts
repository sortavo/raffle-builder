// useTranslation hook
import { useContext, useCallback } from 'react';
import { TranslationContext } from './index';
import type { TranslationKeys } from './locales/es';

type NestedKeyOf<T> = T extends object
  ? {
      [K in keyof T]: K extends string
        ? T[K] extends object
          ? `${K}` | `${K}.${NestedKeyOf<T[K]>}`
          : `${K}`
        : never;
    }[keyof T]
  : never;

type TranslationKey = NestedKeyOf<TranslationKeys>;

type InterpolationParams = Record<string, string | number>;

/**
 * Hook to access translation functions and locale settings
 * @returns { t, locale, setLocale }
 */
export function useTranslation() {
  const context = useContext(TranslationContext);

  if (!context) {
    throw new Error('useTranslation must be used within a TranslationProvider');
  }

  const { translations, locale, setLocale } = context;

  /**
   * Get a translated string by key
   * @param key - Dot-notation key (e.g., 'profile.menu.editProfile')
   * @param params - Optional interpolation parameters
   * @returns Translated string
   */
  const t = useCallback(
    (key: TranslationKey | string, params?: InterpolationParams): string => {
      // Navigate through the nested object using the key path
      const keys = key.split('.');
      let value: unknown = translations;

      for (const k of keys) {
        if (value && typeof value === 'object' && k in value) {
          value = (value as Record<string, unknown>)[k];
        } else {
          // Key not found, return the key itself
          console.warn(`Translation key not found: ${key}`);
          return key;
        }
      }

      if (typeof value !== 'string') {
        console.warn(`Translation key does not resolve to a string: ${key}`);
        return key;
      }

      // Handle interpolation (e.g., "Hello {{name}}" with { name: "John" })
      if (params) {
        return value.replace(/\{\{(\w+)\}\}/g, (_, paramKey) => {
          const paramValue = params[paramKey];
          return paramValue !== undefined ? String(paramValue) : `{{${paramKey}}}`;
        });
      }

      return value;
    },
    [translations]
  );

  return {
    t,
    locale,
    setLocale,
  };
}

// i18n Setup - Translation Provider and Context
import React, { createContext, useState, useCallback, useMemo, type ReactNode } from 'react';
import { es, type TranslationKeys } from './locales/es';
import { en } from './locales/en';

export type Locale = 'es' | 'en';

// Cast es to TranslationKeys since it defines the structure
const translations: Record<Locale, TranslationKeys> = {
  es: es as TranslationKeys,
  en,
};

interface TranslationContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  translations: TranslationKeys;
}

export const TranslationContext = createContext<TranslationContextValue | null>(null);

interface TranslationProviderProps {
  children: ReactNode;
  defaultLocale?: Locale;
}

/**
 * TranslationProvider - Provides translation context to the app
 * Wraps the app and provides locale state and translation functions
 */
export function TranslationProvider({
  children,
  defaultLocale = 'es',
}: TranslationProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);

  const setLocale = useCallback((newLocale: Locale) => {
    if (translations[newLocale]) {
      setLocaleState(newLocale);
    } else {
      console.warn(`Locale '${newLocale}' is not supported. Available locales: ${Object.keys(translations).join(', ')}`);
    }
  }, []);

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      translations: translations[locale],
    }),
    [locale, setLocale]
  );

  return React.createElement(
    TranslationContext.Provider,
    { value },
    children
  );
}

// Re-export the hook
export { useTranslation } from './useTranslation';

// Export types
export type { TranslationKeys };

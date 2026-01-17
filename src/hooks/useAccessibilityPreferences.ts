import { useEffect, useState } from 'react';

interface AccessibilityPreferences {
  /** User prefers reduced motion (animations/transitions) */
  prefersReducedMotion: boolean;
  /** User prefers high contrast colors */
  prefersHighContrast: boolean;
  /** User prefers dark color scheme */
  prefersDarkMode: boolean;
}

/**
 * Hook to detect user's accessibility preferences from OS/browser settings.
 * Useful for conditionally disabling animations or adjusting contrast.
 */
export function useAccessibilityPreferences(): AccessibilityPreferences {
  const [preferences, setPreferences] = useState<AccessibilityPreferences>(() => {
    // SSR-safe initial values
    if (typeof window === 'undefined') {
      return {
        prefersReducedMotion: false,
        prefersHighContrast: false,
        prefersDarkMode: false,
      };
    }
    
    return {
      prefersReducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      prefersHighContrast: window.matchMedia('(prefers-contrast: high)').matches,
      prefersDarkMode: window.matchMedia('(prefers-color-scheme: dark)').matches,
    };
  });

  useEffect(() => {
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const contrastQuery = window.matchMedia('(prefers-contrast: high)');
    const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const updatePreferences = () => {
      setPreferences({
        prefersReducedMotion: motionQuery.matches,
        prefersHighContrast: contrastQuery.matches,
        prefersDarkMode: darkQuery.matches,
      });
    };

    // Listen for changes
    motionQuery.addEventListener('change', updatePreferences);
    contrastQuery.addEventListener('change', updatePreferences);
    darkQuery.addEventListener('change', updatePreferences);

    return () => {
      motionQuery.removeEventListener('change', updatePreferences);
      contrastQuery.removeEventListener('change', updatePreferences);
      darkQuery.removeEventListener('change', updatePreferences);
    };
  }, []);

  return preferences;
}

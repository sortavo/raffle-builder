import { useEffect } from 'react';

/**
 * Activates dark mode on the document root when the component mounts,
 * and restores the previous state when unmounting.
 * This ensures all Shadcn/design-system tokens use dark mode values.
 */
export function useScopedDarkMode() {
  useEffect(() => {
    const root = document.documentElement;
    const previouslyHadDark = root.classList.contains('dark');
    
    // Activate dark mode
    root.classList.add('dark');
    
    return () => {
      // Restore previous state on unmount
      if (!previouslyHadDark) {
        root.classList.remove('dark');
      }
    };
  }, []);
}

import { useEffect, useCallback } from 'react';

interface ShortcutOptions {
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
}

export function useKeyboardShortcut(
  key: string,
  callback: () => void,
  options?: ShortcutOptions
) {
  const handler = useCallback((e: KeyboardEvent) => {
    // Don't trigger shortcuts when typing in input fields
    const target = e.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    ) {
      return;
    }

    if (
      e.key.toLowerCase() === key.toLowerCase() &&
      (!options?.ctrl || e.ctrlKey || e.metaKey) &&
      (!options?.shift || e.shiftKey) &&
      (!options?.alt || e.altKey)
    ) {
      e.preventDefault();
      callback();
    }
  }, [key, callback, options]);

  useEffect(() => {
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handler]);
}

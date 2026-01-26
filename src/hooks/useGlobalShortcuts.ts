import { useEffect, useCallback } from 'react';

interface GlobalShortcutConfig {
  onSave?: () => void;
  onEscape?: () => void;
  onSearch?: () => void;
  disabled?: boolean;
}

/**
 * Global keyboard shortcuts hook
 * - Cmd/Ctrl + S: Save
 * - Escape: Close modals/dialogs
 * - Cmd/Ctrl + K: Open search
 */
export function useGlobalShortcuts({
  onSave,
  onEscape,
  onSearch,
  disabled = false,
}: GlobalShortcutConfig) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (disabled) return;

      // Cmd/Ctrl + S: Save
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        onSave?.();
        return;
      }

      // Cmd/Ctrl + K: Search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onSearch?.();
        return;
      }

      // Escape: Close
      if (e.key === 'Escape') {
        // Don't prevent default for escape - let dialogs handle it
        onEscape?.();
        return;
      }
    },
    [onSave, onEscape, onSearch, disabled]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

/**
 * Hook for form-specific shortcuts
 * Allows Cmd+S to work even in input fields
 */
export function useFormShortcuts({
  onSave,
  disabled = false,
}: {
  onSave: () => void;
  disabled?: boolean;
}) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (disabled) return;

      // Cmd/Ctrl + S: Save (works in inputs)
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        onSave();
      }
    },
    [onSave, disabled]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

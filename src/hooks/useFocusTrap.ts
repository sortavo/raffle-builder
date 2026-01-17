import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTORS = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

/**
 * Traps focus within a container element.
 * Essential for modal dialogs to meet WCAG 2.4.3 Focus Order.
 */
export function useFocusTrap<T extends HTMLElement = HTMLDivElement>(
  isActive: boolean = true
) {
  const containerRef = useRef<T>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    // Store previously focused element
    previousActiveElement.current = document.activeElement as HTMLElement;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll<HTMLElement>(
      FOCUSABLE_SELECTORS
    );

    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Focus first element
    firstElement?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      // Get fresh list of focusable elements (DOM might have changed)
      const currentFocusable = container.querySelectorAll<HTMLElement>(
        FOCUSABLE_SELECTORS
      );
      const first = currentFocusable[0];
      const last = currentFocusable[currentFocusable.length - 1];

      if (e.shiftKey) {
        // Shift + Tab: if on first element, go to last
        if (document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
      } else {
        // Tab: if on last element, go to first
        if (document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
      // Restore focus to previous element
      previousActiveElement.current?.focus();
    };
  }, [isActive]);

  return containerRef;
}

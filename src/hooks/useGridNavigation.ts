import { useCallback, useState } from 'react';

interface UseGridNavigationOptions {
  columns: number;
  totalItems: number;
  onSelect?: (index: number) => void;
  /** Whether navigation wraps around edges */
  wrap?: boolean;
}

interface GridItemProps {
  tabIndex: number;
  'aria-selected': boolean;
  onFocus: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
}

/**
 * Keyboard navigation for grid layouts.
 * Supports arrow keys, Home, End, Page Up/Down.
 * WCAG 2.1.1: Keyboard
 */
export function useGridNavigation({
  columns,
  totalItems,
  onSelect,
  wrap = false,
}: UseGridNavigationOptions) {
  const [focusedIndex, setFocusedIndex] = useState(0);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      let newIndex = focusedIndex;
      const currentRow = Math.floor(focusedIndex / columns);
      const rowStart = currentRow * columns;
      const rowEnd = Math.min(rowStart + columns - 1, totalItems - 1);

      switch (e.key) {
        case 'ArrowRight':
          if (focusedIndex < totalItems - 1) {
            newIndex = focusedIndex + 1;
          } else if (wrap) {
            newIndex = 0;
          }
          break;

        case 'ArrowLeft':
          if (focusedIndex > 0) {
            newIndex = focusedIndex - 1;
          } else if (wrap) {
            newIndex = totalItems - 1;
          }
          break;

        case 'ArrowDown':
          if (focusedIndex + columns < totalItems) {
            newIndex = focusedIndex + columns;
          } else if (wrap) {
            // Go to same column in first row
            newIndex = focusedIndex % columns;
          }
          break;

        case 'ArrowUp':
          if (focusedIndex - columns >= 0) {
            newIndex = focusedIndex - columns;
          } else if (wrap) {
            // Go to same column in last row
            const lastRowStart = Math.floor((totalItems - 1) / columns) * columns;
            newIndex = Math.min(lastRowStart + (focusedIndex % columns), totalItems - 1);
          }
          break;

        case 'Home':
          if (e.ctrlKey) {
            // Ctrl+Home: go to first item in grid
            newIndex = 0;
          } else {
            // Home: go to first item in current row
            newIndex = rowStart;
          }
          break;

        case 'End':
          if (e.ctrlKey) {
            // Ctrl+End: go to last item in grid
            newIndex = totalItems - 1;
          } else {
            // End: go to last item in current row
            newIndex = rowEnd;
          }
          break;

        case 'PageUp':
          // Move up 5 rows
          newIndex = Math.max(focusedIndex - columns * 5, 0);
          break;

        case 'PageDown':
          // Move down 5 rows
          newIndex = Math.min(focusedIndex + columns * 5, totalItems - 1);
          break;

        case 'Enter':
        case ' ':
          e.preventDefault();
          onSelect?.(focusedIndex);
          return;

        default:
          return; // Don't prevent default for other keys
      }

      if (newIndex !== focusedIndex) {
        e.preventDefault();
        setFocusedIndex(newIndex);
      }
    },
    [focusedIndex, columns, totalItems, onSelect, wrap]
  );

  const getItemProps = useCallback(
    (index: number): GridItemProps => ({
      tabIndex: index === focusedIndex ? 0 : -1,
      'aria-selected': index === focusedIndex,
      onFocus: () => setFocusedIndex(index),
      onKeyDown: handleKeyDown,
    }),
    [focusedIndex, handleKeyDown]
  );

  return {
    focusedIndex,
    setFocusedIndex,
    handleKeyDown,
    getItemProps,
  };
}

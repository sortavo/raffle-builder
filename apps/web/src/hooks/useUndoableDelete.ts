import { useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';

interface UndoableDeleteOptions<T> {
  /** Function to execute the actual delete */
  onDelete: (item: T) => Promise<void>;
  /** Function to get display text for the toast */
  getDeleteMessage: (item: T) => string;
  /** Delay before executing the delete (default: 5000ms) */
  delay?: number;
}

/**
 * Hook for undoable delete operations
 * Shows a toast with undo button for 5 seconds before executing delete
 */
export function useUndoableDelete<T extends { id: string }>({
  onDelete,
  getDeleteMessage,
  delay = 5000,
}: UndoableDeleteOptions<T>) {
  const [pendingDeletes, setPendingDeletes] = useState<Map<string, T>>(new Map());
  const timeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const scheduleDelete = useCallback((item: T) => {
    const id = item.id;
    
    // Add to pending
    setPendingDeletes(prev => {
      const next = new Map(prev);
      next.set(id, item);
      return next;
    });

    // Show toast with undo button
    const toastId = toast.loading(getDeleteMessage(item), {
      duration: delay,
      action: {
        label: 'Deshacer',
        onClick: () => {
          // Cancel the delete
          const timeout = timeoutsRef.current.get(id);
          if (timeout) {
            clearTimeout(timeout);
            timeoutsRef.current.delete(id);
          }
          setPendingDeletes(prev => {
            const next = new Map(prev);
            next.delete(id);
            return next;
          });
          toast.success('Eliminación cancelada');
        },
      },
    });

    // Schedule actual delete
    const timeout = setTimeout(async () => {
      try {
        await onDelete(item);
        toast.success('Eliminado correctamente', { id: toastId });
      } catch (error) {
        toast.error('Error al eliminar', { id: toastId });
      } finally {
        setPendingDeletes(prev => {
          const next = new Map(prev);
          next.delete(id);
          return next;
        });
        timeoutsRef.current.delete(id);
      }
    }, delay);

    timeoutsRef.current.set(id, timeout);

    return () => {
      clearTimeout(timeout);
      timeoutsRef.current.delete(id);
    };
  }, [onDelete, getDeleteMessage, delay]);

  const cancelDelete = useCallback((id: string) => {
    const timeout = timeoutsRef.current.get(id);
    if (timeout) {
      clearTimeout(timeout);
      timeoutsRef.current.delete(id);
    }
    setPendingDeletes(prev => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const isPending = useCallback((id: string) => {
    return pendingDeletes.has(id);
  }, [pendingDeletes]);

  return {
    scheduleDelete,
    cancelDelete,
    isPending,
    pendingCount: pendingDeletes.size,
  };
}

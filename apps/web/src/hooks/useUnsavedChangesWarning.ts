import { useEffect, useCallback, useRef, useState, useContext } from 'react';
import { UNSAFE_NavigationContext, useLocation } from 'react-router-dom';

interface UseUnsavedChangesWarningOptions {
  isDirty: boolean;
  enabled?: boolean;
  message?: string;
}

interface UseUnsavedChangesWarningReturn {
  showDialog: boolean;
  confirmNavigation: () => void;
  cancelNavigation: () => void;
}

type BlockerTx = {
  location: { pathname: string };
  retry: () => void;
};

function useBrowserRouterBlocker(params: {
  when: boolean;
  currentPathname: string;
  onBlocked: (tx: BlockerTx) => void;
}) {
  const { when, currentPathname, onBlocked } = params;
  const navigationContext = useContext(UNSAFE_NavigationContext) as any;

  useEffect(() => {
    if (!when) return;

    const navigator = navigationContext?.navigator;
    const block = navigator?.block as undefined | ((cb: (tx: any) => void) => () => void);

    // If the router doesn't support blocking, we simply skip (and rely on beforeunload).
    if (typeof block !== 'function') return;

    const unblock = block((tx: any) => {
      // Ignore same-path navigation
      if (tx?.location?.pathname === currentPathname) {
        tx.retry?.();
        return;
      }

      const wrappedTx: BlockerTx = {
        location: { pathname: tx?.location?.pathname ?? '' },
        retry: () => {
          unblock();
          tx.retry?.();
        },
      };

      onBlocked(wrappedTx);
    });

    return unblock;
  }, [when, currentPathname, onBlocked, navigationContext]);
}

export function useUnsavedChangesWarning(
  options: UseUnsavedChangesWarningOptions
): UseUnsavedChangesWarningReturn {
  const {
    isDirty,
    enabled = true,
    message = 'Tienes cambios sin guardar. ¿Estás seguro de que quieres salir?',
  } = options;

  const location = useLocation();
  const shouldBlock = enabled && isDirty;

  const [showDialog, setShowDialog] = useState(false);
  const pendingTxRef = useRef<BlockerTx | null>(null);

  const handleBlocked = useCallback((tx: BlockerTx) => {
    pendingTxRef.current = tx;
    setShowDialog(true);
  }, []);

  // Block in-app navigation (works with BrowserRouter)
  useBrowserRouterBlocker({
    when: shouldBlock,
    currentPathname: location.pathname,
    onBlocked: handleBlocked,
  });

  // Handle browser refresh/close
  useEffect(() => {
    if (!shouldBlock) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = message;
      return message;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [shouldBlock, message]);

  // Auto-close dialog if form becomes clean
  useEffect(() => {
    if (!shouldBlock && showDialog) {
      pendingTxRef.current = null;
      setShowDialog(false);
    }
  }, [shouldBlock, showDialog]);

  const confirmNavigation = useCallback(() => {
    const tx = pendingTxRef.current;
    pendingTxRef.current = null;
    setShowDialog(false);
    tx?.retry();
  }, []);

  const cancelNavigation = useCallback(() => {
    pendingTxRef.current = null;
    setShowDialog(false);
  }, []);

  return {
    showDialog,
    confirmNavigation,
    cancelNavigation,
  };
}


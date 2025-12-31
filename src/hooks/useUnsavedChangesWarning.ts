import { useEffect, useCallback, useState } from 'react';
import { useBlocker } from 'react-router-dom';

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

export function useUnsavedChangesWarning(
  options: UseUnsavedChangesWarningOptions
): UseUnsavedChangesWarningReturn {
  const { isDirty, enabled = true, message = 'Tienes cambios sin guardar. ¿Estás seguro de que quieres salir?' } = options;
  const [showDialog, setShowDialog] = useState(false);

  const shouldBlock = enabled && isDirty;

  // Block navigation with react-router
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      shouldBlock && currentLocation.pathname !== nextLocation.pathname
  );

  // Handle browser beforeunload
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

  // Sync blocker state with dialog
  useEffect(() => {
    if (blocker.state === 'blocked') {
      setShowDialog(true);
    } else {
      setShowDialog(false);
    }
  }, [blocker.state]);

  const confirmNavigation = useCallback(() => {
    if (blocker.state === 'blocked') {
      blocker.proceed();
    }
    setShowDialog(false);
  }, [blocker]);

  const cancelNavigation = useCallback(() => {
    if (blocker.state === 'blocked') {
      blocker.reset();
    }
    setShowDialog(false);
  }, [blocker]);

  return {
    showDialog,
    confirmNavigation,
    cancelNavigation,
  };
}

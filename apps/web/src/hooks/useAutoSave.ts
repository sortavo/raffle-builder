import { useEffect, useRef, useState, useCallback } from 'react';
import { UseFormReturn } from 'react-hook-form';

interface AutoSaveOptions {
  key: string;
  interval?: number; // in milliseconds
  enabled?: boolean;
}

interface AutoSaveReturn {
  lastSaved: Date | null;
  isSaving: boolean;
  hasDraft: boolean;
  clearDraft: () => void;
  saveDraft: () => void;
}

export function useAutoSave<T extends Record<string, any>>(
  form: UseFormReturn<T>,
  options: AutoSaveOptions
): AutoSaveReturn {
  const { key, interval = 30000, enabled = true } = options;
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const previousValuesRef = useRef<string>('');
  const timeoutRef = useRef<NodeJS.Timeout>();

  const storageKey = `raffle_draft_${key}`;

  // Check for existing draft on mount
  useEffect(() => {
    if (!enabled) return;
    
    try {
      const savedDraft = localStorage.getItem(storageKey);
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft);
        if (parsed.data && parsed.timestamp) {
          // Check if draft is less than 7 days old
          const draftAge = Date.now() - parsed.timestamp;
          const sevenDays = 7 * 24 * 60 * 60 * 1000;
          if (draftAge < sevenDays) {
            setHasDraft(true);
            // Restore the draft
            form.reset(parsed.data);
            setLastSaved(new Date(parsed.timestamp));
          } else {
            // Clear old draft
            localStorage.removeItem(storageKey);
          }
        }
      }
    } catch (e) {
      console.error('Error loading draft:', e);
    }
  }, [storageKey, enabled]);

  const saveDraft = useCallback(() => {
    if (!enabled) return;
    
    const currentValues = form.getValues();
    const serialized = JSON.stringify(currentValues);
    
    // Only save if values have changed
    if (serialized !== previousValuesRef.current) {
      setIsSaving(true);
      try {
        const draftData = {
          data: currentValues,
          timestamp: Date.now(),
        };
        localStorage.setItem(storageKey, JSON.stringify(draftData));
        previousValuesRef.current = serialized;
        setLastSaved(new Date());
        setHasDraft(true);
      } catch (e) {
        console.error('Error saving draft:', e);
      }
      setIsSaving(false);
    }
  }, [form, storageKey, enabled]);

  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
      setHasDraft(false);
      setLastSaved(null);
      previousValuesRef.current = '';
    } catch (e) {
      console.error('Error clearing draft:', e);
    }
  }, [storageKey]);

  // Auto-save on interval
  useEffect(() => {
    if (!enabled) return;

    const save = () => {
      saveDraft();
    };

    // Initial save after 5 seconds
    timeoutRef.current = setTimeout(save, 5000);
    
    // Interval save
    const intervalId = setInterval(save, interval);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      clearInterval(intervalId);
    };
  }, [interval, enabled, saveDraft]);

  // Save on blur/visibility change
  useEffect(() => {
    if (!enabled) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        saveDraft();
      }
    };

    const handleBeforeUnload = () => {
      saveDraft();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [enabled, saveDraft]);

  return {
    lastSaved,
    isSaving,
    hasDraft,
    clearDraft,
    saveDraft,
  };
}

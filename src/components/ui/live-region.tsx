import { useState, useCallback } from 'react';

interface LiveRegionProps {
  /** 'polite' waits for user to be idle, 'assertive' interrupts immediately */
  politeness?: 'polite' | 'assertive';
  /** The message to announce */
  message?: string;
}

/**
 * Announces dynamic content changes to screen readers.
 * Use for notifications, loading states, and real-time updates.
 * WCAG 4.1.3: Status Messages
 */
export function LiveRegion({ politeness = 'polite', message = '' }: LiveRegionProps) {
  return (
    <div
      role="status"
      aria-live={politeness}
      aria-atomic="true"
      className="sr-only"
    >
      {message}
    </div>
  );
}

/**
 * Hook to announce messages to screen readers.
 * Returns announce function and a component to render.
 */
export function useAnnounce() {
  const [message, setMessage] = useState('');
  const [politeness, setPoliteness] = useState<'polite' | 'assertive'>('polite');
  const [key, setKey] = useState(0);

  const announce = useCallback((text: string, priority: 'polite' | 'assertive' = 'polite') => {
    // Clear and re-set to ensure announcement even if same message
    setMessage('');
    setPoliteness(priority);
    
    // Use setTimeout to ensure the DOM update triggers screen reader
    setTimeout(() => {
      setMessage(text);
      setKey(k => k + 1);
    }, 100);
  }, []);

  const clear = useCallback(() => {
    setMessage('');
  }, []);

  const LiveRegionComponent = (
    <div
      key={key}
      role="status"
      aria-live={politeness}
      aria-atomic="true"
      className="sr-only"
    >
      {message}
    </div>
  );

  return { announce, clear, LiveRegionComponent };
}

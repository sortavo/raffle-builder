import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';
import { Loader2 } from 'lucide-react';
import { useState, useCallback } from 'react';

interface LoadMoreTriggerProps {
  onLoadMore: () => void;
  remaining: number;
  enabled?: boolean;
}

export function LoadMoreTrigger({ onLoadMore, remaining, enabled = true }: LoadMoreTriggerProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleIntersect = useCallback(() => {
    if (isLoading || !enabled) return;
    
    setIsLoading(true);
    // Small delay to prevent rapid multiple loads and show loading state
    setTimeout(() => {
      onLoadMore();
      setIsLoading(false);
    }, 150);
  }, [onLoadMore, isLoading, enabled]);

  const triggerRef = useIntersectionObserver(handleIntersect, {
    threshold: 0.1,
    rootMargin: '150px',
    enabled: enabled && remaining > 0,
  });

  if (remaining <= 0) return null;

  return (
    <div 
      ref={triggerRef} 
      className="flex items-center justify-center py-4 text-sm text-muted-foreground"
    >
      {isLoading ? (
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Cargando más boletos...</span>
        </div>
      ) : (
        <span className="opacity-50">{remaining} boleto{remaining !== 1 ? 's' : ''} más</span>
      )}
    </div>
  );
}

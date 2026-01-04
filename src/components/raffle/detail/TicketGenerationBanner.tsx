import { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Loader2, CheckCircle2, AlertCircle, ExternalLink, X, Zap, Clock, RefreshCw } from 'lucide-react';
import { useTicketGenerationJob } from '@/hooks/useTicketGenerationJob';
import { getRafflePublicUrl } from '@/lib/url-utils';
import { cn } from '@/lib/utils';

interface TicketGenerationBannerProps {
  raffleId: string;
  raffleSlug: string;
  orgSlug?: string | null;
  justPublished?: boolean;
  onDismiss?: () => void;
}

export function TicketGenerationBanner({
  raffleId,
  raffleSlug,
  orgSlug,
  justPublished = false,
  onDismiss,
}: TicketGenerationBannerProps) {
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const { 
    job, 
    isRunning, 
    isComplete, 
    isFailed, 
    progress, 
    error,
    ticketsPerSecond,
    formattedTimeRemaining,
    fetchActiveJob
  } = useTicketGenerationJob({
    raffleId,
    onComplete: () => {
      setShowSuccessBanner(true);
    },
  });

  // For sync (small) raffles that complete immediately when justPublished
  useEffect(() => {
    if (justPublished && !job) {
      setShowSuccessBanner(true);
      // Auto-hide after 30 seconds
      const timer = setTimeout(() => {
        setShowSuccessBanner(false);
      }, 30000);
      return () => clearTimeout(timer);
    }
  }, [justPublished, job]);

  // Auto-hide success banner after 30 seconds
  useEffect(() => {
    if (showSuccessBanner) {
      const timer = setTimeout(() => {
        setShowSuccessBanner(false);
      }, 30000);
      return () => clearTimeout(timer);
    }
  }, [showSuccessBanner]);

  const handleDismiss = () => {
    setDismissed(true);
    setShowSuccessBanner(false);
    onDismiss?.();
  };

  const handleRetry = () => {
    fetchActiveJob(raffleId);
  };

  if (dismissed) return null;

  const publicUrl = getRafflePublicUrl(raffleSlug, orgSlug);

  // Format speed for display
  const formatSpeed = (speed: number): string => {
    if (speed >= 1000) {
      return `${(speed / 1000).toFixed(1)}K/s`;
    }
    return `${Math.round(speed)}/s`;
  };

  // Running state - show detailed progress
  if (isRunning && job) {
    return (
      <Alert className="bg-amber-500/10 border-amber-500/30 mb-4">
        <div className="flex flex-col gap-2 w-full">
          <div className="flex items-center gap-3 w-full">
            <Loader2 className="h-4 w-4 animate-spin text-amber-600 shrink-0" />
            <AlertDescription className="flex items-center justify-between flex-1 gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-sm font-medium text-amber-700">
                  Generando boletos...
                </span>
                <span className="text-xs text-amber-600">
                  {job.generated_count.toLocaleString()} / {job.total_tickets.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center gap-3">
                {ticketsPerSecond > 0 && (
                  <div className="flex items-center gap-1 text-xs text-amber-600">
                    <Zap className="h-3 w-3" />
                    <span>{formatSpeed(ticketsPerSecond)}</span>
                  </div>
                )}
                {formattedTimeRemaining && (
                  <div className="flex items-center gap-1 text-xs text-amber-600">
                    <Clock className="h-3 w-3" />
                    <span>~{formattedTimeRemaining}</span>
                  </div>
                )}
              </div>
            </AlertDescription>
          </div>
          <Progress value={progress} className="w-full h-2" />
          <div className="flex justify-between text-xs text-amber-600/70">
            <span>Lote {job.current_batch} de {job.total_batches}</span>
            <span>{progress}% completado</span>
          </div>
        </div>
      </Alert>
    );
  }

  // Error state with retry option
  if (isFailed) {
    return (
      <Alert className="bg-destructive/10 border-destructive/30 mb-4">
        <div className="flex items-center gap-3 w-full">
          <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
          <AlertDescription className="flex items-center justify-between flex-1 gap-4">
            <span className="text-sm text-destructive">
              Error al generar boletos: {error || 'Error desconocido'}
            </span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="border-destructive/50 text-destructive hover:bg-destructive/10 gap-1.5"
                onClick={handleRetry}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Reintentar
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive hover:bg-destructive/10"
                onClick={handleDismiss}
              >
                Cerrar
              </Button>
            </div>
          </AlertDescription>
        </div>
      </Alert>
    );
  }

  // Success state - show for justPublished or when job completes
  if (showSuccessBanner || (justPublished && !isRunning)) {
    return (
      <Alert className="bg-emerald-500/10 border-emerald-500/30 mb-4">
        <div className="flex items-center gap-3 w-full">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <AlertDescription className="flex items-center justify-between flex-1 gap-2">
            <span className="text-sm font-medium text-emerald-700">
              ¡Tu rifa está activa y lista para recibir participantes!
              {job && job.generated_count > 10000 && (
                <span className="ml-2 text-emerald-600 font-normal">
                  ({job.generated_count.toLocaleString()} boletos generados)
                </span>
              )}
            </span>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                variant="outline"
                className="border-emerald-500/50 text-emerald-700 hover:bg-emerald-500/10 gap-1.5"
                asChild
              >
                <a href={publicUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3.5 w-3.5" />
                  Ver página
                </a>
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10"
                onClick={handleDismiss}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </AlertDescription>
        </div>
      </Alert>
    );
  }

  return null;
}

import { useEffect, useState } from 'react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle2, XCircle, X, Ticket } from 'lucide-react';
import { useTicketGenerationJob, TicketGenerationJob } from '@/hooks/useTicketGenerationJob';
import { cn } from '@/lib/utils';

interface TicketGenerationProgressProps {
  raffleId: string;
  totalTickets: number;
  onComplete?: (job: TicketGenerationJob) => void;
  onError?: (error: string) => void;
  onCancel?: () => void;
  autoStart?: boolean;
  className?: string;
}

export function TicketGenerationProgress({
  raffleId,
  totalTickets,
  onComplete,
  onError,
  onCancel,
  autoStart = false,
  className
}: TicketGenerationProgressProps) {
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  const {
    job,
    isPolling,
    error,
    startJob,
    cancelJob,
    progress,
    isComplete,
    isFailed,
    isRunning
  } = useTicketGenerationJob({
    onComplete,
    onError,
    pollInterval: 1500
  });

  // Auto-start if requested
  useEffect(() => {
    if (autoStart && !job && !isPolling) {
      handleStart();
    }
  }, [autoStart]);

  // Track elapsed time
  useEffect(() => {
    if (!isRunning || !startTime) return;

    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime.getTime()) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, startTime]);

  const handleStart = async () => {
    setStartTime(new Date());
    setElapsedTime(0);
    await startJob(raffleId);
  };

  const handleCancel = async () => {
    if (job?.id && job.id !== 'sync') {
      await cancelJob(job.id);
    }
    onCancel?.();
  };

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins < 60) return `${mins}m ${secs}s`;
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return `${hours}h ${remainingMins}m`;
  };

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('es-MX').format(num);
  };

  const estimatedTotal = job && job.generated_count > 0 && elapsedTime > 0
    ? Math.ceil((totalTickets / job.generated_count) * elapsedTime)
    : null;

  const estimatedRemaining = estimatedTotal 
    ? Math.max(0, estimatedTotal - elapsedTime)
    : null;

  const ticketsPerSecond = job && job.generated_count > 0 && elapsedTime > 0
    ? Math.round(job.generated_count / elapsedTime)
    : null;

  // Determine status icon and color
  const getStatusIcon = () => {
    if (isComplete) return <CheckCircle2 className="h-5 w-5 text-success" />;
    if (isFailed) return <XCircle className="h-5 w-5 text-destructive" />;
    if (isRunning) return <Loader2 className="h-5 w-5 animate-spin text-primary" />;
    return <Ticket className="h-5 w-5 text-muted-foreground" />;
  };

  const getStatusText = () => {
    if (isComplete) return 'Generación completada';
    if (isFailed) return 'Error en la generación';
    if (job?.status === 'cancelled') return 'Generación cancelada';
    if (isRunning) return 'Generando boletos...';
    return 'Listo para generar';
  };

  // Don't render if no job and not autoStart
  if (!job && !autoStart && !isPolling) {
    return (
      <Card className={cn("border-dashed", className)}>
        <CardContent className="flex flex-col items-center justify-center py-8 gap-4">
          <Ticket className="h-12 w-12 text-muted-foreground" />
          <div className="text-center">
            <p className="font-medium">Generar {formatNumber(totalTickets)} boletos</p>
            <p className="text-sm text-muted-foreground">
              {totalTickets > 50000 
                ? 'La generación se realizará en segundo plano'
                : 'La generación será instantánea'}
            </p>
          </div>
          <Button onClick={handleStart}>
            Iniciar generación
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(
      "transition-all duration-300",
      isComplete && "border-success/50 bg-success/5",
      isFailed && "border-destructive/50 bg-destructive/5",
      className
    )}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <CardTitle className="text-base">{getStatusText()}</CardTitle>
          </div>
          {isRunning && (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleCancel}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progreso</span>
            <span className="font-medium">{progress}%</span>
          </div>
          <Progress 
            value={progress} 
            className={cn(
              "h-3",
              isComplete && "[&>div]:bg-success",
              isFailed && "[&>div]:bg-destructive"
            )} 
          />
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Generados</p>
            <p className="font-medium">
              {formatNumber(job?.generated_count ?? 0)} / {formatNumber(totalTickets)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Tiempo transcurrido</p>
            <p className="font-medium">{formatTime(elapsedTime)}</p>
          </div>
          {isRunning && estimatedRemaining !== null && (
            <div>
              <p className="text-muted-foreground">Tiempo restante</p>
              <p className="font-medium">~{formatTime(estimatedRemaining)}</p>
            </div>
          )}
          {ticketsPerSecond && (
            <div>
              <p className="text-muted-foreground">Velocidad</p>
              <p className="font-medium">{formatNumber(ticketsPerSecond)}/s</p>
            </div>
          )}
        </div>

        {/* Batch info */}
        {job && job.total_batches > 1 && (
          <div className="text-xs text-muted-foreground pt-2 border-t">
            Lote {job.current_batch} de {job.total_batches} 
            ({formatNumber(job.batch_size)} boletos por lote)
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Completion message */}
        {isComplete && (
          <div className="p-3 bg-success/10 border border-success/20 rounded-md">
            <p className="text-sm text-success">
              ¡{formatNumber(job?.generated_count ?? totalTickets)} boletos generados exitosamente!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

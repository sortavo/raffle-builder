import { Cloud, CloudOff, Loader2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface AutoSaveIndicatorProps {
  lastSaved: Date | null;
  isSaving: boolean;
  className?: string;
}

export function AutoSaveIndicator({ lastSaved, isSaving, className }: AutoSaveIndicatorProps) {
  if (isSaving) {
    return (
      <div className={cn('flex items-center gap-1.5 text-xs text-muted-foreground', className)}>
        <Loader2 className="h-3 w-3 animate-spin" />
        <span>Guardando...</span>
      </div>
    );
  }

  if (lastSaved) {
    return (
      <div className={cn('flex items-center gap-1.5 text-xs text-muted-foreground', className)}>
        <Check className="h-3 w-3 text-success" />
        <span>
          Guardado {formatDistanceToNow(lastSaved, { addSuffix: true, locale: es })}
        </span>
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-1.5 text-xs text-muted-foreground', className)}>
      <Cloud className="h-3 w-3" />
      <span>Autoguardado activado</span>
    </div>
  );
}

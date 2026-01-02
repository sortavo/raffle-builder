import { UseFormReturn } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HelpTooltip } from '@/components/ui/HelpTooltip';
import { Gift, Calendar, X, Info } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Prize } from '@/types/prize';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PreDrawSchedulerProps {
  form: UseFormReturn<any>;
  prizes: Prize[];
  drawDate: string | null;
  startDate: string | null;
  isPublished: boolean;
}

export const PreDrawScheduler = ({ 
  form, 
  prizes, 
  drawDate, 
  startDate,
  isPublished 
}: PreDrawSchedulerProps) => {
  
  const updatePrizeDate = (prizeId: string, date: string | null) => {
    const currentPrizes = form.getValues('prizes') || [];
    const updatedPrizes = currentPrizes.map((p: Prize) => 
      p.id === prizeId ? { ...p, scheduled_draw_date: date } : p
    );
    form.setValue('prizes', updatedPrizes, { shouldDirty: true });
  };

  const clearAllDates = () => {
    const currentPrizes = form.getValues('prizes') || [];
    const updatedPrizes = currentPrizes.map((p: Prize) => ({ 
      ...p, 
      scheduled_draw_date: null 
    }));
    form.setValue('prizes', updatedPrizes, { shouldDirty: true });
  };

  const getDateValidation = (date: string | null, prizeIndex: number): string | null => {
    if (!date) return null;
    
    const prizeDate = new Date(date);
    
    if (startDate && prizeDate <= new Date(startDate)) {
      return 'Debe ser después de la fecha de inicio';
    }
    
    if (drawDate && prizeDate >= new Date(drawDate)) {
      return 'Debe ser antes del sorteo final';
    }
    
    // Check for conflicts with other pre-draw dates
    const otherPrizes = prizes.filter((_, i) => i !== prizeIndex);
    const conflictingPrize = otherPrizes.find(p => 
      p.scheduled_draw_date && 
      Math.abs(new Date(p.scheduled_draw_date).getTime() - prizeDate.getTime()) < 3600000 // within 1 hour
    );
    
    if (conflictingPrize) {
      return `Muy cercano a otro pre-sorteo (${conflictingPrize.name})`;
    }
    
    return null;
  };

  const isDatePassed = (date: string | null): boolean => {
    if (!date) return false;
    return new Date(date) < new Date();
  };

  const scheduledCount = prizes.filter(p => p.scheduled_draw_date).length;

  return (
    <div className="space-y-4">
      <Alert className="bg-muted/50 border-border/50">
        <Info className="h-4 w-4" />
        <AlertDescription>
          Programa fechas para sortear premios de forma individual antes del sorteo final. 
          Los premios sin fecha se sortearán todos juntos en la fecha principal.
        </AlertDescription>
      </Alert>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {scheduledCount} de {prizes.length} premios con pre-sorteo programado
        </p>
        {scheduledCount > 0 && !isPublished && (
          <Button 
            type="button" 
            variant="ghost" 
            size="sm"
            onClick={clearAllDates}
            className="text-muted-foreground hover:text-foreground"
          >
            Limpiar fechas
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {prizes.map((prize, index) => {
          const validation = getDateValidation(prize.scheduled_draw_date || null, index);
          const isPast = isDatePassed(prize.scheduled_draw_date || null);
          const isLocked = isPublished && isPast;
          
          return (
            <Card 
              key={prize.id} 
              className={cn(
                "p-4 transition-colors",
                prize.scheduled_draw_date ? "border-primary/30 bg-primary/5" : "bg-muted/30",
                isLocked && "opacity-60"
              )}
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Gift className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{prize.name || `Premio ${index + 1}`}</p>
                      {index === prizes.length - 1 && !prize.scheduled_draw_date && (
                        <Badge variant="secondary" className="shrink-0 text-xs">
                          Sorteo Final
                        </Badge>
                      )}
                      {isPast && prize.scheduled_draw_date && (
                        <Badge variant="outline" className="shrink-0 text-xs text-amber-600 border-amber-300">
                          Fecha pasada
                        </Badge>
                      )}
                    </div>
                    {prize.scheduled_draw_date && (
                      <p className="text-xs text-muted-foreground">
                        Pre-sorteo: {format(new Date(prize.scheduled_draw_date), "d 'de' MMMM, HH:mm", { locale: es })}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2 sm:w-auto">
                  <div className="relative flex-1 sm:w-52">
                    <Input
                      type="datetime-local"
                      value={prize.scheduled_draw_date 
                        ? format(new Date(prize.scheduled_draw_date), "yyyy-MM-dd'T'HH:mm") 
                        : ''
                      }
                      onChange={(e) => {
                        const newDate = e.target.value ? new Date(e.target.value).toISOString() : null;
                        updatePrizeDate(prize.id, newDate);
                      }}
                      disabled={isLocked}
                      min={startDate ? format(new Date(startDate), "yyyy-MM-dd'T'HH:mm") : undefined}
                      max={drawDate ? format(new Date(drawDate), "yyyy-MM-dd'T'HH:mm") : undefined}
                      className={cn(
                        "text-sm",
                        validation && "border-destructive focus-visible:ring-destructive"
                      )}
                    />
                    {prize.scheduled_draw_date && !isLocked && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground hover:text-foreground"
                        onClick={() => updatePrizeDate(prize.id, null)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              
              {validation && (
                <p className="text-xs text-destructive mt-2 ml-11">{validation}</p>
              )}
            </Card>
          );
        })}
      </div>

      {drawDate && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-dashed">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            Sorteo final: {format(new Date(drawDate), "d 'de' MMMM 'a las' HH:mm", { locale: es })}
          </span>
          <HelpTooltip content="Los premios sin fecha de pre-sorteo se sortearán en esta fecha" />
        </div>
      )}
    </div>
  );
};

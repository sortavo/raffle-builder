import { format, formatDistanceToNow, isFuture } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar, Clock, Gift, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/currency-utils';
import type { Prize } from '@/types/prize';
import { cn } from '@/lib/utils';

interface UpcomingPreDrawsProps {
  prizes: Prize[];
  currencyCode?: string;
  primaryColor?: string;
  isLightTemplate?: boolean;
  compact?: boolean; // For use inside hero layout
}

export function UpcomingPreDraws({
  prizes,
  currencyCode = 'MXN',
  primaryColor,
  isLightTemplate = false,
  compact = false,
}: UpcomingPreDrawsProps) {
  // Filter to only future pre-draws and sort by date
  const upcomingPrizes = prizes
    .filter(p => p.scheduled_draw_date && isFuture(new Date(p.scheduled_draw_date)))
    .sort((a, b) => 
      new Date(a.scheduled_draw_date!).getTime() - new Date(b.scheduled_draw_date!).getTime()
    );

  if (upcomingPrizes.length === 0) {
    return null;
  }

  const textColor = isLightTemplate ? 'text-gray-900' : 'text-white';
  const textMuted = isLightTemplate ? 'text-gray-500' : 'text-white/60';
  const cardBg = isLightTemplate ? 'bg-white' : 'bg-white/[0.03]';
  const borderColor = isLightTemplate ? 'border-gray-200' : 'border-white/[0.08]';

  // Dynamic grid columns based on number of items
  const gridCols = upcomingPrizes.length <= 2 
    ? "sm:grid-cols-2" 
    : upcomingPrizes.length === 3 
      ? "sm:grid-cols-2 lg:grid-cols-3"
      : "sm:grid-cols-2 lg:grid-cols-4";

  return (
    <section className={compact ? "py-6" : "py-12 lg:py-16"}>
      <div className={compact ? "w-full px-4" : "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"}>
        {/* Header - more compact in compact mode */}
        <div className={cn("text-center", compact ? "mb-4" : "mb-8 lg:mb-12")}>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-3"
            style={{ 
              backgroundColor: primaryColor ? `${primaryColor}15` : 'rgba(16, 185, 129, 0.15)',
            }}
          >
            <Sparkles 
              className="h-4 w-4" 
              style={{ color: primaryColor || '#10B981' }}
            />
            <span 
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: primaryColor || '#10B981' }}
            >
              Pre-sorteos
            </span>
          </div>
          <h2 className={cn(
            compact ? "text-xl lg:text-2xl" : "text-2xl lg:text-3xl",
            "font-bold tracking-tight", 
            textColor
          )}>
            ¡Más Oportunidades de Ganar!
          </h2>
          {!compact && (
            <p className={cn("mt-2 text-sm lg:text-base", textMuted)}>
              Participa también en estos sorteos anticipados
            </p>
          )}
        </div>

        {/* Pre-draws Grid - dynamic columns */}
        <div className={cn("grid gap-3", gridCols)}>
          {upcomingPrizes.map((prize, index) => {
            const drawDate = new Date(prize.scheduled_draw_date!);
            const isNextDraw = index === 0;
            const timeUntil = formatDistanceToNow(drawDate, { locale: es, addSuffix: false });

            return (
              <Card 
                key={prize.id}
                className={cn(
                  "relative overflow-hidden transition-all hover:scale-[1.02]",
                  cardBg,
                  borderColor,
                  isNextDraw && "ring-2 ring-emerald-500",
                )}
              >
                {/* Next badge */}
                {isNextDraw && (
                  <div 
                    className="absolute top-0 right-0 px-3 py-1 text-xs font-bold text-white rounded-bl-lg"
                    style={{ backgroundColor: primaryColor || '#10B981' }}
                  >
                    PRÓXIMO
                  </div>
                )}

              <CardContent className="p-4">
                  {/* Vertical centered layout */}
                  <div className="flex flex-col items-center text-center">
                    {/* Icon */}
                    <div 
                      className="h-10 w-10 rounded-lg flex items-center justify-center mb-3"
                      style={{ 
                        backgroundColor: primaryColor ? `${primaryColor}20` : 'rgba(16, 185, 129, 0.2)',
                      }}
                    >
                      <Gift 
                        className="h-5 w-5" 
                        style={{ color: primaryColor || '#10B981' }}
                      />
                    </div>

                    {/* Badge */}
                    <Badge variant="secondary" className="mb-2 text-[10px]">
                      Pre-sorteo
                    </Badge>
                    
                    {/* Title - 2 lines */}
                    <h3 className={cn("font-semibold text-sm line-clamp-2 min-h-[2.5rem]", textColor)}>
                      {prize.name || 'Premio'}
                    </h3>
                    
                    {/* Value */}
                    {prize.value && (
                      <p className={cn("text-xs mt-1", textMuted)}>
                        {formatCurrency(prize.value, currencyCode)}
                      </p>
                    )}
                  </div>

                  {/* Compact date footer */}
                  <div className={cn("mt-3 pt-3 border-t text-center", borderColor)}>
                    <span className={cn("text-xs", textMuted)}>
                      {format(drawDate, "d MMM", { locale: es })}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}

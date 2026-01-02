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
}

export function UpcomingPreDraws({
  prizes,
  currencyCode = 'MXN',
  primaryColor,
  isLightTemplate = false,
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

  return (
    <section className="py-12 lg:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8 lg:mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4"
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
          <h2 className={cn("text-2xl lg:text-3xl font-bold tracking-tight", textColor)}>
            ¡Más Oportunidades de Ganar!
          </h2>
          <p className={cn("mt-2 text-sm lg:text-base", textMuted)}>
            Participa también en estos sorteos anticipados
          </p>
        </div>

        {/* Pre-draws Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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

                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div 
                      className="flex-shrink-0 h-12 w-12 rounded-xl flex items-center justify-center"
                      style={{ 
                        backgroundColor: primaryColor ? `${primaryColor}20` : 'rgba(16, 185, 129, 0.2)',
                      }}
                    >
                      <Gift 
                        className="h-6 w-6" 
                        style={{ color: primaryColor || '#10B981' }}
                      />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <Badge variant="secondary" className="mb-2 text-[10px]">
                        Pre-sorteo
                      </Badge>
                      <h3 className={cn("font-semibold truncate", textColor)}>
                        {prize.name || 'Premio'}
                      </h3>
                      {prize.value && (
                        <p className={cn("text-sm", textMuted)}>
                          Valor: {formatCurrency(prize.value, currencyCode)}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Date and countdown */}
                  <div className={cn(
                    "mt-4 pt-4 border-t flex items-center justify-between gap-2",
                    borderColor
                  )}>
                    <div className="flex items-center gap-2">
                      <Calendar className={cn("h-4 w-4", textMuted)} />
                      <span className={cn("text-sm", textMuted)}>
                        {format(drawDate, "d 'de' MMMM", { locale: es })}
                      </span>
                    </div>
                    <div 
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                      style={{ 
                        backgroundColor: primaryColor ? `${primaryColor}15` : 'rgba(16, 185, 129, 0.15)',
                        color: primaryColor || '#10B981',
                      }}
                    >
                      <Clock className="h-3 w-3" />
                      En {timeUntil}
                    </div>
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

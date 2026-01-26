import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Trophy, PartyPopper, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/currency-utils';
import { cn } from '@/lib/utils';

interface AnnouncedDraw {
  id: string;
  prize_id: string;
  prize_name: string;
  prize_value: number | null;
  ticket_number: string;
  winner_name: string | null;
  winner_city: string | null;
  draw_type: string;
  drawn_at: string;
}

interface AnnouncedWinnersProps {
  draws: AnnouncedDraw[];
  currencyCode?: string;
  primaryColor?: string;
  isLightTemplate?: boolean;
}

export function AnnouncedWinners({
  draws,
  currencyCode = 'MXN',
  primaryColor,
  isLightTemplate = false,
}: AnnouncedWinnersProps) {
  // Sort by most recent first
  const sortedDraws = [...draws].sort(
    (a, b) => new Date(b.drawn_at).getTime() - new Date(a.drawn_at).getTime()
  );

  if (sortedDraws.length === 0) {
    return null;
  }

  const textColor = isLightTemplate ? 'text-gray-900' : 'text-white';
  const textMuted = isLightTemplate ? 'text-gray-500' : 'text-white/60';
  const cardBg = isLightTemplate ? 'bg-gradient-to-br from-amber-50 to-yellow-50' : 'bg-gradient-to-br from-amber-500/10 to-yellow-500/10';
  const borderColor = isLightTemplate ? 'border-amber-200' : 'border-amber-500/20';

  return (
    <section className="py-12 lg:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8 lg:mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-amber-500/20 to-yellow-500/20 mb-4">
            <Trophy className="h-4 w-4 text-amber-500" />
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-500">
              Ganadores
            </span>
          </div>
          <h2 className={cn("text-2xl lg:text-3xl font-bold tracking-tight", textColor)}>
            ¡Felicidades a Nuestros Ganadores!
          </h2>
          <p className={cn("mt-2 text-sm lg:text-base", textMuted)}>
            Resultados de los sorteos realizados
          </p>
        </div>

        {/* Winners Grid */}
        <div className="grid gap-4 md:grid-cols-2">
          {sortedDraws.map((draw) => {
            const isPreDraw = draw.draw_type === 'pre_draw';

            return (
              <Card 
                key={draw.id}
                className={cn(
                  "relative overflow-hidden border-2",
                  cardBg,
                  borderColor,
                )}
              >
                {/* Decorative confetti pattern */}
                <div className="absolute top-0 right-0 w-24 h-24 opacity-10">
                  <PartyPopper className="w-full h-full text-amber-500" />
                </div>

                <CardContent className="p-4 sm:p-5 relative">
                  <div className="flex items-start gap-4">
                    {/* Trophy icon */}
                    <div className="flex-shrink-0 h-14 w-14 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center shadow-lg">
                      <Trophy className="h-7 w-7 text-white" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        {isPreDraw && (
                          <Badge variant="secondary" className="text-[10px] bg-amber-100 text-amber-700">
                            Pre-sorteo
                          </Badge>
                        )}
                      </div>
                      <h3 className={cn("text-lg font-bold", textColor)}>
                        {draw.prize_name}
                      </h3>
                      {draw.prize_value && (
                        <p className={cn("text-sm", textMuted)}>
                          Valor: {formatCurrency(draw.prize_value, currencyCode)}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Winner info */}
                  <div className={cn(
                    "mt-4 p-4 rounded-xl",
                    isLightTemplate ? 'bg-white' : 'bg-black/20'
                  )}>
                    <p className={cn("text-xs uppercase tracking-wider mb-1", textMuted)}>
                      Ganador
                    </p>
                    <p className={cn("text-xl font-bold", textColor)}>
                      {draw.winner_name || 'Participante'}
                    </p>
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      <Badge 
                        variant="outline" 
                        className="font-mono text-sm px-3 py-1 border-amber-500/50 text-amber-600"
                      >
                        #{draw.ticket_number}
                      </Badge>
                      {draw.winner_city && (
                        <span className={cn("text-sm flex items-center gap-1", textMuted)}>
                          <MapPin className="h-3.5 w-3.5" />
                          {draw.winner_city}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Date */}
                  <p className={cn("text-xs mt-3", textMuted)}>
                    Sorteado el {format(new Date(draw.drawn_at), "d 'de' MMMM, yyyy", { locale: es })}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}

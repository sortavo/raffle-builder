import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Trophy, PartyPopper, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/currency-utils';
import type { Prize, PrizeDisplayMode } from '@/types/prize';
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

interface PreDrawResultsProps {
  announcedDraws: AnnouncedDraw[];
  allPrizes: Prize[];
  displayMode?: PrizeDisplayMode;
  currencyCode?: string;
  primaryColor?: string;
}

export function PreDrawResults({
  announcedDraws,
  allPrizes,
  displayMode = 'hierarchical',
  currencyCode = 'MXN',
  primaryColor,
}: PreDrawResultsProps) {
  const drawnPrizeIds = new Set(announcedDraws.map(d => d.prize_id));
  const pendingPrizes = allPrizes.filter(p => !drawnPrizeIds.has(p.id));
  
  const getPrizeLabel = (prizeId: string) => {
    const index = allPrizes.findIndex(p => p.id === prizeId);
    if (index === -1) return null;
    
    if (displayMode === 'hierarchical') {
      const ordinals = ['1°', '2°', '3°', '4°', '5°'];
      return ordinals[index] || `${index + 1}°`;
    }
    if (displayMode === 'numbered') {
      return `Premio ${index + 1}`;
    }
    return null;
  };

  if (announcedDraws.length === 0 && pendingPrizes.length === 0) {
    return null;
  }

  // Don't show if only one prize and not drawn yet
  if (allPrizes.length <= 1 && announcedDraws.length === 0) {
    return null;
  }

  return (
    <section className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold flex items-center justify-center gap-2">
          <Trophy className="h-6 w-6" style={{ color: primaryColor }} />
          Resultados de Sorteos
        </h2>
        <p className="text-muted-foreground mt-1">
          {announcedDraws.length} de {allPrizes.length} premios sorteados
        </p>
      </div>

      {/* Announced Winners */}
      {announcedDraws.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {announcedDraws.map((draw) => {
            const label = getPrizeLabel(draw.prize_id);
            
            return (
              <Card 
                key={draw.id} 
                className="overflow-hidden border-2"
                style={{ borderColor: primaryColor ? `${primaryColor}40` : undefined }}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div 
                      className="flex-shrink-0 h-12 w-12 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: primaryColor ? `${primaryColor}20` : 'hsl(var(--primary) / 0.1)' }}
                    >
                      <PartyPopper 
                        className="h-6 w-6" 
                        style={{ color: primaryColor || 'hsl(var(--primary))' }}
                      />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {label && (
                          <Badge 
                            variant="secondary"
                            style={{ 
                              backgroundColor: primaryColor ? `${primaryColor}20` : undefined,
                              color: primaryColor || undefined,
                            }}
                          >
                            {label}
                          </Badge>
                        )}
                        <span className="font-semibold truncate">
                          {draw.prize_name}
                        </span>
                      </div>
                      
                      {draw.prize_value && (
                        <p className="text-sm text-muted-foreground">
                          Valor: {formatCurrency(draw.prize_value, currencyCode)}
                        </p>
                      )}
                      
                      <div className="mt-3 p-3 rounded-lg bg-muted/50">
                        <p className="text-sm text-muted-foreground">Ganador</p>
                        <p className="font-bold text-lg">
                          {draw.winner_name || 'Participante'}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="font-mono">
                            #{draw.ticket_number}
                          </Badge>
                          {draw.winner_city && (
                            <span className="text-sm text-muted-foreground">
                              {draw.winner_city}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <p className="text-xs text-muted-foreground mt-2">
                        Sorteado el {format(new Date(draw.drawn_at), "d 'de' MMMM, yyyy", { locale: es })}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pending Prizes */}
      {pendingPrizes.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <Clock className="h-5 w-5 text-muted-foreground" />
            Premios Pendientes
          </h3>
          <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
            {pendingPrizes.map((prize) => {
              const label = getPrizeLabel(prize.id);
              
              return (
                <Card key={prize.id} className="bg-muted/30">
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {label && (
                          <Badge variant="outline" className="text-xs">
                            {label}
                          </Badge>
                        )}
                        <span className="font-medium truncate text-sm">
                          {prize.name || 'Premio'}
                        </span>
                      </div>
                      {prize.value && (
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(prize.value, currencyCode)}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

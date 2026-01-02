import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Check, Clock } from 'lucide-react';
import type { Prize, PrizeDisplayMode } from '@/types/prize';
import { formatCurrency } from '@/lib/currency-utils';
import { cn } from '@/lib/utils';

interface DrawPrizeSelectorProps {
  prizes: Prize[];
  drawnPrizeIds: Set<string>;
  selectedPrizeId: string | null;
  onSelectPrize: (prizeId: string) => void;
  displayMode?: PrizeDisplayMode;
  currencyCode?: string;
}

export function DrawPrizeSelector({
  prizes,
  drawnPrizeIds,
  selectedPrizeId,
  onSelectPrize,
  displayMode = 'hierarchical',
  currencyCode = 'MXN',
}: DrawPrizeSelectorProps) {
  const getPrizeLabel = (index: number) => {
    if (displayMode === 'hierarchical') {
      const ordinals = ['1°', '2°', '3°', '4°', '5°'];
      return ordinals[index] || `${index + 1}°`;
    }
    if (displayMode === 'numbered') {
      return `Premio ${index + 1}`;
    }
    return null;
  };

  if (prizes.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No hay premios configurados en esta rifa
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          Seleccionar Premio a Sortear
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {prizes.map((prize, index) => {
          const isDrawn = drawnPrizeIds.has(prize.id);
          const isSelected = selectedPrizeId === prize.id;
          const label = getPrizeLabel(index);

          return (
            <Button
              key={prize.id}
              variant={isSelected ? 'default' : 'outline'}
              className={cn(
                'w-full justify-start h-auto py-3 px-4',
                isDrawn && 'opacity-60 cursor-not-allowed',
                isSelected && 'ring-2 ring-primary'
              )}
              disabled={isDrawn}
              onClick={() => onSelectPrize(prize.id)}
            >
              <div className="flex items-center gap-3 w-full">
                <div className="flex-shrink-0">
                  {isDrawn ? (
                    <div className="h-8 w-8 rounded-full bg-green-500/20 flex items-center justify-center">
                      <Check className="h-4 w-4 text-green-600" />
                    </div>
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                </div>
                
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    {label && (
                      <Badge variant="secondary" className="text-xs">
                        {label}
                      </Badge>
                    )}
                    <span className={cn(
                      'font-medium',
                      isDrawn && 'line-through text-muted-foreground'
                    )}>
                      {prize.name || 'Premio sin nombre'}
                    </span>
                  </div>
                  {prize.value && (
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Valor: {formatCurrency(prize.value, currencyCode)}
                    </p>
                  )}
                </div>

                {isDrawn && (
                  <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                    Sorteado
                  </Badge>
                )}
              </div>
            </Button>
          );
        })}

        <div className="pt-2 text-sm text-muted-foreground text-center">
          {drawnPrizeIds.size} de {prizes.length} premios sorteados
        </div>
      </CardContent>
    </Card>
  );
}

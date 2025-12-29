import { AlertTriangle, Search, Shuffle, Sparkles, Grid3X3 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface LargeRaffleNoticeProps {
  totalTickets: number;
  onUseSearch: () => void;
  onUseRandom: () => void;
}

// Threshold where we show the notice but still allow grid
const LARGE_RAFFLE_THRESHOLD = 50000;

// Threshold where we hide the grid completely - mega-raffles
const MEGA_RAFFLE_THRESHOLD = 100000;

export function LargeRaffleNotice({ 
  totalTickets, 
  onUseSearch, 
  onUseRandom 
}: LargeRaffleNoticeProps) {
  if (totalTickets <= LARGE_RAFFLE_THRESHOLD) return null;

  const formattedCount = new Intl.NumberFormat('es-MX').format(totalTickets);
  const isMegaRaffle = totalTickets > MEGA_RAFFLE_THRESHOLD;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className={`border-2 ${isMegaRaffle ? 'border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50' : 'border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50'}`}>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg ${isMegaRaffle ? 'bg-gradient-to-br from-purple-500 to-indigo-600 shadow-purple-500/30' : 'bg-gradient-to-br from-amber-400 to-orange-500 shadow-amber-500/30'}`}>
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            
            <div className="space-y-2">
              <h3 className={`text-xl font-bold ${isMegaRaffle ? 'text-purple-900' : 'text-amber-900'}`}>
                {isMegaRaffle ? '🎰 ¡Mega Rifa!' : '¡Rifa Grande!'} {formattedCount} boletos
              </h3>
              <p className={isMegaRaffle ? 'text-purple-700 max-w-md' : 'text-amber-700 max-w-md'}>
                {isMegaRaffle 
                  ? 'Con esta cantidad de boletos, la mejor experiencia es usar la búsqueda para encontrar números específicos o dejar que la máquina de la suerte elija por ti.'
                  : 'Esta es una rifa muy grande. Te recomendamos usar la búsqueda para encontrar números específicos o la selección aleatoria.'}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md pt-2">
              <Button
                onClick={onUseSearch}
                variant="outline"
                className={`flex-1 h-12 border-2 ${isMegaRaffle ? 'border-purple-300 bg-white hover:bg-purple-100 text-purple-900' : 'border-amber-300 bg-white hover:bg-amber-100 text-amber-900'}`}
              >
                <Search className="w-5 h-5 mr-2" />
                Buscar número
              </Button>
              <Button
                onClick={onUseRandom}
                className={`flex-1 h-12 text-white shadow-lg ${isMegaRaffle ? 'bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 shadow-purple-500/30' : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-amber-500/30'}`}
              >
                <Shuffle className="w-5 h-5 mr-2" />
                Elegir al azar
              </Button>
            </div>

            <p className={`text-xs flex items-center gap-1 ${isMegaRaffle ? 'text-purple-600' : 'text-amber-600'}`}>
              {isMegaRaffle ? (
                <>
                  <Grid3X3 className="w-3 h-3" />
                  La cuadrícula está deshabilitada para mega-rifas
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3 h-3" />
                  La vista de cuadrícula muestra máximo 100,000 boletos
                </>
              )}
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export { LARGE_RAFFLE_THRESHOLD, MEGA_RAFFLE_THRESHOLD };

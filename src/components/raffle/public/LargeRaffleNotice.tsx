import { AlertTriangle, Search, Shuffle, Sparkles, Grid3X3 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface LargeRaffleNoticeProps {
  totalTickets: number;
  onUseSearch: () => void;
  onUseRandom: () => void;
  isLightTemplate?: boolean;
}

// Threshold where we show the notice but still allow grid
const LARGE_RAFFLE_THRESHOLD = 50000;

// Threshold where we hide the grid completely - mega-raffles
const MEGA_RAFFLE_THRESHOLD = 100000;

export function LargeRaffleNotice({ 
  totalTickets, 
  onUseSearch, 
  onUseRandom,
  isLightTemplate = false
}: LargeRaffleNoticeProps) {
  if (totalTickets <= LARGE_RAFFLE_THRESHOLD) return null;

  const formattedCount = new Intl.NumberFormat('es-MX').format(totalTickets);
  const isMegaRaffle = totalTickets > MEGA_RAFFLE_THRESHOLD;

  // Theme-aware colors
  const colors = isLightTemplate ? {
    // Large raffle (amber theme)
    largeBorder: 'border-amber-300',
    largeBg: 'bg-gradient-to-br from-amber-50 to-orange-50',
    largeIconBg: 'bg-gradient-to-br from-amber-400 to-orange-500 shadow-amber-400/30',
    largeTitle: 'text-amber-800',
    largeText: 'text-amber-700',
    largeHint: 'text-amber-600',
    largeSearchBtn: 'border-amber-300 bg-white hover:bg-amber-50 text-amber-800',
    largeRandomBtn: 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-amber-400/30',
    // Mega raffle (purple theme)
    megaBorder: 'border-purple-300',
    megaBg: 'bg-gradient-to-br from-purple-50 to-indigo-50',
    megaIconBg: 'bg-gradient-to-br from-purple-500 to-indigo-600 shadow-purple-400/30',
    megaTitle: 'text-purple-800',
    megaText: 'text-purple-700',
    megaHint: 'text-purple-600',
    megaSearchBtn: 'border-purple-300 bg-white hover:bg-purple-50 text-purple-800',
    megaRandomBtn: 'bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 shadow-purple-400/30',
  } : {
    // Large raffle (amber theme - dark)
    largeBorder: 'border-amber-500/30',
    largeBg: 'bg-gradient-to-br from-amber-500/10 to-orange-500/10',
    largeIconBg: 'bg-gradient-to-br from-amber-400 to-orange-500 shadow-amber-500/30',
    largeTitle: 'text-amber-300',
    largeText: 'text-amber-200/80',
    largeHint: 'text-amber-400/70',
    largeSearchBtn: 'border-amber-500/30 bg-white/5 hover:bg-amber-500/10 text-amber-200',
    largeRandomBtn: 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-amber-500/30',
    // Mega raffle (purple theme - dark)
    megaBorder: 'border-purple-500/30',
    megaBg: 'bg-gradient-to-br from-purple-500/10 to-indigo-500/10',
    megaIconBg: 'bg-gradient-to-br from-purple-500 to-indigo-600 shadow-purple-500/30',
    megaTitle: 'text-purple-300',
    megaText: 'text-purple-200/80',
    megaHint: 'text-purple-400/70',
    megaSearchBtn: 'border-purple-500/30 bg-white/5 hover:bg-purple-500/10 text-purple-200',
    megaRandomBtn: 'bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 shadow-purple-500/30',
  };

  const theme = isMegaRaffle ? {
    border: colors.megaBorder,
    bg: colors.megaBg,
    iconBg: colors.megaIconBg,
    title: colors.megaTitle,
    text: colors.megaText,
    hint: colors.megaHint,
    searchBtn: colors.megaSearchBtn,
    randomBtn: colors.megaRandomBtn,
  } : {
    border: colors.largeBorder,
    bg: colors.largeBg,
    iconBg: colors.largeIconBg,
    title: colors.largeTitle,
    text: colors.largeText,
    hint: colors.largeHint,
    searchBtn: colors.largeSearchBtn,
    randomBtn: colors.largeRandomBtn,
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className={cn("border-2", theme.border, theme.bg)}>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg", theme.iconBg)}>
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            
            <div className="space-y-2">
              <h3 className={cn("text-xl font-bold", theme.title)}>
                {isMegaRaffle ? '🎰 ¡Mega Rifa!' : '¡Rifa Grande!'} {formattedCount} boletos
              </h3>
              <p className={cn("max-w-md", theme.text)}>
                {isMegaRaffle 
                  ? 'Con esta cantidad de boletos, la mejor experiencia es usar la búsqueda para encontrar números específicos o dejar que la máquina de la suerte elija por ti.'
                  : 'Esta es una rifa muy grande. Te recomendamos usar la búsqueda para encontrar números específicos o la selección aleatoria.'}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md pt-2">
              <Button
                onClick={onUseSearch}
                variant="outline"
                className={cn("flex-1 h-12 border-2", theme.searchBtn)}
              >
                <Search className="w-5 h-5 mr-2" />
                Buscar número
              </Button>
              <Button
                onClick={onUseRandom}
                className={cn("flex-1 h-12 text-white shadow-lg", theme.randomBtn)}
              >
                <Shuffle className="w-5 h-5 mr-2" />
                Elegir al azar
              </Button>
            </div>

            <p className={cn("text-xs flex items-center gap-1", theme.hint)}>
              {isMegaRaffle ? (
                <>
                  <Grid3X3 className="w-3 h-3" />
                  La cuadrícula tiene {new Intl.NumberFormat('es-MX').format(Math.ceil(totalTickets / 100))} páginas - usa búsqueda para mayor rapidez
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3 h-3" />
                  Usa búsqueda o aleatorio para encontrar boletos más rápido
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

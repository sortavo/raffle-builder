import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/currency-utils";
import { ArrowRight, Ticket, X, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";


interface FloatingCartButtonProps {
  selectedCount: number;
  total: number;
  currency: string;
  selectedTickets: string[];
  onContinue: () => void;
  onClear: () => void;
  winProbability?: number;
}

export function FloatingCartButton({
  selectedCount,
  total,
  currency,
  selectedTickets,
  onContinue,
  onClear,
  winProbability,
}: FloatingCartButtonProps) {
  if (selectedCount === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-50"
        aria-live="polite"
      >
        {/* TIER S: Premium glassmorphism with orb */}
        <div 
          className={cn(
            "relative overflow-hidden",
            "backdrop-blur-2xl",
            "rounded-2xl md:rounded-2xl",
            "border border-ultra-dark",
            "shadow-2xl shadow-black/60",
            "bg-ultra-dark/95"
          )}
        >
          {/* TIER S: Dual animated orbs for premium feel */}
          <div className="absolute -top-20 -right-20 w-48 h-48 bg-emerald-500/15 rounded-full blur-[120px] animate-blob" />
          <div className="absolute -bottom-16 -left-16 w-40 h-40 bg-teal-500/10 rounded-full blur-[100px] animate-blob animation-delay-2000" />
          
          {/* Subtle top accent line */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />
          
          {/* Noise texture */}
          <div className="absolute inset-0 opacity-[0.015] [background-image:url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noise%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noise)%22/%3E%3C/svg%3E')]" />
          
          <div className="relative p-6 md:p-8">
            {/* Header with ticket count and clear */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-5">
                {/* TIER S: Large icon container with glow - w-16/w-18 */}
                <div className="relative">
                  <div className="w-16 h-16 md:w-18 md:h-18 rounded-2xl flex items-center justify-center bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/20 shadow-lg shadow-emerald-500/10">
                    <Ticket className="w-7 h-7 md:w-8 md:h-8 text-emerald-400" />
                  </div>
                  
                  {/* TIER S: Shimmer count badge */}
                  <motion.div
                    key={selectedCount}
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="absolute -top-2 -right-2 w-7 h-7 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-emerald-500/30 shimmer-badge"
                  >
                    {selectedCount}
                  </motion.div>
                </div>
                
                <div>
                  <p className="font-semibold text-white text-base">
                    {selectedCount} boleto{selectedCount !== 1 && 's'}
                  </p>
                  <p className="text-sm truncate max-w-[120px] md:max-w-[180px] text-ultra-dark-muted">
                    {selectedTickets.slice(0, 3).join(', ')}
                    {selectedCount > 3 && ` +${selectedCount - 3}`}
                  </p>
                </div>
              </div>
              
              <button
                onClick={onClear}
                className="p-2.5 rounded-xl transition-all text-ultra-dark-muted hover:text-white hover:bg-white/10"
                aria-label="Limpiar selección"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Price and CTA */}
            <div className="flex items-center gap-5">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase tracking-widest mb-1.5 text-ultra-dark-dimmed">
                  Total
                </p>
                <motion.p
                  key={total}
                  initial={{ scale: 1.05 }}
                  animate={{ scale: 1 }}
                  className="text-4xl md:text-5xl font-black text-white tracking-[-0.03em]"
                >
                  {formatCurrency(total, currency)}
                </motion.p>
                
                {/* Win probability if provided */}
                {winProbability !== undefined && winProbability > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-1.5 mt-2"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-sm font-semibold text-amber-400">
                      {winProbability.toFixed(2)}% de ganar
                    </span>
                  </motion.div>
                )}
              </div>
              
              {/* TIER S: Premium CTA button */}
              <Button
                onClick={onContinue}
                variant="inverted"
                size="lg"
                className={cn(
                  "h-14 md:h-16 px-6 md:px-10",
                  "shadow-xl shadow-white/10",
                  "text-base font-bold",
                  "rounded-xl",
                  "group transition-all duration-200",
                  "hover:shadow-2xl hover:shadow-white/20 hover:-translate-y-0.5"
                )}
              >
                <span className="hidden sm:inline">Continuar</span>
                <span className="sm:hidden">Pagar</span>
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

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
        {/* Premium glassmorphism container */}
        <div 
          className={cn(
            "relative overflow-hidden",
            "backdrop-blur-2xl",
            "rounded-2xl md:rounded-2xl",
            "border",
            "shadow-2xl shadow-black/60"
          )}
          style={{
            backgroundColor: 'rgba(3, 7, 18, 0.95)',
            borderColor: PREMIUM_COLORS.border.subtle
          }}
        >
          {/* Subtle top accent line */}
          <div 
            className="absolute top-0 left-0 right-0 h-px"
            style={{ background: `linear-gradient(90deg, transparent, ${PREMIUM_COLORS.accent.emerald}40, transparent)` }}
          />
          
          <div className="relative p-4 md:p-5">
            {/* Header with ticket count and clear */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                {/* Ticket icon with count badge */}
                <div className="relative">
                  <div 
                    className="w-11 h-11 md:w-12 md:h-12 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)' }}
                  >
                    <Ticket className="w-5 h-5 md:w-6 md:h-6" style={{ color: PREMIUM_COLORS.accent.emerald }} />
                  </div>
                  
                  {/* Count badge */}
                  <motion.div
                    key={selectedCount}
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                  >
                    {selectedCount}
                  </motion.div>
                </div>
                
                <div>
                  <p className="font-medium text-white text-sm">
                    {selectedCount} boleto{selectedCount !== 1 && 's'}
                  </p>
                  <p 
                    className="text-xs truncate max-w-[100px] md:max-w-[160px]"
                    style={{ color: PREMIUM_COLORS.text.muted }}
                  >
                    {selectedTickets.slice(0, 3).join(', ')}
                    {selectedCount > 3 && ` +${selectedCount - 3}`}
                  </p>
                </div>
              </div>
              
              <button
                onClick={onClear}
                className="p-2 rounded-lg transition-colors"
                style={{ color: PREMIUM_COLORS.text.muted }}
                aria-label="Limpiar selección"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Price and CTA */}
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p 
                  className="text-[10px] uppercase tracking-widest mb-0.5"
                  style={{ color: PREMIUM_COLORS.text.dimmed }}
                >
                  Total
                </p>
                <motion.p
                  key={total}
                  initial={{ scale: 1.05 }}
                  animate={{ scale: 1 }}
                  className="text-2xl md:text-3xl font-bold text-white tracking-tight"
                >
                  {formatCurrency(total, currency)}
                </motion.p>
                
                {/* Win probability if provided */}
                {winProbability !== undefined && winProbability > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-1 mt-1"
                  >
                    <Sparkles className="w-3 h-3" style={{ color: PREMIUM_COLORS.accent.amber }} />
                    <span 
                      className="text-xs font-medium"
                      style={{ color: PREMIUM_COLORS.accent.amber }}
                    >
                      {winProbability.toFixed(2)}% de ganar
                    </span>
                  </motion.div>
                )}
              </div>
              
              {/* White CTA button - inverted for impact */}
              <Button
                onClick={onContinue}
                size="lg"
                className={cn(
                  "h-12 md:h-14 px-5 md:px-8",
                  "bg-white text-[#030712]",
                  "hover:bg-white/90",
                  "shadow-lg",
                  "text-sm font-semibold",
                  "rounded-xl",
                  "group transition-all duration-200"
                )}
              >
                <span className="hidden sm:inline">Continuar</span>
                <span className="sm:hidden">Pagar</span>
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-0.5 transition-transform" />
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

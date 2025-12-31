import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/currency-utils";
import { ShoppingCart, ArrowRight, Ticket, X, Sparkles } from "lucide-react";
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
        <div className={cn(
          "relative overflow-hidden",
          "bg-gray-950/95 backdrop-blur-2xl",
          "rounded-2xl md:rounded-3xl",
          "border border-white/10",
          "shadow-2xl shadow-black/50"
        )}>
          {/* Animated gradient accent bar */}
          <motion.div 
            className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_auto]"
            animate={{ backgroundPosition: ["0% 0%", "200% 0%"] }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          />
          
          {/* Subtle pulse animation when items present */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 pointer-events-none"
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          
          <div className="relative p-4 md:p-5">
            {/* Header with ticket count and clear */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                {/* Ticket icon with count badge */}
                <div className="relative">
                  <motion.div 
                    className="w-12 h-12 md:w-14 md:h-14 bg-gradient-to-br from-primary to-accent rounded-xl md:rounded-2xl flex items-center justify-center shadow-lg shadow-primary/30"
                    animate={{ scale: [1, 1.02, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Ticket className="w-6 h-6 md:w-7 md:h-7 text-primary-foreground" />
                  </motion.div>
                  
                  {/* Animated count badge */}
                  <motion.div
                    key={selectedCount}
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center text-black text-xs font-bold shadow-lg"
                  >
                    {selectedCount}
                  </motion.div>
                </div>
                
                <div>
                  <p className="font-semibold text-white/90 text-sm md:text-base">
                    {selectedCount} boleto{selectedCount !== 1 && 's'}
                  </p>
                  <p className="text-xs text-white/50 truncate max-w-[120px] md:max-w-[180px]">
                    {selectedTickets.slice(0, 3).join(', ')}
                    {selectedCount > 3 && ` +${selectedCount - 3}`}
                  </p>
                </div>
              </div>
              
              <button
                onClick={onClear}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors group"
                aria-label="Limpiar selección"
              >
                <X className="w-5 h-5 text-white/50 group-hover:text-white/80 transition-colors" />
              </button>
            </div>
            
            {/* Price and CTA */}
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-white/50 mb-0.5">Total</p>
                <motion.p
                  key={total}
                  initial={{ scale: 1.1 }}
                  animate={{ scale: 1 }}
                  className="text-2xl md:text-3xl font-bold text-white"
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
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    <span className="text-xs font-medium text-amber-400">
                      {winProbability.toFixed(2)}% de ganar
                    </span>
                  </motion.div>
                )}
              </div>
              
              <Button
                onClick={onContinue}
                size="lg"
                className={cn(
                  "h-12 md:h-14 px-5 md:px-8",
                  "bg-gradient-to-r from-primary to-accent",
                  "hover:from-primary/90 hover:to-accent/90",
                  "shadow-lg shadow-primary/40",
                  "text-base font-bold",
                  "rounded-xl md:rounded-2xl",
                  "group transition-all duration-300",
                  "hover:shadow-xl hover:shadow-primary/50"
                )}
              >
                <ShoppingCart className="w-5 h-5 mr-2" />
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

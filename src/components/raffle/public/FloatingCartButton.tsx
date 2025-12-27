import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/currency-utils";
import { ShoppingCart, ArrowRight, Ticket, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface FloatingCartButtonProps {
  selectedCount: number;
  total: number;
  currency: string;
  selectedTickets: string[];
  onContinue: () => void;
  onClear: () => void;
}

export function FloatingCartButton({
  selectedCount,
  total,
  currency,
  selectedTickets,
  onContinue,
  onClear,
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
      >
        <div className="bg-card rounded-2xl shadow-2xl border border-border overflow-hidden">
          {/* Gradient accent bar */}
          <div className="h-1 bg-gradient-to-r from-primary via-primary/80 to-accent" />
          
          <div className="p-4">
            {/* Header with ticket count */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center shadow-lg">
                    <Ticket className="w-6 h-6 text-primary-foreground" />
                  </div>
                  {/* Count badge */}
                  <motion.div
                    key={selectedCount}
                    initial={{ scale: 0.5 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-secondary rounded-full flex items-center justify-center text-secondary-foreground text-xs font-bold shadow-lg"
                  >
                    {selectedCount}
                  </motion.div>
                </div>
                
                <div>
                  <p className="font-semibold text-foreground">
                    {selectedCount} boleto{selectedCount !== 1 && 's'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {selectedTickets.slice(0, 3).join(', ')}
                    {selectedCount > 3 && ` +${selectedCount - 3} más`}
                  </p>
                </div>
              </div>
              
              <button
                onClick={onClear}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
                aria-label="Limpiar selección"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            
            {/* Price and CTA */}
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Total</p>
                <motion.p
                  key={total}
                  initial={{ scale: 1.1 }}
                  animate={{ scale: 1 }}
                  className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent"
                >
                  {formatCurrency(total, currency)}
                </motion.p>
              </div>
              
              <Button
                onClick={onContinue}
                size="lg"
                className={cn(
                  "flex-1 bg-gradient-to-r from-primary to-accent",
                  "hover:from-primary/90 hover:to-accent/90",
                  "shadow-lg shadow-primary/30",
                  "h-14 text-base font-semibold",
                  "group transition-all"
                )}
              >
                <ShoppingCart className="w-5 h-5 mr-2" />
                Continuar
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

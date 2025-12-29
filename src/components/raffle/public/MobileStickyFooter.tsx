import { motion, AnimatePresence } from "framer-motion";
import { Ticket, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/currency-utils";

interface MobileStickyFooterProps {
  visible: boolean;
  selectedCount: number;
  totalAmount: number;
  currency: string;
  onScrollToTickets: () => void;
  onCheckout: () => void;
}

export function MobileStickyFooter({
  visible,
  selectedCount,
  totalAmount,
  currency,
  onScrollToTickets,
  onCheckout,
}: MobileStickyFooterProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
        >
          {/* Background with blur */}
          <div className="bg-white/95 backdrop-blur-xl border-t border-border shadow-2xl shadow-black/20 safe-area-bottom">
            <div className="px-4 py-3">
              {selectedCount > 0 ? (
                /* Has selected tickets - show checkout */
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center">
                        <span className="text-white font-bold">{selectedCount}</span>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Boletos seleccionados</p>
                        <p className="font-bold text-lg text-foreground">
                          {formatCurrency(totalAmount, currency)}
                        </p>
                      </div>
                    </div>
                  </div>
                  <Button
                    size="lg"
                    onClick={onCheckout}
                    className="h-12 px-6 bg-gradient-to-r from-primary to-accent font-bold shadow-lg"
                  >
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Continuar
                  </Button>
                </div>
              ) : (
                /* No tickets selected - show CTA */
                <Button
                  size="lg"
                  onClick={onScrollToTickets}
                  className="w-full h-12 text-base font-bold bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_auto] hover:bg-right transition-all duration-500 shadow-lg"
                >
                  <Ticket className="w-5 h-5 mr-2" />
                  VER BOLETOS DISPONIBLES
                </Button>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

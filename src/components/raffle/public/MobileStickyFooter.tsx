import { motion, AnimatePresence } from "framer-motion";
import { Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MobileStickyFooterProps {
  visible: boolean;
  selectedCount: number;
  onScrollToTickets: () => void;
}

export function MobileStickyFooter({
  visible,
  selectedCount,
  onScrollToTickets,
}: MobileStickyFooterProps) {
  // Only show when visible AND no tickets selected (FloatingCartButton handles selection)
  const shouldShow = visible && selectedCount === 0;
  
  return (
    <AnimatePresence>
      {shouldShow && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed bottom-0 left-0 right-0 z-40 md:hidden"
        >
          {/* Premium glassmorphism background */}
          <div className="bg-gray-950/95 backdrop-blur-2xl border-t border-white/10 shadow-2xl shadow-black/50 safe-area-bottom">
            <div className="px-4 py-3">
              <Button
                size="lg"
                onClick={onScrollToTickets}
                className="w-full h-12 text-base font-bold bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_auto] hover:bg-right transition-all duration-500 shadow-lg shadow-primary/30 rounded-xl"
              >
                <Ticket className="w-5 h-5 mr-2" />
                VER BOLETOS DISPONIBLES
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

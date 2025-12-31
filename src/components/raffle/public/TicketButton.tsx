import { forwardRef, memo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import { LuckyNumberBadge, getNumberBadgeType } from "./LuckyNumberBadge";

interface TicketButtonProps {
  ticketNumber: string;
  status: string;
  isSelected: boolean;
  onClick: () => void;
  disabled?: boolean;
  luckyNumbers?: string[];
  popularNumbers?: string[];
  isLastFew?: boolean;
  isHighlighted?: boolean;
}

export const TicketButton = memo(forwardRef<HTMLButtonElement, TicketButtonProps>(
  function TicketButton(
    {
      ticketNumber,
      status,
      isSelected,
      onClick,
      disabled = false,
      luckyNumbers = [],
      popularNumbers = [],
      isLastFew = false,
      isHighlighted = false,
    },
    ref
  ) {
    const isAvailable = status === 'available';
    const badgeType = isAvailable ? getNumberBadgeType(ticketNumber, luckyNumbers, popularNumbers, isLastFew) : null;

    return (
      <motion.button
        ref={ref}
        onClick={onClick}
        disabled={disabled || !isAvailable}
        whileHover={isAvailable ? { scale: 1.08, y: -2 } : undefined}
        whileTap={isAvailable ? { scale: 0.95 } : undefined}
        initial={false}
        animate={isSelected ? { scale: 1.02 } : { scale: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 17 }}
        className={cn(
          "relative aspect-square rounded-lg font-bold text-sm",
          "transition-all duration-200 touch-manipulation group",
          "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1",
          
          // Highlighted state (found via search)
          isHighlighted && [
            "ring-4 ring-amber-400 ring-offset-2 animate-pulse z-10",
          ],
          
          // Available - not selected
          isAvailable && !isSelected && [
            "bg-card border border-border",
            "text-foreground/80 hover:border-primary hover:text-primary",
            "hover:shadow-lg hover:shadow-primary/20",
            "hover:bg-primary/5",
          ],
          
          // Available - selected (premium violet gradient)
          isAvailable && isSelected && [
            "bg-gradient-to-br from-primary via-primary to-accent",
            "text-primary-foreground border border-transparent",
            "shadow-lg shadow-primary/40",
            "ring-2 ring-primary/50 ring-offset-1 ring-offset-background",
          ],
          
          // Sold
          status === 'sold' && [
            "bg-muted border border-muted",
            "text-muted-foreground/50 cursor-not-allowed",
          ],
          
          // Reserved
          status === 'reserved' && [
            "bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700",
            "text-amber-600 dark:text-amber-400 cursor-not-allowed",
          ],
          
          // Canceled
          status === 'canceled' && [
            "bg-destructive/10 border border-destructive/30",
            "text-destructive/50 cursor-not-allowed",
          ]
        )}
      >
        {/* Badge for special numbers - only show when available and not selected */}
        {badgeType && !isSelected && (
          <LuckyNumberBadge type={badgeType} />
        )}
        
        {/* Content */}
        <span className={cn(
          "relative z-0 flex items-center justify-center h-full text-xs sm:text-sm",
          isSelected && "font-bold"
        )}>
          {isSelected ? (
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 15 }}
              className="flex items-center justify-center"
            >
              <Check className="w-3 h-3 sm:w-4 sm:h-4 mr-0.5" strokeWidth={3} />
              <span className="text-[10px] sm:text-xs">{ticketNumber}</span>
            </motion.div>
          ) : (
            ticketNumber
          )}
        </span>
        
        {/* Selection ripple effect */}
        {isSelected && (
          <motion.div
            initial={{ scale: 0.5, opacity: 0.8 }}
            animate={{ scale: 2.5, opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="absolute inset-0 bg-primary rounded-lg pointer-events-none"
          />
        )}
        
        {/* Hover glow effect for available tickets */}
        {isAvailable && !isSelected && (
          <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-primary/0 to-accent/0 group-hover:from-primary/5 group-hover:to-accent/5 transition-all duration-200 pointer-events-none" />
        )}
      </motion.button>
    );
  }
));

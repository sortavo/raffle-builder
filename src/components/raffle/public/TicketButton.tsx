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
        whileHover={isAvailable ? { scale: 1.03 } : undefined}
        whileTap={isAvailable ? { scale: 0.97 } : undefined}
        initial={false}
        animate={isSelected ? { scale: 1.02 } : { scale: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 20 }}
        className={cn(
          "relative aspect-square rounded-lg font-mono font-bold text-sm",
          "transition-all duration-150 touch-manipulation",
          "focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:ring-offset-1 focus:ring-offset-[#030712]",
          
          // Highlighted state (found via search)
          isHighlighted && [
            "ring-2 ring-amber-400 ring-offset-2 ring-offset-[#030712] z-10",
          ],
          
          // Available - not selected (ultra subtle dark)
          isAvailable && !isSelected && [
            "bg-white/[0.03] border border-white/[0.08]",
            "text-white/70",
            "hover:bg-white/[0.06] hover:border-white/[0.12] hover:text-white",
          ],
          
          // Available - selected (emerald solid)
          isAvailable && isSelected && [
            "bg-emerald-500 text-white",
            "border border-emerald-400",
            "shadow-lg shadow-emerald-500/30",
          ],
          
          // Sold (very subtle with diagonal pattern)
          status === 'sold' && [
            "bg-white/[0.02] border border-white/[0.04]",
            "text-white/20 cursor-not-allowed",
            "bg-[repeating-linear-gradient(45deg,transparent,transparent_3px,rgba(255,255,255,0.02)_3px,rgba(255,255,255,0.02)_6px)]",
          ],
          
          // Reserved
          status === 'reserved' && [
            "bg-amber-500/10 border border-amber-500/20",
            "text-amber-500/50 cursor-not-allowed",
          ],
          
          // Canceled
          status === 'canceled' && [
            "bg-red-500/5 border border-red-500/10",
            "text-red-500/30 cursor-not-allowed",
          ]
        )}
      >
        {/* Badge for special numbers - only show when available and not selected */}
        {badgeType && !isSelected && (
          <LuckyNumberBadge type={badgeType} />
        )}
        
        {/* Content */}
        <span className={cn(
          "relative z-0 flex items-center justify-center h-full text-xs sm:text-sm tabular-nums",
          isSelected && "font-bold"
        )}>
          {isSelected ? (
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 15 }}
              className="flex items-center justify-center gap-0.5"
            >
              <Check className="w-3 h-3 sm:w-4 sm:h-4" strokeWidth={3} />
              <span className="text-[10px] sm:text-xs">{ticketNumber}</span>
            </motion.div>
          ) : (
            ticketNumber
          )}
        </span>
      </motion.button>
    );
  }
));

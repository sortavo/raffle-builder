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
  isLightTemplate?: boolean;
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
      isLightTemplate = false,
    },
    ref
  ) {
    const isAvailable = status === 'available';
    const badgeType = isAvailable ? getNumberBadgeType(ticketNumber, luckyNumbers, popularNumbers, isLastFew) : null;

    // Theme-aware colors
    const colors = isLightTemplate ? {
      focusRingOffset: 'focus:ring-offset-white',
      highlightRingOffset: 'ring-offset-white',
      availableBg: 'bg-gray-50 border border-gray-200',
      availableText: 'text-gray-700',
      availableHover: 'hover:bg-gray-100 hover:border-gray-300 hover:text-gray-900',
      availableHoverShadow: 'hover:shadow-md hover:shadow-emerald-500/10',
      soldBg: 'bg-gray-100 border border-gray-200',
      soldText: 'text-gray-300 cursor-not-allowed',
      soldPattern: 'bg-[repeating-linear-gradient(45deg,transparent,transparent_3px,rgba(0,0,0,0.03)_3px,rgba(0,0,0,0.03)_6px)]',
      reservedBg: 'bg-amber-50 border border-amber-200',
      reservedText: 'text-amber-400 cursor-not-allowed',
      canceledBg: 'bg-red-50 border border-red-200',
      canceledText: 'text-red-300 cursor-not-allowed',
      checkBg: 'bg-white',
    } : {
      focusRingOffset: 'focus:ring-offset-[#030712]',
      highlightRingOffset: 'ring-offset-[#030712]',
      availableBg: 'bg-white/[0.03] border border-white/[0.08]',
      availableText: 'text-white/70',
      availableHover: 'hover:bg-white/[0.08] hover:border-white/[0.15] hover:text-white',
      availableHoverShadow: 'hover:shadow-lg hover:shadow-emerald-500/10',
      soldBg: 'bg-white/[0.02] border border-white/[0.04]',
      soldText: 'text-white/20 cursor-not-allowed',
      soldPattern: 'bg-[repeating-linear-gradient(45deg,transparent,transparent_3px,rgba(255,255,255,0.03)_3px,rgba(255,255,255,0.03)_6px)]',
      reservedBg: 'bg-amber-500/10 border border-amber-500/20',
      reservedText: 'text-amber-500/50 cursor-not-allowed',
      canceledBg: 'bg-red-500/5 border border-red-500/10',
      canceledText: 'text-red-500/30 cursor-not-allowed',
      checkBg: 'bg-[#030712]',
    };

    return (
      <motion.button
        ref={ref}
        onClick={onClick}
        disabled={disabled || !isAvailable}
        whileHover={isAvailable ? { scale: 1.05, y: -2 } : undefined}
        whileTap={isAvailable ? { scale: 0.95 } : undefined}
        initial={false}
        animate={isSelected ? { scale: 1.02 } : { scale: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 20 }}
        className={cn(
          "relative aspect-square rounded-lg font-mono font-bold text-sm",
          "transition-all duration-200 touch-manipulation",
          `focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:ring-offset-1 ${colors.focusRingOffset}`,
          
          // Highlighted state (found via search)
          isHighlighted && [
            `ring-2 ring-amber-400 ring-offset-2 ${colors.highlightRingOffset} z-10`,
          ],
          
          // Available - not selected
          isAvailable && !isSelected && [
            colors.availableBg,
            colors.availableText,
            colors.availableHover,
            colors.availableHoverShadow,
          ],
          
          // Available - selected (emerald solid with glow)
          isAvailable && isSelected && [
            "bg-emerald-500 text-white",
            "border border-emerald-400",
            "shadow-lg shadow-emerald-500/40",
          ],
          
          // Sold
          status === 'sold' && [
            colors.soldBg,
            colors.soldText,
            colors.soldPattern,
          ],
          
          // Reserved
          status === 'reserved' && [
            colors.reservedBg,
            colors.reservedText,
          ],
          
          // Canceled
          status === 'canceled' && [
            colors.canceledBg,
            colors.canceledText,
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

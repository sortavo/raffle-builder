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

    // Theme-aware colors - TRAFFIC LIGHT SYSTEM
    // Green = Available | Red = Sold | Yellow = Reserved
    const colors = isLightTemplate ? {
      focusRingOffset: 'focus:ring-offset-white',
      highlightRingOffset: 'ring-offset-white',
      // AVAILABLE - Green (clearly visible)
      availableBg: 'bg-emerald-100 border border-emerald-300',
      availableText: 'text-emerald-700',
      availableHover: 'hover:bg-emerald-200 hover:border-emerald-400 hover:text-emerald-800',
      availableHoverShadow: 'hover:shadow-md hover:shadow-emerald-500/20',
      // SOLD - Red (clearly unavailable)
      soldBg: 'bg-red-100 border border-red-200',
      soldText: 'text-red-400 cursor-not-allowed',
      soldPattern: 'bg-[repeating-linear-gradient(45deg,transparent,transparent_3px,rgba(239,68,68,0.08)_3px,rgba(239,68,68,0.08)_6px)]',
      // RESERVED - Amber/Yellow (waiting state)
      reservedBg: 'bg-amber-100 border border-amber-300',
      reservedText: 'text-amber-600 cursor-not-allowed',
      // PENDING_APPROVAL - Orange (awaiting payment confirmation)
      pendingApprovalBg: 'bg-orange-100 border border-orange-300',
      pendingApprovalText: 'text-orange-600 cursor-not-allowed',
      // CANCELED - Gray
      canceledBg: 'bg-gray-100 border border-gray-200',
      canceledText: 'text-gray-400 cursor-not-allowed',
      checkBg: 'bg-white',
    } : {
      focusRingOffset: 'focus:ring-offset-[#030712]',
      highlightRingOffset: 'ring-offset-[#030712]',
      // AVAILABLE - Green (clearly visible on dark)
      availableBg: 'bg-emerald-500/20 border border-emerald-500/40',
      availableText: 'text-emerald-300',
      availableHover: 'hover:bg-emerald-500/30 hover:border-emerald-500/50 hover:text-emerald-200',
      availableHoverShadow: 'hover:shadow-lg hover:shadow-emerald-500/20',
      // SOLD - Red (clearly unavailable)
      soldBg: 'bg-red-500/15 border border-red-500/30',
      soldText: 'text-red-400/60 cursor-not-allowed',
      soldPattern: 'bg-[repeating-linear-gradient(45deg,transparent,transparent_3px,rgba(239,68,68,0.1)_3px,rgba(239,68,68,0.1)_6px)]',
      // RESERVED - Amber/Yellow (waiting state)
      reservedBg: 'bg-amber-500/20 border border-amber-500/40',
      reservedText: 'text-amber-400 cursor-not-allowed',
      // PENDING_APPROVAL - Orange (awaiting payment confirmation)
      pendingApprovalBg: 'bg-orange-500/20 border border-orange-500/40',
      pendingApprovalText: 'text-orange-400 cursor-not-allowed',
      // CANCELED - Muted gray
      canceledBg: 'bg-gray-500/10 border border-gray-500/20',
      canceledText: 'text-gray-500/50 cursor-not-allowed',
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

          // Pending Approval
          status === 'pending_approval' && [
            colors.pendingApprovalBg,
            colors.pendingApprovalText,
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

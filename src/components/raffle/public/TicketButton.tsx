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

export function TicketButton({
  ticketNumber,
  status,
  isSelected,
  onClick,
  disabled = false,
  luckyNumbers = [],
  popularNumbers = [],
  isLastFew = false,
  isHighlighted = false,
}: TicketButtonProps) {
  const isAvailable = status === 'available';
  const badgeType = isAvailable ? getNumberBadgeType(ticketNumber, luckyNumbers, popularNumbers, isLastFew) : null;

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled || !isAvailable}
      whileHover={isAvailable ? { scale: 1.08, y: -2 } : undefined}
      whileTap={isAvailable ? { scale: 0.95 } : undefined}
      initial={false}
      animate={isSelected ? { scale: 1.05 } : { scale: 1 }}
      className={cn(
        "relative aspect-square rounded-xl font-bold text-sm",
        "transition-all duration-200 touch-manipulation",
        "focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2",
        
        // Highlighted state (found via search)
        isHighlighted && [
          "ring-4 ring-amber-400 ring-offset-2 animate-pulse",
        ],
        
        // Available - not selected
        isAvailable && !isSelected && [
          "bg-white border-2 border-gray-300",
          "text-gray-900 hover:border-violet-500 hover:text-violet-600",
          "hover:shadow-lg hover:shadow-violet-500/20",
        ],
        
        // Available - selected
        isAvailable && isSelected && [
          "bg-gradient-to-br from-violet-600 to-indigo-600",
          "text-white border-2 border-transparent",
          "shadow-lg shadow-violet-500/40",
        ],
        
        // Sold
        status === 'sold' && [
          "bg-gray-100 border-2 border-gray-200",
          "text-gray-400 cursor-not-allowed",
        ],
        
        // Reserved
        status === 'reserved' && [
          "bg-amber-50 border-2 border-amber-300",
          "text-amber-700 cursor-not-allowed",
        ],
        
        // Canceled
        status === 'canceled' && [
          "bg-red-50 border-2 border-red-200",
          "text-red-400 cursor-not-allowed",
        ]
      )}
    >
      {/* Badge for special numbers */}
      {badgeType && !isSelected && (
        <LuckyNumberBadge type={badgeType} />
      )}
      
      {/* Content */}
      <span className={cn(
        "relative z-0 flex items-center justify-center h-full",
        isSelected && "font-bold"
      )}>
        {isSelected ? (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="flex items-center justify-center"
          >
            <Check className="w-4 h-4 mr-0.5" />
            <span className="text-xs">{ticketNumber}</span>
          </motion.div>
        ) : (
          ticketNumber
        )}
      </span>
      
      {/* Selection animation ripple */}
      {isSelected && (
        <motion.div
          initial={{ scale: 0.5, opacity: 1 }}
          animate={{ scale: 1.5, opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="absolute inset-0 bg-violet-400 rounded-xl pointer-events-none"
        />
      )}
    </motion.button>
  );
}

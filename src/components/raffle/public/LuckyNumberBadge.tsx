import { cn } from "@/lib/utils";

interface LuckyNumberBadgeProps {
  type: 'lucky' | 'popular' | 'hot' | 'last';
  className?: string;
}

const badgeConfig = {
  lucky: {
    label: '★',
    colors: 'bg-emerald-500',
  },
  popular: {
    label: '●',
    colors: 'bg-blue-500',
  },
  hot: {
    label: '●',
    colors: 'bg-amber-500',
  },
  last: {
    label: '!',
    colors: 'bg-red-500',
  },
};

export function LuckyNumberBadge({ type, className }: LuckyNumberBadgeProps) {
  const config = badgeConfig[type];

  return (
    <div
      className={cn(
        "absolute -top-0.5 -right-0.5 z-10",
        "w-3 h-3 rounded-full",
        "flex items-center justify-center",
        "text-[8px] font-bold text-white",
        config.colors,
        className
      )}
    >
      {config.label}
    </div>
  );
}

// Utility to determine if a number should have a badge
export function getNumberBadgeType(
  ticketNumber: string,
  luckyNumbers: string[] = [],
  popularNumbers: string[] = [],
  lastFewAvailable: boolean = false
): 'lucky' | 'popular' | 'hot' | 'last' | null {
  if (luckyNumbers.includes(ticketNumber)) return 'lucky';
  if (popularNumbers.includes(ticketNumber)) return 'popular';
  if (lastFewAvailable) return 'last';
  
  // Check for "hot" patterns (repeating digits, sequences, etc.)
  const num = parseInt(ticketNumber, 10);
  const str = ticketNumber.replace(/^0+/, '');
  
  // Repeating digits (111, 222, 777, etc.)
  if (str.length >= 2 && new Set(str.split('')).size === 1) return 'hot';
  
  // Lucky 7s
  if (str.includes('777')) return 'hot';
  
  // Round numbers ending in 00
  if (num % 100 === 0 && num > 0) return 'popular';
  
  return null;
}

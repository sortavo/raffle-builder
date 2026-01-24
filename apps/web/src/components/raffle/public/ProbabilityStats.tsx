import { useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatCurrency } from "@/lib/currency-utils";
import { cn } from "@/lib/utils";
import { 
  TrendingUp, 
  Target, 
  Ticket,
  Sparkles,
  BarChart3
} from "lucide-react";

// Structured probability result for intentional rendering
interface ProbabilityFormat {
  kind: 'percent' | 'oneIn';
  percent?: string;
  oneIn?: number;
}

// Smart probability formatting - returns structured data for intentional two-line rendering
function getProbabilityFormat(probability: number): ProbabilityFormat {
  if (probability >= 10) {
    return { kind: 'percent', percent: probability.toFixed(0) + '%' };
  } else if (probability >= 1) {
    return { kind: 'percent', percent: probability.toFixed(1) + '%' };
  } else if (probability >= 0.1) {
    return { kind: 'percent', percent: probability.toFixed(2) + '%' };
  } else if (probability >= 0.01) {
    return { kind: 'percent', percent: probability.toFixed(2) + '%' };
  } else if (probability > 0) {
    // For very small percentages, use "1 en X" format
    const oneInX = Math.round(100 / probability);
    if (oneInX >= 1000) {
      return { kind: 'oneIn', oneIn: oneInX };
    }
    return { kind: 'percent', percent: probability.toFixed(2) + '%' };
  }
  return { kind: 'percent', percent: '0%' };
}

// Legacy string format for simple cases
function formatProbability(probability: number): string {
  const format = getProbabilityFormat(probability);
  if (format.kind === 'percent') {
    return format.percent!;
  }
  return `1 en ${format.oneIn!.toLocaleString()}`;
}

interface ProbabilityStatsProps {
  totalTickets: number;
  ticketsSold: number;
  ticketsAvailable: number;
  ticketPrice: number;
  currencyCode: string;
  selectedCount?: number;
  isLightTemplate?: boolean;
}

export function ProbabilityStats({
  totalTickets,
  ticketsSold,
  ticketsAvailable,
  ticketPrice,
  currencyCode,
  selectedCount = 0,
  isLightTemplate = false
}: ProbabilityStatsProps) {
  const stats = useMemo(() => {
    const probabilityPerTicket = ticketsAvailable > 0 ? (1 / ticketsAvailable) * 100 : 0;
    const probabilityWithSelection = ticketsAvailable > 0 ? (selectedCount / ticketsAvailable) * 100 : 0;
    const soldPercentage = (ticketsSold / totalTickets) * 100;
    
    // Compare to national lottery (approximately 1 in 10 million)
    const nationalLotteryOdds = 1 / 10000000;
    const raffleOdds = ticketsAvailable > 0 ? 1 / ticketsAvailable : 0;
    const timesMoreLikely = raffleOdds > 0 ? Math.round(raffleOdds / nationalLotteryOdds) : 0;
    
    return {
      probabilityPerTicket,
      probabilityWithSelection,
      soldPercentage,
      timesMoreLikely
    };
  }, [totalTickets, ticketsSold, ticketsAvailable, selectedCount]);

  // Theme-aware colors
  const colors = isLightTemplate ? {
    cardBg: 'bg-white border-gray-200',
    cardShadow: 'shadow-xl shadow-emerald-500/5',
    text: 'text-gray-900',
    textMuted: 'text-gray-500',
    textSubtle: 'text-gray-400',
    innerCardBg: 'bg-gray-50',
    innerCardBorder: 'border-gray-200',
    innerCardHover: 'hover:border-emerald-500/30',
    iconBg: 'bg-emerald-100',
    iconText: 'text-emerald-600',
    progressBg: 'bg-gray-200',
    badgeBg: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    amberBadgeBg: 'bg-amber-100 text-amber-700 border-amber-200',
    packageCardBg: 'bg-gray-50 border-gray-200 hover:border-emerald-500/30 hover:bg-gray-100',
  } : {
    cardBg: 'bg-white/[0.03] border-white/[0.08]',
    cardShadow: 'shadow-2xl shadow-emerald-500/10',
    text: 'text-white',
    textMuted: 'text-white/50',
    textSubtle: 'text-white/40',
    innerCardBg: 'bg-white/[0.03]',
    innerCardBorder: 'border-white/[0.08]',
    innerCardHover: 'hover:border-emerald-500/20',
    iconBg: 'bg-emerald-500/10',
    iconText: 'text-emerald-400',
    progressBg: 'bg-white/[0.06]',
    badgeBg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    amberBadgeBg: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    packageCardBg: 'bg-white/[0.03] border-white/[0.06] hover:border-emerald-500/30 hover:bg-white/[0.05]',
  };

  const packageMultipliers = [
    { qty: 3, label: "3 boletos" },
    { qty: 5, label: "5 boletos" },
    { qty: 10, label: "10 boletos" }
  ];

  // Get structured probability formats
  const mainProbFormat = getProbabilityFormat(stats.probabilityPerTicket);
  const selectionProbFormat = getProbabilityFormat(stats.probabilityWithSelection);

  // Render probability with intentional two-line layout for "1 en X" format
  const renderProbability = (
    format: ProbabilityFormat, 
    sizeClasses: { label: string; number: string },
    labelColor: string
  ) => {
    if (format.kind === 'oneIn') {
      return (
        <div className="flex flex-col items-center leading-none">
          <span className={cn(sizeClasses.label, labelColor, "font-semibold uppercase tracking-wide")}>
            1 en
          </span>
          <span className={cn(sizeClasses.number, "font-black text-emerald-500 tabular-nums tracking-[-0.02em]")}>
            {format.oneIn!.toLocaleString()}
          </span>
        </div>
      );
    }
    return (
      <span className={cn(sizeClasses.number, "font-black text-emerald-500 tabular-nums tracking-[-0.02em]")}>
        {format.percent}
      </span>
    );
  };

  // Render package card probability - compact version for grid
  const renderPackageProbability = (format: ProbabilityFormat) => {
    if (format.kind === 'oneIn') {
      return (
        <div className="flex flex-col items-center leading-none min-w-0">
          <span className={cn("text-[10px] sm:text-xs font-semibold uppercase tracking-wide", colors.textMuted)}>
            1 en
          </span>
          <span className="text-lg sm:text-2xl font-black text-emerald-500 tabular-nums tracking-tight">
            {format.oneIn!.toLocaleString()}
          </span>
        </div>
      );
    }
    return (
      <span className="text-lg sm:text-2xl font-black text-emerald-500 tabular-nums tracking-tight">
        {format.percent}
      </span>
    );
  };

  return (
    <Card className={cn(
      "relative border backdrop-blur-xl overflow-hidden",
      colors.cardBg, colors.cardShadow
    )}>
      {/* Animated orbs background - only show on dark template */}
      {!isLightTemplate && (
        <>
          <motion.div 
            className="absolute top-0 right-0 w-[300px] h-[300px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none"
            animate={{ 
              x: [0, 20, 0], 
              y: [0, -15, 0],
              scale: [1, 1.1, 1]
            }}
            transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div 
            className="absolute bottom-0 left-0 w-[250px] h-[250px] bg-teal-500/8 rounded-full blur-[120px] pointer-events-none"
            animate={{ 
              x: [0, -15, 0], 
              y: [0, 20, 0]
            }}
            transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          />
          <motion.div 
            className="absolute top-1/2 left-1/2 w-[200px] h-[200px] bg-violet-500/5 rounded-full blur-[120px] pointer-events-none -translate-x-1/2 -translate-y-1/2"
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.6, 0.3]
            }}
            transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          />
        </>
      )}
      
      {/* Grid pattern overlay */}
      <div 
        className={cn(
          "absolute inset-0 pointer-events-none",
          isLightTemplate ? "opacity-[0.02]" : "opacity-[0.03]"
        )}
        style={{
          backgroundImage: isLightTemplate 
            ? `linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)`
            : `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '48px 48px'
        }}
      />
      
      <CardContent className="relative pt-8 sm:pt-10 pb-8 sm:pb-10 space-y-8 sm:space-y-10">
        {/* Header */}
        <div className="text-center">
          <motion.div 
            className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-xl shadow-emerald-500/30"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <BarChart3 className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
          </motion.div>
          <h3 className={cn("text-xl sm:text-2xl lg:text-3xl font-black tracking-tight", colors.text)}>
            Tus Probabilidades
          </h3>
          <p className={cn("text-sm sm:text-base mt-2", colors.textMuted)}>
            Estadísticas en tiempo real
          </p>
        </div>

        {/* Main probability */}
        <div className={cn(
          "backdrop-blur-sm rounded-xl sm:rounded-2xl p-5 sm:p-8 border transition-colors",
          colors.innerCardBg, colors.innerCardBorder, colors.innerCardHover
        )}>
          <div className="flex items-center justify-between mb-4 sm:mb-6 gap-3">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <div className={cn("w-11 h-11 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center shrink-0", colors.iconBg)}>
                <Target className={cn("w-5 h-5 sm:w-7 sm:h-7", colors.iconText)} />
              </div>
              <span className={cn("font-semibold text-sm sm:text-lg", colors.text, "opacity-80")}>
                Probabilidad por boleto
              </span>
            </div>
            <Badge className={cn("shadow-lg shadow-emerald-500/10 text-xs sm:text-sm px-2.5 py-1.5 sm:px-4 sm:py-2 shrink-0", colors.badgeBg)}>
              1 de {ticketsAvailable.toLocaleString()}
            </Badge>
          </div>
          
          <div className="text-center py-4 sm:py-6">
            <motion.div
              key={stats.probabilityPerTicket}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
            >
              {renderProbability(
                mainProbFormat,
                { label: 'text-base sm:text-lg', number: 'text-5xl sm:text-6xl lg:text-7xl' },
                colors.textMuted
              )}
            </motion.div>
          </div>
        </div>

        {/* Progress bar - tickets sold */}
        <div className="space-y-2.5 sm:space-y-3">
          <div className="flex items-center justify-between text-sm sm:text-base">
            <span className={colors.textMuted}>Boletos vendidos</span>
            <span className={cn("font-bold text-base sm:text-lg tabular-nums", colors.text)}>
              {ticketsSold.toLocaleString()} / {totalTickets.toLocaleString()}
            </span>
          </div>
          <Progress 
            value={stats.soldPercentage} 
            className={cn("h-3 sm:h-4", colors.progressBg, "[&>div]:bg-gradient-to-r [&>div]:from-emerald-600 [&>div]:to-emerald-400")} 
          />
          <p className={cn("text-xs sm:text-sm text-center tabular-nums", colors.textSubtle)}>
            {ticketsAvailable.toLocaleString()} boletos disponibles
          </p>
        </div>

        {/* Comparison badge */}
        {stats.timesMoreLikely > 1000 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "flex items-center justify-center gap-2.5 sm:gap-3 p-4 sm:p-5 rounded-xl sm:rounded-2xl border shimmer-badge",
              colors.amberBadgeBg
            )}
          >
            <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-amber-500 shrink-0" />
            <span className="text-sm sm:text-base font-semibold text-amber-600">
              {stats.timesMoreLikely.toLocaleString()}× más probable que la lotería nacional
            </span>
          </motion.div>
        )}

        {/* Package multipliers */}
        <div className="space-y-4 sm:space-y-6">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className={cn("w-11 h-11 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center shrink-0", colors.iconBg)}>
              <TrendingUp className={cn("w-5 h-5 sm:w-7 sm:h-7", colors.iconText)} />
            </div>
            <span className={cn("font-semibold text-sm sm:text-lg", colors.text, "opacity-80")}>
              Aumenta tus probabilidades
            </span>
          </div>
          
          <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
            {packageMultipliers.map((pkg) => {
              const pkgProbability = ticketsAvailable > 0 ? (pkg.qty / ticketsAvailable) * 100 : 0;
              const pkgFormat = getProbabilityFormat(pkgProbability);
              const cost = pkg.qty * ticketPrice;
              
              return (
                <div 
                  key={pkg.qty}
                  className={cn(
                    "text-center p-3 sm:p-5 backdrop-blur-sm rounded-xl sm:rounded-2xl border transition-all duration-300 group hover:shadow-lg hover:shadow-emerald-500/10 min-w-0",
                    colors.packageCardBg
                  )}
                >
                  <div className="flex items-center justify-center gap-1 sm:gap-1.5 mb-2 sm:mb-3">
                    <Ticket className={cn("w-3 h-3 sm:w-4 sm:h-4 group-hover:text-emerald-500 transition-colors shrink-0", colors.textSubtle)} />
                    <span className={cn("text-[11px] sm:text-sm truncate", colors.textMuted)}>{pkg.label}</span>
                  </div>
                  {renderPackageProbability(pkgFormat)}
                  <p className={cn("text-[11px] sm:text-sm mt-1.5 sm:mt-2 tabular-nums", colors.textSubtle)}>
                    {formatCurrency(cost, currencyCode)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected tickets probability */}
        {selectedCount > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-5 sm:p-8 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl sm:rounded-2xl text-white shadow-2xl shadow-emerald-500/30"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm sm:text-base opacity-90">Con tus {selectedCount} boletos</p>
                <div className="mt-1">
                  {selectionProbFormat.kind === 'oneIn' ? (
                    <div className="flex flex-col leading-none">
                      <span className="text-sm sm:text-base opacity-80 font-semibold uppercase tracking-wide">
                        1 en
                      </span>
                      <span className="text-3xl sm:text-4xl lg:text-5xl font-black tabular-nums tracking-[-0.04em]">
                        {selectionProbFormat.oneIn!.toLocaleString()}
                      </span>
                    </div>
                  ) : (
                    <p className="text-3xl sm:text-4xl lg:text-5xl font-black tabular-nums tracking-[-0.04em]">
                      {selectionProbFormat.percent} de ganar
                    </p>
                  )}
                </div>
              </div>
              <div className="w-14 h-14 sm:w-20 sm:h-20 bg-white/20 rounded-xl sm:rounded-2xl flex items-center justify-center backdrop-blur-sm shrink-0">
                <Sparkles className="w-7 h-7 sm:w-10 sm:h-10" />
              </div>
            </div>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}

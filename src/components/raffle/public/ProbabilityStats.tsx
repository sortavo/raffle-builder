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

// Smart probability formatting - shows readable format for small percentages
function formatProbability(probability: number): string {
  if (probability >= 10) {
    return probability.toFixed(0) + '%';
  } else if (probability >= 1) {
    return probability.toFixed(1) + '%';
  } else if (probability >= 0.1) {
    return probability.toFixed(2) + '%';
  } else if (probability >= 0.01) {
    return probability.toFixed(2) + '%';
  } else if (probability > 0) {
    // For very small percentages, show as "1 en X" format which is more readable
    const oneInX = Math.round(100 / probability);
    if (oneInX >= 1000) {
      return `1 en ${oneInX.toLocaleString()}`;
    }
    return probability.toFixed(2) + '%';
  }
  return '0%';
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
      
      <CardContent className="relative pt-10 pb-10 space-y-10">
        {/* Header */}
        <div className="text-center">
          <motion.div 
            className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-500/30"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <BarChart3 className="w-10 h-10 text-white" />
          </motion.div>
          <h3 className={cn("text-2xl lg:text-3xl font-black tracking-tight", colors.text)}>
            Tus Probabilidades
          </h3>
          <p className={cn("text-base mt-2", colors.textMuted)}>
            Estadísticas en tiempo real
          </p>
        </div>

        {/* Main probability */}
        <div className={cn(
          "backdrop-blur-sm rounded-2xl p-8 border transition-colors",
          colors.innerCardBg, colors.innerCardBorder, colors.innerCardHover
        )}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className={cn("w-14 h-14 rounded-xl flex items-center justify-center", colors.iconBg)}>
                <Target className={cn("w-7 h-7", colors.iconText)} />
              </div>
              <span className={cn("font-semibold text-lg", colors.text, "opacity-80")}>
                Probabilidad por boleto
              </span>
            </div>
            <Badge className={cn("shadow-lg shadow-emerald-500/10 text-sm px-4 py-2", colors.badgeBg)}>
              1 de {ticketsAvailable.toLocaleString()}
            </Badge>
          </div>
          
          <div className="text-center py-6">
            <motion.span 
              className="text-6xl lg:text-7xl font-black text-emerald-500 tracking-[-0.04em]"
              key={stats.probabilityPerTicket}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
            >
              {formatProbability(stats.probabilityPerTicket)}
            </motion.span>
          </div>
        </div>

        {/* Progress bar - tickets sold */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-base">
            <span className={colors.textMuted}>Boletos vendidos</span>
            <span className={cn("font-bold text-lg", colors.text)}>
              {ticketsSold.toLocaleString()} / {totalTickets.toLocaleString()}
            </span>
          </div>
          <Progress 
            value={stats.soldPercentage} 
            className={cn("h-4", colors.progressBg, "[&>div]:bg-gradient-to-r [&>div]:from-emerald-600 [&>div]:to-emerald-400")} 
          />
          <p className={cn("text-sm text-center", colors.textSubtle)}>
            {ticketsAvailable.toLocaleString()} boletos disponibles
          </p>
        </div>

        {/* Comparison badge */}
        {stats.timesMoreLikely > 1000 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "flex items-center justify-center gap-3 p-5 rounded-2xl border shimmer-badge",
              colors.amberBadgeBg
            )}
          >
            <Sparkles className="w-6 h-6 text-amber-500" />
            <span className="text-base font-semibold text-amber-600">
              {stats.timesMoreLikely.toLocaleString()}× más probable que la lotería nacional
            </span>
          </motion.div>
        )}

        {/* Package multipliers */}
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <div className={cn("w-14 h-14 rounded-xl flex items-center justify-center", colors.iconBg)}>
              <TrendingUp className={cn("w-7 h-7", colors.iconText)} />
            </div>
            <span className={cn("font-semibold text-lg", colors.text, "opacity-80")}>
              Aumenta tus probabilidades
            </span>
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            {packageMultipliers.map((pkg) => {
              const pkgProbability = ticketsAvailable > 0 ? (pkg.qty / ticketsAvailable) * 100 : 0;
              const cost = pkg.qty * ticketPrice;
              
              return (
                <div 
                  key={pkg.qty}
                  className={cn(
                    "text-center p-6 backdrop-blur-sm rounded-2xl border transition-all duration-300 group hover:shadow-lg hover:shadow-emerald-500/10",
                    colors.packageCardBg
                  )}
                >
                  <div className="flex items-center justify-center gap-1.5 mb-3">
                    <Ticket className={cn("w-4 h-4 group-hover:text-emerald-500 transition-colors", colors.textSubtle)} />
                    <span className={cn("text-sm", colors.textMuted)}>{pkg.label}</span>
                  </div>
                  <p className="text-2xl lg:text-3xl font-black text-emerald-500 tracking-tight">
                    {formatProbability(pkgProbability)}
                  </p>
                  <p className={cn("text-sm mt-2", colors.textSubtle)}>
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
            className="p-8 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl text-white shadow-2xl shadow-emerald-500/30"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-base opacity-90">Con tus {selectedCount} boletos</p>
                <p className="text-4xl lg:text-5xl font-black tracking-[-0.04em]">
                  {formatProbability(stats.probabilityWithSelection)} de ganar
                </p>
              </div>
              <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                <Sparkles className="w-10 h-10" />
              </div>
            </div>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatCurrency } from "@/lib/currency-utils";
import { 
  TrendingUp, 
  Target, 
  Ticket,
  Sparkles,
  BarChart3
} from "lucide-react";

interface ProbabilityStatsProps {
  totalTickets: number;
  ticketsSold: number;
  ticketsAvailable: number;
  ticketPrice: number;
  currencyCode: string;
  selectedCount?: number;
}

export function ProbabilityStats({
  totalTickets,
  ticketsSold,
  ticketsAvailable,
  ticketPrice,
  currencyCode,
  selectedCount = 0
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

  const packageMultipliers = [
    { qty: 3, label: "3 boletos" },
    { qty: 5, label: "5 boletos" },
    { qty: 10, label: "10 boletos" }
  ];

  return (
    <Card className="bg-white/[0.03] border border-white/[0.06] backdrop-blur-sm overflow-hidden">
      <CardContent className="pt-6 space-y-6">
        {/* Header */}
        <div className="text-center">
          <motion.div 
            className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center mx-auto mb-3"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <BarChart3 className="w-7 h-7 text-white" />
          </motion.div>
          <h3 className="text-lg font-bold text-white">Tus Probabilidades</h3>
          <p className="text-sm text-white/60">Estadísticas en tiempo real</p>
        </div>

        {/* Main probability */}
        <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-emerald-400" />
              <span className="font-medium text-white/80">Probabilidad por boleto</span>
            </div>
            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
              1 de {ticketsAvailable.toLocaleString()}
            </Badge>
          </div>
          
          <div className="text-center py-3">
            <motion.span 
              className="text-4xl font-bold text-emerald-400"
              key={stats.probabilityPerTicket}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
            >
              {stats.probabilityPerTicket.toFixed(2)}%
            </motion.span>
          </div>
        </div>

        {/* Progress bar - tickets sold */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/60">Boletos vendidos</span>
            <span className="font-semibold text-white">
              {ticketsSold.toLocaleString()} / {totalTickets.toLocaleString()}
            </span>
          </div>
          <Progress value={stats.soldPercentage} className="h-3 bg-white/[0.06] [&>div]:bg-emerald-500" />
          <p className="text-xs text-white/40 text-center">
            {ticketsAvailable.toLocaleString()} boletos disponibles
          </p>
        </div>

        {/* Comparison badge */}
        {stats.timesMoreLikely > 1000 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-center gap-2 p-3 bg-amber-500/10 rounded-xl border border-amber-500/20"
          >
            <Sparkles className="w-5 h-5 text-amber-400" />
            <span className="text-sm font-medium text-amber-400">
              {stats.timesMoreLikely.toLocaleString()}× más probable que la lotería nacional
            </span>
          </motion.div>
        )}

        {/* Package multipliers */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-white/80">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            Aumenta tus probabilidades
          </div>
          
          <div className="grid grid-cols-3 gap-2">
            {packageMultipliers.map((pkg) => {
              const pkgProbability = ticketsAvailable > 0 ? (pkg.qty / ticketsAvailable) * 100 : 0;
              const cost = pkg.qty * ticketPrice;
              
              return (
                <div 
                  key={pkg.qty}
                  className="text-center p-3 bg-white/[0.03] rounded-lg border border-white/[0.06] hover:border-emerald-500/30 transition-colors"
                >
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Ticket className="w-3 h-3 text-white/40" />
                    <span className="text-xs text-white/50">{pkg.label}</span>
                  </div>
                  <p className="text-lg font-bold text-emerald-400">
                    {pkgProbability.toFixed(2)}%
                  </p>
                  <p className="text-xs text-white/40">
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
            className="p-4 bg-gradient-to-r from-violet-500 to-indigo-500 rounded-xl text-white"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Con tus {selectedCount} boletos</p>
                <p className="text-2xl font-bold">
                  {stats.probabilityWithSelection.toFixed(2)}% de ganar
                </p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <Sparkles className="w-6 h-6" />
              </div>
            </div>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}

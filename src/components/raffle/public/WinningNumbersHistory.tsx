import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Trophy, 
  ChevronDown, 
  ChevronUp, 
  Sparkles,
  TrendingUp,
  Hash
} from "lucide-react";
import { cn } from "@/lib/utils";

interface WinningNumber {
  ticket_number: string;
  raffle_title: string;
  draw_date: string;
}

interface WinningNumbersHistoryProps {
  onNumberClick?: (number: string) => void;
  className?: string;
}

export function WinningNumbersHistory({ onNumberClick, className }: WinningNumbersHistoryProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const { data: winningNumbers = [], isLoading } = useQuery({
    queryKey: ['winning-numbers-history'],
    queryFn: async (): Promise<WinningNumber[]> => {
      const { data, error } = await supabase
        .from('raffles')
        .select('winner_ticket_number, title, draw_date')
        .eq('status', 'completed')
        .not('winner_ticket_number', 'is', null)
        .order('draw_date', { ascending: false })
        .limit(20);

      if (error) throw error;

      return (data || []).map(r => ({
        ticket_number: r.winner_ticket_number!,
        raffle_title: r.title,
        draw_date: r.draw_date || ''
      }));
    },
    staleTime: 60000, // Cache for 1 minute
  });

  // Analyze patterns in winning numbers
  const analyzePatterns = (numbers: string[]) => {
    if (numbers.length === 0) return { hotDigits: [], patterns: [] };

    const digitFrequency: Record<string, number> = {};
    const patterns: string[] = [];

    numbers.forEach(num => {
      // Count digit frequency
      num.split('').forEach(digit => {
        digitFrequency[digit] = (digitFrequency[digit] || 0) + 1;
      });

      // Check for patterns
      const numInt = parseInt(num, 10);
      if (numInt % 100 === 0) patterns.push('Números redondos');
      if (new Set(num.split('')).size === 1 && num.length >= 2) patterns.push('Dígitos repetidos');
      if (num.includes('7')) patterns.push('Contiene 7');
    });

    // Get top 5 hot digits
    const hotDigits = Object.entries(digitFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([digit, count]) => ({ digit, count }));

    // Get unique patterns
    const uniquePatterns = [...new Set(patterns)].slice(0, 3);

    return { hotDigits, patterns: uniquePatterns };
  };

  const { hotDigits, patterns } = analyzePatterns(winningNumbers.map(w => w.ticket_number));

  if (isLoading || winningNumbers.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30",
        "rounded-xl border-2 border-amber-200 dark:border-amber-800 overflow-hidden",
        className
      )}
    >
      {/* Header - Always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-amber-100/50 dark:hover:bg-amber-900/20 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-lg flex items-center justify-center shadow-lg shadow-amber-400/30">
            <Trophy className="w-5 h-5 text-amber-950" />
          </div>
          <div className="text-left">
            <h4 className="font-semibold text-gray-900 dark:text-gray-100">
              Números Ganadores
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {winningNumbers.length} sorteos anteriores
            </p>
          </div>
        </div>
        
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-5 h-5 text-gray-500" />
        </motion.div>
      </button>

      {/* Expandable content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-4">
              {/* Hot Digits */}
              {hotDigits.length > 0 && (
                <div className="p-3 bg-white dark:bg-gray-900 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-red-500" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Dígitos más frecuentes
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {hotDigits.map(({ digit, count }, i) => (
                      <motion.div
                        key={digit}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: i * 0.05 }}
                      >
                        <Badge
                          className={cn(
                            "text-lg px-3 py-1 cursor-pointer transition-transform hover:scale-110",
                            i === 0 
                              ? "bg-gradient-to-r from-red-500 to-orange-500 text-white" 
                              : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                          )}
                          onClick={() => onNumberClick?.(digit)}
                        >
                          {digit}
                          <span className="text-[10px] ml-1 opacity-70">×{count}</span>
                        </Badge>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Patterns */}
              {patterns.length > 0 && (
                <div className="p-3 bg-white dark:bg-gray-900 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-purple-500" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Patrones observados
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {patterns.map((pattern, i) => (
                      <Badge
                        key={pattern}
                        variant="outline"
                        className="text-xs border-purple-200 text-purple-700 dark:border-purple-800 dark:text-purple-300"
                      >
                        {pattern}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Winning Numbers List */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 mb-2">
                  <Hash className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Últimos ganadores
                  </span>
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2 max-h-[200px] overflow-y-auto">
                  {winningNumbers.slice(0, 12).map((winning, index) => (
                    <motion.button
                      key={`${winning.ticket_number}-${index}`}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.03 }}
                      onClick={() => onNumberClick?.(winning.ticket_number)}
                      className={cn(
                        "relative p-2 rounded-lg text-center transition-all",
                        "bg-gradient-to-br from-amber-100 to-yellow-100 dark:from-amber-900/40 dark:to-yellow-900/40",
                        "hover:from-amber-200 hover:to-yellow-200 dark:hover:from-amber-800/60 dark:hover:to-yellow-800/60",
                        "border border-amber-200 dark:border-amber-700",
                        "hover:scale-105 hover:shadow-lg hover:shadow-amber-200/50"
                      )}
                      title={`Ganador de: ${winning.raffle_title}`}
                    >
                      {index === 0 && (
                        <motion.div
                          className="absolute -top-1 -right-1"
                          animate={{ rotate: [0, 10, -10, 0] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        >
                          <Trophy className="w-3 h-3 text-amber-500" />
                        </motion.div>
                      )}
                      <span className="font-bold text-amber-800 dark:text-amber-200">
                        {winning.ticket_number}
                      </span>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Disclaimer */}
              <p className="text-[10px] text-gray-400 text-center pt-2">
                Los resultados pasados no garantizan resultados futuros. ¡Buena suerte!
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

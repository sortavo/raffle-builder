import { useState, useEffect } from 'react';
import { differenceInHours, differenceInMinutes } from 'date-fns';
import { motion } from 'framer-motion';
import { Clock, Flame, AlertTriangle } from 'lucide-react';

interface UrgencyBadgeProps {
  drawDate: string;
  totalTickets: number;
  ticketsSold: number;
  className?: string;
}

export function UrgencyBadge({
  drawDate,
  totalTickets,
  ticketsSold,
  className
}: UrgencyBadgeProps) {
  const [now, setNow] = useState(new Date());

  // Update every minute for accurate countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const hoursUntilDraw = differenceInHours(new Date(drawDate), now);
  const minutesUntilDraw = differenceInMinutes(new Date(drawDate), now);
  const ticketsRemaining = totalTickets - ticketsSold;
  const percentageSold = (ticketsSold / totalTickets) * 100;

  // Show urgency conditions
  const showTimeUrgency = hoursUntilDraw < 24 && hoursUntilDraw > 0;
  const showLastMinutes = minutesUntilDraw <= 60 && minutesUntilDraw > 0;
  const showStockUrgency = percentageSold >= 90;
  const showLowStock = percentageSold >= 75 && percentageSold < 90;

  if (!showTimeUrgency && !showStockUrgency && !showLastMinutes && !showLowStock) {
    return null;
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Time urgency - Last minutes */}
      {showLastMinutes && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 backdrop-blur-xl"
        >
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <span className="text-red-300 font-medium">
            ⏰ ¡Últimos {minutesUntilDraw} minutos para participar!
          </span>
        </motion.div>
      )}

      {/* Time urgency - Last hours */}
      {showTimeUrgency && !showLastMinutes && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 backdrop-blur-xl"
        >
          <Clock className="w-5 h-5 text-amber-400 flex-shrink-0" />
          <span className="text-amber-300 font-medium">
            ⏰ ¡Quedan solo {hoursUntilDraw} horas para participar!
          </span>
        </motion.div>
      )}

      {/* Stock urgency - Almost sold out */}
      {showStockUrgency && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="flex items-center gap-3 px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/20 backdrop-blur-xl"
        >
          <Flame className="w-5 h-5 text-rose-400 flex-shrink-0" />
          <span className="text-rose-300 font-medium">
            🔥 ¡Solo quedan {ticketsRemaining} boletos disponibles!
          </span>
        </motion.div>
      )}

      {/* Low stock warning */}
      {showLowStock && !showStockUrgency && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="flex items-center gap-3 px-4 py-3 rounded-xl bg-orange-500/10 border border-orange-500/20 backdrop-blur-xl"
        >
          <AlertTriangle className="w-5 h-5 text-orange-400 flex-shrink-0" />
          <span className="text-orange-300 font-medium">
            ⚡ {Math.round(percentageSold)}% vendido - ¡Quedan {ticketsRemaining} boletos!
          </span>
        </motion.div>
      )}
    </div>
  );
}

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface CountdownTimerProps {
  targetDate: Date;
  onExpire?: () => void;
  variant?: 'default' | 'compact' | 'inline' | 'lottery';
  showLabels?: boolean;
  className?: string;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  expired: boolean;
}

function calculateTimeLeft(targetDate: Date): TimeLeft {
  const now = new Date().getTime();
  const target = targetDate.getTime();
  const difference = target - now;

  if (difference <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
  }

  return {
    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
    hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((difference % (1000 * 60)) / 1000),
    expired: false,
  };
}

export function CountdownTimer({
  targetDate,
  onExpire,
  variant = 'default',
  showLabels = true,
  className,
}: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(() => calculateTimeLeft(targetDate));
  const [prevSeconds, setPrevSeconds] = useState(timeLeft.seconds);

  useEffect(() => {
    const timer = setInterval(() => {
      const newTimeLeft = calculateTimeLeft(targetDate);
      setPrevSeconds(timeLeft.seconds);
      setTimeLeft(newTimeLeft);

      if (newTimeLeft.expired && onExpire) {
        onExpire();
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate, onExpire, timeLeft.seconds]);

  if (timeLeft.expired) {
    return (
      <div className={cn("text-center", className)}>
        <p className="text-lg font-semibold text-muted-foreground">
          Sorteo Finalizado
        </p>
      </div>
    );
  }

  const pad = (num: number) => num.toString().padStart(2, '0');

  // Lottery variant - large animated numbers
  if (variant === 'lottery') {
    const isUrgent = timeLeft.days === 0 && timeLeft.hours < 6;
    
    return (
      <div className={cn("flex justify-center gap-2 sm:gap-4", className)}>
        <LotteryTimeUnit value={timeLeft.days} label="DÍAS" urgent={isUrgent} />
        <div className="text-white/60 text-3xl sm:text-5xl font-bold self-center pb-6">:</div>
        <LotteryTimeUnit value={timeLeft.hours} label="HRS" urgent={isUrgent} />
        <div className="text-white/60 text-3xl sm:text-5xl font-bold self-center pb-6">:</div>
        <LotteryTimeUnit value={timeLeft.minutes} label="MIN" urgent={isUrgent} />
        <div className="text-white/60 text-3xl sm:text-5xl font-bold self-center pb-6">:</div>
        <LotteryTimeUnit 
          value={timeLeft.seconds} 
          label="SEG" 
          animate 
          prevValue={prevSeconds}
          urgent={isUrgent}
        />
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <span className={cn("font-mono", className)}>
        {timeLeft.days > 0 && `${timeLeft.days}d `}
        {pad(timeLeft.hours)}:{pad(timeLeft.minutes)}:{pad(timeLeft.seconds)}
      </span>
    );
  }

  if (variant === 'compact') {
    const isUrgent = timeLeft.days === 0 && timeLeft.hours === 0 && timeLeft.minutes < 5;
    const showHours = timeLeft.days > 0 || timeLeft.hours > 0;
    
    return (
      <div className={cn(
        "flex items-center gap-1 font-mono text-lg",
        isUrgent && "text-destructive animate-pulse",
        className
      )}>
        {showHours && (
          <>
            <span>{timeLeft.days > 0 ? `${timeLeft.days}d ` : ''}{pad(timeLeft.hours)}</span>
            <span>:</span>
          </>
        )}
        <span>{pad(timeLeft.minutes)}</span>
        <span>:</span>
        <span>{pad(timeLeft.seconds)}</span>
      </div>
    );
  }

  return (
    <div className={cn("flex justify-center gap-4 md:gap-6", className)}>
      <TimeUnit value={timeLeft.days} label="Días" showLabel={showLabels} />
      <TimeUnit value={timeLeft.hours} label="Horas" showLabel={showLabels} />
      <TimeUnit value={timeLeft.minutes} label="Minutos" showLabel={showLabels} />
      <TimeUnit value={timeLeft.seconds} label="Segundos" showLabel={showLabels} />
    </div>
  );
}

function TimeUnit({ 
  value, 
  label, 
  showLabel 
}: { 
  value: number; 
  label: string; 
  showLabel: boolean;
}) {
  return (
    <div className="flex flex-col items-center">
      <div className="bg-primary text-primary-foreground text-2xl md:text-4xl font-bold rounded-lg px-3 py-2 md:px-4 md:py-3 min-w-[60px] md:min-w-[80px] text-center">
        {value.toString().padStart(2, '0')}
      </div>
      {showLabel && (
        <span className="text-xs md:text-sm text-muted-foreground mt-1">
          {label}
        </span>
      )}
    </div>
  );
}

function LotteryTimeUnit({ 
  value, 
  label, 
  animate = false,
  prevValue,
  urgent = false
}: { 
  value: number; 
  label: string;
  animate?: boolean;
  prevValue?: number;
  urgent?: boolean;
}) {
  const displayValue = value.toString().padStart(2, '0');
  const prevDisplayValue = prevValue?.toString().padStart(2, '0');
  const hasChanged = animate && prevDisplayValue !== displayValue;
  
  return (
    <div className="flex flex-col items-center">
      <div className={cn(
        "relative bg-white/20 backdrop-blur-sm rounded-xl px-3 py-2 sm:px-4 sm:py-3 min-w-[52px] sm:min-w-[72px] overflow-hidden",
        urgent && "bg-red-500/30"
      )}>
        {/* Shimmer effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-shimmer" />
        
        <AnimatePresence mode="popLayout">
          <motion.span
            key={displayValue}
            initial={hasChanged ? { y: -40, opacity: 0 } : false}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className={cn(
              "block text-3xl sm:text-5xl font-black text-white text-center font-mono tabular-nums",
              urgent && "text-red-100"
            )}
          >
            {displayValue}
          </motion.span>
        </AnimatePresence>
      </div>
      <span className={cn(
        "text-[10px] sm:text-xs font-medium mt-1.5 uppercase tracking-wider",
        urgent ? "text-red-200" : "text-white/70"
      )}>
        {label}
      </span>
    </div>
  );
}

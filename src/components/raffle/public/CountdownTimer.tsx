import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface CountdownTimerProps {
  targetDate: Date;
  onExpire?: () => void;
  variant?: 'default' | 'compact' | 'inline' | 'lottery';
  showLabels?: boolean;
  className?: string;
  isLightTemplate?: boolean;
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
  isLightTemplate = false,
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
        <p className="text-lg font-semibold text-ultra-dark-muted">
          Sorteo Finalizado
        </p>
      </div>
    );
  }

  const pad = (num: number) => num.toString().padStart(2, '0');

  // Lottery variant - Enterprise dark premium style with glow
  if (variant === 'lottery') {
    const isUrgent = timeLeft.days === 0 && timeLeft.hours < 6;
    
    const separatorColor = isLightTemplate ? "text-emerald-500" : "text-emerald-400/40";
    
    return (
      <div className={cn("flex justify-center gap-2 sm:gap-3 relative", className)}>
        {/* Subtle ambient glow */}
        {!isLightTemplate && (
          <div className="absolute inset-0 -inset-x-8 bg-gradient-to-r from-transparent via-emerald-500/5 to-transparent rounded-full blur-xl" />
        )}
        
        <LotteryTimeUnit value={timeLeft.days} label="DÍAS" urgent={isUrgent} isLightTemplate={isLightTemplate} />
        <div className={cn("text-2xl sm:text-4xl font-bold self-center pb-5 animate-pulse", separatorColor)}>
          :
        </div>
        <LotteryTimeUnit value={timeLeft.hours} label="HRS" urgent={isUrgent} isLightTemplate={isLightTemplate} />
        <div className={cn("text-2xl sm:text-4xl font-bold self-center pb-5 animate-pulse", separatorColor)}>
          :
        </div>
        <LotteryTimeUnit value={timeLeft.minutes} label="MIN" urgent={isUrgent} isLightTemplate={isLightTemplate} />
        <div className={cn("text-2xl sm:text-4xl font-bold self-center pb-5 animate-pulse", separatorColor)}>
          :
        </div>
        <LotteryTimeUnit 
          value={timeLeft.seconds} 
          label="SEG" 
          animate 
          prevValue={prevSeconds}
          urgent={isUrgent}
          isLightTemplate={isLightTemplate}
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
        isUrgent && "text-red-500 animate-pulse",
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
      <div className="relative text-3xl md:text-5xl font-black rounded-xl px-4 py-3 md:px-5 md:py-4 min-w-[70px] md:min-w-[100px] text-center text-white bg-gradient-to-br from-emerald-500 to-teal-500 shadow-lg shadow-emerald-500/20">
        {value.toString().padStart(2, '0')}
      </div>
      {showLabel && (
        <span className="text-xs md:text-sm mt-2 text-white/50 uppercase tracking-wider font-medium">
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
  urgent = false,
  isLightTemplate = false
}: { 
  value: number; 
  label: string;
  animate?: boolean;
  prevValue?: number;
  urgent?: boolean;
  isLightTemplate?: boolean;
}) {
  const displayValue = value.toString().padStart(2, '0');
  const prevDisplayValue = prevValue?.toString().padStart(2, '0');
  const hasChanged = animate && prevDisplayValue !== displayValue;
  
  // Dynamic styles based on template
  const boxStyles = isLightTemplate 
    ? (urgent 
        ? "bg-red-50 border-red-300 shadow-lg shadow-red-100" 
        : "bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200 shadow-lg shadow-emerald-100")
    : (urgent 
        ? "bg-red-500/10 border-red-500/20 shadow-lg shadow-red-500/10" 
        : "bg-emerald-500/10 border-emerald-500/15 shadow-lg shadow-emerald-500/5");
  
  const numberStyles = isLightTemplate
    ? (urgent ? "text-red-600" : "text-gray-900")
    : (urgent ? "text-red-500" : "text-white");
  
  const labelStyles = isLightTemplate
    ? (urgent ? "text-red-600" : "text-gray-600")
    : (urgent ? "text-red-500" : "text-ultra-dark-dimmed");
  
  return (
    <div className="flex flex-col items-center">
      <div 
        className={cn(
          "relative rounded-xl px-3 py-2 sm:px-4 sm:py-3 min-w-[48px] sm:min-w-[68px] overflow-hidden border",
          boxStyles
        )}
      >
        <AnimatePresence mode="popLayout">
          <motion.span
            key={displayValue}
            initial={hasChanged ? { y: -30, opacity: 0, scale: 0.8 } : false}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 30, opacity: 0, scale: 0.8 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className={cn(
              "block text-2xl sm:text-4xl font-black text-center font-mono tabular-nums tracking-tight",
              numberStyles
            )}
          >
            {displayValue}
          </motion.span>
        </AnimatePresence>
      </div>
      <span 
        className={cn(
          "text-[9px] sm:text-[10px] font-medium mt-1.5 uppercase tracking-[0.15em]",
          labelStyles
        )}
      >
        {label}
      </span>
    </div>
  );
}

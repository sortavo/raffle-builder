import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface CountdownTimerProps {
  targetDate: Date;
  onExpire?: () => void;
  variant?: 'default' | 'compact' | 'inline';
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

  useEffect(() => {
    const timer = setInterval(() => {
      const newTimeLeft = calculateTimeLeft(targetDate);
      setTimeLeft(newTimeLeft);

      if (newTimeLeft.expired && onExpire) {
        onExpire();
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate, onExpire]);

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

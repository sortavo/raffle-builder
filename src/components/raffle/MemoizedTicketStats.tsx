import { memo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Ticket, CheckCircle, Clock, AlertCircle, Package } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TicketStatsProps {
  total: number;
  sold: number;
  reserved: number;
  pending?: number;
  available: number;
  className?: string;
  compact?: boolean;
}

/**
 * A memoized component that displays ticket statistics.
 * Only re-renders when the actual numbers change.
 */
export const MemoizedTicketStats = memo(function TicketStats({
  total,
  sold,
  reserved,
  pending = 0,
  available,
  className,
  compact = false,
}: TicketStatsProps) {
  const stats = [
    { 
      label: 'Total', 
      value: total, 
      icon: Ticket, 
      color: 'text-foreground',
      bgColor: 'bg-muted/50'
    },
    { 
      label: 'Vendidos', 
      value: sold, 
      icon: CheckCircle, 
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10'
    },
    { 
      label: 'Reservados', 
      value: reserved, 
      icon: Clock, 
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10'
    },
    ...(pending > 0 ? [{ 
      label: 'Pendientes', 
      value: pending, 
      icon: AlertCircle, 
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10'
    }] : []),
    { 
      label: 'Disponibles', 
      value: available, 
      icon: Package, 
      color: 'text-muted-foreground',
      bgColor: 'bg-muted/30'
    },
  ];

  if (compact) {
    return (
      <div className={cn('flex flex-wrap gap-3', className)}>
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div 
            key={label}
            className="flex items-center gap-1.5 text-sm"
          >
            <Icon className={cn('h-4 w-4', color)} />
            <span className="font-medium">{value.toLocaleString()}</span>
            <span className="text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={cn('grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4', className)}>
      {stats.map(({ label, value, icon: Icon, color, bgColor }) => (
        <Card key={label} className={cn('border-0', bgColor)}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Icon className={cn('h-4 w-4', color)} />
              <span className="text-sm text-muted-foreground">{label}</span>
            </div>
            <p className={cn('text-2xl font-bold', color)}>
              {value.toLocaleString()}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
});

MemoizedTicketStats.displayName = 'MemoizedTicketStats';

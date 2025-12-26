import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import { RAFFLE_STATUS_CONFIG } from '@/lib/raffle-utils';
import { cn } from '@/lib/utils';

interface RaffleStatusBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  status: string | null;
}

export const RaffleStatusBadge = React.forwardRef<HTMLDivElement, RaffleStatusBadgeProps>(
  ({ status, className, ...props }, ref) => {
    const config = RAFFLE_STATUS_CONFIG[status as keyof typeof RAFFLE_STATUS_CONFIG] || RAFFLE_STATUS_CONFIG.draft;

    return (
      <Badge ref={ref} variant="secondary" className={cn(config.color, className)} {...props}>
        {config.label}
      </Badge>
    );
  }
);
RaffleStatusBadge.displayName = 'RaffleStatusBadge';

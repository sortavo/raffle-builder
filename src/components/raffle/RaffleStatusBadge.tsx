import { Badge } from '@/components/ui/badge';
import { RAFFLE_STATUS_CONFIG } from '@/lib/raffle-utils';
import { cn } from '@/lib/utils';

interface RaffleStatusBadgeProps {
  status: string | null;
  className?: string;
}

export const RaffleStatusBadge = ({ status, className }: RaffleStatusBadgeProps) => {
  const config = RAFFLE_STATUS_CONFIG[status as keyof typeof RAFFLE_STATUS_CONFIG] || RAFFLE_STATUS_CONFIG.draft;

  return (
    <Badge variant="secondary" className={cn(config.color, className)}>
      {config.label}
    </Badge>
  );
};

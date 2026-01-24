import { Lock, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface FieldLockBadgeProps {
  type: 'locked' | 'restricted';
  message: string;
  shortMessage?: string;
  className?: string;
}

export function FieldLockBadge({ 
  type, 
  message, 
  shortMessage,
  className 
}: FieldLockBadgeProps) {
  const isLocked = type === 'locked';
  
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge 
          variant="outline" 
          className={cn(
            "gap-1 text-xs font-normal cursor-help",
            isLocked 
              ? "border-muted-foreground/50 text-muted-foreground bg-muted/50" 
              : "border-amber-500/50 text-amber-600 dark:text-amber-400 bg-amber-500/10",
            className
          )}
        >
          {isLocked ? (
            <Lock className="h-3 w-3" />
          ) : (
            <AlertTriangle className="h-3 w-3" />
          )}
          <span className="hidden sm:inline">
            {shortMessage || (isLocked ? 'Bloqueado' : 'Restringido')}
          </span>
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <p className="text-sm">{message}</p>
      </TooltipContent>
    </Tooltip>
  );
}

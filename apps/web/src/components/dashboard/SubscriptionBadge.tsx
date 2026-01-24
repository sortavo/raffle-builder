import { Crown, Zap, Diamond, Sparkles, Clock, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
// Issue 9: Use centralized trial helper
import { calculateTrialDaysRemaining } from "@/lib/subscription-utils";

type SubscriptionTier = "basic" | "pro" | "premium" | "enterprise" | string | null | undefined;
type SubscriptionStatus = "active" | "trial" | "past_due" | "canceled" | string | null | undefined;

interface SubscriptionBadgeProps {
  tier: SubscriptionTier;
  status?: SubscriptionStatus;
  trialEndsAt?: string | null;
  collapsed?: boolean;
  className?: string;
}

// L6: Standardized badge colors using design tokens
const tierConfig = {
  basic: {
    label: "Basic",
    icon: Sparkles,
    className: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
  },
  pro: {
    label: "Pro",
    icon: Zap,
    className: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800",
  },
  premium: {
    label: "Premium",
    icon: Crown,
    className: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800",
  },
  enterprise: {
    label: "Enterprise",
    icon: Diamond,
    className: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800",
  },
};

export function SubscriptionBadge({ 
  tier, 
  status, 
  trialEndsAt,
  collapsed = false,
  className 
}: SubscriptionBadgeProps) {
  const config = tier ? tierConfig[tier] : tierConfig.basic;
  const Icon = config.icon;
  
  const isTrialing = status === "trial";
  const isPastDue = status === "past_due";
  const isCanceled = status === "canceled";
  
  // Use centralized helper for consistent trial day calculation
  const daysRemaining = calculateTrialDaysRemaining(trialEndsAt);

  // Handle special statuses
  if (isPastDue) {
    return (
      <div 
        className={cn(
          "flex items-center gap-1.5 px-2 py-1 rounded-md border text-xs font-medium",
          "bg-destructive/10 text-destructive border-destructive/30",
          "hover:bg-destructive/20 transition-colors cursor-pointer",
          collapsed && "px-1.5 justify-center",
          className
        )}
      >
        <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
        {!collapsed && <span>Pago Pendiente</span>}
      </div>
    );
  }

  if (isCanceled) {
    return (
      <div 
        className={cn(
          "flex items-center gap-1.5 px-2 py-1 rounded-md border text-xs font-medium",
          "bg-muted text-muted-foreground border-border",
          "hover:bg-muted/80 transition-colors cursor-pointer",
          collapsed && "px-1.5 justify-center",
          className
        )}
      >
        <Icon className="h-3.5 w-3.5 flex-shrink-0" />
        {!collapsed && <span>Cancelado</span>}
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <div 
        className={cn(
          "flex items-center gap-1.5 px-2 py-1 rounded-md border text-xs font-medium",
          config.className,
          "hover:scale-105 hover:shadow-sm transition-all cursor-pointer",
          collapsed && "px-1.5 justify-center",
          isTrialing && "ring-1 ring-emerald-400/50"
        )}
      >
        <Icon className="h-3.5 w-3.5 flex-shrink-0" />
        {!collapsed && (
          <>
            <span>{config.label}</span>
            {isTrialing && (
              <span className="ml-0.5 px-1 py-0.5 text-[10px] bg-emerald-500 text-white rounded animate-pulse">
                Trial
              </span>
            )}
          </>
        )}
      </div>
      
      {isTrialing && !collapsed && trialEndsAt && (
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground pl-0.5">
          <Clock className="h-3 w-3" />
          <span>
            {daysRemaining === 0 
              ? "Termina hoy" 
              : `${daysRemaining} día${daysRemaining !== 1 ? 's' : ''} restante${daysRemaining !== 1 ? 's' : ''}`
            }
          </span>
        </div>
      )}
      {isTrialing && !collapsed && !trialEndsAt && (
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground pl-0.5">
          <Clock className="h-3 w-3" />
          <span>Prueba activa</span>
        </div>
      )}
    </div>
  );
}

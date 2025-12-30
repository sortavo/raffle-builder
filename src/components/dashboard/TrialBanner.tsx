import { Link } from "react-router-dom";
import { differenceInDays, parseISO } from "date-fns";
import { Clock, Sparkles, Gift, AlertTriangle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

export function TrialBanner() {
  const { organization } = useAuth();

  // Only show if subscription_status is 'trial' and trial_ends_at exists
  if (
    organization?.subscription_status !== "trial" ||
    !organization?.trial_ends_at
  ) {
    return null;
  }

  const trialEndDate = parseISO(organization.trial_ends_at);
  const daysRemaining = differenceInDays(trialEndDate, new Date());

  // Don't show if trial has expired
  if (daysRemaining < 0) {
    return null;
  }

  const isUrgent = daysRemaining <= 2;
  const isLastDay = daysRemaining === 0;
  const tierName = organization.subscription_tier === "basic" ? "Básico" : 
                   organization.subscription_tier === "pro" ? "Pro" : 
                   organization.subscription_tier === "premium" ? "Premium" : "Enterprise";

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border p-4 sm:p-6 mb-4",
        isUrgent
          ? "bg-gradient-to-r from-destructive/10 to-destructive/5 border-destructive/30"
          : "bg-gradient-to-r from-secondary/10 to-warning/10 border-secondary/20"
      )}
    >
      {/* Blur decorative effect */}
      <div className={cn(
        "absolute top-0 right-0 w-32 h-32 rounded-full -translate-y-16 translate-x-16 blur-2xl",
        isUrgent ? "bg-destructive/10" : "bg-secondary/10"
      )} />

      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          {/* Icon with gradient */}
          <div
            className={cn(
              "w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shadow-lg shrink-0",
              isUrgent
                ? "bg-gradient-to-br from-destructive to-destructive/80"
                : "bg-gradient-to-br from-secondary to-warning"
            )}
          >
            {isUrgent ? (
              <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-destructive-foreground" />
            ) : (
              <Gift className="w-5 h-5 sm:w-6 sm:h-6 text-secondary-foreground" />
            )}
          </div>

          <div>
            <h3 className="font-semibold text-foreground">
              {isLastDay
                ? "¡Tu prueba gratuita termina hoy!"
                : daysRemaining === 1
                ? "Te queda 1 día de prueba"
                : `Te quedan ${daysRemaining} días de prueba`}
              <span className="text-muted-foreground font-normal ml-1">
                del plan {tierName}
              </span>
            </h3>
            <p className="text-sm text-muted-foreground">
              Actualiza para desbloquear todas las funcionalidades
            </p>
          </div>
        </div>

        <Button
          asChild
          variant={isUrgent ? "destructive" : "default"}
          className={cn(
            "shrink-0",
            !isUrgent && "bg-gradient-to-r from-secondary to-warning hover:from-secondary/90 hover:to-warning/90 text-secondary-foreground"
          )}
        >
          <Link to="/pricing">
            <Sparkles className="h-4 w-4 mr-2" />
            Elegir plan
            <ArrowRight className="h-4 w-4 ml-2" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

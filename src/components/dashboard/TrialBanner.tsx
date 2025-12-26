import { Link } from "react-router-dom";
import { differenceInDays, parseISO } from "date-fns";
import { Clock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

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
  const tierName = organization.subscription_tier === "basic" ? "Básico" : 
                   organization.subscription_tier === "pro" ? "Pro" : "Premium";

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 rounded-lg mb-4 ${
        isUrgent
          ? "bg-destructive/10 border border-destructive/20"
          : "bg-primary/10 border border-primary/20"
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`p-2 rounded-full ${
            isUrgent ? "bg-destructive/20" : "bg-primary/20"
          }`}
        >
          <Clock
            className={`h-4 w-4 ${
              isUrgent ? "text-destructive" : "text-primary"
            }`}
          />
        </div>
        <div className="text-sm">
          <span className="font-medium">
            {daysRemaining === 0
              ? "Tu prueba gratuita termina hoy"
              : daysRemaining === 1
              ? "Te queda 1 día de prueba gratuita"
              : `Te quedan ${daysRemaining} días de prueba gratuita`}
          </span>
          <span className="text-muted-foreground ml-1">
            del plan {tierName}
          </span>
        </div>
      </div>
      <Button asChild size="sm" variant={isUrgent ? "destructive" : "default"}>
        <Link to="/pricing">
          <Sparkles className="h-4 w-4 mr-1" />
          Elegir plan
        </Link>
      </Button>
    </div>
  );
}

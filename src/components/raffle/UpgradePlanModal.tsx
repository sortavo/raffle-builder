import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Crown, Zap, Star, AlertCircle, Building2, Phone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { STRIPE_PLANS } from '@/lib/stripe-config';

interface UpgradePlanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentTier?: string;
  currentLimit?: number;
  requestedValue?: number;
  feature?: string;
  reason?: string;
}

export const UpgradePlanModal = ({ 
  open, 
  onOpenChange, 
  currentTier = 'basic',
  currentLimit,
  requestedValue,
  feature = 'boletos',
  reason
}: UpgradePlanModalProps) => {
  const navigate = useNavigate();

  const handleUpgrade = (plan: 'pro' | 'premium') => {
    onOpenChange(false);
    navigate(`/pricing`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-yellow-500" />
            Actualiza tu Plan
          </DialogTitle>
          <DialogDescription>
            {currentLimit && requestedValue 
              ? 'Has alcanzado el límite de tu plan actual'
              : 'Desbloquea más funcionalidades con un plan superior'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {reason && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{reason}</AlertDescription>
            </Alert>
          )}

          {currentLimit && requestedValue && !reason && (
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm">
                <strong>{feature}:</strong> Tu plan actual permite hasta <strong>{currentLimit.toLocaleString()}</strong>, 
                pero necesitas <strong>{requestedValue.toLocaleString()}</strong>.
              </p>
            </div>
          )}

          <div className="space-y-3">
            {currentTier !== 'pro' && currentTier !== 'premium' && currentTier !== 'enterprise' && (
              <div 
                className="flex items-center gap-3 p-3 border rounded-lg hover:border-primary transition-colors cursor-pointer"
                onClick={() => handleUpgrade('pro')}
              >
                <Zap className="w-8 h-8 text-blue-500" />
                <div className="flex-1">
                  <p className="font-medium">Plan Pro</p>
                  <p className="text-sm text-muted-foreground">
                    Hasta {STRIPE_PLANS.pro.limits.maxTicketsPerRaffle.toLocaleString()} boletos • {STRIPE_PLANS.pro.limits.maxActiveRaffles} sorteos activos
                  </p>
                </div>
                <span className="font-bold">${STRIPE_PLANS.pro.monthlyPrice} USD/mes</span>
              </div>
            )}

            {currentTier !== 'premium' && currentTier !== 'enterprise' && (
              <div 
                className="flex items-center gap-3 p-3 border rounded-lg hover:border-primary transition-colors cursor-pointer"
                onClick={() => handleUpgrade('premium')}
              >
                <Star className="w-8 h-8 text-yellow-500" />
                <div className="flex-1">
                  <p className="font-medium">Plan Premium</p>
                  <p className="text-sm text-muted-foreground">
                    Hasta {STRIPE_PLANS.premium.limits.maxTicketsPerRaffle.toLocaleString()} boletos • {STRIPE_PLANS.premium.limits.maxActiveRaffles} sorteos activos
                  </p>
                </div>
                <span className="font-bold">${STRIPE_PLANS.premium.monthlyPrice} USD/mes</span>
              </div>
            )}

            {currentTier === 'premium' && (
              <div 
                className="flex items-center gap-3 p-3 border rounded-lg hover:border-purple-500 transition-colors cursor-pointer"
                onClick={() => navigate('/contact')}
              >
                <Building2 className="w-8 h-8 text-purple-600" />
                <div className="flex-1">
                  <p className="font-medium">Plan Enterprise</p>
                  <p className="text-sm text-muted-foreground">
                    Hasta {STRIPE_PLANS.enterprise.limits.maxTicketsPerRaffle.toLocaleString()} boletos • Sorteos ilimitados • API Access
                  </p>
                </div>
                <div className="flex items-center gap-1 text-purple-600">
                  <Phone className="w-4 h-4" />
                  <span className="font-bold text-sm">Contactar</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
            Cancelar
          </Button>
          <Button onClick={() => navigate('/pricing')} className="flex-1">
            Ver Todos los Planes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

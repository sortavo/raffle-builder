import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Check, ArrowRight, Sparkles, LucideIcon, Gift, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Feature {
  text: string;
  included: boolean | 'partial';
  highlight?: boolean;
}

interface PricingCardProps {
  name: string;
  price: number;
  isAnnual: boolean;
  icon: LucideIcon;
  badge: string;
  popular?: boolean;
  tier: 'basic' | 'pro' | 'premium' | 'enterprise';
  idealFor: string;
  features: Feature[];
  cta: string;
  ctaLink: string;
  index: number;
  hasTrial?: boolean;
  trialDays?: number;
}

const tierStyles = {
  basic: {
    gradient: 'from-slate-600 to-slate-500',
    border: 'border-border hover:border-slate-400',
    iconBg: 'bg-gradient-to-br from-slate-600 to-slate-500',
    glow: '',
    badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  },
  pro: {
    gradient: 'from-primary to-emerald-400',
    border: 'border-2 border-primary shadow-xl shadow-primary/20',
    iconBg: 'bg-gradient-to-br from-primary to-emerald-400',
    glow: 'before:absolute before:inset-0 before:rounded-3xl before:bg-gradient-to-r before:from-primary/20 before:to-emerald-400/20 before:blur-xl before:-z-10',
    badge: 'bg-gradient-to-r from-primary to-emerald-400 text-primary-foreground',
  },
  premium: {
    gradient: 'from-amber-500 to-yellow-400',
    border: 'border-amber-400/50 hover:border-amber-400',
    iconBg: 'bg-gradient-to-br from-amber-500 to-yellow-400',
    glow: 'before:absolute before:inset-0 before:rounded-3xl before:bg-gradient-to-r before:from-amber-500/10 before:to-yellow-400/10 before:blur-xl before:-z-10',
    badge: 'bg-gradient-to-r from-amber-500 to-yellow-400 text-amber-950',
  },
  enterprise: {
    gradient: 'from-purple-600 to-violet-500',
    border: 'border-purple-500/50 hover:border-purple-400 bg-gradient-to-b from-purple-950/50 to-background',
    iconBg: 'bg-gradient-to-br from-purple-600 to-violet-500',
    glow: 'before:absolute before:inset-0 before:rounded-3xl before:bg-gradient-to-r before:from-purple-600/10 before:to-violet-500/10 before:blur-xl before:-z-10',
    badge: 'bg-gradient-to-r from-purple-600 to-violet-500 text-white',
  },
};

export function PricingCard({
  name,
  price,
  isAnnual,
  icon: Icon,
  badge,
  popular,
  tier,
  idealFor,
  features,
  cta,
  ctaLink,
  index,
  hasTrial = false,
  trialDays = 7,
}: PricingCardProps) {
  const styles = tierStyles[tier];
  const monthlyEquivalent = isAnnual ? Math.round(price / 12) : price;

  return (
    // Issue 11: Accessibility - add role and aria-labelledby
    <motion.div
      role="article"
      aria-labelledby={`plan-${tier}-title`}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className={cn(
        'relative flex flex-col rounded-3xl border p-8 lg:p-10 transition-all duration-500',
        'bg-white/[0.03] backdrop-blur-xl hover-glow',
        styles.border,
        styles.glow,
        popular && 'scale-105 z-10'
      )}
    >
      {/* Popular badge */}
      {popular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <Badge className={cn('px-5 py-2 shadow-xl text-sm font-bold shimmer-badge', styles.badge)}>
            <Sparkles className="w-4 h-4 mr-2" />
            {badge}
          </Badge>
        </div>
      )}

      {/* Header */}
      <div className="text-center mb-8">
        {/* Icon - TIER S: w-20 h-20 */}
        <motion.div
          whileHover={{ scale: 1.1, rotate: 5 }}
          className={cn(
            'mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl shadow-xl',
            styles.iconBg
          )}
        >
          <Icon className="h-10 w-10 text-white" />
        </motion.div>

        {/* Badge for non-popular */}
        {!popular && (
          <Badge variant="outline" className="mb-4 border-white/20 text-white/70">
            {badge}
          </Badge>
        )}

        {/* Plan name - with id for aria-labelledby */}
        <h3 id={`plan-${tier}-title`} className="text-2xl font-bold text-white mb-2">{name}</h3>
        <p className="text-sm text-white/50">{idealFor}</p>
      </div>

      {/* Price - Issue M8: Improved clarity for annual vs monthly display */}
      <div className="text-center mb-6">
        <div className="flex items-baseline justify-center gap-1">
          <span className="text-5xl lg:text-6xl font-black bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent tracking-tight">
            ${monthlyEquivalent.toLocaleString()}
          </span>
          <span className="text-white/50 text-lg">USD/mes</span>
        </div>
        {isAnnual ? (
          <div className="space-y-1 mt-2">
            <p className="text-sm text-white/40">
              ${price.toLocaleString()} USD facturado anualmente
            </p>
            <p className="text-xs text-emerald-400 font-medium">
              Ahorras ${Math.round((monthlyEquivalent * 12) - price)} USD al año
            </p>
          </div>
        ) : (
          <p className="text-sm text-white/40 mt-2">
            Facturado mensualmente
          </p>
        )}
      </div>

      {/* Trial Badge or Payment Notice */}
      <div className="text-center mb-6 min-h-[70px]">
        {hasTrial ? (
          <div className="space-y-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ 
                repeat: Infinity, 
                repeatType: "reverse", 
                duration: 2 
              }}
            >
              <Badge className="bg-emerald-500 text-white px-4 py-2 text-base font-bold shadow-lg">
                <Gift className="w-4 h-4 mr-2" />
                {trialDays} DÍAS GRATIS
              </Badge>
            </motion.div>
            <p className="text-sm text-emerald-400 font-medium">
              Sin cargo hasta terminar la prueba
            </p>
            <p className="text-xs text-muted-foreground">
              Tu tarjeta se valida pero no se cobra hoy
            </p>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground p-3">
            <CreditCard className="w-3.5 h-3.5" />
            <span>Pago inmediato al suscribirte</span>
          </div>
        )}
      </div>

      {/* CTA Button - Issue 11: Accessibility label */}
      <Button
        asChild
        size="lg"
        aria-label={`${cta} - Plan ${name} por $${monthlyEquivalent} USD al mes`}
        className={cn(
          'w-full mb-6 font-semibold transition-all duration-300 group',
          popular && 'bg-gradient-to-r from-primary to-emerald-400 hover:from-primary/90 hover:to-emerald-400/90 shadow-lg shadow-primary/25',
          tier === 'enterprise' && 'bg-gradient-to-r from-purple-600 to-violet-500 hover:from-purple-700 hover:to-violet-600',
          tier === 'premium' && 'bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-600 hover:to-yellow-500 text-amber-950',
          tier === 'basic' && 'bg-foreground hover:bg-foreground/90'
        )}
      >
        <Link to={ctaLink}>
          {cta}
          <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Link>
      </Button>

      {/* Features */}
      <div className="flex-1 space-y-3">
        {features.slice(0, 7).map((feature, idx) => (
          <div key={idx} className="flex items-start gap-3">
            <div className={cn(
              'flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5',
              feature.included === true 
                ? 'bg-success/20 text-success' 
                : 'bg-muted text-muted-foreground/50'
            )}>
              <Check className="w-3 h-3" strokeWidth={3} />
            </div>
            <span className={cn(
              'text-sm leading-tight',
              feature.included === true ? 'text-foreground' : 'text-muted-foreground/70',
              feature.highlight && 'font-medium'
            )}>
              {feature.text}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

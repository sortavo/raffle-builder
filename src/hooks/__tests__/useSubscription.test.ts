import { describe, it, expect } from 'vitest';

// Test the pure business logic functions for subscription management
// These don't require mocking Supabase or Stripe

// ===== Types =====
type PlanKey = 'basic' | 'pro' | 'premium' | 'enterprise';
type BillingPeriod = 'monthly' | 'annual';
type SubscriptionStatus = 'trial' | 'active' | 'past_due' | 'canceled' | 'incomplete';

interface PlanConfig {
  name: string;
  monthlyPrice: number;
  annualPrice: number;
  hasTrial: boolean;
  trialDays: number;
  limits: {
    maxActiveRaffles: number;
    maxTicketsPerRaffle: number;
    templatesAvailable: number;
  };
  features: string[];
}

interface Organization {
  subscription_tier: PlanKey | null;
  subscription_status: SubscriptionStatus | null;
  subscription_period: BillingPeriod | null;
  trial_ends_at: string | null;
  max_active_raffles: number | null;
  max_tickets_per_raffle: number | null;
  templates_available: number | null;
  cancel_at_period_end?: boolean;
  current_period_end?: string | null;
}

// ===== Plan Configuration =====
const STRIPE_PLANS: Record<PlanKey, PlanConfig> = {
  basic: {
    name: 'Basic',
    monthlyPrice: 49,
    annualPrice: 490,
    hasTrial: true,
    trialDays: 7,
    limits: {
      maxActiveRaffles: 2,
      maxTicketsPerRaffle: 2000,
      templatesAvailable: 3,
    },
    features: [
      '2 sorteos activos',
      '2,000 boletos por sorteo',
      '1 plantilla',
      'Soporte por email (48h)',
    ],
  },
  pro: {
    name: 'Pro',
    monthlyPrice: 149,
    annualPrice: 1490,
    hasTrial: false,
    trialDays: 0,
    limits: {
      maxActiveRaffles: 7,
      maxTicketsPerRaffle: 30000,
      templatesAvailable: 6,
    },
    features: [
      '7 sorteos activos',
      '30,000 boletos por sorteo',
      '6 plantillas',
      'Lotería Nacional',
      'Sin marca Sortavo',
      'Soporte WhatsApp (12h)',
    ],
  },
  premium: {
    name: 'Premium',
    monthlyPrice: 299,
    annualPrice: 2990,
    hasTrial: false,
    trialDays: 0,
    limits: {
      maxActiveRaffles: 15,
      maxTicketsPerRaffle: 100000,
      templatesAvailable: 9,
    },
    features: [
      '15 sorteos activos',
      '100,000 boletos por sorteo',
      '6 plantillas + CSS personalizado',
      'Bot de Telegram incluido',
      'Account Manager dedicado',
      'Setup asistido incluido',
    ],
  },
  enterprise: {
    name: 'Enterprise',
    monthlyPrice: 499,
    annualPrice: 4990,
    hasTrial: false,
    trialDays: 0,
    limits: {
      maxActiveRaffles: 999,
      maxTicketsPerRaffle: 10000000,
      templatesAvailable: 9,
    },
    features: [
      'Sorteos ilimitados',
      '10,000,000 boletos por sorteo',
      'Bot de Telegram incluido',
      'API Access',
      'Account Manager dedicado',
      'SLA 99.9% uptime',
      'Soporte 24/7 telefónico',
    ],
  },
};

// ===== Plan Comparison Functions =====
const getPlanLimits = (tier: PlanKey | null): PlanConfig['limits'] => {
  return STRIPE_PLANS[tier || 'basic'].limits;
};

const isPlanUpgrade = (currentPlan: PlanKey, targetPlan: PlanKey): boolean => {
  const planOrder: PlanKey[] = ['basic', 'pro', 'premium', 'enterprise'];
  return planOrder.indexOf(targetPlan) > planOrder.indexOf(currentPlan);
};

const isPlanDowngrade = (currentPlan: PlanKey, targetPlan: PlanKey): boolean => {
  const planOrder: PlanKey[] = ['basic', 'pro', 'premium', 'enterprise'];
  return planOrder.indexOf(targetPlan) < planOrder.indexOf(currentPlan);
};

const comparePlans = (
  planA: PlanKey,
  planB: PlanKey
): { comparison: 'upgrade' | 'downgrade' | 'same'; difference: number } => {
  const planOrder: PlanKey[] = ['basic', 'pro', 'premium', 'enterprise'];
  const indexA = planOrder.indexOf(planA);
  const indexB = planOrder.indexOf(planB);
  const difference = indexB - indexA;

  if (difference > 0) return { comparison: 'upgrade', difference };
  if (difference < 0) return { comparison: 'downgrade', difference: Math.abs(difference) };
  return { comparison: 'same', difference: 0 };
};

describe('useSubscription - plan comparison', () => {
  describe('getPlanLimits', () => {
    it('should return correct limits for each plan', () => {
      expect(getPlanLimits('basic').maxActiveRaffles).toBe(2);
      expect(getPlanLimits('pro').maxActiveRaffles).toBe(7);
      expect(getPlanLimits('premium').maxActiveRaffles).toBe(15);
      expect(getPlanLimits('enterprise').maxActiveRaffles).toBe(999);
    });

    it('should return basic limits for null tier', () => {
      expect(getPlanLimits(null).maxActiveRaffles).toBe(2);
    });

    it('should return correct ticket limits', () => {
      expect(getPlanLimits('basic').maxTicketsPerRaffle).toBe(2000);
      expect(getPlanLimits('pro').maxTicketsPerRaffle).toBe(30000);
      expect(getPlanLimits('premium').maxTicketsPerRaffle).toBe(100000);
      expect(getPlanLimits('enterprise').maxTicketsPerRaffle).toBe(10000000);
    });
  });

  describe('isPlanUpgrade', () => {
    it('should identify upgrades correctly', () => {
      expect(isPlanUpgrade('basic', 'pro')).toBe(true);
      expect(isPlanUpgrade('basic', 'premium')).toBe(true);
      expect(isPlanUpgrade('basic', 'enterprise')).toBe(true);
      expect(isPlanUpgrade('pro', 'premium')).toBe(true);
      expect(isPlanUpgrade('pro', 'enterprise')).toBe(true);
      expect(isPlanUpgrade('premium', 'enterprise')).toBe(true);
    });

    it('should reject non-upgrades', () => {
      expect(isPlanUpgrade('pro', 'basic')).toBe(false);
      expect(isPlanUpgrade('enterprise', 'basic')).toBe(false);
      expect(isPlanUpgrade('basic', 'basic')).toBe(false);
    });
  });

  describe('isPlanDowngrade', () => {
    it('should identify downgrades correctly', () => {
      expect(isPlanDowngrade('pro', 'basic')).toBe(true);
      expect(isPlanDowngrade('premium', 'basic')).toBe(true);
      expect(isPlanDowngrade('enterprise', 'basic')).toBe(true);
      expect(isPlanDowngrade('premium', 'pro')).toBe(true);
      expect(isPlanDowngrade('enterprise', 'pro')).toBe(true);
    });

    it('should reject non-downgrades', () => {
      expect(isPlanDowngrade('basic', 'pro')).toBe(false);
      expect(isPlanDowngrade('basic', 'enterprise')).toBe(false);
      expect(isPlanDowngrade('pro', 'pro')).toBe(false);
    });
  });

  describe('comparePlans', () => {
    it('should compare upgrades', () => {
      const result = comparePlans('basic', 'enterprise');
      expect(result.comparison).toBe('upgrade');
      expect(result.difference).toBe(3);
    });

    it('should compare downgrades', () => {
      const result = comparePlans('enterprise', 'basic');
      expect(result.comparison).toBe('downgrade');
      expect(result.difference).toBe(3);
    });

    it('should compare same plans', () => {
      const result = comparePlans('pro', 'pro');
      expect(result.comparison).toBe('same');
      expect(result.difference).toBe(0);
    });
  });
});

// ===== Billing Calculation Functions =====
const calculateAnnualSavings = (plan: PlanKey): { amount: number; percentage: number } => {
  const config = STRIPE_PLANS[plan];
  const monthlyTotal = config.monthlyPrice * 12;
  const amount = monthlyTotal - config.annualPrice;
  const percentage = Math.round((amount / monthlyTotal) * 100);
  return { amount, percentage };
};

const calculateProrationAmount = (
  daysRemaining: number,
  daysInPeriod: number,
  currentPlanPrice: number,
  newPlanPrice: number
): { credit: number; charge: number; net: number } => {
  const dailyRate = currentPlanPrice / daysInPeriod;
  const credit = dailyRate * daysRemaining;

  const newDailyRate = newPlanPrice / daysInPeriod;
  const charge = newDailyRate * daysRemaining;

  const net = charge - credit;

  return {
    credit: Math.round(credit * 100) / 100,
    charge: Math.round(charge * 100) / 100,
    net: Math.round(net * 100) / 100,
  };
};

const getEffectivePrice = (plan: PlanKey, period: BillingPeriod): number => {
  const config = STRIPE_PLANS[plan];
  if (period === 'annual') {
    return Math.round(config.annualPrice / 12);
  }
  return config.monthlyPrice;
};

const formatPrice = (
  amount: number,
  currency: string = 'USD',
  locale: string = 'en-US'
): string => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(amount);
};

describe('useSubscription - billing calculations', () => {
  describe('calculateAnnualSavings', () => {
    it('should calculate savings for basic plan', () => {
      const savings = calculateAnnualSavings('basic');
      expect(savings.amount).toBe(49 * 12 - 490); // 98
      expect(savings.percentage).toBeGreaterThan(15);
    });

    it('should calculate savings for pro plan', () => {
      const savings = calculateAnnualSavings('pro');
      expect(savings.amount).toBe(149 * 12 - 1490); // 298
      expect(savings.percentage).toBeGreaterThan(15);
    });

    it('should calculate consistent ~16% savings across plans', () => {
      const basicSavings = calculateAnnualSavings('basic');
      const proSavings = calculateAnnualSavings('pro');
      const premiumSavings = calculateAnnualSavings('premium');

      // All should be around 16-17%
      expect(basicSavings.percentage).toBeGreaterThanOrEqual(16);
      expect(proSavings.percentage).toBeGreaterThanOrEqual(16);
      expect(premiumSavings.percentage).toBeGreaterThanOrEqual(16);
    });
  });

  describe('calculateProrationAmount', () => {
    it('should calculate upgrade proration', () => {
      // Upgrading from basic ($49) to pro ($149) with 15 days remaining in 30-day period
      const result = calculateProrationAmount(15, 30, 49, 149);

      expect(result.credit).toBe(24.5); // 49/30 * 15
      expect(result.charge).toBe(74.5); // 149/30 * 15
      expect(result.net).toBe(50); // 74.5 - 24.5
    });

    it('should calculate downgrade proration (credit)', () => {
      // Downgrading from pro ($149) to basic ($49) with 15 days remaining
      const result = calculateProrationAmount(15, 30, 149, 49);

      expect(result.credit).toBe(74.5);
      expect(result.charge).toBe(24.5);
      expect(result.net).toBe(-50); // Negative = credit to customer
    });

    it('should handle zero days remaining', () => {
      const result = calculateProrationAmount(0, 30, 49, 149);
      expect(result.credit).toBe(0);
      expect(result.charge).toBe(0);
      expect(result.net).toBe(0);
    });

    it('should handle full period remaining', () => {
      const result = calculateProrationAmount(30, 30, 49, 149);
      expect(result.credit).toBe(49);
      expect(result.charge).toBe(149);
      expect(result.net).toBe(100);
    });
  });

  describe('getEffectivePrice', () => {
    it('should return monthly price for monthly billing', () => {
      expect(getEffectivePrice('basic', 'monthly')).toBe(49);
      expect(getEffectivePrice('pro', 'monthly')).toBe(149);
    });

    it('should return monthly equivalent for annual billing', () => {
      expect(getEffectivePrice('basic', 'annual')).toBe(Math.round(490 / 12)); // 41
      expect(getEffectivePrice('pro', 'annual')).toBe(Math.round(1490 / 12)); // 124
    });
  });

  describe('formatPrice', () => {
    it('should format USD prices', () => {
      expect(formatPrice(49, 'USD', 'en-US')).toBe('$49.00');
      expect(formatPrice(1490, 'USD', 'en-US')).toBe('$1,490.00');
    });

    it('should format MXN prices', () => {
      expect(formatPrice(49, 'MXN', 'es-MX')).toContain('49');
    });

    it('should handle decimal amounts', () => {
      expect(formatPrice(49.99, 'USD', 'en-US')).toBe('$49.99');
    });
  });
});

// ===== Feature Access Functions =====
interface FeatureAccess {
  hasAccess: boolean;
  reason?: string;
  requiredPlan?: PlanKey;
}

const hasFeatureAccess = (
  currentTier: PlanKey | null,
  feature: string
): FeatureAccess => {
  const featureRequirements: Record<string, PlanKey> = {
    'custom_domain': 'pro',
    'white_label': 'pro',
    'lottery_method': 'pro',
    'telegram_bot': 'premium',
    'custom_css': 'premium',
    'account_manager': 'premium',
    'api_access': 'enterprise',
    'sla_guarantee': 'enterprise',
    'priority_support': 'enterprise',
  };

  const requiredPlan = featureRequirements[feature];
  if (!requiredPlan) {
    return { hasAccess: true }; // Feature not restricted
  }

  const planOrder: PlanKey[] = ['basic', 'pro', 'premium', 'enterprise'];
  const currentIndex = planOrder.indexOf(currentTier || 'basic');
  const requiredIndex = planOrder.indexOf(requiredPlan);

  if (currentIndex >= requiredIndex) {
    return { hasAccess: true };
  }

  return {
    hasAccess: false,
    reason: `Requiere plan ${STRIPE_PLANS[requiredPlan].name}`,
    requiredPlan,
  };
};

const getLimitUsage = (
  organization: Organization,
  currentValue: number,
  limitType: 'maxActiveRaffles' | 'maxTicketsPerRaffle' | 'templatesAvailable'
): { current: number; limit: number; percentage: number; atLimit: boolean } => {
  const limits = getPlanLimits(organization.subscription_tier);
  const limit = limits[limitType];

  return {
    current: currentValue,
    limit,
    percentage: limit > 0 ? Math.round((currentValue / limit) * 100) : 0,
    atLimit: currentValue >= limit,
  };
};

describe('useSubscription - feature access', () => {
  describe('hasFeatureAccess', () => {
    it('should allow unrestricted features for all plans', () => {
      expect(hasFeatureAccess('basic', 'some_basic_feature').hasAccess).toBe(true);
    });

    it('should restrict pro features to pro and above', () => {
      expect(hasFeatureAccess('basic', 'custom_domain').hasAccess).toBe(false);
      expect(hasFeatureAccess('pro', 'custom_domain').hasAccess).toBe(true);
      expect(hasFeatureAccess('premium', 'custom_domain').hasAccess).toBe(true);
      expect(hasFeatureAccess('enterprise', 'custom_domain').hasAccess).toBe(true);
    });

    it('should restrict premium features to premium and above', () => {
      expect(hasFeatureAccess('basic', 'telegram_bot').hasAccess).toBe(false);
      expect(hasFeatureAccess('pro', 'telegram_bot').hasAccess).toBe(false);
      expect(hasFeatureAccess('premium', 'telegram_bot').hasAccess).toBe(true);
      expect(hasFeatureAccess('enterprise', 'telegram_bot').hasAccess).toBe(true);
    });

    it('should restrict enterprise features to enterprise only', () => {
      expect(hasFeatureAccess('basic', 'api_access').hasAccess).toBe(false);
      expect(hasFeatureAccess('pro', 'api_access').hasAccess).toBe(false);
      expect(hasFeatureAccess('premium', 'api_access').hasAccess).toBe(false);
      expect(hasFeatureAccess('enterprise', 'api_access').hasAccess).toBe(true);
    });

    it('should provide reason and required plan when access denied', () => {
      const result = hasFeatureAccess('basic', 'telegram_bot');
      expect(result.hasAccess).toBe(false);
      expect(result.requiredPlan).toBe('premium');
      expect(result.reason).toContain('Premium');
    });

    it('should handle null tier as basic', () => {
      expect(hasFeatureAccess(null, 'custom_domain').hasAccess).toBe(false);
    });
  });

  describe('getLimitUsage', () => {
    const org: Organization = {
      subscription_tier: 'pro',
      subscription_status: 'active',
      subscription_period: 'monthly',
      trial_ends_at: null,
      max_active_raffles: 7,
      max_tickets_per_raffle: 30000,
      templates_available: 6,
    };

    it('should calculate raffle usage', () => {
      const usage = getLimitUsage(org, 3, 'maxActiveRaffles');
      expect(usage.current).toBe(3);
      expect(usage.limit).toBe(7);
      expect(usage.percentage).toBe(43);
      expect(usage.atLimit).toBe(false);
    });

    it('should detect when at limit', () => {
      const usage = getLimitUsage(org, 7, 'maxActiveRaffles');
      expect(usage.atLimit).toBe(true);
      expect(usage.percentage).toBe(100);
    });

    it('should calculate ticket usage', () => {
      const usage = getLimitUsage(org, 15000, 'maxTicketsPerRaffle');
      expect(usage.limit).toBe(30000);
      expect(usage.percentage).toBe(50);
    });
  });
});

// ===== Trial Functions =====
const isInTrial = (org: Organization): boolean => {
  return org.subscription_status === 'trial' && org.trial_ends_at !== null;
};

const getTrialDaysRemaining = (trialEndsAt: string | null): number => {
  if (!trialEndsAt) return 0;

  const endDate = new Date(trialEndsAt);
  const now = new Date();
  const msRemaining = endDate.getTime() - now.getTime();
  const daysRemaining = Math.ceil(msRemaining / (1000 * 60 * 60 * 24));

  return Math.max(0, daysRemaining);
};

const isTrialExpired = (trialEndsAt: string | null): boolean => {
  if (!trialEndsAt) return true;
  return new Date(trialEndsAt) < new Date();
};

const getTrialEndDate = (startDate: Date, trialDays: number): Date => {
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + trialDays);
  return endDate;
};

describe('useSubscription - trial management', () => {
  describe('isInTrial', () => {
    it('should identify active trial', () => {
      const org: Organization = {
        subscription_tier: 'basic',
        subscription_status: 'trial',
        subscription_period: null,
        trial_ends_at: new Date(Date.now() + 86400000).toISOString(),
        max_active_raffles: 2,
        max_tickets_per_raffle: 2000,
        templates_available: 3,
      };
      expect(isInTrial(org)).toBe(true);
    });

    it('should return false for active subscription', () => {
      const org: Organization = {
        subscription_tier: 'pro',
        subscription_status: 'active',
        subscription_period: 'monthly',
        trial_ends_at: null,
        max_active_raffles: 7,
        max_tickets_per_raffle: 30000,
        templates_available: 6,
      };
      expect(isInTrial(org)).toBe(false);
    });

    it('should return false for null trial_ends_at', () => {
      const org: Organization = {
        subscription_tier: 'basic',
        subscription_status: 'trial',
        subscription_period: null,
        trial_ends_at: null,
        max_active_raffles: 2,
        max_tickets_per_raffle: 2000,
        templates_available: 3,
      };
      expect(isInTrial(org)).toBe(false);
    });
  });

  describe('getTrialDaysRemaining', () => {
    it('should return positive days for future date', () => {
      const futureDate = new Date(Date.now() + 5 * 86400000).toISOString(); // 5 days
      const days = getTrialDaysRemaining(futureDate);
      expect(days).toBeGreaterThanOrEqual(4);
      expect(days).toBeLessThanOrEqual(6);
    });

    it('should return 0 for past date', () => {
      const pastDate = new Date(Date.now() - 86400000).toISOString();
      expect(getTrialDaysRemaining(pastDate)).toBe(0);
    });

    it('should return 0 for null', () => {
      expect(getTrialDaysRemaining(null)).toBe(0);
    });
  });

  describe('isTrialExpired', () => {
    it('should return false for future date', () => {
      const futureDate = new Date(Date.now() + 86400000).toISOString();
      expect(isTrialExpired(futureDate)).toBe(false);
    });

    it('should return true for past date', () => {
      const pastDate = new Date(Date.now() - 86400000).toISOString();
      expect(isTrialExpired(pastDate)).toBe(true);
    });

    it('should return true for null', () => {
      expect(isTrialExpired(null)).toBe(true);
    });
  });

  describe('getTrialEndDate', () => {
    it('should calculate 7-day trial end', () => {
      const start = new Date('2024-01-01');
      const end = getTrialEndDate(start, 7);
      expect(end.toISOString()).toContain('2024-01-08');
    });

    it('should calculate 14-day trial end', () => {
      const start = new Date('2024-01-01');
      const end = getTrialEndDate(start, 14);
      expect(end.toISOString()).toContain('2024-01-15');
    });

    it('should handle month boundary', () => {
      const start = new Date('2024-01-28');
      const end = getTrialEndDate(start, 7);
      expect(end.getMonth()).toBe(1); // February
    });
  });
});

// ===== Status Functions =====
const getStatusBadgeConfig = (
  status: SubscriptionStatus
): { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' } => {
  switch (status) {
    case 'active':
      return { label: 'Activa', variant: 'default' };
    case 'trial':
      return { label: 'Prueba Gratuita', variant: 'secondary' };
    case 'past_due':
      return { label: 'Pago Pendiente', variant: 'destructive' };
    case 'canceled':
      return { label: 'Cancelada', variant: 'outline' };
    case 'incomplete':
      return { label: 'Incompleta', variant: 'destructive' };
    default:
      return { label: status, variant: 'secondary' };
  }
};

const canAccessDashboard = (org: Organization): boolean => {
  const validStatuses: SubscriptionStatus[] = ['active', 'trial', 'past_due'];
  return validStatuses.includes(org.subscription_status || 'trial');
};

const shouldShowUpgradePrompt = (org: Organization): boolean => {
  if (org.subscription_status === 'trial') return true;
  if (org.subscription_tier === 'basic') return true;
  return false;
};

const isPendingCancellation = (org: Organization): boolean => {
  return org.cancel_at_period_end === true && org.current_period_end !== null;
};

describe('useSubscription - status functions', () => {
  describe('getStatusBadgeConfig', () => {
    it('should return correct config for each status', () => {
      expect(getStatusBadgeConfig('active').label).toBe('Activa');
      expect(getStatusBadgeConfig('active').variant).toBe('default');

      expect(getStatusBadgeConfig('trial').label).toBe('Prueba Gratuita');
      expect(getStatusBadgeConfig('trial').variant).toBe('secondary');

      expect(getStatusBadgeConfig('past_due').label).toBe('Pago Pendiente');
      expect(getStatusBadgeConfig('past_due').variant).toBe('destructive');

      expect(getStatusBadgeConfig('canceled').label).toBe('Cancelada');
      expect(getStatusBadgeConfig('canceled').variant).toBe('outline');
    });
  });

  describe('canAccessDashboard', () => {
    it('should allow active subscriptions', () => {
      const org: Organization = {
        subscription_tier: 'pro',
        subscription_status: 'active',
        subscription_period: 'monthly',
        trial_ends_at: null,
        max_active_raffles: 7,
        max_tickets_per_raffle: 30000,
        templates_available: 6,
      };
      expect(canAccessDashboard(org)).toBe(true);
    });

    it('should allow trials', () => {
      const org: Organization = {
        subscription_tier: 'basic',
        subscription_status: 'trial',
        subscription_period: null,
        trial_ends_at: new Date(Date.now() + 86400000).toISOString(),
        max_active_raffles: 2,
        max_tickets_per_raffle: 2000,
        templates_available: 3,
      };
      expect(canAccessDashboard(org)).toBe(true);
    });

    it('should allow past_due (grace period)', () => {
      const org: Organization = {
        subscription_tier: 'pro',
        subscription_status: 'past_due',
        subscription_period: 'monthly',
        trial_ends_at: null,
        max_active_raffles: 7,
        max_tickets_per_raffle: 30000,
        templates_available: 6,
      };
      expect(canAccessDashboard(org)).toBe(true);
    });

    it('should block canceled subscriptions', () => {
      const org: Organization = {
        subscription_tier: 'pro',
        subscription_status: 'canceled',
        subscription_period: null,
        trial_ends_at: null,
        max_active_raffles: 7,
        max_tickets_per_raffle: 30000,
        templates_available: 6,
      };
      expect(canAccessDashboard(org)).toBe(false);
    });
  });

  describe('shouldShowUpgradePrompt', () => {
    it('should show for trial users', () => {
      const org: Organization = {
        subscription_tier: 'basic',
        subscription_status: 'trial',
        subscription_period: null,
        trial_ends_at: new Date().toISOString(),
        max_active_raffles: 2,
        max_tickets_per_raffle: 2000,
        templates_available: 3,
      };
      expect(shouldShowUpgradePrompt(org)).toBe(true);
    });

    it('should show for basic plan users', () => {
      const org: Organization = {
        subscription_tier: 'basic',
        subscription_status: 'active',
        subscription_period: 'monthly',
        trial_ends_at: null,
        max_active_raffles: 2,
        max_tickets_per_raffle: 2000,
        templates_available: 3,
      };
      expect(shouldShowUpgradePrompt(org)).toBe(true);
    });

    it('should not show for pro and above', () => {
      const org: Organization = {
        subscription_tier: 'pro',
        subscription_status: 'active',
        subscription_period: 'monthly',
        trial_ends_at: null,
        max_active_raffles: 7,
        max_tickets_per_raffle: 30000,
        templates_available: 6,
      };
      expect(shouldShowUpgradePrompt(org)).toBe(false);
    });
  });

  describe('isPendingCancellation', () => {
    it('should detect pending cancellation', () => {
      const org: Organization = {
        subscription_tier: 'pro',
        subscription_status: 'active',
        subscription_period: 'monthly',
        trial_ends_at: null,
        max_active_raffles: 7,
        max_tickets_per_raffle: 30000,
        templates_available: 6,
        cancel_at_period_end: true,
        current_period_end: new Date(Date.now() + 86400000 * 30).toISOString(),
      };
      expect(isPendingCancellation(org)).toBe(true);
    });

    it('should return false when not pending cancellation', () => {
      const org: Organization = {
        subscription_tier: 'pro',
        subscription_status: 'active',
        subscription_period: 'monthly',
        trial_ends_at: null,
        max_active_raffles: 7,
        max_tickets_per_raffle: 30000,
        templates_available: 6,
        cancel_at_period_end: false,
        current_period_end: null,
      };
      expect(isPendingCancellation(org)).toBe(false);
    });
  });
});

// ===== Error Message Mapping =====
const getErrorMessage = (error: string): string => {
  const errorMap: Record<string, string> = {
    'Invalid price': 'El plan seleccionado no es válido.',
    'authorization': 'Tu sesión ha expirado. Por favor inicia sesión de nuevo.',
    'authenticated': 'Debes iniciar sesión para continuar.',
    'pago pendiente': 'Tienes un pago pendiente. Actualiza tu método de pago.',
    'suscripción activa': 'Ya tienes una suscripción activa.',
    'network': 'Error de conexión. Verifica tu internet.',
    'Origin not allowed': 'Origen no autorizado.',
  };

  const lowerError = error.toLowerCase();
  for (const [key, message] of Object.entries(errorMap)) {
    if (lowerError.includes(key.toLowerCase())) {
      return message;
    }
  }

  return 'Ocurrió un error. Por favor intenta de nuevo.';
};

describe('useSubscription - error handling', () => {
  describe('getErrorMessage', () => {
    it('should map known errors to user-friendly messages', () => {
      expect(getErrorMessage('Invalid price ID')).toContain('plan seleccionado');
      expect(getErrorMessage('User not authenticated')).toContain('iniciar sesión');
      expect(getErrorMessage('Tienes un pago pendiente')).toContain('pago pendiente');
    });

    it('should return generic message for unknown errors', () => {
      expect(getErrorMessage('Some random error')).toContain('intenta de nuevo');
    });

    it('should be case-insensitive', () => {
      expect(getErrorMessage('INVALID PRICE')).toContain('plan seleccionado');
      expect(getErrorMessage('Network Error')).toContain('conexión');
    });
  });
});

// ===== Upgrade Preview Functions =====
interface UpgradePreview {
  amount_due: number;
  currency: string;
  proration_details: {
    credit: number;
    debit: number;
    items: { description: string; amount: number }[];
  };
  effective_date: string;
  next_billing_date: string | null;
  new_plan_name: string;
  old_plan_name: string;
}

const formatUpgradePreview = (preview: UpgradePreview): {
  netAmount: string;
  isCredit: boolean;
  effectiveDate: string;
  summary: string;
} => {
  const netAmount = preview.amount_due / 100; // Convert cents to dollars
  const isCredit = netAmount < 0;

  return {
    netAmount: formatPrice(Math.abs(netAmount), preview.currency),
    isCredit,
    effectiveDate: new Date(preview.effective_date).toLocaleDateString('es-MX'),
    summary: isCredit
      ? `Recibirás un crédito de ${formatPrice(Math.abs(netAmount), preview.currency)}`
      : `Se cobrará ${formatPrice(netAmount, preview.currency)} por la diferencia`,
  };
};

const canProceedWithUpgrade = (preview: UpgradePreview): { canProceed: boolean; reason?: string } => {
  // Check if amount is reasonable (not too high)
  if (preview.amount_due > 50000) { // $500 max
    return { canProceed: false, reason: 'Monto muy alto, contacta soporte' };
  }

  return { canProceed: true };
};

describe('useSubscription - upgrade preview', () => {
  describe('formatUpgradePreview', () => {
    it('should format charge preview', () => {
      const preview: UpgradePreview = {
        amount_due: 5000, // $50
        currency: 'USD',
        proration_details: { credit: 25, debit: 75, items: [] },
        effective_date: '2024-01-15T00:00:00Z',
        next_billing_date: '2024-02-01T00:00:00Z',
        new_plan_name: 'Pro',
        old_plan_name: 'Basic',
      };

      const formatted = formatUpgradePreview(preview);
      expect(formatted.isCredit).toBe(false);
      expect(formatted.netAmount).toContain('50');
      expect(formatted.summary).toContain('cobrará');
    });

    it('should format credit preview', () => {
      const preview: UpgradePreview = {
        amount_due: -2500, // -$25 credit
        currency: 'USD',
        proration_details: { credit: 75, debit: 50, items: [] },
        effective_date: '2024-01-15T00:00:00Z',
        next_billing_date: '2024-02-01T00:00:00Z',
        new_plan_name: 'Basic',
        old_plan_name: 'Pro',
      };

      const formatted = formatUpgradePreview(preview);
      expect(formatted.isCredit).toBe(true);
      expect(formatted.netAmount).toContain('25');
      expect(formatted.summary).toContain('crédito');
    });
  });

  describe('canProceedWithUpgrade', () => {
    it('should allow reasonable amounts', () => {
      const preview: UpgradePreview = {
        amount_due: 10000, // $100
        currency: 'USD',
        proration_details: { credit: 0, debit: 100, items: [] },
        effective_date: '2024-01-15T00:00:00Z',
        next_billing_date: '2024-02-01T00:00:00Z',
        new_plan_name: 'Pro',
        old_plan_name: 'Basic',
      };

      expect(canProceedWithUpgrade(preview).canProceed).toBe(true);
    });

    it('should block unreasonably high amounts', () => {
      const preview: UpgradePreview = {
        amount_due: 100000, // $1000
        currency: 'USD',
        proration_details: { credit: 0, debit: 1000, items: [] },
        effective_date: '2024-01-15T00:00:00Z',
        next_billing_date: '2024-02-01T00:00:00Z',
        new_plan_name: 'Enterprise',
        old_plan_name: 'Basic',
      };

      const result = canProceedWithUpgrade(preview);
      expect(result.canProceed).toBe(false);
      expect(result.reason).toContain('soporte');
    });
  });
});

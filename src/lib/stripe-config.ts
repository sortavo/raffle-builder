// SORTAVO Stripe Configuration
// These are the actual Stripe product and price IDs

export const STRIPE_PLANS = {
  basic: {
    name: "Basic",
    monthlyPrice: 49,
    annualPrice: 490,
    monthlyPriceId: "price_1ShldQRk7xhLUSttlw5O8LPm",
    annualPriceId: "price_1ShldlRk7xhLUSttMCfocNpN",
    productId: "prod_Tf5pTKxFYtPfd4",
    features: [
      "2 sorteos activos",
      "2,000 boletos por sorteo",
      "1 plantilla",
      "Soporte por email (48h)",
    ],
    limits: {
      maxActiveRaffles: 2,
      maxTicketsPerRaffle: 2000,
      templatesAvailable: 1,
    },
  },
  pro: {
    name: "Pro",
    monthlyPrice: 149,
    annualPrice: 1490,
    monthlyPriceId: "price_1ShlhvRk7xhLUSttYM8BTpMv",
    annualPriceId: "price_1Shli9Rk7xhLUSttNCen5wEz",
    productId: "prod_Tf5tsw8mmJQneA",
    popular: true,
    features: [
      "7 sorteos activos",
      "30,000 boletos por sorteo",
      "6 plantillas",
      "Lotería Nacional",
      "Sin marca Sortavo",
      "Soporte WhatsApp (12h)",
    ],
    limits: {
      maxActiveRaffles: 7,
      maxTicketsPerRaffle: 30000,
      templatesAvailable: 6,
    },
  },
  premium: {
    name: "Premium",
    monthlyPrice: 299,
    annualPrice: 2990,
    monthlyPriceId: "price_1ShliMRk7xhLUSttjsJ6IJa1",
    annualPriceId: "price_1ShliZRk7xhLUSttqay0l79f",
    productId: "prod_Tf5uiAAHV2WZNF",
    features: [
      "15 sorteos activos",
      "100,000 boletos por sorteo",
      "6 plantillas + CSS personalizado",
      "Bot de Telegram incluido",
      "Account Manager dedicado",
      "Setup asistido incluido",
    ],
    limits: {
      maxActiveRaffles: 15,
      maxTicketsPerRaffle: 100000,
      templatesAvailable: 6,
    },
  },
  enterprise: {
    name: "Enterprise",
    monthlyPrice: 499,
    annualPrice: 4990,
    monthlyPriceId: "price_1SjsnMRk7xhLUSttruKBstef",
    annualPriceId: "price_1SjsnrRk7xhLUSttiS0aebpB",
    productId: "prod_ThHMyhLAztHnsu",
    features: [
      "Sorteos ilimitados",
      "10,000,000 boletos por sorteo",
      "Bot de Telegram incluido",
      "API Access",
      "Account Manager dedicado",
      "SLA 99.9% uptime",
      "Soporte 24/7 telefónico",
    ],
    limits: {
      maxActiveRaffles: 999,
      maxTicketsPerRaffle: 10000000,
      templatesAvailable: 6,
    },
  },
} as const;

export type PlanKey = keyof typeof STRIPE_PLANS;
export type BillingPeriod = "monthly" | "annual";

export function getPriceId(plan: PlanKey, period: BillingPeriod): string {
  return period === "annual"
    ? STRIPE_PLANS[plan].annualPriceId
    : STRIPE_PLANS[plan].monthlyPriceId;
}

export function getPlanByProductId(productId: string): PlanKey | null {
  for (const [key, plan] of Object.entries(STRIPE_PLANS)) {
    if (plan.productId === productId) {
      return key as PlanKey;
    }
  }
  return null;
}

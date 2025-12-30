// SORTAVO Stripe Configuration
// Supports both TEST and LIVE modes with automatic detection

// Stripe mode detection based on the secret key prefix
// In edge functions, we detect from STRIPE_SECRET_KEY (sk_test_ vs sk_live_)
// This config provides both sets of IDs for reference

export type StripeMode = "test" | "live";

// ============= TEST MODE IDs =============
const TEST_PLANS = {
  basic: {
    monthlyPriceId: "price_1SjvNEDPAURVR9VYo48CuIdo",
    annualPriceId: "price_1SjvNKDPAURVR9VYTaWlJiqR",
    productId: "prod_ThK1EiE0AtKCIM",
  },
  pro: {
    monthlyPriceId: "price_1SjvNMDPAURVR9VYkqjmzN1v",
    annualPriceId: "price_1SjvNNDPAURVR9VY3sqCZ87h",
    productId: "prod_ThK1LTy6UcPdrl",
  },
  premium: {
    monthlyPriceId: "price_1SjvNPDPAURVR9VYUkxIxLaW",
    annualPriceId: "price_1SjvNRDPAURVR9VYhvvFqB0k",
    productId: "prod_ThK1L4ZhLIMS0C",
  },
  enterprise: {
    monthlyPriceId: "price_1SjvNTDPAURVR9VYEoMGZChr",
    annualPriceId: "price_1SjvNUDPAURVR9VYBwTQUNtp",
    productId: "prod_ThK18K9yms0nxs",
  },
} as const;

// ============= LIVE MODE IDs =============
const LIVE_PLANS = {
  basic: {
    monthlyPriceId: "price_1ShldQRk7xhLUSttlw5O8LPm",
    annualPriceId: "price_1ShldlRk7xhLUSttMCfocNpN",
    productId: "prod_Tf5pTKxFYtPfd4",
  },
  pro: {
    monthlyPriceId: "price_1ShleyRk7xhLUSttu62RpPSz",
    annualPriceId: "price_1ShlfdRk7xhLUSttwg0xGlKm",
    productId: "prod_Tf5tsw8mmJQneA",
  },
  premium: {
    monthlyPriceId: "price_1ShlgGRk7xhLUSttGHQyXlEo",
    annualPriceId: "price_1ShlglRk7xhLUSttFQxlJm5d",
    productId: "prod_Tf5uiAAHV2WZNF",
  },
  enterprise: {
    monthlyPriceId: "price_1Sjr3nRk7xhLUSttFD1TdVTf",
    annualPriceId: "price_1Sjr45Rk7xhLUSttjCfRfM3l",
    productId: "prod_ThHMyhLAztHnsu",
  },
} as const;

// ============= PLAN METADATA (shared) =============
const PLAN_METADATA = {
  basic: {
    name: "Basic",
    monthlyPrice: 49,
    annualPrice: 490,
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

// ============= CURRENT MODE =============
// Detect mode from environment variable or default to test
// The VITE_STRIPE_MODE env var can be set to 'live' for production
const currentMode: StripeMode = 
  (import.meta.env.VITE_STRIPE_MODE as StripeMode) || "test";

// Get the appropriate plan IDs based on current mode
const CURRENT_PLAN_IDS = currentMode === "live" ? LIVE_PLANS : TEST_PLANS;

// ============= EXPORTS =============
export const STRIPE_MODE = currentMode;

export const STRIPE_PLANS = {
  basic: {
    ...PLAN_METADATA.basic,
    ...CURRENT_PLAN_IDS.basic,
  },
  pro: {
    ...PLAN_METADATA.pro,
    ...CURRENT_PLAN_IDS.pro,
  },
  premium: {
    ...PLAN_METADATA.premium,
    ...CURRENT_PLAN_IDS.premium,
  },
  enterprise: {
    ...PLAN_METADATA.enterprise,
    ...CURRENT_PLAN_IDS.enterprise,
  },
} as const;

// Export both sets for edge functions that need both
export const STRIPE_PLANS_BY_MODE = {
  test: TEST_PLANS,
  live: LIVE_PLANS,
} as const;

// All basic price IDs (for trial detection in edge functions)
export const BASIC_PRICE_IDS = {
  test: [TEST_PLANS.basic.monthlyPriceId, TEST_PLANS.basic.annualPriceId],
  live: [LIVE_PLANS.basic.monthlyPriceId, LIVE_PLANS.basic.annualPriceId],
  all: [
    TEST_PLANS.basic.monthlyPriceId,
    TEST_PLANS.basic.annualPriceId,
    LIVE_PLANS.basic.monthlyPriceId,
    LIVE_PLANS.basic.annualPriceId,
  ],
} as const;

export type PlanKey = keyof typeof STRIPE_PLANS;
export type BillingPeriod = "monthly" | "annual";

export function getPriceId(plan: PlanKey, period: BillingPeriod): string {
  return period === "annual"
    ? STRIPE_PLANS[plan].annualPriceId
    : STRIPE_PLANS[plan].monthlyPriceId;
}

export function getPlanByProductId(productId: string): PlanKey | null {
  // Check both test and live product IDs
  for (const [key, plan] of Object.entries(TEST_PLANS)) {
    if (plan.productId === productId) {
      return key as PlanKey;
    }
  }
  for (const [key, plan] of Object.entries(LIVE_PLANS)) {
    if (plan.productId === productId) {
      return key as PlanKey;
    }
  }
  return null;
}

// Helper to check if a price ID is for the basic plan (supports both modes)
export function isBasicPlanPriceId(priceId: string): boolean {
  return (BASIC_PRICE_IDS.all as readonly string[]).includes(priceId);
}
